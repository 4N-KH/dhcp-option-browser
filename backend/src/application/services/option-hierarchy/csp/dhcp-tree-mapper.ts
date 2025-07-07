// src/application/services/dhcp/csp-dhcp-tree-mapper.ts

import {
  GlobalDhcpConfigTreeDto,
  IpSpaceTreeDto,
  AddressBlockTreeDto,
  SubnetTreeDto,
  RangeTreeDto,
  FixedAddressDto,
  DhcpOptionDto,
  OptionGroupDto,
  ExclusionRangeDto,
} from '@/domain/dto/csp/dhcp-tree.dto';
import { DhcpGlobalConfig } from '@/infrastructure/database/csp/global-config.entity';
import { DhcpGlobalConfigOption } from '@/infrastructure/database/csp/global-config-option.entity';
import { DhcpGlobalConfigOptionGroup } from '@/infrastructure/database/csp/global-config-option-group.entity';
import { IpSpace } from '@/infrastructure/database/csp/ip-space.entity';
import { IpSpaceDhcpOption } from '@/infrastructure/database/csp/ip-space-dhcp-option.entity';
import { IpSpaceOptionGroup } from '@/infrastructure/database/csp/ip-space-option-group.entity';
import { AddressBlock } from '@/infrastructure/database/csp/adress-block.entity';
import { AddressBlockDhcpOption } from '@/infrastructure/database/csp/address-block-dhcp-option.entity';
import { AddressBlockOptionGroup } from '@/infrastructure/database/csp/address-block-option-group.entity';
import { Subnet } from '@/infrastructure/database/csp/subnet.entity';
import { SubnetDhcpOption } from '@/infrastructure/database/csp/subnet-dhcp-option.entity';
import { SubnetOptionGroup } from '@/infrastructure/database/csp/subnet-option-group.entity';
import { Range } from '@/infrastructure/database/csp/range.entity';
import { RangeDhcpOption } from '@/infrastructure/database/csp/range-dhcp-option.entity';
import { RangeOptionGroup } from '@/infrastructure/database/csp/range-option-group.entity';
import { RangeExclusion } from '@/infrastructure/database/csp/range-exclusion.entity';
import { FixedAddress } from '@/infrastructure/database/csp/fixed-address.entity';
import { FixedDhcpOption } from '@/infrastructure/database/csp/fixed-dhcp-option.entity';
import { FixedAddressOptionGroup } from '@/infrastructure/database/csp/fixed-address-option-group.entity';
import { OptionGroup } from '@/infrastructure/database/csp/option-group.entity';

// --- GLOBAL CONFIGURATION ---
export function mapGlobalConfigToDto(
  globalConfig: DhcpGlobalConfig | null | undefined,
  ipSpaces: (IpSpace & {
    subnets?: (Subnet & {
      ranges?: (Range & {
        fixedAddresses?: (FixedAddress & {
          dhcpOptions?: FixedDhcpOption[];
          optionGroups?: FixedAddressOptionGroup[];
        })[];
        exclusionRanges?: RangeExclusion[];
      })[];
      fixedAddresses?: (FixedAddress & {
        dhcpOptions?: FixedDhcpOption[];
        optionGroups?: FixedAddressOptionGroup[];
      })[];
    })[];
    addressBlocks?: (AddressBlock & {
      children?: AddressBlock[];
      subnets?: (Subnet & {
        ranges?: (Range & {
          fixedAddresses?: (FixedAddress & {
            dhcpOptions?: FixedDhcpOption[];
            optionGroups?: FixedAddressOptionGroup[];
          })[];
          exclusionRanges?: RangeExclusion[];
        })[];
        fixedAddresses?: (FixedAddress & {
          dhcpOptions?: FixedDhcpOption[];
          optionGroups?: FixedAddressOptionGroup[];
        })[];
      })[];
    })[];
  })[],
): GlobalDhcpConfigTreeDto {
  return {
    id: globalConfig?.id ?? 0,
    comment: globalConfig?.comment ?? null,
    dhcpOptions: Array.isArray(globalConfig?.dhcpOptions)
      ? globalConfig.dhcpOptions.map(mapGlobalConfigDhcpOptionToDto)
      : [],
    optionGroups: Array.isArray(globalConfig?.optionGroups)
      ? globalConfig.optionGroups.map(mapGlobalConfigOptionGroupToDto)
      : [],
    ipSpaces: Array.isArray(ipSpaces) ? ipSpaces.map(mapIpSpaceToDto) : [],
  };
}

