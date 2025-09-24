import { Injectable } from '@nestjs/common';
import { ImportJobRepositoryPort } from '@/domain/ports/import-job.repository.port';
import {
  ImportJobState,
  ImportJobStatus,
} from '@/domain/models/import-job.model';

// Simple in-memory repository for development or tests
@Injectable()
export class InMemoryImportJobRepositoryAdapter
  implements ImportJobRepositoryPort
{
  private readonly store = new Map<string, ImportJobState>();

  private generateId(): string {
    return Math.random().toString(36).slice(2);
  }

  // Create a new job with queued status
  create(initial?: Partial<ImportJobState>): Promise<ImportJobState> {
    const id = this.generateId();
    const job: ImportJobState = {
      id,
      status: ImportJobStatus.QUEUED,
      progress: 0,
      result: initial?.result,
      error: initial?.error,
    };
    this.store.set(id, job);
    return Promise.resolve(job);
  }

  // Get job by id
  findById(id: string): Promise<ImportJobState | null> {
    return Promise.resolve(this.store.get(id) ?? null);
  }

  // State updates
  markPending(id: string): Promise<void> {
    this.patch(id, { status: ImportJobStatus.QUEUED });
    return Promise.resolve();
  }

  markRunning(id: string): Promise<void> {
    this.patch(id, { status: ImportJobStatus.RUNNING });
    return Promise.resolve();
  }

  updateProgress(id: string, progress: number): Promise<void> {
    this.patch(id, { progress });
    return Promise.resolve();
  }

  markSucceeded(id: string, result?: unknown): Promise<void> {
    this.patch(id, { status: ImportJobStatus.SUCCESS, progress: 100, result });
    return Promise.resolve();
  }

  markFailed(id: string, errorMessage?: string): Promise<void> {
    this.patch(id, {
      status: ImportJobStatus.ERROR,
      progress: 100,
      error: errorMessage ?? 'Unknown error',
    });
    return Promise.resolve();
  }

  markTimedOut(id: string): Promise<void> {
    this.patch(id, { status: ImportJobStatus.TIMED_OUT, progress: 100 });
    return Promise.resolve();
  }

  // Internal helper to update job fields
  private patch(id: string, data: Partial<ImportJobState>): void {
    const current = this.store.get(id);
    if (!current) return;
    this.store.set(id, { ...current, ...data });
  }
}
