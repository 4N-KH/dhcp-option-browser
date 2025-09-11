export abstract class EncodingSanitizer {
  abstract sanitize(input: string | null): string;
}
