import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CspDataClient } from '@/infrastructure/api-clients/csp/data.client';
import { FixedAddress } from '@/infrastructure/database/csp/fixed-address.entity';
import { IpSpace } from '@/infrastructure/database/csp/ip-space.entity';
import { Subnet } from '@/infrastructure/database/csp/subnet.entity';
import { Range } from '@/infrastructure/database/csp/range.entity';
import { FixedDhcpOption } from '@/infrastructure/database/csp/fixed-dhcp-option.entity';
import { FixedAddressOptionGroup } from '@/infrastructure/database/csp/fixed-address-option-group.entity';
import { OptionGroup } from '@/infrastructure/database/csp/option-group.entity';
import { OptionCodeEntity } from '@/infrastructure/database/csp/option-code.entity';
import { EncodingSanitizer } from '@/application/services/import/transformers/encoding-sanitizer.interface';

import {
  buildOptionCodeMap,
  mapDhcpOptionToEntity,
} from '@/shared/utils/dhcp-option-mapper.util';
import { resolveOptionGroupsFromOptions } from '@/shared/utils/option-group-mapper.util';
import { normalizeAndDedupeDhcpOptions } from '@/shared/parser/dhcp-option-normalizer';
import type { CspFixedAddressDto } from '@/domain/dto/csp/fixed-address.dto';

type InterruptibleImportOptions = {
  isCancelled?: () => boolean;
  onProgress?: (current: number, total: number) => void;
};

@Injectable()
export class CspFixedAddressImportService {
  private readonly logger = new Logger(CspFixedAddressImportService.name);

  constructor(
    private readonly cspDataClient: CspDataClient,
    @InjectRepository(FixedAddress)
    private readonly fixedAddressRepo: Repository<FixedAddress>,
    @InjectRepository(IpSpace)
    private readonly ipSpaceRepo: Repository<IpSpace>,
    @InjectRepository(Subnet)
    private readonly subnetRepo: Repository<Subnet>,
    @InjectRepository(Range)
    private readonly rangeRepo: Repository<Range>,
    @InjectRepository(FixedDhcpOption)
    private readonly dhcpOptionRepo: Repository<FixedDhcpOption>,
    @InjectRepository(FixedAddressOptionGroup)
    private readonly fixedAddressOptionGroupRepo: Repository<FixedAddressOptionGroup>,
    @InjectRepository(OptionGroup)
    private readonly optionGroupRepo: Repository<OptionGroup>,
    @InjectRepository(OptionCodeEntity)
    private readonly optionCodeRepo: Repository<OptionCodeEntity>,
    @Inject(EncodingSanitizer)
    private readonly encodingSanitizer: EncodingSanitizer,
  ) {}

