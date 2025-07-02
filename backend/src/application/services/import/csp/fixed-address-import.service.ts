// backend/src/application/services/import/csp/fixed-address-import.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CspDataClient } from '@/infrastructure/api-clients/csp/data.client';
import { FixedAddress } from '@/infrastructure/database/csp/fixed-address.entity';
import { IpSpace } from '@/infrastructure/database/csp/ip-space.entity';
import { Subnet } from '@/infrastructure/database/csp/subnet.entity';
import { FixedDhcpOption } from '@/infrastructure/database/csp/fixed-dhcp-option.entity';

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
    @InjectRepository(FixedDhcpOption)
    private readonly dhcpOptionRepo: Repository<FixedDhcpOption>,
  ) {}

  async importFixedAddresses(): Promise<FixedAddress[]> {
    this.logger.log('Importing Fixed Addresses from CSP...');
    const dtos = await this.cspDataClient.fetchFixedAddresses();

    if (!dtos?.length) {
      this.logger.warn('No Fixed Addresses found in CSP.');
      return [];
    }

    // IpSpaces und Subnets mappen
    const ipSpaces = await this.ipSpaceRepo.find();
    const ipSpaceMap = new Map<string, IpSpace>();
    for (const s of ipSpaces) {
      if (s.externalId) ipSpaceMap.set(s.externalId, s);
    }

    const subnets = await this.subnetRepo.find();
    const subnetMap = new Map<string, Subnet>();
    for (const s of subnets) {
      if (s.externalId) subnetMap.set(s.externalId, s);
    }

    const imported: FixedAddress[] = [];

    for (const dto of dtos) {
      // Parent-Zuordnung
      const parent = dto.parent ? subnetMap.get(dto.parent) : undefined;
      const ipSpace = ipSpaceMap.get(dto.ip_space);

      if (!ipSpace) {
        this.logger.warn(
          `No IpSpace found for FixedAddress ${dto.id} (ip_space: ${dto.ip_space}). Skipping.`,
        );
        continue;
      }

      let fixed = await this.fixedAddressRepo.findOne({
        where: { externalId: dto.id },
        relations: ['dhcpOptions'],
      });
      if (!fixed) {
        fixed = this.fixedAddressRepo.create({ externalId: dto.id });
      }

      fixed.name = dto.name;
      fixed.address = dto.address;
      fixed.ipSpace = ipSpace;
      fixed.ipSpaceId = ipSpace.id;
      fixed.match_type = dto.match_type;
      fixed.match_value = dto.match_value;
      fixed.comment = dto.comment ?? null;
      fixed.parent = parent;
      fixed.parentId = parent?.id;
      fixed.inheritance_sources = dto.inheritance_sources ?? undefined;

      await this.fixedAddressRepo.save(fixed);

      // DHCP-Optionen: Vorher löschen
      if (Array.isArray(fixed.dhcpOptions)) {
        await this.dhcpOptionRepo.delete({ fixedAddressId: fixed.id });
      }
      if (Array.isArray(dto.dhcp_options) && dto.dhcp_options.length > 0) {
        for (const opt of dto.dhcp_options) {
          if (
            typeof opt.option_code === 'string' &&
            typeof opt.option_value === 'string' &&
            typeof opt.type === 'string'
          ) {
            const option = this.dhcpOptionRepo.create({
              fixedAddress: fixed,
              fixedAddressId: fixed.id,
              group: typeof opt.group === 'string' ? opt.group : null,
              option_code: opt.option_code,
              option_value: opt.option_value,
              type: opt.type,
            });
            await this.dhcpOptionRepo.save(option);
          }
        }
      }

      imported.push(fixed);
    }

    this.logger.log(
      `Import complete: ${imported.length} Fixed Addresses saved.`,
    );
    return imported;
  }
}
