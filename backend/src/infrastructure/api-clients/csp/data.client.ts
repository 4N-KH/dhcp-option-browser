import { Injectable, Logger } from '@nestjs/common';
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
import { CspOptionSpaceSchema } from '@/domain/dto/csp/zod/option-space.zod';
import { CspOptionFilterSchema } from '@/domain/dto/csp/zod/option-filter.zod';

import {
  validateArray,
  validateObject,
} from '@/shared/validator/zod-validator.util';

// AddressBlock-Normalizer importieren
import { normalizeAddressBlockDtos } from '@/shared/parser/normalize-address-block-dtos';

// Type Guard für paginierten API-Response mit results-Array
function hasResultsArray(obj: unknown): obj is { results: unknown[] } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    Array.isArray((obj as { results?: unknown }).results)
  );
}

// Absolut type-sicherer Error-Extractor ohne ESLint-Fehler
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
  return 'Unbekannter Fehler';
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

  async fetchIpSpaces() {
    const url = `${this.config.cspBaseUrl}/ipam/ip_space`;
    const raw = await fetchAllPaginated<unknown>(
      this.http,
      url,
      this.getHeaders(),
    );
    return validateArray(CspIpSpaceSchema, raw);
  }

  async fetchAddressBlocks() {
    const url = `${this.config.cspBaseUrl}/ipam/address_block`;
    const raw = await fetchAllPaginated<unknown>(
      this.http,
      url,
      this.getHeaders(),
    );
    // NEU: ZUERST NORMALISIEREN, DANN VALIDIEREN
    const normalized = normalizeAddressBlockDtos(raw);
    return validateArray(CspAddressBlockSchema, normalized);
  }

  async fetchSubnets() {
    const url = `${this.config.cspBaseUrl}/ipam/subnet`;
    const raw = await fetchAllPaginated<unknown>(
      this.http,
      url,
      this.getHeaders(),
    );
    return validateArray(CspSubnetSchema, raw);
  }

  async fetchRanges() {
    const url = `${this.config.cspBaseUrl}/ipam/range`;
    const raw = await fetchAllPaginated<unknown>(
      this.http,
      url,
      this.getHeaders(),
    );
    return validateArray(CspRangeSchema, raw);
  }

  async fetchFixedAddresses() {
    const url = `${this.config.cspBaseUrl}/dhcp/fixed_address`;
    const raw = await fetchAllPaginated<unknown>(
      this.http,
      url,
      this.getHeaders(),
    );
    return validateArray(CspFixedAddressSchema, raw);
  }

  async fetchOptionGroups() {
    const url = `${this.config.cspBaseUrl}/dhcp/option_group`;
    const raw = await fetchAllPaginated<unknown>(
      this.http,
      url,
      this.getHeaders(),
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

  async fetchOptionCodes() {
    const url = `${this.config.cspBaseUrl}/dhcp/option_code`;
    const raw = await fetchAllPaginated<unknown>(
      this.http,
      url,
      this.getHeaders(),
    );
    return validateArray(CspOptionCodeSchema, raw);
  }

  async fetchOptionSpaces() {
    const url = `${this.config.cspBaseUrl}/dhcp/option_space`;
    const raw = await fetchAllPaginated<unknown>(
      this.http,
      url,
      this.getHeaders(),
    );
    const optionSpaces = hasResultsArray(raw) ? raw.results : raw;
    return validateArray(CspOptionSpaceSchema, optionSpaces);
  }

  async fetchOptionFilters() {
    const url = `${this.config.cspBaseUrl}/dhcp/option_filter`;
    const raw = await fetchAllPaginated<unknown>(
      this.http,
      url,
      this.getHeaders(),
    );
    const optionFilters = hasResultsArray(raw) ? raw.results : raw;
    return validateArray(CspOptionFilterSchema, optionFilters);
  }

  async fetchConfigProfiles() {
    const url = `${this.config.cspBaseUrl}/dhcp/config_profile/profiles`;
    try {
      const raw = await fetchAllPaginated<unknown>(
        this.http,
        url,
        this.getHeaders(),
      );
      if (!raw || (Array.isArray(raw) && raw.length === 0)) {
        this.logger.warn('Keine Config Profiles gefunden (leere Antwort).');
        return [];
      }
      return validateArray(CspConfigProfileSchema, raw);
    } catch (e) {
      this.logger.warn(
        `Config Profiles konnten nicht geladen werden: ${extractErrorMessage(e)}`,
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
        `Global DHCP Config konnte nicht geladen werden: ${extractErrorMessage(e)}`,
      );
      return null;
    }
  }
}
