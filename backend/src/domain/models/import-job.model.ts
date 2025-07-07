// src/domain/models/import-job.model.ts
export enum ImportJobStatus {
  QUEUED = 'queued',
  RUNNING = 'running',
  SUCCESS = 'success',
  ERROR = 'error',
  CANCELLED = 'cancelled',
}

export interface ImportJobState {
  id: string;
  status: ImportJobStatus;
  progress: number;
  result?: any;
  error?: string;
}
