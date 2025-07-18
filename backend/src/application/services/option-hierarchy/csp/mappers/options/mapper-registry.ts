import { mapGlobalConfigDhcpOptionToEffectiveDto } from './global-config-dhcp-option.mapper';
import { mapIpSpaceDhcpOptionToEffectiveDto } from './ip-space-dhcp-option.mapper';
import { mapAddressBlockDhcpOptionToEffectiveDto } from './address-block-dhcp-option.mapper';
import { mapSubnetDhcpOptionToEffectiveDto } from './subnet-dhcp-option.mapper';
import { mapRangeDhcpOptionToEffectiveDto } from './range-dhcp-option.mapper';
import { mapFixedDhcpOptionToEffectiveDto } from './fixed-dhcp-option.mapper';

import { EffectiveDhcpOptionDto } from '@/domain/dto/csp/effective-dhcp-option.dto';

type OptionMapper = (opt: any) => EffectiveDhcpOptionDto;

export function getMapperForType(type: string): OptionMapper {
  switch (type) {
    case 'global':
      return mapGlobalConfigDhcpOptionToEffectiveDto as OptionMapper;
    case 'ipSpace':
      return mapIpSpaceDhcpOptionToEffectiveDto as OptionMapper;
    case 'addressBlock':
      return mapAddressBlockDhcpOptionToEffectiveDto as OptionMapper;
    case 'subnet':
      return mapSubnetDhcpOptionToEffectiveDto as OptionMapper;
    case 'range':
      return mapRangeDhcpOptionToEffectiveDto as OptionMapper;
    case 'fixedAddress':
      return mapFixedDhcpOptionToEffectiveDto as OptionMapper;
    default:
      throw new Error(`No mapper for type: ${type}`);
  }
}
