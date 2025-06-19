import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

import { ApiConfigService } from '@/shared/config/api-config.service';
import { fetchAllPaginated } from './http-paginator.util';

import { CspSubnetDto } from '@/domain/dto/csp/subnet.dto';
import { CspGlobalDhcpConfigDto } from '@/domain/dto/csp/global-dhcp-config.dto';
import { CspOptionGroupDto } from '@/domain/dto/csp/option-group.dto';
import { CspIpSpaceDto } from '@/domain/dto/csp/ip-space.dto';
import { CspAddressBlockDto } from '@/domain/dto/csp/address-block.dto';
import { CspRangeDto } from '@/domain/dto/csp/range.dto';
import { CspFixedAddressDto } from '@/domain/dto/csp/fixed-address.dto';
import { CspConfigProfileDto } from '@/domain/dto/csp/config-profile.dto';
import { CspOptionCodeDto } from '@/domain/dto/csp/option-code.dto';

@Injectable()
export class CspDataClient {
  constructor(
    private readonly http: HttpService,
    private readonly config: ApiConfigService,
  ) {}

  private get headers(): Record<string, string> {
    return {
      Authorization: `Token ${this.config.cspApiKey}`,
      Accept: 'application/json',
    };
  }

  // IP Spaces
  async fetchIpSpaces(): Promise<CspIpSpaceDto[]> {
    const url = `${this.config.cspBaseUrl}/ipam/ip_space`;
    return fetchAllPaginated<CspIpSpaceDto>(this.http, url, this.headers);
  }

  // Address Blocks
  async fetchAddressBlocks(): Promise<CspAddressBlockDto[]> {
    const url = `${this.config.cspBaseUrl}/ipam/address_block`;
    return fetchAllPaginated<CspAddressBlockDto>(this.http, url, this.headers);
  }

  // Subnets
  async fetchSubnets(): Promise<CspSubnetDto[]> {
    const url = `${this.config.cspBaseUrl}/ipam/subnet`;
    return fetchAllPaginated<CspSubnetDto>(this.http, url, this.headers);
  }

  // Ranges
  async fetchRanges(): Promise<CspRangeDto[]> {
    const url = `${this.config.cspBaseUrl}/ipam/range`;
    return fetchAllPaginated<CspRangeDto>(this.http, url, this.headers);
  }

  // Fixed Addresses
  async fetchFixedAddresses(): Promise<CspFixedAddressDto[]> {
    const url = `${this.config.cspBaseUrl}/dhcp/fixed_address`;
    return fetchAllPaginated<CspFixedAddressDto>(this.http, url, this.headers);
  }

  // Option Groups
  async fetchOptionGroups(): Promise<CspOptionGroupDto[]> {
    const url = `${this.config.cspBaseUrl}/dhcp/option_group`;
    return fetchAllPaginated<CspOptionGroupDto>(this.http, url, this.headers);
  }

  // Option Group by ID
  async fetchOptionGroupById(groupId: string): Promise<CspOptionGroupDto> {
    const url = `${this.config.cspBaseUrl}/dhcp/option_group/${encodeURIComponent(groupId)}`;
    const response = await lastValueFrom(
      this.http.get<CspOptionGroupDto>(url, { headers: this.headers }),
    );
    return response.data;
  }

  // Option Codes
  async fetchOptionCodes(): Promise<CspOptionCodeDto[]> {
    const url = `${this.config.cspBaseUrl}/dhcp/option_code`;
    return fetchAllPaginated<CspOptionCodeDto>(this.http, url, this.headers);
  }

  // Config Profiles
  async fetchConfigProfiles(): Promise<CspConfigProfileDto[]> {
    const url = `${this.config.cspBaseUrl}/dhcp/config_profile/profiles`;
    return fetchAllPaginated<CspConfigProfileDto>(this.http, url, this.headers);
  }

  // Global DHCP Config
  async fetchGlobalDhcpConfig(): Promise<CspGlobalDhcpConfigDto> {
    const url = `${this.config.cspBaseUrl}/dhcp/global`;
    const response = await lastValueFrom(
      this.http.get<CspGlobalDhcpConfigDto>(url, {
        headers: this.headers,
      }),
    );
    return response.data;
  }
}
