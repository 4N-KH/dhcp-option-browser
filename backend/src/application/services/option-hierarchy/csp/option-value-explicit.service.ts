// src/application/services/option-hierarchy/csp/option-value-explicit.service.ts

import { Injectable } from '@nestjs/common';
import { OptionOccurrenceDto } from '@/domain/dto/csp/option-occurrence.dto';
import { ObjectType } from '@/domain/enums/csp/object-type.enum';

import { GlobalConfigOptionRepository } from '@/infrastructure/database/csp/global-config-option.repository';
import { IpSpaceDhcpOptionRepository } from '@/infrastructure/database/csp/ip-space-dhcp-option.repository';
import { AddressBlockDhcpOptionRepository } from '@/infrastructure/database/csp/address-block-dhcp-option.repository';
import { SubnetDhcpOptionRepository } from '@/infrastructure/database/csp/subnet-dhcp-option.repository';
import { RangeDhcpOptionRepository } from '@/infrastructure/database/csp/range-dhcp-option.repository';
import { FixedDhcpOptionRepository } from '@/infrastructure/database/csp/fixed-dhcp-option.repository';

@Injectable()
export class OptionValueExplicitService {
  constructor(
    private readonly globalOptRepo: GlobalConfigOptionRepository,
    private readonly ipSpaceOptRepo: IpSpaceDhcpOptionRepository,
    private readonly addressBlockOptRepo: AddressBlockDhcpOptionRepository,
    private readonly subnetOptRepo: SubnetDhcpOptionRepository,
    private readonly rangeOptRepo: RangeDhcpOptionRepository,
    private readonly fixedOptRepo: FixedDhcpOptionRepository,
  ) {}

  /**
   * Alle expliziten Optionen auf Global-Config-Ebene
   */
  async findExplicitGlobalOptions(
    code: number,
    name: string,
    type?: string,
    source?: string,
  ): Promise<OptionOccurrenceDto[]> {
    const opts = await this.globalOptRepo.findByCodeNameTypeSource(
      String(code),
      name,
      type,
      source,
    );

    return opts.map((opt) => ({
      objectType: ObjectType.GLOBAL,
      objectId: opt.globalConfigId,
      objectLabel: 'Global Config',
      objectDisplay: 'Global Config',
      address: null,
      cidr: null,
      ipSpace: null,
      value: opt.option_value,
      setStatus: 'explicit',
      type: opt.optionCode?.type ?? null,
      source: opt.optionCode?.source ?? null,
      optionSpaceId: opt.optionSpaceId ?? null,
      optionCodeId: opt.optionCodeId ?? null,
      inheritedFrom: undefined,
      overriddenBy: undefined,
    }));
  }

  /**
   * Alle expliziten Optionen auf IP-Space-Ebene
   */
  async findExplicitIpSpaceOptions(
    code: number,
    name: string,
    type?: string,
    source?: string,
  ): Promise<OptionOccurrenceDto[]> {
    const opts = await this.ipSpaceOptRepo.findByCodeNameTypeSource(
      String(code),
      name,
      type,
      source,
    );

    return opts.map((opt) => ({
      objectType: ObjectType.IPSPACE,
      objectId: opt.ipSpaceId,
      objectLabel: opt.ipSpace?.name ?? '',
      objectDisplay: `IP Space ${opt.ipSpace?.name ?? ''}`,
      address: null,
      cidr: null,
      ipSpace: opt.ipSpace?.name ?? null,
      value: opt.option_value,
      setStatus: 'explicit',
      type: opt.optionCode?.type ?? null,
      source: opt.optionCode?.source ?? null,
      optionSpaceId: opt.optionSpaceId ?? null,
      optionCodeId: opt.optionCodeId ?? null,
      inheritedFrom: undefined,
      overriddenBy: undefined,
    }));
  }

  /**
   * Alle expliziten Optionen auf AddressBlock-Ebene
   */
  async findExplicitAddressBlockOptions(
    code: number,
    name: string,
    type?: string,
    source?: string,
  ): Promise<OptionOccurrenceDto[]> {
    const opts = await this.addressBlockOptRepo.findByCodeNameTypeSource(
      String(code),
      name,
      type,
      source,
    );

    return opts.map((opt) => ({
      objectType: ObjectType.ADDRESSBLOCK,
      objectId: opt.addressBlockId,
      objectLabel: opt.addressBlock?.name ?? '',
      objectDisplay: `Address Block ${opt.addressBlock?.name ?? ''}${
        opt.addressBlock?.address &&
        opt.addressBlock?.cidr !== undefined &&
        opt.addressBlock?.cidr !== null
          ? ` (${opt.addressBlock.address}/${String(opt.addressBlock.cidr)})`
          : ''
      }`,
      address: opt.addressBlock?.address ?? null,
      cidr:
        opt.addressBlock?.cidr !== undefined && opt.addressBlock?.cidr !== null
          ? String(opt.addressBlock.cidr)
          : null,
      ipSpace: opt.addressBlock?.ipSpace?.name ?? null,
      value: opt.option_value,
      setStatus: 'explicit',
      type: opt.optionCode?.type ?? null,
      source: opt.optionCode?.source ?? null,
      optionSpaceId: opt.optionSpaceId ?? null,
      optionCodeId: opt.optionCodeId ?? null,
      inheritedFrom: undefined,
      overriddenBy: undefined,
    }));
  }

