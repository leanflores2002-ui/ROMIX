export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code = 'error'
  ) {
    super(message);
  }
}

export const isHttpError = (error: unknown): error is HttpError => error instanceof HttpError;

