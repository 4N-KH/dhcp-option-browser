// backend/src/controller/import.controller.ts

import { Controller, Get } from '@nestjs/common';
import { DhcpCspImportOrchestratorService } from '@/application/services/import/csp/dhcp-import-orchestrator.service';
import { CspSubnetImportService } from '@/application/services/import/csp/subnet-import.service';
import { CspOptionGroupImportService } from '@/application/services/import/csp/option-group-import.service';
import { CspIpSpaceImportService } from '@/application/services/import/csp/ip-space-import.service';
import { CspAddressBlockImportService } from '@/application/services/import/csp/address-block-import.service';
import { CspRangeImportService } from '@/application/services/import/csp/range-import.service';
import { CspFixedAddressImportService } from '@/application/services/import/csp/fixed-address-import.service';
import { CspGlobalConfigImportService } from '@/application/services/import/csp/global-config-import.service';
import { CspConfigProfileImportService } from '@/application/services/import/csp/config-profile-import.service';
import { CspOptionCodeImportService } from '@/application/services/import/csp/option-code-import.service';

@Controller('import')
export class ImportController {
  constructor(
    private readonly orchestrator: DhcpCspImportOrchestratorService,
    private readonly subnetImport: CspSubnetImportService,
    private readonly optionGroupImport: CspOptionGroupImportService,
    private readonly ipSpaceImport: CspIpSpaceImportService,
    private readonly addressBlockImport: CspAddressBlockImportService,
    private readonly rangeImport: CspRangeImportService,
    private readonly fixedAddressImport: CspFixedAddressImportService,
    private readonly globalConfigImport: CspGlobalConfigImportService,
    private readonly configProfileImport: CspConfigProfileImportService,
    private readonly optionCodeImport: CspOptionCodeImportService,
  ) {}

  @Get('csp/all')
  async importAllCsp(): Promise<{ success: boolean; message: string }> {
    await this.orchestrator.runFullImport();
    return { success: true, message: 'Full CSP DHCP import completed' };
  }

  @Get('csp/subnets')
  async importSubnets(): Promise<{ success: boolean; message: string }> {
    await this.subnetImport.importSubnets();
    return { success: true, message: 'CSP Subnet import completed' };
  }

  @Get('csp/option-groups')
  async importOptionGroups(): Promise<{ success: boolean; message: string }> {
    await this.optionGroupImport.importOptionGroups();
    return { success: true, message: 'CSP Option Group import completed' };
  }

  @Get('csp/ip-spaces')
  async importIpSpaces(): Promise<{ success: boolean; message: string }> {
    await this.ipSpaceImport.importIpSpaces();
    return { success: true, message: 'CSP IP Space import completed' };
  }

  @Get('csp/address-blocks')
  async importAddressBlocks(): Promise<{ success: boolean; message: string }> {
    await this.addressBlockImport.importAddressBlocks();
    return { success: true, message: 'CSP Address Block import completed' };
  }

  @Get('csp/ranges')
  async importRanges(): Promise<{ success: boolean; message: string }> {
    await this.rangeImport.importRanges();
    return { success: true, message: 'CSP Range import completed' };
  }

  @Get('csp/fixed-addresses')
  async importFixedAddresses(): Promise<{ success: boolean; message: string }> {
    await this.fixedAddressImport.importFixedAddresses();
    return { success: true, message: 'CSP Fixed Address import completed' };
  }

  @Get('csp/global-config')
  async importGlobalConfig(): Promise<{ success: boolean; message: string }> {
    await this.globalConfigImport.importGlobalDhcpConfig();
    return {
      success: true,
      message: 'CSP Global DHCP Config import completed',
    };
  }

  @Get('csp/config-profiles')
  async importConfigProfiles(): Promise<{ success: boolean; message: string }> {
    await this.configProfileImport.importConfigProfiles();
    return { success: true, message: 'CSP Config Profile import completed' };
  }

  @Get('csp/option-codes')
  async importOptionCodes(): Promise<{ success: boolean; message: string }> {
    await this.optionCodeImport.importOptionCodes();
    return { success: true, message: 'CSP Option Codes import completed' };
  }
}
