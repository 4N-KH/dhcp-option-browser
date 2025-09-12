import { UnauthorizedException } from '@nestjs/common';
import {
  sign as jwtSign,
  verify as jwtVerify,
  SignOptions,
  VerifyOptions,
} from 'jsonwebtoken';
import { Buffer } from 'buffer';

// Strongly-typed JWT payload contract
export interface JwtPayload {
  id: string;
  region?: string;
  iat?: number;
  exp?: number;
}

// Runtime type guard for JwtPayload contract
export function isJwtPayload(obj: unknown): obj is JwtPayload {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    typeof (obj as { id?: unknown }).id === 'string'
  );
}

// Throws a standardised unauthorised exception (NestJS style)
export function throwUnauthorized(message: string): never {
  throw new UnauthorizedException(message);
}

// Internal wrapper: disables no-unsafe-call only for the jsonwebtoken API
function jwtSignUnknown(
  payload: object,
  secret: string,
  options?: SignOptions,
): unknown {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  return jwtSign(payload, secret, options);
}

// Ensures JWT is always a UTF-8 string, never Buffer/any
export function signJwtStrict(
  payload: object,
  secret: string,
  options?: SignOptions,
): string {
  const result = jwtSignUnknown(payload, secret, options);
  if (typeof result === 'string') return result;
  if (Buffer.isBuffer(result)) return result.toString('utf8');
  throw new Error('Unexpected return type from jwt.sign()');
}

// Internal wrapper: disables no-unsafe-call only for the jsonwebtoken API
function jwtVerifyUnknown(
  token: string,
  secret: string,
  options?: VerifyOptions,
): unknown {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  return jwtVerify(token, secret, options);
}

// Ensures strict payload typing for JWT verification
export function verifyJwtStrict<T extends object>(
  token: string,
  secret: string,
  options?: VerifyOptions,
): T {
  const result = jwtVerifyUnknown(token, secret, options);
  if (typeof result === 'object' && result !== null) {
    return result as T;
  }
  throw new Error('Invalid JWT payload: unexpected type');
}
