import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { ApiConfigService } from '@/shared/config/api-config.service';
import { fetchAllPaginated } from './http-paginator.util';

// Zod schemas
import { CspSubnetSchema } from '@/domain/dto/csp/zod/subnet.zod';
import { CspGlobalDhcpConfigSchema } from '@/domain/dto/csp/zod/global-dhcp-config.zod';
import { CspOptionGroupSchema } from '@/domain/dto/csp/zod/option-group.zod';
import { CspIpSpaceSchema } from '@/domain/dto/csp/zod/ip-space.zod';
import { CspAddressBlockSchema } from '@/domain/dto/csp/zod/address-block.zod';
import { CspRangeSchema } from '@/domain/dto/csp/zod/range.zod';
import { CspFixedAddressSchema } from '@/domain/dto/csp/zod/fixed-address.zod';
import { CspConfigProfileSchema } from '@/domain/dto/csp/zod/config-profile.zod';
import { CspOptionCodeSchema } from '@/domain/dto/csp/zod/option-code.zod';
import { CspOptionSpaceSchema } from '@/domain/dto/csp/zod/option-space.zod';
import { CspOptionFilterSchema } from '@/domain/dto/csp/zod/option-filter.zod';

import {
  validateArray,
  validateObject,
} from '@/shared/validator/zod-validator.util';

import { normalizeAddressBlockDtos } from '@/shared/parser/normalize-address-block-dtos';

// Helper: Type guard for paginated API responses with a results array
function hasResultsArray(obj: unknown): obj is { results: unknown[] } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    Array.isArray((obj as { results?: unknown }).results)
  );
}

// Robust error extractor (type safe, no ESLint errors)
function extractErrorMessage(e: unknown): string {
  if (
    typeof e === 'object' &&
    e !== null &&
    Object.prototype.hasOwnProperty.call(e, 'message')
  ) {
    const msg = (e as { message?: unknown }).message;
    if (typeof msg === 'string') {
      return msg;
    }
  }
  if (typeof e === 'string') {
    return e;
  }
  return 'Unknown error';
}

@Injectable()
export class CspDataClient {
  private readonly logger = new Logger(CspDataClient.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ApiConfigService,
  ) {}

  get httpClient(): HttpService {
    return this.http;
  }
  get apiConfig(): ApiConfigService {
    return this.config;
  }
  getHeaders(): Record<string, string> {
    return {
      Authorization: `Token ${this.config.cspApiKey}`,
      Accept: 'application/json',
    };
  }

  // Default page size for production – can be overridden per call
  private readonly defaultPageSize = 100;

  async fetchIpSpaces(
    pageSize = this.defaultPageSize,
    onProgress?: (percent: number) => void,
    isCancelled?: () => boolean,
  ) {
    const url = `${this.config.cspBaseUrl}/ipam/ip_space`;
    const raw = await fetchAllPaginated<unknown>(
      this.http,
      url,
      this.getHeaders(),
      pageSize,
      onProgress,
      isCancelled,
    );
    return validateArray(CspIpSpaceSchema, raw);
  }

  async fetchAddressBlocks(
    pageSize = this.defaultPageSize,
    onProgress?: (percent: number) => void,
    isCancelled?: () => boolean,
  ) {
    const url = `${this.config.cspBaseUrl}/ipam/address_block`;
    const raw = await fetchAllPaginated<unknown>(
      this.http,
      url,
      this.getHeaders(),
      pageSize,
      onProgress,
      isCancelled,
    );
    // Always normalize, then validate
    const normalized = normalizeAddressBlockDtos(raw);
    return validateArray(CspAddressBlockSchema, normalized);
  }

  async fetchSubnets(
    pageSize = this.defaultPageSize,
    onProgress?: (percent: number) => void,
    isCancelled?: () => boolean,
  ) {
    const url = `${this.config.cspBaseUrl}/ipam/subnet`;
    const raw = await fetchAllPaginated<unknown>(
      this.http,
      url,
      this.getHeaders(),
      pageSize,
      onProgress,
      isCancelled,
    );
    return validateArray(CspSubnetSchema, raw);
  }

  async fetchRanges(
    pageSize = this.defaultPageSize,
    onProgress?: (percent: number) => void,
    isCancelled?: () => boolean,
  ) {
    const url = `${this.config.cspBaseUrl}/ipam/range`;
    const raw = await fetchAllPaginated<unknown>(
      this.http,
      url,
      this.getHeaders(),
      pageSize,
      onProgress,
      isCancelled,
    );
    return validateArray(CspRangeSchema, raw);
  }