// --- IP SPACE ---
export function mapIpSpaceToDto(
  ipSpace: IpSpace & {
    subnets?: (Subnet & {
      ranges?: (Range & {
        fixedAddresses?: (FixedAddress & {
          dhcpOptions?: FixedDhcpOption[];
          optionGroups?: FixedAddressOptionGroup[];
        })[];
        exclusionRanges?: RangeExclusion[];
      })[];
      fixedAddresses?: (FixedAddress & {
        dhcpOptions?: FixedDhcpOption[];
        optionGroups?: FixedAddressOptionGroup[];
      })[];
    })[];
    addressBlocks?: (AddressBlock & {
      children?: AddressBlock[];
      subnets?: (Subnet & {
        ranges?: (Range & {
          fixedAddresses?: (FixedAddress & {
            dhcpOptions?: FixedDhcpOption[];
            optionGroups?: FixedAddressOptionGroup[];
          })[];
          exclusionRanges?: RangeExclusion[];
        })[];
        fixedAddresses?: (FixedAddress & {
          dhcpOptions?: FixedDhcpOption[];
          optionGroups?: FixedAddressOptionGroup[];
        })[];
      })[];
    })[];
  },
): IpSpaceTreeDto {
  return {
    id: ipSpace.id,
    externalId: ipSpace.externalId,
    name: ipSpace.name,
    comment: ipSpace.comment ?? null,
    dhcpOptions: Array.isArray(ipSpace.dhcpOptions)
      ? ipSpace.dhcpOptions.map(mapIpSpaceDhcpOptionToDto)
      : [],
    optionGroups: Array.isArray(ipSpace.optionGroups)
      ? ipSpace.optionGroups.map(mapIpSpaceOptionGroupToDto)
      : [],
    addressBlocks: Array.isArray(ipSpace.addressBlocks)
      ? ipSpace.addressBlocks.map(mapAddressBlockToDto)
      : [],
    subnets: Array.isArray(ipSpace.subnets)
      ? ipSpace.subnets.map(mapSubnetToDto)
      : [],
  };
}

// --- ADDRESS BLOCK ---
export function mapAddressBlockToDto(
  addressBlock: AddressBlock & {
    children?: (AddressBlock & {
      children?: AddressBlock[];
      subnets?: (Subnet & {
        ranges?: (Range & {
          fixedAddresses?: (FixedAddress & {
            dhcpOptions?: FixedDhcpOption[];
            optionGroups?: FixedAddressOptionGroup[];
          })[];
          exclusionRanges?: RangeExclusion[];
        })[];
        fixedAddresses?: (FixedAddress & {
          dhcpOptions?: FixedDhcpOption[];
          optionGroups?: FixedAddressOptionGroup[];
        })[];
      })[];
    })[];
    subnets?: (Subnet & {
      ranges?: (Range & {
        fixedAddresses?: (FixedAddress & {
          dhcpOptions?: FixedDhcpOption[];
          optionGroups?: FixedAddressOptionGroup[];
        })[];
        exclusionRanges?: RangeExclusion[];
      })[];
      fixedAddresses?: (FixedAddress & {
        dhcpOptions?: FixedDhcpOption[];
        optionGroups?: FixedAddressOptionGroup[];
      })[];
    })[];
  },
): AddressBlockTreeDto {
  return {
    id: addressBlock.id,
    externalId: addressBlock.externalId,
    name: addressBlock.name,
    address: addressBlock.address,
    cidr: addressBlock.cidr,
    comment: addressBlock.comment ?? null,
    parentId: addressBlock.parentId ?? null,
    ipSpaceId: addressBlock.ipSpaceId ?? null,
    dhcpOptions: Array.isArray(addressBlock.dhcpOptions)
      ? addressBlock.dhcpOptions.map(mapAddressBlockDhcpOptionToDto)
      : [],
    optionGroups: Array.isArray(addressBlock.optionGroups)
      ? addressBlock.optionGroups.map(mapAddressBlockOptionGroupToDto)
      : [],
    children: Array.isArray(addressBlock.children)
      ? addressBlock.children.map(mapAddressBlockToDto)
      : [],
    subnets: Array.isArray(addressBlock.subnets)
      ? addressBlock.subnets.map(mapSubnetToDto)
      : [],
  };
}

