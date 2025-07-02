// backend/src/controller/import.controller.ts

import { Controller, Get } from '@nestjs/common';
import { CspDataClient } from '@/infrastructure/api-clients/csp/data.client';
import { fetchAllPaginated } from '@/infrastructure/api-clients/csp/http-paginator.util';

@Controller('import/csp')
export class ImportRawDataController {
  constructor(private readonly dataClient: CspDataClient) {}

  @Get('subnets/raw')
  async getRawSubnets() {
    const url = this.dataClient.apiConfig.cspBaseUrl + '/ipam/subnet';
    const headers = this.dataClient.getHeaders();
    const raw = await fetchAllPaginated(
      this.dataClient.httpClient,
      url,
      headers,
    );
    return raw;
  }

  @Get('ranges/raw')
  async getRawRanges() {
    const url = this.dataClient.apiConfig.cspBaseUrl + '/ipam/range';
    const headers = this.dataClient.getHeaders();
    const raw = await fetchAllPaginated(
      this.dataClient.httpClient,
      url,
      headers,
    );
    return raw;
  }

  @Get('fixed-addresses/raw')
  async getRawFixedAddresses() {
    const url = this.dataClient.apiConfig.cspBaseUrl + '/dhcp/fixed_address';
    const headers = this.dataClient.getHeaders();
    const raw = await fetchAllPaginated(
      this.dataClient.httpClient,
      url,
      headers,
    );
    return raw;
  }

  @Get('config-profiles/raw')
  async getRawConfigProfiles() {
    const url =
      this.dataClient.apiConfig.cspBaseUrl + '/dhcp/config_profile/profiles';
    const headers = this.dataClient.getHeaders();
    const raw = await fetchAllPaginated(
      this.dataClient.httpClient,
      url,
      headers,
    );
    return raw;
  }

  @Get('option-spaces/raw')
  async getRawOptionSpaces() {
    const url = this.dataClient.apiConfig.cspBaseUrl + '/dhcp/option_space';
    const headers = this.dataClient.getHeaders();
    const raw = await fetchAllPaginated(
      this.dataClient.httpClient,
      url,
      headers,
    );
    return raw;
  }

  @Get('option-codes/raw')
  async getRawOptionCodes() {
    const url = this.dataClient.apiConfig.cspBaseUrl + '/dhcp/option_code';
    const headers = this.dataClient.getHeaders();
    const raw = await fetchAllPaginated(
      this.dataClient.httpClient,
      url,
      headers,
    );
    return raw;
  }
}
