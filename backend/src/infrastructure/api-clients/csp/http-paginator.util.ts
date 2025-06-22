import { HttpService } from '@nestjs/axios';
import { AxiosResponse, isAxiosError, AxiosError } from 'axios';
import { lastValueFrom } from 'rxjs';
import { Logger } from '@nestjs/common';
import { CspApiError } from '@/shared/errors/csp-api.error';

interface PaginatedResponse<T> {
  results: T[];
  next_page_id?: string;
  page?: number;
  page_size?: number;
  total?: number;
}

const logger = new Logger('fetchAllPaginated');

/**
 * Fetches all paginated records from a CSP API endpoint.
 */
export async function fetchAllPaginated<T>(
  http: HttpService,
  baseUrl: string,
  headers: Record<string, string>,
): Promise<T[]> {
  const results: T[] = [];
  let nextPageId: string | null = null;

  try {
    do {
      const url = nextPageId
        ? `${baseUrl}?page_id=${encodeURIComponent(nextPageId)}`
        : baseUrl;

      const response: AxiosResponse<PaginatedResponse<T>> = await lastValueFrom(
        http.get<PaginatedResponse<T>>(url, { headers }),
      );

      const responseData = response.data;

      if (!Array.isArray(responseData.results)) {
        logger.error(
          `Invalid response format: ${JSON.stringify(responseData)}`,
        );
        throw new CspApiError(responseData, 'Invalid CSP response structure');
      }

      results.push(...responseData.results);
      nextPageId = responseData.next_page_id ?? null;
    } while (nextPageId);
  } catch (err: unknown) {
    if (isAxiosError(err)) {
      const axiosError = err as AxiosError;
      const data = axiosError.response?.data;
      const message = axiosError.message ?? 'No error message';
      logger.error(
        `CSP API error: ${JSON.stringify(data)} | message: ${message}`,
      );
      throw new CspApiError(err, message);
    } else if (err instanceof Error) {
      logger.error(`Unhandled error: ${err.message}`);
      throw new CspApiError(err, err.message);
    } else {
      logger.error('Unknown error object', JSON.stringify(err));
      throw new CspApiError(err, 'Unknown untyped error');
    }
  }

  return results;
}
