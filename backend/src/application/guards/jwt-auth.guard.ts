import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthenticatedRequest } from '@/domain/interfaces/csp/authenticated-request.interface';
import {
  JwtPayload,
  isJwtPayload,
  throwUnauthorized,
  verifyJwtStrict,
} from '@/shared/utils/jwt.util';

/**
 * Guard that enforces strict JWT authentication.
 * It verifies the token and exposes the tenant hash
 * to downstream handlers via req.user.hash.
 */
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
    const authHeader = req.headers['authorization'];

    // Require a valid Bearer token header
    if (!authHeader?.startsWith('Bearer ')) {
      throwUnauthorized('No token provided');
    }

    const token = authHeader.slice(7).trim();

    let payload: JwtPayload;
    try {
      // Verify and strictly type-check the JWT payload
      payload = verifyJwtStrict<JwtPayload>(token, this.secret);
      if (!isJwtPayload(payload)) {
        throwUnauthorized('Token payload invalid');
      }
    } catch {
      throwUnauthorized('Invalid or expired token');
      return false;
    }

    // Attach the tenant hash to the request object
    req.user = { hash: payload.hash };
    return true;
  }
}
