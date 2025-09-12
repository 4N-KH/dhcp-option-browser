import { Injectable } from '@nestjs/common';
import { ImportJobRepositoryPort } from '@/domain/ports/import-job.repository.port';
import {
  ImportJobState,
  ImportJobStatus,
} from '@/domain/models/import-job.model';

// In-Memory-Adapter für Dev/Tests. Production-Adapter (TypeORM) kann später ergänzt werden.
@Injectable()
export class InMemoryImportJobRepositoryAdapter
  implements ImportJobRepositoryPort
{
  private readonly store = new Map<string, ImportJobState>();

  private generateId(): string {
    return Math.random().toString(36).slice(2);
  }

  create(initial?: Partial<ImportJobState>): Promise<ImportJobState> {
    const id = this.generateId();
    const job: ImportJobState = {
      id,
      status: ImportJobStatus.QUEUED, // initialer Zustand – der Use-Case setzt direkt danach RUNNING
      progress: 0,
      result: initial?.result,
      error: initial?.error,
    };
    this.store.set(id, job);
    return Promise.resolve(job);
  }

  findById(id: string): Promise<ImportJobState | null> {
    return Promise.resolve(this.store.get(id) ?? null);
  }

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

  // --- intern ---
  private patch(id: string, data: Partial<ImportJobState>): void {
    const current = this.store.get(id);
    if (!current) return;
    this.store.set(id, { ...current, ...data });
  }
}
