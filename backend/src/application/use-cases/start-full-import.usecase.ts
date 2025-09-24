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

  /** Starts the full import asynchronously and returns the jobId. */
  async execute(): Promise<{ jobId: string }> {
    const job = await this.jobs.create();
    await this.jobs.markRunning(job.id);
    await this.jobs.updateProgress(job.id, 1);

    // Launch in the background – callback strictly returns void
    setImmediate((): void => {
      this.fireAndForget(job);
    });

    return { jobId: job.id };
  }

  /** Fire-and-forget wrapper without a Promise return. */
  private fireAndForget(job: ImportJobState): void {
    // intentionally no return; no async; side-effects only
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
        // no async callback to avoid no-misused-promises
        onProgress: (percent: number): void => {
          // persist non-blocking
          void this.jobs.updateProgress(job.id, percent);
        },
        isCancelled: neverCancelled, // cancel currently disabled
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