// --- SUBNET ---
export function mapSubnetToDto(
  subnet: Subnet & {
    ranges?: (Range & {
      fixedAddresses?: (FixedAddress & {
        dhcpOptions?: FixedDhcpOption[];
        optionGroups?: FixedAddressOptionGroup[];
      })[];
      exclusionRanges?: RangeExclusion[];
    })[];
    fixedAddresses?: (FixedAddress & {
      dhcpOptions?: FixedDhcpOption[];
      optionGroups?: FixedAddressOptionGroup[];
    })[];
  },
): SubnetTreeDto {
  return {
    id: subnet.id,
    externalId: subnet.externalId,
    name: subnet.name,
    address: subnet.address,
    cidr: subnet.cidr,
    comment: subnet.comment ?? null,
    addressBlockId: subnet.addressBlockId ?? null,
    spaceId: subnet.spaceId ?? null,
    dhcpOptions: Array.isArray(subnet.dhcpOptions)
      ? subnet.dhcpOptions.map(mapSubnetDhcpOptionToDto)
      : [],
    optionGroups: Array.isArray(subnet.optionGroups)
      ? subnet.optionGroups.map(mapSubnetOptionGroupToDto)
      : [],
    ranges: Array.isArray(subnet.ranges)
      ? subnet.ranges.map(mapRangeToDto)
      : [],
    fixedAddresses: Array.isArray(subnet.fixedAddresses)
      ? subnet.fixedAddresses.map(mapFixedAddressToDto)
      : [],
  };
}

// --- RANGE ---
export function mapRangeToDto(
  range: Range & {
    fixedAddresses?: (FixedAddress & {
      dhcpOptions?: FixedDhcpOption[];
      optionGroups?: FixedAddressOptionGroup[];
    })[];
    exclusionRanges?: RangeExclusion[];
  },
): RangeTreeDto {
  return {
    id: range.id,
    externalId: range.externalId,
    name: range.name,
    start: range.start,
    end: range.end,
    comment: range.comment ?? null,
    subnetId: range.subnetId,
    dhcpOptions: Array.isArray(range.dhcpOptions)
      ? range.dhcpOptions.map(mapRangeDhcpOptionToDto)
      : [],
    optionGroups: Array.isArray(range.optionGroups)
      ? range.optionGroups.map(mapRangeOptionGroupToDto)
      : [],
    exclusionRanges: Array.isArray(range.exclusionRanges)
      ? range.exclusionRanges.map(mapExclusionRangeToDto)
      : [],
    fixedAddresses: Array.isArray(range.fixedAddresses)
      ? range.fixedAddresses.map(mapFixedAddressToDto)
      : [],
  };
}

// --- FIXED ADDRESS ---
export function mapFixedAddressToDto(
  fa: FixedAddress & {
    dhcpOptions?: FixedDhcpOption[];
    optionGroups?: FixedAddressOptionGroup[];
  },
): FixedAddressDto {
  return {
    id: fa.id,
    externalId: fa.externalId,
    name: fa.name,
    address: fa.address,
    match_type: fa.match_type,
    match_value: fa.match_value,
    comment: fa.comment ?? null,
    subnetId: fa.subnetId ?? null,
    rangeId: fa.rangeId ?? null,
    dhcpOptions: Array.isArray(fa.dhcpOptions)
      ? fa.dhcpOptions.map(mapFixedDhcpOptionToDto)
      : [],
    optionGroups: Array.isArray(fa.optionGroups)
      ? fa.optionGroups.map(mapFixedAddressOptionGroupToDto)
      : [],
  };
}

