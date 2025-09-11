import { Injectable, Logger, Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { createAllDhcpOptionAssignmentsView } from '@/shared/utils/create-views.util';
import { ImportStepPort } from '@/domain/ports/import-step.port';
import { ImportConfigPort } from '@/domain/ports/import-config.port';
import {
  IMPORT_STEPS,
  IMPORT_CONFIG,
} from '@/application/services/import/tokens';

type OrchestratorOptions = {
  isCancelled?: () => boolean;
  onProgress?: (
    percent: number,
    phase?: string,
    sub?: { current: number; total: number },
  ) => void;
};

@Injectable()
export class DhcpCspImportOrchestratorService {
  private readonly logger = new Logger(DhcpCspImportOrchestratorService.name);

  constructor(
    @Inject(IMPORT_STEPS) private readonly steps: ReadonlyArray<ImportStepPort>,
    @Inject(IMPORT_CONFIG) private readonly cfg: ImportConfigPort,
    private readonly dataSource: DataSource,
  ) {}

  async runFullImport(opts?: OrchestratorOptions): Promise<void> {
    this.logger.log('--- Starting full CSP DHCP import sequence ---');

    const totalPhases = this.steps.length;
    const startedAt = Date.now();
    const isCancelled = opts?.isCancelled ?? (() => false);

    const updatePhaseProgress = (
      phaseIndex: number,
      phase: string,
      sub?: { current: number; total: number },
    ): void => {
      const base = phaseIndex + (sub ? sub.current / sub.total : 0);
      let percent = Math.floor((base / totalPhases) * 100);
      if (percent > 100) percent = 100;
      opts?.onProgress?.(percent, phase, sub);
    };

    try {
      for (let i = 0; i < this.steps.length; i++) {
        const step = this.steps[i];

        // Timeout prüfen
        if (Date.now() - startedAt > this.cfg.maxRuntimeMs) {
          this.logger.warn(
            `Import timed out after ${this.cfg.maxRuntimeMs} ms`,
          );
          throw new Error('TIMED_OUT');
        }

        // Cancel prüfen (derzeit typischerweise always-false)
        if (isCancelled()) {
          this.logger.warn('Import cancelled (disabled path)');
          throw new Error('CANCELLED');
        }

        await step.run({
          isCancelled,
          onProgress: (cur, tot) =>
            updatePhaseProgress(i, step.name, { current: cur, total: tot }),
        });

        updatePhaseProgress(i + 1, step.name);
      }

      // View nach vollständigem Import erzeugen/aktualisieren
      await createAllDhcpOptionAssignmentsView(this.dataSource);
      this.logger.log('all_dhcp_option_assignments-View (re-)created.');

      this.logger.log('--- CSP DHCP full import completed successfully ---');
      opts?.onProgress?.(
        100,
        this.steps[this.steps.length - 1]?.name ?? 'final',
      );
    } catch (error) {
      const msg = (error as Error)?.message ?? String(error);
      this.logger.error('CSP DHCP full import failed:', msg, error);
      // Fortschritt für Clients finalisieren
      opts?.onProgress?.(100);
      throw error;
    }
  }
}
