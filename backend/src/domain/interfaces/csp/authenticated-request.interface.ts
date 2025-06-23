// somewhere global (e.g., src/domain/interfaces/authenticated-request.interface.ts)
import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    region?: string;
  };
}
