import { Injectable, Logger, Inject } from '@nestjs/common';
import { DhcpCspImportOrchestratorService } from '@/application/services/import/csp/dhcp-import-orchestrator.service';
import { ImportJobRepositoryPort } from '@/domain/ports/import-job.repository.port';
import { ImportJobState } from '@/domain/models/import-job.model';
import { neverCancelled } from '@/shared/import/import-cancel.util';

@Injectable()
export class StartFullImportUseCase {
  private readonly logger = new Logger(StartFullImportUseCase.name);

  constructor(
    @Inject('ImportJobRepositoryPort')
    private readonly jobs: ImportJobRepositoryPort,
    private readonly orchestrator: DhcpCspImportOrchestratorService,
  ) {}

  /** Startet den Full-Import asynchron und gibt die JobId zurück. */
  async execute(): Promise<{ jobId: string }> {
    const job = await this.jobs.create();
    await this.jobs.markRunning(job.id);
    await this.jobs.updateProgress(job.id, 1);

    // Nebenläufig starten – Callback liefert strikt `void`
    setImmediate((): void => {
      this.fireAndForget(job);
    });

    return { jobId: job.id };
  }

  /** Fire-and-forget Wrapper ohne Promise-Rückgabe. */
  private fireAndForget(job: ImportJobState): void {
    // bewusst kein return; kein async; nur side-effects
    this.run(job).catch((err: unknown) => {
      if (err instanceof Error) {
        this.logger.error(
          'Unexpected error in StartFullImportUseCase.run',
          err.stack,
        );
      } else {
        this.logger.error(
          `Unexpected error in StartFullImportUseCase.run: ${String(err)}`,
        );
      }
    });
  }

  private async run(job: ImportJobState): Promise<void> {
    try {
      await this.orchestrator.runFullImport({
        // Kein async-Callback: vermeidet no-misused-promises
        onProgress: (percent: number): void => {
          // Nicht blockierend persistieren
          void this.jobs.updateProgress(job.id, percent);
        },
        isCancelled: neverCancelled, // Cancel aktuell deaktiviert
      });

      await this.jobs.markSucceeded(job.id);
    } catch (e: unknown) {
      if (e instanceof Error) {
        this.logger.error('Full import failed', e.stack);
        await this.jobs.markFailed(job.id, e.message);
      } else {
        this.logger.error(`Full import failed: ${String(e)}`);
        await this.jobs.markFailed(job.id, String(e));
      }
    }
  }
}
