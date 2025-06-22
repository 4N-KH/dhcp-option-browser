import { ZodSchema, ZodError } from 'zod';

export function validateArray<T>(schema: ZodSchema<T>, data: unknown): T[] {
  try {
    return schema.array().parse(data);
  } catch (e) {
    if (e instanceof ZodError) {
      // Hier kannst du ggf. Logging oder eigene Fehler werfen
      throw new Error('Validation error: ' + JSON.stringify(e.errors, null, 2));
    }
    throw e;
  }
}

export function validateObject<T>(schema: ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (e) {
    if (e instanceof ZodError) {
      throw new Error('Validation error: ' + JSON.stringify(e.errors, null, 2));
    }
    throw e;
  }
}
