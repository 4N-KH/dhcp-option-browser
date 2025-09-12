export enum ImportJobStatus {
  QUEUED = 'queued',
  RUNNING = 'running',
  SUCCESS = 'success',
  ERROR = 'error',
  CANCELLED = 'cancelled',
  TIMED_OUT = 'timed_out',
}

export interface ImportJobState {
  id: string;
  status: ImportJobStatus;
  progress: number;
  result?: unknown;
  error?: string;
}
