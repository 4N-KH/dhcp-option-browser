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

const REQUEST_TIMEOUT = 0; // ms
const MAX_RETRIES = 3;
const BASE_DELAY = 1_000; // ms
const DEFAULT_PAGE_SIZE = 10; // can be tuned per endpoint

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getHeader(headers: unknown, key: string): string | undefined {
  if (headers && typeof headers === 'object' && key in headers) {
    const val = (headers as Record<string, unknown>)[key];
    if (Array.isArray(val)) {
      return typeof val[0] === 'string' ? val[0] : undefined;
    }
    return typeof val === 'string' ? val : undefined;
  }
  return undefined;
}

/**
 * Robustly fetches all paginated records from a CSP API endpoint,
 * supporting retries, explicit page size, and strict error handling.
 * Reports progress if onProgress callback is provided.
 * Supports optional cancellation via isCancelled callback.
 *
 * @param http        NestJS HttpService instance
 * @param baseUrl     API endpoint base URL (without page_size/page_id)
 * @param headers     HTTP headers (incl. authorisation)
 * @param pageSize    Number of items per page (default: 100)
 * @param onProgress  Optional progress callback: (percent: number) => void
 * @param isCancelled Optional cancellation check: () => boolean
 */
export async function fetchAllPaginated<T>(
  http: HttpService,
  baseUrl: string,
  headers: Record<string, string>,
  pageSize: number = DEFAULT_PAGE_SIZE,
  onProgress?: (percent: number) => void,
  isCancelled?: () => boolean,
): Promise<T[]> {
  const results: T[] = [];
  let nextPageId: string | null = null;
  let total: number | undefined = undefined;
  let fetched = 0;

  // Build base URL with explicit page_size (preserves custom queries)
  const baseUrlWithPageSize = baseUrl.includes('?')
    ? `${baseUrl}&page_size=${pageSize}`
    : `${baseUrl}?page_size=${pageSize}`;

  const checkCancel = () => {
    if (isCancelled?.()) {
      logger.warn('Pagination fetch cancelled by user.');
      throw new CspApiError('Cancelled', 'Pagination fetch cancelled by user');
    }
  };

  do {
    let retryCount = 0;
    let requestSuccess = false;

    while (!requestSuccess && retryCount <= MAX_RETRIES) {
      checkCancel();

      try {
        const url = nextPageId
          ? `${baseUrlWithPageSize}&page_id=${encodeURIComponent(nextPageId)}`
          : baseUrlWithPageSize;

        const response: AxiosResponse<PaginatedResponse<T>> =
          await lastValueFrom(
            http.get<PaginatedResponse<T>>(url, {
              headers,
              timeout: REQUEST_TIMEOUT,
            }),
          );

        checkCancel();

        const responseData: PaginatedResponse<T> = response.data;

        if (!Array.isArray(responseData.results)) {
          logger.error(
            `Invalid response format: ${JSON.stringify(responseData)}`,
          );
          throw new CspApiError(responseData, 'Invalid CSP response structure');
        }

        if (typeof responseData.total === 'number') {
          total = responseData.total;
        }

        results.push(...responseData.results);
        fetched += responseData.results.length;
        nextPageId = responseData.next_page_id ?? null;
        requestSuccess = true;

        // Fortschritt berechnen und melden
        if (onProgress && total && total > 0) {
          const percent = Math.min(Math.round((fetched / total) * 100), 99);
          onProgress(percent);
        }
      } catch (err: unknown) {
        retryCount++;
        let isRetryable = false;
        let retryDelay = BASE_DELAY * Math.pow(2, retryCount - 1);

        if (isAxiosError(err)) {
          const axiosError = err as AxiosError;
          const status = axiosError.response?.status;
          const data = axiosError.response?.data;
          const message = axiosError.message ?? 'No error message';

          if (status === 429) {
            isRetryable = true;
            retryDelay = 10_000; // default 10s
            const retryAfter = getHeader(
              axiosError.response?.headers,
              'retry-after',
            );
            if (retryAfter && !isNaN(Number(retryAfter))) {
              retryDelay = Number(retryAfter) * 1_000;
            }
            logger.warn(
              `Rate limited by CSP API (429). Retrying after ${retryDelay / 1000}s.`,
            );
          }
          // Network issues / Timeout / 5xx are retryable
          else if (
            !axiosError.response ||
            (status && status >= 500 && status < 600) ||
            axiosError.code === 'ECONNABORTED' ||
            axiosError.code === 'ECONNRESET' ||
            axiosError.code === 'ETIMEDOUT' ||
            axiosError.code === 'EAI_AGAIN'
          ) {
            isRetryable = true;
            logger.warn(
              `Transient error: ${message} (attempt ${retryCount} of ${MAX_RETRIES})`,
            );
          } else {
            // Non-retryable errors
            logger.error(
              `CSP API error: ${JSON.stringify(data)} | message: ${message}`,
            );
            throw new CspApiError(err, message);
          }
        } else if (err instanceof Error) {
          isRetryable = true;
          logger.warn(
            `Generic error: ${err.message} (attempt ${retryCount} of ${MAX_RETRIES})`,
          );
        } else {
          logger.error('Unknown error object', JSON.stringify(err));
          throw new CspApiError(err, 'Unknown untyped error');
        }

        if (isRetryable && retryCount <= MAX_RETRIES) {
          await delay(retryDelay);
          continue;
        }

        // Not retryable or maximum attempts reached
        if (isAxiosError(err)) {
          const axiosError = err as AxiosError;
          throw new CspApiError(axiosError, axiosError.message);
        }
        if (err instanceof Error) {
          throw new CspApiError(err, err.message);
        }
        throw new CspApiError(err, 'Unknown error');
      }
    }

    if (!requestSuccess) {
      throw new CspApiError(
        'Maximum retry attempts exceeded',
        'Failed to fetch paginated records after multiple retries.',
      );
    }
  } while (nextPageId);

  // 100% Progress am Ende (wenn Callback gesetzt)
  if (onProgress) {
    onProgress(100);
  }

  return results;
}
