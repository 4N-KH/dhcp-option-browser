import { CspSubnetDto } from '@/domain/dto/csp/subnet.dto';

type NormalisedDhcpOption = {
  option_code: string;
  option_value: string;
  type: string;
  group?: string | null;
};

export function normaliseSubnet(raw: unknown): CspSubnetDto | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;

  const dhcp_options: NormalisedDhcpOption[] = Array.isArray(o.dhcp_options)
    ? o.dhcp_options
        .map((opt): NormalisedDhcpOption | null => {
          if (typeof opt !== 'object' || opt === null) return null;
          const op = opt as Record<string, unknown>;
          return {
            option_code:
              typeof op.option_code === 'string' ? op.option_code : '',
            option_value:
              typeof op.option_value === 'string' ? op.option_value : '',
            type: typeof op.type === 'string' ? op.type : '',
            group: typeof op.group === 'string' ? op.group : null,
          };
        })
        .filter((v): v is NormalisedDhcpOption => v !== null)
    : [];

  return {
    id: typeof o.id === 'string' ? o.id : '',
    name: typeof o.name === 'string' ? o.name : '',
    address: typeof o.address === 'string' ? o.address : '',
    cidr: typeof o.cidr === 'number' ? o.cidr : 0,
    comment: typeof o.comment === 'string' ? o.comment : null,
    parent: typeof o.parent === 'string' ? o.parent : null,
    space: typeof o.space === 'string' ? o.space : null,
    dhcp_options,
  };
}
