import { Injectable, Logger, Inject } from '@nestjs/common';

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
import { EncodingSanitizer } from '@/application/services/import/transformers/encoding-sanitizer.interface';

const IMPORT_PHASES = [
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
] as const;
type ImportPhase = (typeof IMPORT_PHASES)[number];

type OrchestratorOptions = {
  isCancelled?: () => boolean;
  onProgress?: (
    percent: number,
    phase?: ImportPhase,
    sub?: { current: number; total: number },
  ) => void;
};

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
    @Inject(EncodingSanitizer)
    private readonly encodingSanitizer: EncodingSanitizer,
  ) {}

  /**
   * Runs a full import in correct order, including fine-grained error handling, progress and cancellation support.
   */
  async runFullImport(opts?: OrchestratorOptions): Promise<void> {
    this.logger.log('--- Starting full CSP DHCP import sequence ---');
    const totalPhases = IMPORT_PHASES.length;
    let currentPhase = 0;

    const checkCancel = () => {
      if (opts?.isCancelled?.()) {
        this.logger.warn('CSP DHCP import cancelled by user.');
        throw new Error('Import cancelled by user');
      }
    };

    const updatePhaseProgress = (
      phaseIndex: number,
      phase: ImportPhase,
      subProgress?: { current: number; total: number },
    ) => {
      checkCancel();
      let percent = Math.floor(
        ((phaseIndex +
          (subProgress ? subProgress.current / subProgress.total : 0)) /
          totalPhases) *
          100,
      );
      if (percent > 100) percent = 100;
      if (opts?.onProgress) opts.onProgress(percent, phase, subProgress);
    };

    try {
      // 1. Option Spaces
      checkCancel();
      await this.optionSpaceImport.importOptionSpaces({
        isCancelled: opts?.isCancelled,
        onProgress: (cur, tot) =>
          updatePhaseProgress(currentPhase, 'optionSpaces', {
            current: cur,
            total: tot,
          }),
        // encodingSanitizer: this.encodingSanitizer // Wenn Service angepasst wurde
      });
      updatePhaseProgress(++currentPhase, 'optionSpaces');

      // 2. Option Codes
      checkCancel();
      await this.optionCodeImport.importOptionCodes({
        isCancelled: opts?.isCancelled,
        onProgress: (cur, tot) =>
          updatePhaseProgress(currentPhase, 'optionCodes', {
            current: cur,
            total: tot,
          }),
        // encodingSanitizer: this.encodingSanitizer
      });
      updatePhaseProgress(++currentPhase, 'optionCodes');

      // 3. Option Groups
      checkCancel();
      await this.optionGroupImport.importOptionGroups({
        isCancelled: opts?.isCancelled,
        onProgress: (cur, tot) =>
          updatePhaseProgress(currentPhase, 'optionGroups', {
            current: cur,
            total: tot,
          }),
        // encodingSanitizer: this.encodingSanitizer
      });
      updatePhaseProgress(++currentPhase, 'optionGroups');

      // 4. OptionGroup DHCP Options
      checkCancel();
      await this.optionGroupDhcpOptionImport.importOptionGroupDhcpOptions({
        isCancelled: opts?.isCancelled,
        onProgress: (cur, tot) =>
          updatePhaseProgress(currentPhase, 'optionGroupDhcpOptions', {
            current: cur,
            total: tot,
          }),
        // encodingSanitizer: this.encodingSanitizer
      });
      updatePhaseProgress(++currentPhase, 'optionGroupDhcpOptions');

      // 5. Global Config
      checkCancel();
      await this.globalConfigImport.importGlobalDhcpConfig({
        isCancelled: opts?.isCancelled,
        onProgress: (cur, tot) =>
          updatePhaseProgress(currentPhase, 'globalConfig', {
            current: cur,
            total: tot,
          }),
        // encodingSanitizer: this.encodingSanitizer
      });
      updatePhaseProgress(++currentPhase, 'globalConfig');

      // 6. Config Profiles
      checkCancel();
      await this.configProfileImport.importConfigProfiles({
        isCancelled: opts?.isCancelled,
        onProgress: (cur, tot) =>
          updatePhaseProgress(currentPhase, 'configProfiles', {
            current: cur,
            total: tot,
          }),
        // encodingSanitizer: this.encodingSanitizer
      });
      updatePhaseProgress(++currentPhase, 'configProfiles');

      // 7. IpSpaces
      checkCancel();
      await this.ipSpaceImport.importIpSpaces({
        isCancelled: opts?.isCancelled,
        onProgress: (cur, tot) =>
          updatePhaseProgress(currentPhase, 'ipSpaces', {
            current: cur,
            total: tot,
          }),
        // encodingSanitizer: this.encodingSanitizer
      });
      updatePhaseProgress(++currentPhase, 'ipSpaces');

      // 8. AddressBlocks
      checkCancel();
      await this.addressBlockImport.importAddressBlocks({
        isCancelled: opts?.isCancelled,
        onProgress: (cur, tot) =>
          updatePhaseProgress(currentPhase, 'addressBlocks', {
            current: cur,
            total: tot,
          }),
        // encodingSanitizer: this.encodingSanitizer
      });
      updatePhaseProgress(++currentPhase, 'addressBlocks');

      // 9. Subnets
      checkCancel();
      await this.subnetImport.importSubnets({
        isCancelled: opts?.isCancelled,
        onProgress: (cur, tot) =>
          updatePhaseProgress(currentPhase, 'subnets', {
            current: cur,
            total: tot,
          }),
        // encodingSanitizer: this.encodingSanitizer
      });
      updatePhaseProgress(++currentPhase, 'subnets');

      // 10. Ranges
      checkCancel();
      await this.rangeImport.importRanges({
        isCancelled: opts?.isCancelled,
        onProgress: (cur, tot) =>
          updatePhaseProgress(currentPhase, 'ranges', {
            current: cur,
            total: tot,
          }),
        // encodingSanitizer: this.encodingSanitizer
      });
      updatePhaseProgress(++currentPhase, 'ranges');

      // 11. Fixed Addresses
      checkCancel();
      await this.fixedAddressImport.importFixedAddresses({
        isCancelled: opts?.isCancelled,
        onProgress: (cur, tot) =>
          updatePhaseProgress(currentPhase, 'fixedAddresses', {
            current: cur,
            total: tot,
          }),
        // encodingSanitizer: this.encodingSanitizer
      });
      updatePhaseProgress(++currentPhase, 'fixedAddresses');

      this.logger.log('--- CSP DHCP full import completed successfully ---');
      if (opts?.onProgress) opts.onProgress(100, 'fixedAddresses');
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
