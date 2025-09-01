// Domain Port for Import-Job-Persistence (DIP, ISP)
import { ImportJobState } from '@/domain/models/import-job.model';

export interface ImportJobRepositoryPort {
  create(initial?: Partial<ImportJobState>): Promise<ImportJobState>;
  findById(id: string): Promise<ImportJobState | null>;

  markPending(id: string): Promise<void>;
  markRunning(id: string): Promise<void>;
  updateProgress(id: string, progress: number): Promise<void>;
  markSucceeded(id: string, result?: unknown): Promise<void>;
  markFailed(id: string, errorMessage?: string): Promise<void>;
  markTimedOut(id: string): Promise<void>;
}
