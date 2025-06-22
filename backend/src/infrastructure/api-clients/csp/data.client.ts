import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { ApiConfigService } from '@/shared/config/api-config.service';
import { fetchAllPaginated } from './http-paginator.util';

// Zod-Schemas importieren
import { CspSubnetSchema } from '@/domain/dto/csp/zod/subnet.zod';
import { CspGlobalDhcpConfigSchema } from '@/domain/dto/csp/zod/global-dhcp-config.zod';
import { CspOptionGroupSchema } from '@/domain/dto/csp/zod/option-group.zod';
import { CspIpSpaceSchema } from '@/domain/dto/csp/zod/ip-space.zod';
import { CspAddressBlockSchema } from '@/domain/dto/csp/zod/address-block.zod';
import { CspRangeSchema } from '@/domain/dto/csp/zod/range.zod';
import { CspFixedAddressSchema } from '@/domain/dto/csp/zod/fixed-address.zod';
import { CspConfigProfileSchema } from '@/domain/dto/csp/zod/config-profile.zod';
import { CspOptionCodeSchema } from '@/domain/dto/csp/zod/option-code.zod';

// Validator-Utility importieren
import {
  validateArray,
  validateObject,
} from '@/shared/validator/zod-validator.util';

// Normalizer importieren
import { normalizeDhcpOptions } from '@/shared/parser/dhcp-option-normalizer';

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

  async fetchIpSpaces() {
    const url = `${this.config.cspBaseUrl}/ipam/ip_space`;
    const raw = await fetchAllPaginated<unknown>(this.http, url, this.headers);
    const arr = validateArray(CspIpSpaceSchema, raw);
    // Normalisieren
    return arr.map(obj => ({
      ...obj,
      dhcp_options: normalizeDhcpOptions(obj.dhcp_options),
    }));
  }

  async fetchAddressBlocks() {
    const url = `${this.config.cspBaseUrl}/ipam/address_block`;
    const raw = await fetchAllPaginated<unknown>(this.http, url, this.headers);
    const arr = validateArray(CspAddressBlockSchema, raw);
    return arr.map(obj => ({
      ...obj,
      dhcp_options: normalizeDhcpOptions(obj.dhcp_options),
    }));
  }

  async fetchSubnets() {
    const url = `${this.config.cspBaseUrl}/ipam/subnet`;
    const raw = await fetchAllPaginated<unknown>(this.http, url, this.headers);
    const arr = validateArray(CspSubnetSchema, raw);
    return arr.map(obj => ({
      ...obj,
      dhcp_options: normalizeDhcpOptions(obj.dhcp_options),
    }));
  }

  async fetchRanges() {
    const url = `${this.config.cspBaseUrl}/ipam/range`;
    const raw = await fetchAllPaginated<unknown>(this.http, url, this.headers);
    const arr = validateArray(CspRangeSchema, raw);
    return arr.map(obj => ({
      ...obj,
      dhcp_options: normalizeDhcpOptions(obj.dhcp_options),
    }));
  }

  async fetchFixedAddresses() {
    const url = `${this.config.cspBaseUrl}/dhcp/fixed_address`;
    const raw = await fetchAllPaginated<unknown>(this.http, url, this.headers);
    const arr = validateArray(CspFixedAddressSchema, raw);
    return arr.map(obj => ({
      ...obj,
      dhcp_options: normalizeDhcpOptions(obj.dhcp_options),
    }));
  }

  async fetchOptionGroups() {
    const url = `${this.config.cspBaseUrl}/dhcp/option_group`;
    const raw = await fetchAllPaginated<unknown>(this.http, url, this.headers);
    const arr = validateArray(CspOptionGroupSchema, raw);
    return arr.map(obj => ({
      ...obj,
      dhcp_options: normalizeDhcpOptions(obj.dhcp_options),
    }));
  }

  async fetchOptionGroupById(groupId: string) {
    const url = `${this.config.cspBaseUrl}/dhcp/option_group/${encodeURIComponent(groupId)}`;
    const response = await lastValueFrom(
      this.http.get<unknown>(url, { headers: this.headers }),
    );
    const obj = validateObject(CspOptionGroupSchema, response.data);
    return {
      ...obj,
      dhcp_options: normalizeDhcpOptions(obj.dhcp_options),
    };
  }

  async fetchOptionCodes() {
    const url = `${this.config.cspBaseUrl}/dhcp/option_code`;
    const raw = await fetchAllPaginated<unknown>(this.http, url, this.headers);
    return validateArray(CspOptionCodeSchema, raw);
  }

  async fetchConfigProfiles() {
    const url = `${this.config.cspBaseUrl}/dhcp/config_profile/profiles`;
    const raw = await fetchAllPaginated<unknown>(this.http, url, this.headers);
    const arr = validateArray(CspConfigProfileSchema, raw);
    return arr.map(obj => ({
      ...obj,
      dhcp_options: normalizeDhcpOptions(obj.dhcp_options),
    }));
  }

  async fetchGlobalDhcpConfig() {
    const url = `${this.config.cspBaseUrl}/dhcp/global`;
    const response = await lastValueFrom(
      this.http.get<unknown>(url, { headers: this.headers }),
    );
    const obj = validateObject(CspGlobalDhcpConfigSchema, response.data);
    return {
      ...obj,
      dhcp_options: normalizeDhcpOptions(obj.dhcp_options),
      dhcp_options_v6: normalizeDhcpOptions(obj.dhcp_options_v6),
    };
  }
}
