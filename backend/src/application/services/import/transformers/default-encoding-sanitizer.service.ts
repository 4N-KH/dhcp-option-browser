import { Injectable } from '@nestjs/common';
import { EncodingSanitizer } from './encoding-sanitizer.interface';

@Injectable()
export class DefaultEncodingSanitizerService extends EncodingSanitizer {
  sanitize(input: string | null): string {
    if (!input) return '';
    return input
      .replace(/Ã¤/g, 'ä')
      .replace(/Ã¶/g, 'ö')
      .replace(/Ã¼/g, 'ü')
      .replace(/Ã/g, 'ß')
      .replace(/Ã–/g, 'Ö')
      .replace(/Ãœ/g, 'Ü')
      .replace(/Ã„/g, 'Ä');
  }
}