// --- OPTION-MAPPER für jede Ebene (Join-Entity als Argument) ---

function mapGlobalConfigDhcpOptionToDto(
  opt: DhcpGlobalConfigOption,
): DhcpOptionDto {
  return {
    id: opt.id,
    option_code: opt.option_code,
    option_value: opt.option_value,
    type: opt.type,
    optionCodeId: opt.optionCodeId ?? null,
    optionSpaceId: opt.optionSpaceId ?? null,
  };
}
function mapGlobalConfigOptionGroupToDto(
  og: DhcpGlobalConfigOptionGroup,
): OptionGroupDto {
  return mapOptionGroupToDto(og.optionGroup);
}
function mapIpSpaceDhcpOptionToDto(opt: IpSpaceDhcpOption): DhcpOptionDto {
  return {
    id: opt.id,
    option_code: opt.option_code,
    option_value: opt.option_value,
    type: opt.type ?? '',
    optionCodeId: opt.optionCodeId ?? null,
    optionSpaceId: opt.optionSpaceId ?? null,
  };
}
function mapIpSpaceOptionGroupToDto(og: IpSpaceOptionGroup): OptionGroupDto {
  return mapOptionGroupToDto(og.optionGroup);
}
function mapAddressBlockDhcpOptionToDto(
  opt: AddressBlockDhcpOption,
): DhcpOptionDto {
  return {
    id: opt.id,
    option_code: opt.option_code,
    option_value: opt.option_value,
    type: opt.type,
    optionCodeId: opt.optionCodeId ?? null,
    optionSpaceId: opt.optionSpaceId ?? null,
  };
}
function mapAddressBlockOptionGroupToDto(
  og: AddressBlockOptionGroup,
): OptionGroupDto {
  return mapOptionGroupToDto(og.optionGroup);
}
function mapSubnetDhcpOptionToDto(opt: SubnetDhcpOption): DhcpOptionDto {
  return {
    id: opt.id,
    option_code: opt.option_code,
    option_value: opt.option_value,
    type: opt.type,
    optionCodeId: opt.optionCodeId ?? null,
    optionSpaceId: opt.optionSpaceId ?? null,
  };
}
function mapSubnetOptionGroupToDto(og: SubnetOptionGroup): OptionGroupDto {
  return mapOptionGroupToDto(og.optionGroup);
}
function mapRangeDhcpOptionToDto(opt: RangeDhcpOption): DhcpOptionDto {
  return {
    id: opt.id,
    option_code: opt.option_code,
    option_value: opt.option_value,
    type: opt.type,
    optionCodeId: opt.optionCodeId ?? null,
    optionSpaceId: opt.optionSpaceId ?? null,
  };
}
function mapRangeOptionGroupToDto(og: RangeOptionGroup): OptionGroupDto {
  return mapOptionGroupToDto(og.optionGroup);
}
function mapFixedDhcpOptionToDto(opt: FixedDhcpOption): DhcpOptionDto {
  return {
    id: opt.id,
    option_code: opt.option_code,
    option_value: opt.option_value,
    type: opt.type,
    optionCodeId: opt.optionCodeId ?? null,
    optionSpaceId: opt.optionSpaceId ?? null,
  };
}
function mapFixedAddressOptionGroupToDto(
  og: FixedAddressOptionGroup,
): OptionGroupDto {
  return mapOptionGroupToDto(og.optionGroup);
}

// --- OPTION GROUP universal ---
function mapOptionGroupToDto(og: OptionGroup): OptionGroupDto {
  return {
    id: og.id,
    externalId: og.externalId,
    name: og.name,
    comment: og.comment ?? null,
    protocol: og.protocol ?? null,
  };
}

// --- EXCLUSION RANGE ---
function mapExclusionRangeToDto(er: RangeExclusion): ExclusionRangeDto {
  return {
    id: er.id,
    start: er.start,
    end: er.end,
    comment: er.comment ?? null,
  };
}
