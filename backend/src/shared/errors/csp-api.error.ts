export class CspApiError extends Error {
  constructor(
    public readonly original: unknown,
    message = 'Failed to access the CSP API',
  ) {
    super(message);
    this.name = 'CspApiError';
  }
}