  async importFixedAddresses(
    opts?: InterruptibleImportOptions,
  ): Promise<FixedAddress[]> {
    this.logger.log('Importing Fixed Addresses from CSP...');
    const checkCancel = () => {
      if (opts?.isCancelled?.()) {
        this.logger.warn('FixedAddress import interrupted by user.');
        throw new Error('Import cancelled by user');
      }
    };

    checkCancel();
    const dtos: CspFixedAddressDto[] =
      await this.cspDataClient.fetchFixedAddresses();

    if (!dtos?.length) {
      this.logger.warn('No Fixed Addresses found in CSP.');
      return [];
    }

    // Lookup-Maps
    const ipSpaceMap = new Map<string, IpSpace>();
    for (const s of await this.ipSpaceRepo.find()) {
      if (s.externalId) ipSpaceMap.set(s.externalId, s);
    }
    const subnetMap = new Map<string, Subnet>();
    for (const s of await this.subnetRepo.find()) {
      if (s.externalId) subnetMap.set(s.externalId, s);
    }
    const rangeMap = new Map<string, Range>();
    for (const r of await this.rangeRepo.find()) {
      if (r.externalId) rangeMap.set(r.externalId, r);
    }
    const optionCodeMap = buildOptionCodeMap(
      await this.optionCodeRepo.find({ relations: ['optionSpace'] }),
    );
    // OptionGroups
    const allOptionGroups = await this.optionGroupRepo.find();
    const optionGroupMap = new Map<string, OptionGroup>();
    for (const og of allOptionGroups) {
      if (!og) continue;
      if (og.externalId)
        optionGroupMap.set(og.externalId.trim().toLowerCase(), og);
      const m = og.externalId
        ?.trim()
        .toLowerCase()
        .match(/^dhcp\/option_group\/(.+)$/);
      if (m) optionGroupMap.set(m[1], og);
      if (og.name) optionGroupMap.set(og.name.trim().toLowerCase(), og);
      if (og.id) optionGroupMap.set(String(og.id), og);
    }

    const imported: FixedAddress[] = [];
    const total = dtos.length;
    let progress = 0;
    const report = () => opts?.onProgress?.(progress, total);

    for (const dto of dtos) {
      checkCancel();

      const name = this.encodingSanitizer.sanitize(dto.name);
      const address = this.encodingSanitizer.sanitize(dto.address);
      const match_type = this.encodingSanitizer.sanitize(dto.match_type);
      const match_value = this.encodingSanitizer.sanitize(dto.match_value);
      const comment = this.encodingSanitizer.sanitize(dto.comment ?? '');

      // Parent assignment
      let parentSubnet: Subnet | undefined;
      let parentRange: Range | undefined;
      if (dto.parent?.startsWith('ipam/subnet/')) {
        parentSubnet = subnetMap.get(dto.parent);
      } else if (dto.parent?.startsWith('ipam/range/')) {
        parentRange = rangeMap.get(dto.parent);
      }

      let fixed = await this.fixedAddressRepo.findOne({
        where: { externalId: dto.id },
        relations: ['dhcpOptions', 'optionGroups'],
      });
      if (!fixed) {
        fixed = this.fixedAddressRepo.create({ externalId: dto.id });
      }

      fixed.name = name;
      fixed.address = address;
      fixed.match_type = match_type;
      fixed.match_value = match_value;
      fixed.comment = comment;
      fixed.subnet = parentSubnet;
      fixed.subnetId = parentSubnet?.id ?? null;
      fixed.range = parentRange;
      fixed.rangeId = parentRange?.id ?? null;

      await this.fixedAddressRepo.save(fixed);

      // --- DHCP options ---
      await this.dhcpOptionRepo.delete({ fixedAddressId: fixed.id });
      {
        const normalized = normalizeAndDedupeDhcpOptions(
          dto.dhcp_options ?? [],
        ).filter((o) => o.type !== 'group');

        const dhcpOptionEntities = normalized.map((opt) =>
          this.dhcpOptionRepo.create({
            ...mapDhcpOptionToEntity<FixedDhcpOption>(
              {
                ...opt,
                option_code: this.encodingSanitizer.sanitize(opt.option_code),
                option_value: this.encodingSanitizer.sanitize(opt.option_value),
                type: this.encodingSanitizer.sanitize(opt.type),
                group: opt.group
                  ? this.encodingSanitizer.sanitize(opt.group)
                  : undefined,
              },
              optionCodeMap,
            ),
            fixedAddress: fixed,
            fixedAddressId: fixed.id,
          }),
        );
        if (dhcpOptionEntities.length > 0) {
          await this.dhcpOptionRepo.save(dhcpOptionEntities);
        }
      }

      // --- OptionGroups assignment ---
      await this.fixedAddressOptionGroupRepo.delete({
        fixedAddressId: fixed.id,
      });

      const foundGroups = resolveOptionGroupsFromOptions(
        normalizeAndDedupeDhcpOptions(
          (dto.dhcp_options ?? []).map((opt) => ({
            ...opt,
            group:
              typeof opt.group === 'string'
                ? this.encodingSanitizer.sanitize(opt.group)
                : opt.group,
          })),
        ),
        optionGroupMap,
        null,
      );

      for (const optionGroup of foundGroups) {
        await this.fixedAddressOptionGroupRepo.save(
          this.fixedAddressOptionGroupRepo.create({
            fixedAddress: fixed,
            fixedAddressId: fixed.id,
            optionGroup,
            optionGroupId: optionGroup.id,
          }),
        );
      }

      imported.push(fixed);

      progress++;
      report();
    }

    this.logger.log(
      `Import complete: ${imported.length} Fixed Addresses (including OptionGroups and DHCP options) saved.`,
    );
    return imported;
  }
}
