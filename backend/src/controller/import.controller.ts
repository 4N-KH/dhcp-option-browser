import { Controller, Get } from '@nestjs/common';
import { CspDataClient } from '@/infrastructure/api-clients/csp/data.client';
import { fetchAllPaginated } from '@/infrastructure/api-clients/csp/http-paginator.util';

@Controller('import/csp')
export class ImportController {
  constructor(private readonly dataClient: CspDataClient) {}

  @Get('subnets/raw')
  async getRawSubnets() {
    const url = this.dataClient.apiConfig.cspBaseUrl + '/ipam/subnet';
    const headers = this.dataClient.getHeaders();
    return fetchAllPaginated(this.dataClient.httpClient, url, headers);
  }

  @Get('ranges/raw')
  async getRawRanges() {
    const url = this.dataClient.apiConfig.cspBaseUrl + '/ipam/range';
    const headers = this.dataClient.getHeaders();
    return fetchAllPaginated(this.dataClient.httpClient, url, headers);
  }

  @Get('fixed-addresses/raw')
  async getRawFixedAddresses() {
    const url = this.dataClient.apiConfig.cspBaseUrl + '/dhcp/fixed_address';
    const headers = this.dataClient.getHeaders();
    return fetchAllPaginated(this.dataClient.httpClient, url, headers);
  }

  @Get('config-profiles/raw')
  async getRawConfigProfiles() {
    const url =
      this.dataClient.apiConfig.cspBaseUrl + '/dhcp/config_profile/profiles';
    const headers = this.dataClient.getHeaders();
    return fetchAllPaginated(this.dataClient.httpClient, url, headers);
  }
}