  async fetchFixedAddresses(
    pageSize = this.defaultPageSize,
    onProgress?: (percent: number) => void,
    isCancelled?: () => boolean,
  ) {
    const url = `${this.config.cspBaseUrl}/dhcp/fixed_address`;
    const raw = await fetchAllPaginated<unknown>(
      this.http,
      url,
      this.getHeaders(),
      pageSize,
      onProgress,
      isCancelled,
    );
    return validateArray(CspFixedAddressSchema, raw);
  }

  async fetchOptionGroups(
    pageSize = this.defaultPageSize,
    onProgress?: (percent: number) => void,
    isCancelled?: () => boolean,
  ) {
    const url = `${this.config.cspBaseUrl}/dhcp/option_group`;
    const raw = await fetchAllPaginated<unknown>(
      this.http,
      url,
      this.getHeaders(),
      pageSize,
      onProgress,
      isCancelled,
    );
    return validateArray(CspOptionGroupSchema, raw);
  }

  async fetchOptionGroupById(groupId: string) {
    const url = `${this.config.cspBaseUrl}/dhcp/option_group/${encodeURIComponent(groupId)}`;
    const response = await lastValueFrom(
      this.http.get<unknown>(url, { headers: this.getHeaders() }),
    );
    return validateObject(CspOptionGroupSchema, response.data);
  }

  async fetchOptionCodes(
    pageSize = this.defaultPageSize,
    onProgress?: (percent: number) => void,
    isCancelled?: () => boolean,
  ) {
    const url = `${this.config.cspBaseUrl}/dhcp/option_code`;
    const raw = await fetchAllPaginated<unknown>(
      this.http,
      url,
      this.getHeaders(),
      pageSize,
      onProgress,
      isCancelled,
    );
    return validateArray(CspOptionCodeSchema, raw);
  }

  async fetchOptionSpaces(
    pageSize = this.defaultPageSize,
    onProgress?: (percent: number) => void,
    isCancelled?: () => boolean,
  ) {
    const url = `${this.config.cspBaseUrl}/dhcp/option_space`;
    const raw = await fetchAllPaginated<unknown>(
      this.http,
      url,
      this.getHeaders(),
      pageSize,
      onProgress,
      isCancelled,
    );
    const optionSpaces = hasResultsArray(raw) ? raw.results : raw;
    return validateArray(CspOptionSpaceSchema, optionSpaces);
  }

  async fetchOptionFilters(
    pageSize = this.defaultPageSize,
    onProgress?: (percent: number) => void,
    isCancelled?: () => boolean,
  ) {
    const url = `${this.config.cspBaseUrl}/dhcp/option_filter`;
    const raw = await fetchAllPaginated<unknown>(
      this.http,
      url,
      this.getHeaders(),
      pageSize,
      onProgress,
      isCancelled,
    );
    const optionFilters = hasResultsArray(raw) ? raw.results : raw;
    return validateArray(CspOptionFilterSchema, optionFilters);
  }

  async fetchConfigProfiles(
    pageSize = this.defaultPageSize,
    onProgress?: (percent: number) => void,
    isCancelled?: () => boolean,
  ) {
    const url = `${this.config.cspBaseUrl}/dhcp/config_profile/profiles`;
    try {
      const raw = await fetchAllPaginated<unknown>(
        this.http,
        url,
        this.getHeaders(),
        pageSize,
        onProgress,
        isCancelled,
      );
      if (!raw || (Array.isArray(raw) && raw.length === 0)) {
        this.logger.warn('No config profiles found (empty response).');
        return [];
      }
      return validateArray(CspConfigProfileSchema, raw);
    } catch (e) {
      this.logger.warn(
        `Config profiles could not be loaded: ${extractErrorMessage(e)}`,
      );
      return [];
    }
  }

  async fetchGlobalDhcpConfig() {
    const url = `${this.config.cspBaseUrl}/dhcp/global`;
    try {
      const response = await lastValueFrom(
        this.http.get<unknown>(url, { headers: this.getHeaders() }),
      );
      return validateObject(CspGlobalDhcpConfigSchema, response.data);
    } catch (e) {
      this.logger.warn(
        `Global DHCP config could not be loaded: ${extractErrorMessage(e)}`,
      );
      return null;
    }
  }
}