  /**
   * Alle expliziten Optionen auf Subnetzebene
   */
  async findExplicitSubnetOptions(
    code: number,
    name: string,
    type?: string,
    source?: string,
  ): Promise<OptionOccurrenceDto[]> {
    const opts = await this.subnetOptRepo.findByCodeNameTypeSource(
      String(code),
      name,
      type,
      source,
    );

    return opts.map((opt) => ({
      objectType: ObjectType.SUBNET,
      objectId: opt.subnetId,
      objectLabel: opt.subnet?.name ?? '',
      objectDisplay: `Subnet ${opt.subnet?.name ?? ''}${
        opt.subnet?.address &&
        opt.subnet?.cidr !== undefined &&
        opt.subnet?.cidr !== null
          ? ` (${opt.subnet.address}/${String(opt.subnet.cidr)})`
          : ''
      }`,
      address: opt.subnet?.address ?? null,
      cidr:
        opt.subnet?.cidr !== undefined && opt.subnet?.cidr !== null
          ? String(opt.subnet.cidr)
          : null,
      ipSpace: opt.subnet?.space?.name ?? null, // ACHTUNG: space, nicht ipSpace!
      value: opt.option_value,
      setStatus: 'explicit',
      type: opt.optionCode?.type ?? null,
      source: opt.optionCode?.source ?? null,
      optionSpaceId: opt.optionSpaceId ?? null,
      optionCodeId: opt.optionCodeId ?? null,
      inheritedFrom: undefined,
      overriddenBy: undefined,
    }));
  }

  /**
   * Alle expliziten Optionen auf Range-Ebene
   */
  async findExplicitRangeOptions(
    code: number,
    name: string,
    type?: string,
    source?: string,
  ): Promise<OptionOccurrenceDto[]> {
    const opts = await this.rangeOptRepo.findByCodeNameTypeSource(
      String(code),
      name,
      type,
      source,
    );

    return opts.map((opt) => ({
      objectType: ObjectType.RANGE,
      objectId: opt.rangeId,
      objectLabel: opt.range?.name ?? '',
      objectDisplay: `Range ${opt.range?.name ?? ''}${
        opt.range?.start && opt.range?.end
          ? ` (${opt.range.start}-${opt.range.end})`
          : ''
      }`,
      address: opt.range?.start ?? null,
      cidr:
        opt.range?.start && opt.range?.end
          ? `${opt.range.start}-${opt.range.end}`
          : null,
      ipSpace: opt.range?.subnet?.space?.name ?? null, // ACHTUNG: space, nicht ipSpace!
      value: opt.option_value,
      setStatus: 'explicit',
      type: opt.optionCode?.type ?? null,
      source: opt.optionCode?.source ?? null,
      optionSpaceId: opt.optionSpaceId ?? null,
      optionCodeId: opt.optionCodeId ?? null,
      inheritedFrom: undefined,
      overriddenBy: undefined,
    }));
  }

  /**
   * Alle expliziten Optionen auf FixedAddress-Ebene
   */
  async findExplicitFixedAddressOptions(
    code: number,
    name: string,
    type?: string,
    source?: string,
  ): Promise<OptionOccurrenceDto[]> {
    const opts = await this.fixedOptRepo.findByCodeNameTypeSource(
      String(code),
      name,
      type,
      source,
    );

    return opts.map((opt) => ({
      objectType: ObjectType.FIXEDADDRESS,
      objectId: opt.fixedAddressId,
      objectLabel: opt.fixedAddress?.name ?? '',
      objectDisplay: `Fixed Address ${opt.fixedAddress?.name ?? ''}${
        opt.fixedAddress?.address ? ` (${opt.fixedAddress.address})` : ''
      }`,
      address: opt.fixedAddress?.address ?? null,
      cidr: null,
      ipSpace: opt.fixedAddress?.subnet?.space?.name ?? null, // ACHTUNG: space, nicht ipSpace!
      value: opt.option_value,
      setStatus: 'explicit',
      type: opt.optionCode?.type ?? null,
      source: opt.optionCode?.source ?? null,
      optionSpaceId: opt.optionSpaceId ?? null,
      optionCodeId: opt.optionCodeId ?? null,
      inheritedFrom: undefined,
      overriddenBy: undefined,
    }));
  }

  /**
   * Kombinierte Abfrage: ALLE Ebenen! Optional Wert-Filter.
   */
  async findExplicitOptionsAllLevels(
    code: number,
    name: string,
    type?: string,
    source?: string,
    value?: string,
  ): Promise<OptionOccurrenceDto[]> {
    const all = [
      ...(await this.findExplicitGlobalOptions(code, name, type, source)),
      ...(await this.findExplicitIpSpaceOptions(code, name, type, source)),
      ...(await this.findExplicitAddressBlockOptions(code, name, type, source)),
      ...(await this.findExplicitSubnetOptions(code, name, type, source)),
      ...(await this.findExplicitRangeOptions(code, name, type, source)),
      ...(await this.findExplicitFixedAddressOptions(code, name, type, source)),
    ];
    if (value !== undefined) {
      return all.filter((o) => o.value === value);
    }
    return all;
  }
}
