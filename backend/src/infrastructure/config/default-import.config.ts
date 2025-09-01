import { ImportConfigPort } from '@/domain/ports/import-config.port';

export class DefaultImportConfig implements ImportConfigPort {
  maxRuntimeMs = 30 * 60 * 1000;
  phases = [
    'optionSpaces',
    'optionCodes',
    'optionGroups',
    'optionGroupDhcpOptions',
    'globalConfig',
    'configProfiles',
    'ipSpaces',
    'addressBlocks',
    'subnets',
    'ranges',
    'fixedAddresses',
  ];
}
