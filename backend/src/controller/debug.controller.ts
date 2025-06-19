import { Controller, Get, Param } from '@nestjs/common';
import { CspDataClient } from '@/infrastructure/api-clients/csp-data.client';

@Controller('debug/csp')
export class DebugController {
  constructor(private readonly csp: CspDataClient) {}

  @Get('ip-spaces')
  async getIpSpaces() {
    return this.csp.fetchIpSpaces();
  }

  @Get('address-blocks')
  async getAddressBlocks() {
    return this.csp.fetchAddressBlocks();
  }

  @Get('subnets')
  async getSubnets() {
    return this.csp.fetchSubnets();
  }

  @Get('ranges')
  async getRanges() {
    return this.csp.fetchRanges();
  }

  @Get('fixed-addresses')
  async getFixedAddresses() {
    return this.csp.fetchFixedAddresses();
  }

  @Get('option-groups')
  async getOptionGroups() {
    return this.csp.fetchOptionGroups();
  }

  @Get('option-group/:id')
  async getOptionGroupById(@Param('id') id: string) {
    return this.csp.fetchOptionGroupById(id);
  }

  @Get('option-codes')
  async getOptionCodes() {
    return this.csp.fetchOptionCodes();
  }

  @Get('config-profiles')
  async getConfigProfiles() {
    return this.csp.fetchConfigProfiles();
  }

  @Get('global-dhcp-config')
  async getGlobalDhcpConfig() {
    return this.csp.fetchGlobalDhcpConfig();
  }
}
