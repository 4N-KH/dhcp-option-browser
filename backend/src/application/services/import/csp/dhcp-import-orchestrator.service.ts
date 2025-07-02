import { Injectable, Logger } from '@nestjs/common';

import { CspGlobalConfigImportService } from './global-config-import.service';
import { CspConfigProfileImportService } from './config-profile-import.service';
import { CspIpSpaceImportService } from './ip-space-import.service';
import { CspAddressBlockImportService } from './address-block-import.service';
import { CspSubnetImportService } from './subnet-import.service';
import { CspRangeImportService } from './range-import.service';
import { CspFixedAddressImportService } from './fixed-address-import.service';
import { CspOptionGroupImportService } from './option-group-import.service';
import { CspOptionCodeImportService } from './option-code-import.service';

/**
 * Orchestrator for CSP DHCP imports.
 * Calls all domain import services in dependency-safe order.
 * Can be triggered as a scheduled job, on demand, or via controller.
 */
@Injectable()
export class DhcpCspImportOrchestratorService {
  private readonly logger = new Logger(DhcpCspImportOrchestratorService.name);

  constructor(
    private readonly optionCodeImport: CspOptionCodeImportService,
    private readonly optionGroupImport: CspOptionGroupImportService,
    private readonly globalConfigImport: CspGlobalConfigImportService,
    private readonly configProfileImport: CspConfigProfileImportService,
    private readonly ipSpaceImport: CspIpSpaceImportService,
    private readonly addressBlockImport: CspAddressBlockImportService,
    private readonly subnetImport: CspSubnetImportService,
    private readonly rangeImport: CspRangeImportService,
    private readonly fixedAddressImport: CspFixedAddressImportService,
  ) {}

  /**
   * Runs a full import in correct order, including error handling & logging.
   */
  async runFullImport(): Promise<void> {
    this.logger.log('--- Starting full CSP DHCP import sequence ---');
    try {
      await this.optionCodeImport.importOptionCodes();
      await this.optionGroupImport.importOptionGroups();
      await this.globalConfigImport.importGlobalDhcpConfig();
      await this.configProfileImport.importConfigProfiles();
      await this.ipSpaceImport.importIpSpaces();
      await this.addressBlockImport.importAddressBlocks();
      await this.subnetImport.importSubnets();
      await this.rangeImport.importRanges();
      await this.fixedAddressImport.importFixedAddresses();

      this.logger.log('--- CSP DHCP full import completed successfully ---');
    } catch (error) {
      this.logger.error('CSP DHCP full import failed:', (error as Error)?.message, error);
      throw error;
    }
  }
}
