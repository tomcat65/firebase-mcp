declare module '../utils/error-handler.js' {
  export enum ErrorType {
    VALIDATION = 'validation_error',
    PERMISSION = 'permission_denied',
    NOT_FOUND = 'not_found',
    NETWORK = 'network_error',
    RATE_LIMIT = 'rate_limit',
    INVALID_ARGUMENT = 'invalid_argument',
    ALREADY_EXISTS = 'already_exists',
    INTERNAL = 'internal_error'
  }

  export class FirebaseMcpError extends Error {
    readonly type: ErrorType;
    readonly originalError?: unknown;
    constructor(type: ErrorType, message: string, originalError?: unknown);
  }

  export interface McpResponse {
    content: { type: string; text: string }[];
    isError: boolean;
    errorType?: ErrorType;
  }

  export function createErrorResponse(error: unknown, context?: string): McpResponse;
  export function withErrorHandling<T>(
    handler: (...args: any[]) => Promise<T>,
    context?: string
  ): (...args: any[]) => Promise<T>;
  export function getErrorMessage(error: unknown): string;
} 