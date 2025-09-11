import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthenticatedRequest } from '@/domain/interfaces/csp/authenticated-request.interface';
import {
  JwtPayload,
  isJwtPayload,
  throwUnauthorized,
  verifyJwtStrict,
} from '@/shared/utils/jwt.util';

/* Guard to protect routes with strict JWT authentication.
   Uses centralised JWT utilities for type safety and testability. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly secret: string;

  constructor() {
    const envSecret = process.env.JWT_SECRET;
    if (!envSecret) {
      throw new Error('JWT_SECRET must be present in environment variables');
    }
    this.secret = envSecret;
  }

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const auth = req.headers['authorization'];
    if (!auth?.startsWith('Bearer ')) {
      throwUnauthorized('No token provided');
    }

    const token = auth.slice(7).trim();

    let payload: unknown;
    try {
      // Strictly verify and type the JWT payload using utility
      payload = verifyJwtStrict<JwtPayload>(token, this.secret);
      if (!isJwtPayload(payload)) {
        throwUnauthorized('Token payload invalid');
      }
    } catch {
      throwUnauthorized('Invalid or expired token');
    }

    // Payload strictly typed and safe
    req.user = {
      id: payload.id,
    };
    return true;
  }
}
