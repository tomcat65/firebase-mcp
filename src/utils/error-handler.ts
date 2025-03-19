import { logger } from './logger.js';

/**
 * Error types for better error categorization
 */
export enum ErrorType {
  VALIDATION = 'validation_error',
  PERMISSION = 'permission_denied',
  NOT_FOUND = 'not_found',
  NETWORK = 'network_error',
  RATE_LIMIT = 'rate_limit',
  INVALID_ARGUMENT = 'invalid_argument',
  ALREADY_EXISTS = 'already_exists',
  INTERNAL = 'internal_error',
  AUTHORIZATION = 'authorization_error',
  FIREBASE = 'firebase_error',
  INVALID_PARAMS = 'INVALID_PARAMS'
}

/**
 * Custom error class for Firebase MCP operations
 */
export class FirebaseMcpError extends Error {
  constructor(
    public readonly type: ErrorType,
    message: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'FirebaseMcpError';
  }
}

/**
 * Creates a standardized error response for MCP tools
 */
export function createErrorResponse(error: unknown, context?: string) {
  let errorType = ErrorType.INTERNAL;
  let message = 'An unexpected error occurred';

  if (error instanceof FirebaseMcpError) {
    errorType = error.type;
    message = error.message;
  } else if (error instanceof Error) {
    message = error.message;
    
    // Categorize Firebase Admin errors
    if (message.includes('permission')) {
      errorType = ErrorType.PERMISSION;
    } else if (message.includes('not found')) {
      errorType = ErrorType.NOT_FOUND;
    } else if (message.includes('already exists')) {
      errorType = ErrorType.ALREADY_EXISTS;
    }
  }

  const errorMessage = context ? `${context}: ${message}` : message;
  logger.error(`${errorType}: ${errorMessage}`, error);

  return {
    content: [{
      type: "text" as const,
      text: errorMessage
    }],
    isError: true,
    errorType
  };
}

/**
 * Creates a standardized success response for MCP tools
 */
export function createSuccessResponse(data: any) {
  return {
    content: [{
      type: "text" as const,
      text: typeof data === 'string' ? data : JSON.stringify(data)
    }],
    isError: false
  };
}

/**
 * Wraps an async function with standard error handling
 */
export function withErrorHandling<T>(
  handler: (...args: any[]) => Promise<T>,
  context?: string
) {
  return async (...args: any[]): Promise<T> => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof FirebaseMcpError) {
        throw error;
      }
      throw new FirebaseMcpError(
        ErrorType.INTERNAL,
        context ? `${context}: ${getErrorMessage(error)}` : getErrorMessage(error),
        error
      );
    }
  };
}

/**
 * Gets a readable error message from any error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof FirebaseMcpError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}
