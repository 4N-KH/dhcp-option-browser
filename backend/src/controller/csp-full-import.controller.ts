import {
  Controller,
  Post,
  Get,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { DhcpCspImportOrchestratorService } from '@/application/services/import/csp/dhcp-import-orchestrator.service';
import { CspGlobalConfigImportService } from '@/application/services/import/csp/global-config-import.service';
import { DhcpGlobalConfig } from '@/infrastructure/database/csp/global-config.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

// --- Job State Modelling ---
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

// --- In-memory Job Store (for MVP) ---
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
function getJob(id: string): ImportJobState | undefined {
  return importJobs.get(id);
}
function updateJob(id: string, data: Partial<ImportJobState>): void {
  const job = importJobs.get(id);
  if (!job) return;
  importJobs.set(id, { ...job, ...data });
}
function markCancelled(id: string): void {
  updateJob(id, { cancelled: true, status: ImportJobStatus.CANCELLED });
}

@Controller('api/csp/import')
export class CspFullImportController {
  private readonly logger = new Logger(CspFullImportController.name);

  constructor(
    private readonly orchestrator: DhcpCspImportOrchestratorService,
    private readonly globalConfigImport: CspGlobalConfigImportService,
    @InjectRepository(DhcpGlobalConfig)
    private readonly globalConfigRepo: Repository<DhcpGlobalConfig>,
  ) {}

  @Post('all')
  @HttpCode(HttpStatus.ACCEPTED)
  startFullImport(): { jobId: string } {
    const job = createJob();

    setImmediate(() => {
      void (async () => {
        try {
          updateJob(job.id, { status: ImportJobStatus.RUNNING, progress: 1 });

          await this.orchestrator.runFullImport({
            onProgress: (percent: number) => {
              const current = getJob(job.id);
              if (current?.cancelled) {
                updateJob(job.id, {
                  status: ImportJobStatus.CANCELLED,
                  progress: 100,
                });
                throw new Error('Import aborted by user');
              }
              updateJob(job.id, { progress: percent });
            },
            isCancelled: () => !!getJob(job.id)?.cancelled,
          });

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
        } catch (err: unknown) {
          const error = err as Error;
          this.logger.error('Full import failed', error.stack || String(err));

          if (getJob(job.id)?.cancelled) {
            updateJob(job.id, {
              status: ImportJobStatus.CANCELLED,
              progress: 100,
            });
          } else {
            updateJob(job.id, {
              status: ImportJobStatus.ERROR,
              progress: 100,
              error: error.message || 'Unknown error',
            });
          }
        }
      })();
    });

    return { jobId: job.id };
  }

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

  @Get('status/:jobId')
  @HttpCode(HttpStatus.OK)
  getImportStatus(
    @Param('jobId') jobId: string,
  ): ImportJobState | { status: 'not_found' } {
    const job = getJob(jobId);
    if (!job) return { status: 'not_found' };
    return job;
  }

  @Post('global-config')
  @HttpCode(HttpStatus.ACCEPTED)
  async importGlobalConfig(): Promise<{ message: string }> {
    try {
      await this.globalConfigImport.importGlobalDhcpConfig();
      return { message: 'Central DHCP configuration import completed.' };
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.error(
        'Global config import failed',
        error.stack || String(err),
      );
      throw err;
    }
  }

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
