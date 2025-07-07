import { Injectable } from '@nestjs/common';
import {
  ImportJobState,
  ImportJobStatus,
} from '@/domain/models/import-job.model';

@Injectable()
export class ImportJobStoreService {
  private jobs: Map<string, ImportJobState> = new Map();

  createJob(): ImportJobState {
    const id = Math.random().toString(36).slice(2);
    const job: ImportJobState = {
      id,
      status: ImportJobStatus.QUEUED,
      progress: 0,
    };
    this.jobs.set(id, job);
    return job;
  }
  getJob(id: string) {
    return this.jobs.get(id);
  }
  updateJob(id: string, data: Partial<ImportJobState>) {
    const job = this.jobs.get(id);
    if (!job) return;
    this.jobs.set(id, { ...job, ...data });
  }
}
