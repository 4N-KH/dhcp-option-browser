import { Controller, Post, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { DhcpCspImportOrchestratorService } from '@/application/services/import/csp/dhcp-import-orchestrator.service';
import { DhcpGlobalConfig } from '@/infrastructure/database/csp/global-config.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Controller('api/csp/import')
export class CspFullImportController {
  constructor(
    private readonly orchestrator: DhcpCspImportOrchestratorService,
    @InjectRepository(DhcpGlobalConfig)
    private readonly globalConfigRepo: Repository<DhcpGlobalConfig>,
  ) {}

  /**
   * Führt den vollständigen CSP-Import aus (alle relevanten Objekte werden importiert).
   * POST /api/csp/import/all
   */
  @Post('all')
  @HttpCode(HttpStatus.ACCEPTED)
  async importAllFromCsp(): Promise<{ message: string }> {
    await this.orchestrator.runFullImport();
    return { message: 'CSP-DHCP-Full-Import erfolgreich abgeschlossen.' };
  }

  /**
   * Gibt die aktuellste zentrale globale DHCP-Konfiguration inkl. Relationen zurück.
   * GET /api/csp/import/global-config
   */
  @Get('global-config')
  @HttpCode(HttpStatus.OK)
  async getGlobalConfig(): Promise<DhcpGlobalConfig | null> {
    const configs = await this.globalConfigRepo.find({
      where: {}, // notwendig für TypeORM 0.3+, auch wenn leer!
      relations: ['dhcpOptions', 'optionGroups', 'optionGroups.optionGroup'],
      order: { id: 'DESC' },
      take: 1,
    });
    return configs[0] ?? null;
  }
}
