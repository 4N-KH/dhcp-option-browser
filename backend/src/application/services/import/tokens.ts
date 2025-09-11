import { InjectionToken } from '@nestjs/common';
import { ImportStepPort } from '@/domain/ports/import-step.port';
import { ImportConfigPort } from '@/domain/ports/import-config.port';

export const IMPORT_STEPS: InjectionToken = 'IMPORT_STEPS';
export const IMPORT_CONFIG: InjectionToken = 'IMPORT_CONFIG';

export type ImportStepsToken = ReadonlyArray<ImportStepPort>;
export type ImportConfigToken = ImportConfigPort;
