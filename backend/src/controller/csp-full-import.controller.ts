import {
  Controller,
  Post,
  Get,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DhcpCspImportOrchestratorService } from '@/application/services/import/csp/dhcp-import-orchestrator.service';
import { CspGlobalConfigImportService } from '@/application/services/import/csp/global-config-import.service';
import { DhcpGlobalConfig } from '@/infrastructure/database/csp/global-config.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

// --- JOB STATE MODELLING ---
enum ImportJobStatus {
  QUEUED = 'queued',
  RUNNING = 'running',
  SUCCESS = 'success',
  ERROR = 'error',
  CANCELLED = 'cancelled',
}

interface ImportJobState {
  id: string;
  status: ImportJobStatus;
  progress: number;
  cancelled?: boolean;
  result?: any;
  error?: string;
}

// --- In-memory Job Store (für MVP) ---
const importJobs: Map<string, ImportJobState> = new Map();

function createJob(): ImportJobState {
  const id = Math.random().toString(36).slice(2);
  const job: ImportJobState = {
    id,
    status: ImportJobStatus.QUEUED,
    progress: 0,
    cancelled: false,
  };
  importJobs.set(id, job);
  return job;
}
function getJob(id: string) {
  return importJobs.get(id);
}
function updateJob(id: string, data: Partial<ImportJobState>) {
  const job = importJobs.get(id);
  if (!job) return;
  importJobs.set(id, { ...job, ...data });
}
function markCancelled(id: string) {
  updateJob(id, { cancelled: true, status: ImportJobStatus.CANCELLED });
}

@Controller('api/csp/import')
export class CspFullImportController {
  constructor(
    private readonly orchestrator: DhcpCspImportOrchestratorService,
    private readonly globalConfigImport: CspGlobalConfigImportService,
    @InjectRepository(DhcpGlobalConfig)
    private readonly globalConfigRepo: Repository<DhcpGlobalConfig>,
  ) {}

  /**
   * POST /api/csp/import/all
   * Triggers the full import as async job. Returns jobId immediately.
   */
  @Post('all')
  @HttpCode(HttpStatus.ACCEPTED)
  startFullImport(): { jobId: string } {
    const job = createJob();

    // Importprozess im Hintergrund starten (ESLint-konform, non-blocking)
    setImmediate(() => {
      void (async () => {
        try {
          updateJob(job.id, { status: ImportJobStatus.RUNNING, progress: 1 });

          // Import mit Fortschritts-Callback und Cancel-Check
          await this.orchestrator.runFullImport({
            onProgress: (percent: number) => {
              const current = getJob(job.id);
              if (current?.cancelled) {
                updateJob(job.id, { status: ImportJobStatus.CANCELLED });
                throw new Error('Import aborted by user');
              }
              updateJob(job.id, { progress: percent });
            },
            isCancelled: () => !!getJob(job.id)?.cancelled,
          });

          // Nur setzen, falls nicht abgebrochen
          if (getJob(job.id)?.cancelled) {
            updateJob(job.id, {
              status: ImportJobStatus.CANCELLED,
              progress: 100,
            });
          } else {
            updateJob(job.id, {
              status: ImportJobStatus.SUCCESS,
              progress: 100,
            });
          }
        } catch (e) {
          if (getJob(job.id)?.cancelled) {
            updateJob(job.id, {
              status: ImportJobStatus.CANCELLED,
              progress: 100,
            });
          } else {
            updateJob(job.id, {
              status: ImportJobStatus.ERROR,
              progress: 100,
              error: (e as Error).message,
            });
          }
        }
      })();
    });

    return { jobId: job.id };
  }

  /**
   * POST /api/csp/import/cancel/:jobId
   * Cancels an active import job.
   */
  @Post('cancel/:jobId')
  @HttpCode(HttpStatus.OK)
  cancelImport(@Param('jobId') jobId: string): { status: string } {
    const job = getJob(jobId);
    if (!job) return { status: 'not_found' };
    if (
      job.status === ImportJobStatus.SUCCESS ||
      job.status === ImportJobStatus.ERROR
    ) {
      return { status: 'already_finished' };
    }
    markCancelled(jobId);
    return { status: 'cancelled' };
  }

  /**
   * GET /api/csp/import/status/:jobId
   * Returns current job status, progress and error if any.
   */
  @Get('status/:jobId')
  @HttpCode(HttpStatus.OK)
  getImportStatus(
    @Param('jobId') jobId: string,
  ): ImportJobState | { status: 'not_found' } {
    const job = getJob(jobId);
    if (!job) return { status: 'not_found' };
    return job;
  }

  /**
   * POST /api/csp/import/global-config
   * Executes import of the central DHCP configuration only.
   */
  @Post('global-config')
  @HttpCode(HttpStatus.ACCEPTED)
  async importGlobalConfig(): Promise<{ message: string }> {
    await this.globalConfigImport.importGlobalDhcpConfig();
    return { message: 'Central DHCP configuration import completed.' };
  }

  /**
   * GET /api/csp/import/global-config
   * Retrieves the current central configuration from the database.
   */
  @Get('global-config')
  @HttpCode(HttpStatus.OK)
  async getGlobalConfig(): Promise<DhcpGlobalConfig | null> {
    const configs = await this.globalConfigRepo.find({
      where: {},
      relations: ['dhcpOptions', 'optionGroups', 'optionGroups.optionGroup'],
      order: { id: 'DESC' },
      take: 1,
    });
    return configs[0] ?? null;
  }
}
