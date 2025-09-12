import {
  Controller,
  Post,
  Get,
  HttpCode,
  HttpStatus,
  GoneException,
  Param,
  Inject,
} from '@nestjs/common';
import { StartFullImportUseCase } from '@/application/use-cases/start-full-import.usecase';
import { ImportJobRepositoryPort } from '@/domain/ports/import-job.repository.port';
import {
  ImportJobState,
  ImportJobStatus,
} from '@/domain/models/import-job.model';

@Controller('api/csp/import')
export class CspFullImportController {
  constructor(
    private readonly startFullImport: StartFullImportUseCase,
    @Inject('ImportJobRepositoryPort')
    private readonly jobs: ImportJobRepositoryPort,
  ) {}

  @Post('all')
  @HttpCode(HttpStatus.ACCEPTED)
  async startFull(): Promise<{ jobId: string }> {
    return this.startFullImport.execute();
  }

  // Cancel-Endpoint bleibt stabil, ist aber bewusst deaktiviert:
  @Post('cancel/:jobId')
  @HttpCode(HttpStatus.GONE)
  cancelImport(): never {
    throw new GoneException('Cancel is currently not supported');
  }

  @Get('status/:jobId')
  @HttpCode(HttpStatus.OK)
  async getStatus(
    @Param('jobId') jobId: string,
  ): Promise<
    (ImportJobState & { status: ImportJobStatus }) | { status: 'not_found' }
  > {
    const job = await this.jobs.findById(jobId);
    if (!job) return { status: 'not_found' };

    // CANCELLED wird extern als ERROR exponiert (solange Cancel deaktiviert ist)
    const status =
      job.status === ImportJobStatus.CANCELLED
        ? ImportJobStatus.ERROR
        : job.status;

    return { ...job, status };
  }
}
