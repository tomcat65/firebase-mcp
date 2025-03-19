import { FirebaseMcpError, ErrorType } from './error-handler.js';

/**
 * Validates that required parameters are present and of the correct type
 */
export function validateRequiredParams(
  params: Record<string, any>,
  requiredParams: { name: string; type: string }[]
) {
  for (const { name, type } of requiredParams) {
    if (params[name] === undefined || params[name] === null) {
      throw new FirebaseMcpError(
        ErrorType.INVALID_ARGUMENT,
        `Missing required parameter: ${name}`
      );
    }

    const actualType = typeof params[name];
    if (actualType !== type) {
      throw new FirebaseMcpError(
        ErrorType.INVALID_ARGUMENT,
        `Invalid type for parameter ${name}. Expected ${type}, got ${actualType}`
      );
    }
  }
}

/**
 * Validates a collection path
 */
export function validateCollectionPath(path: string) {
  if (!path || typeof path !== 'string') {
    throw new FirebaseMcpError(
      ErrorType.INVALID_ARGUMENT,
      'Collection path must be a non-empty string'
    );
  }

  // Collection path must have odd number of segments
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0 || segments.length % 2 === 0) {
    throw new FirebaseMcpError(
      ErrorType.INVALID_ARGUMENT,
      'Invalid collection path format. Must be in format: collection/doc/collection'
    );
  }

  // Each segment must be non-empty and valid
  for (const segment of segments) {
    if (!segment.trim()) {
      throw new FirebaseMcpError(
        ErrorType.INVALID_ARGUMENT,
        'Collection path segments cannot be empty'
      );
    }
    if (segment.includes('//')) {
      throw new FirebaseMcpError(
        ErrorType.INVALID_ARGUMENT,
        'Collection path cannot contain consecutive slashes'
      );
    }
  }
}

/**
 * Validates a document path
 */
export function validateDocumentPath(path: string) {
  if (!path || typeof path !== 'string') {
    throw new FirebaseMcpError(
      ErrorType.INVALID_ARGUMENT,
      'Document path must be a non-empty string'
    );
  }

  // Document path must have even number of segments
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0 || segments.length % 2 !== 0) {
    throw new FirebaseMcpError(
      ErrorType.INVALID_ARGUMENT,
      'Invalid document path format. Must be in format: collection/doc'
    );
  }

  // Each segment must be non-empty and valid
  for (const segment of segments) {
    if (!segment.trim()) {
      throw new FirebaseMcpError(
        ErrorType.INVALID_ARGUMENT,
        'Document path segments cannot be empty'
      );
    }
    if (segment.includes('//')) {
      throw new FirebaseMcpError(
        ErrorType.INVALID_ARGUMENT,
        'Document path cannot contain consecutive slashes'
      );
    }
  }
}

/**
 * Validates query parameters
 */
export function validateQueryParams(params: Record<string, any>) {
  const validOperators = ['==', '!=', '<', '<=', '>', '>=', 'array-contains', 'in', 'not-in'];
  
  if (params.where) {
    if (!Array.isArray(params.where)) {
      throw new FirebaseMcpError(
        ErrorType.INVALID_ARGUMENT,
        'Query where clause must be an array'
      );
    }

    for (const [field, operator, value] of params.where) {
      if (typeof field !== 'string' || !field.trim()) {
        throw new FirebaseMcpError(
          ErrorType.INVALID_ARGUMENT,
          'Query field must be a non-empty string'
        );
      }

      if (!validOperators.includes(operator)) {
        throw new FirebaseMcpError(
          ErrorType.INVALID_ARGUMENT,
          `Invalid query operator: ${operator}. Valid operators are: ${validOperators.join(', ')}`
        );
      }

      if (value === undefined || value === null) {
        throw new FirebaseMcpError(
          ErrorType.INVALID_ARGUMENT,
          'Query value cannot be null or undefined'
        );
      }
    }
  }

  if (params.orderBy) {
    if (!Array.isArray(params.orderBy)) {
      throw new FirebaseMcpError(
        ErrorType.INVALID_ARGUMENT,
        'Query orderBy must be an array'
      );
    }

    for (const [field, direction] of params.orderBy) {
      if (typeof field !== 'string' || !field.trim()) {
        throw new FirebaseMcpError(
          ErrorType.INVALID_ARGUMENT,
          'OrderBy field must be a non-empty string'
        );
      }

      if (direction && !['asc', 'desc'].includes(direction)) {
        throw new FirebaseMcpError(
          ErrorType.INVALID_ARGUMENT,
          'OrderBy direction must be either "asc" or "desc"'
        );
      }
    }
  }

  if (params.limit !== undefined) {
    if (typeof params.limit !== 'number' || params.limit < 0) {
      throw new FirebaseMcpError(
        ErrorType.INVALID_ARGUMENT,
        'Query limit must be a non-negative number'
      );
    }
  }
}

/**
 * Validates batch operations
 */
export function validateBatchOperations(operations: any[]) {
  if (!Array.isArray(operations)) {
    throw new FirebaseMcpError(
      ErrorType.INVALID_ARGUMENT,
      'Batch operations must be an array'
    );
  }

  if (operations.length === 0) {
    throw new FirebaseMcpError(
      ErrorType.INVALID_ARGUMENT,
      'Batch operations array cannot be empty'
    );
  }

  if (operations.length > 500) {
    throw new FirebaseMcpError(
      ErrorType.INVALID_ARGUMENT,
      'Batch operations cannot exceed 500 operations'
    );
  }

  for (const op of operations) {
    if (!op.type || !op.path || !op.data) {
      throw new FirebaseMcpError(
        ErrorType.INVALID_ARGUMENT,
        'Each batch operation must have type, path, and data properties'
      );
    }

    if (!['set', 'update', 'delete'].includes(op.type)) {
      throw new FirebaseMcpError(
        ErrorType.INVALID_ARGUMENT,
        'Invalid batch operation type. Must be one of: set, update, delete'
      );
    }

    if (op.type !== 'delete') {
      validateDocumentData(op.data);
    }

    validateDocumentPath(op.path);
  }
}

/**
 * Validates document data
 */
export function validateDocumentData(data: any) {
  if (!data || typeof data !== 'object') {
    throw new FirebaseMcpError(
      ErrorType.INVALID_ARGUMENT,
      'Document data must be a non-null object'
    );
  }

  // Check for unsupported types in Firestore
  function checkValue(value: any, path: string[] = []) {
    if (value === undefined) {
      throw new FirebaseMcpError(
        ErrorType.INVALID_ARGUMENT,
        `Document data cannot contain undefined values (at ${path.join('.')})`
      );
    }

    if (value === null) return;

    if (Array.isArray(value)) {
      value.forEach((item, index) => checkValue(item, [...path, index.toString()]));
      return;
    }

    if (typeof value === 'object') {
      Object.entries(value).forEach(([key, val]) => checkValue(val, [...path, key]));
      return;
    }

    const type = typeof value;
    if (!['string', 'number', 'boolean'].includes(type)) {
      throw new FirebaseMcpError(
        ErrorType.INVALID_ARGUMENT,
        `Unsupported value type ${type} in document data (at ${path.join('.')})`
      );
    }
  }

  checkValue(data);
} 