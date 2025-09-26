import { Request } from 'express';

/**
 * Express request extended with the JWT tenant hash.
 * The hash uniquely identifies the current CSP API key (tenant).
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    hash: string;
  };
}
