import { Injectable, Logger } from '@nestjs/common';
import { CspDataClient } from '@/infrastructure/api-clients/csp/data.client';
import { CspOptionCodeDto } from '@/domain/dto/csp/option-code.dto';

/**
 * Imports all DHCP Option Codes from CSP, stores all metadata fields for later reporting.
 */
@Injectable()
export class CspOptionCodeImportService {
  private readonly logger = new Logger(CspOptionCodeImportService.name);

  constructor(private readonly cspDataClient: CspDataClient) {}

  /**
   * Loads all option codes from CSP and returns them.
   */
  async importOptionCodes(): Promise<CspOptionCodeDto[]> {
    this.logger.log('Fetching CSP DHCP Option Codes...');
    const optionCodes: CspOptionCodeDto[] =
      await this.cspDataClient.fetchOptionCodes();

    if (!optionCodes || optionCodes.length === 0) {
      this.logger.warn('No option codes found.');
      return [];
    }

    this.logger.log(
      `Fetched ${optionCodes.length} DHCP Option Codes from CSP.`,
    );
    // Optional: return, oder weitere Verarbeitung wie Logging
    return optionCodes;
  }
}
