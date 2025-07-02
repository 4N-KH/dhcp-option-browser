import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CspDataClient } from '@/infrastructure/api-clients/csp/data.client';
import { Subnet } from '@/infrastructure/database/csp/subnet.entity';
import { SubnetDhcpOption } from '@/infrastructure/database/csp/subnet-dhcp-option.entity';
import { IpSpace } from '@/infrastructure/database/csp/ip-space.entity';
import { OptionCodeEntity } from '@/infrastructure/database/csp/option-code.entity';

@Injectable()
export class CspSubnetImportService {
  private readonly logger = new Logger(CspSubnetImportService.name);

  constructor(
    private readonly cspDataClient: CspDataClient,
    @InjectRepository(Subnet)
    private readonly subnetRepo: Repository<Subnet>,
    @InjectRepository(IpSpace)
    private readonly ipSpaceRepo: Repository<IpSpace>,
    @InjectRepository(SubnetDhcpOption)
    private readonly subnetDhcpOptionRepo: Repository<SubnetDhcpOption>,
    @InjectRepository(OptionCodeEntity)
    private readonly optionCodeRepo: Repository<OptionCodeEntity>,
  ) {}

  /**
   * Importiert alle Subnetze inkl. DHCP-Optionen, Parent und Space.
   */
  async importSubnets(): Promise<Subnet[]> {
    this.logger.log('Importing Subnets from CSP...');
    const dtos = await this.cspDataClient.fetchSubnets();

    if (!dtos?.length) {
      this.logger.warn('No Subnets found in CSP.');
      return [];
    }

    // Caches für spätere FKs
    const spaceMap = new Map<string, IpSpace>();
    for (const s of await this.ipSpaceRepo.find()) {
      if (s.externalId) spaceMap.set(s.externalId, s);
    }
    const optionCodeMap = new Map<string, OptionCodeEntity>();
    for (const oc of await this.optionCodeRepo.find()) {
      if (oc.externalId) optionCodeMap.set(oc.externalId, oc);
    }

    // 1. Subnets speichern (ohne Parent)
    const subnetMap = new Map<string, Subnet>();
    for (const dto of dtos) {
      let subnet = await this.subnetRepo.findOne({
        where: { externalId: dto.id },
        relations: ['dhcpOptions'],
      });
      if (!subnet) subnet = this.subnetRepo.create({ externalId: dto.id });
      subnet.name = dto.name;
      subnet.address = dto.address;
      subnet.cidr = dto.cidr;
      subnet.comment = dto.comment ?? null;
      subnet.space = dto.space ? spaceMap.get(dto.space) : undefined;
      subnet.spaceId = subnet.space?.id;
      subnet.dhcpOptions = [];
      await this.subnetRepo.save(subnet);
      subnetMap.set(dto.id, subnet);
    }

    // 2. Parent-Relationen
    for (const dto of dtos) {
      if (dto.parent) {
        const child = subnetMap.get(dto.id);
        const parent = subnetMap.get(dto.parent);
        if (child && parent) {
          child.parent = parent;
          child.parentId = parent.id;
          await this.subnetRepo.save(child);
        }
      }
    }

    // 3. DHCP Optionen importieren (Relationstabelle)
    for (const dto of dtos) {
      const subnet = subnetMap.get(dto.id);
      if (!subnet) continue;
      await this.subnetDhcpOptionRepo.delete({ subnetId: subnet.id });

      if (Array.isArray(dto.dhcp_options)) {
        const validOptions = dto.dhcp_options.filter(
          (
            opt,
          ): opt is {
            group?: string | null;
            option_code: string;
            option_value: string;
            type: string;
          } =>
            !!opt &&
            typeof opt.option_code === 'string' &&
            typeof opt.option_value === 'string' &&
            typeof opt.type === 'string',
        );

        for (const opt of validOptions) {
          const optionCodeRef = optionCodeMap.get(opt.option_code) ?? undefined;

          const dhcpOpt = this.subnetDhcpOptionRepo.create({
            subnet,
            subnetId: subnet.id,
            group: typeof opt.group === 'string' ? opt.group : null,
            option_code: opt.option_code,
            option_value: opt.option_value,
            type: opt.type,
            optionCode: optionCodeRef,
            optionCodeId: optionCodeRef?.id,
          });

          await this.subnetDhcpOptionRepo.save(dhcpOpt);
        }
      }
    }

    this.logger.log(
      `Import complete: ${subnetMap.size} Subnets including DHCP options and parents saved.`,
    );
    return Array.from(subnetMap.values());
  }
}
