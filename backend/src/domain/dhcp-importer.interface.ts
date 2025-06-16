import { ParsedDhcpOption } from './parsed-option.interface';

export interface DhcpImporter {
  fetchOptions(): Promise<ParsedDhcpOption[]>;
}
