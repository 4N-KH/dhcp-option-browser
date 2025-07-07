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
import { CspOptionSpaceImportService } from './option-space-import.service';
import { CspOptionGroupDhcpOptionImportService } from './option-group-dhcp-option-import.service';

/**
 * Orchestrator for CSP DHCP imports.
 * Calls all domain import services in dependency-safe order.
 * Can be triggered as a scheduled job, on demand, or via controller.
 */
@Injectable()
export class DhcpCspImportOrchestratorService {
  private readonly logger = new Logger(DhcpCspImportOrchestratorService.name);

  constructor(
    private readonly optionSpaceImport: CspOptionSpaceImportService,
    private readonly optionCodeImport: CspOptionCodeImportService,
    private readonly optionGroupImport: CspOptionGroupImportService,
    private readonly optionGroupDhcpOptionImport: CspOptionGroupDhcpOptionImportService,
    private readonly globalConfigImport: CspGlobalConfigImportService,
    private readonly configProfileImport: CspConfigProfileImportService,
    private readonly ipSpaceImport: CspIpSpaceImportService,
    private readonly addressBlockImport: CspAddressBlockImportService,
    private readonly subnetImport: CspSubnetImportService,
    private readonly rangeImport: CspRangeImportService,
    private readonly fixedAddressImport: CspFixedAddressImportService,
  ) {}

  /**
   * Runs a full import in correct order, including error handling, logging and cancellation support.
   * Optionally accepts an onProgress callback (0...100) and an isCancelled checker.
   */
  async runFullImport(opts?: {
    onProgress?: (percent: number) => void;
    isCancelled?: () => boolean;
  }): Promise<void> {
    this.logger.log('--- Starting full CSP DHCP import sequence ---');
    const totalSteps = 11;
    let currentStep = 0;

    const checkCancel = () => {
      if (opts?.isCancelled?.()) {
        this.logger.warn('CSP DHCP import cancelled by user.');
        throw new Error('Import cancelled by user');
      }
    };

    const progress = (step: number) => {
      checkCancel();
      const percent = Math.round((step / totalSteps) * 100);
      if (opts?.onProgress) opts.onProgress(percent);
    };

    try {
      checkCancel();
      await this.optionSpaceImport.importOptionSpaces();
      progress(++currentStep);

      checkCancel();
      await this.optionCodeImport.importOptionCodes();
      progress(++currentStep);

      checkCancel();
      await this.optionGroupImport.importOptionGroups();
      progress(++currentStep);

      checkCancel();
      await this.optionGroupDhcpOptionImport.importOptionGroupDhcpOptions();
      progress(++currentStep);

      checkCancel();
      await this.globalConfigImport.importGlobalDhcpConfig();
      progress(++currentStep);

      checkCancel();
      await this.configProfileImport.importConfigProfiles();
      progress(++currentStep);

      checkCancel();
      await this.ipSpaceImport.importIpSpaces();
      progress(++currentStep);

      checkCancel();
      await this.addressBlockImport.importAddressBlocks();
      progress(++currentStep);

      checkCancel();
      await this.subnetImport.importSubnets();
      progress(++currentStep);

      checkCancel();
      await this.rangeImport.importRanges();
      progress(++currentStep);

      checkCancel();
      await this.fixedAddressImport.importFixedAddresses();
      progress(++currentStep);

      this.logger.log('--- CSP DHCP full import completed successfully ---');
      progress(totalSteps);
    } catch (error) {
      this.logger.error(
        'CSP DHCP full import failed:',
        (error as Error)?.message,
        error,
      );
      if (opts?.onProgress) opts.onProgress(100);
      throw error;
    }
  }
}
