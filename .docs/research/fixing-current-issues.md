# Firebase MCP Server - Current Issues and Fixes

Based on the analysis of the current errors and the research into MCP SDK and Firebase best practices, here are the issues identified and recommended fixes:

## Current Issues

1. **Type Declarations**: 
   - Missing `UserRecord` type import from Firebase Admin Auth
   - Incorrect import path for MCP SDK types

2. **Error Handling**:
   - Incorrect argument count for `createErrorResponse` calls
   - Inconsistent error handling patterns across tools

3. **MCP SDK Version Compatibility**:
   - The server uses deprecated patterns for registering tools
   - Parameter schemas don't match the required format

4. **Firebase Integration**:
   - Possible duplication of `db` export causing TypeScript errors

## Recommended Fixes

### 1. Fix Firebase Admin Types

The Firebase Admin SDK has its own type definitions for `UserRecord`. We need to correctly import these types:

```typescript
// Replace:
import type { UserRecord } from 'firebase-admin/auth';

// With:
import * as admin from 'firebase-admin';
// Then use as: admin.auth.UserRecord
```

### 2. Correct Error Handling Pattern

The `createErrorResponse` function is being called with an incorrect number of arguments. The function should be used as follows:

```typescript
// Incorrect usage:
return createErrorResponse(
  `Error retrieving user: ${errorMessage}`,
  ErrorType.FIREBASE,
  error
);

// Correct usage:
throw new FirebaseMcpError(
  ErrorType.FIREBASE,
  getErrorMessage(error)
);
```

Alternatively, we can update our `createErrorResponse` function to accept all three arguments:

```typescript
export function createErrorResponse(
  messageOrError: string | unknown, 
  errorType: ErrorType = ErrorType.INTERNAL,
  originalError?: unknown
) {
  let message = typeof messageOrError === 'string' 
    ? messageOrError
    : getErrorMessage(messageOrError);
    
  // Rest of the implementation...
}
```

### 3. Update Tool Registrations

The MCP SDK v1.7.0 requires tool registrations to use a specific format:

```typescript
// Update all tool registrations from:
server.tool('firestore_add_document', 'Add a document to a Firestore collection', firestore_add_document);

// To:
server.tool('firestore_add_document', {
  collection: { type: 'string' },
  data: { type: 'object' }
}, firestore_add_document);
```

### 4. Fix Duplicate DB Exports

The `db` variable is being declared in multiple places, leading to TypeScript errors:

1. Check `src/firebase.ts` which is exporting a `db` variable
2. Check `src/types/firebase.d.ts` which has another declaration
3. Delete the duplicate type declaration or rename one of the exports

### 5. Rate Limiter Implementation

Update the `RateLimiter` class to include a `check` method:

```typescript
export class RateLimiter {
  // ...existing code...

  check(key: string): boolean {
    try {
      this.checkRateLimit(key);
      return true;
    } catch (error) {
      return false;
    }
  }

  private checkRateLimit(key: string): void {
    // ...existing implementation...
  }
}
```

## Implementation Plan

1. **Fix DB Duplication**:
   - Remove the duplicate declaration in `src/types/firebase.d.ts`

2. **Update Error Handler**:
   - Add the missing `AUTHORIZATION` and `FIREBASE` error types
   - Implement `createSuccessResponse` function
   - Fix the error handling pattern to handle native errors correctly

3. **Update Rate Limiter**:
   - Add the `check` method to `RateLimiter` class

4. **Fix Tool Functions**:
   - Update function signatures to use consistent parameter and return types
   - Use proper Firebase Admin SDK imports
   - Implement consistent error handling

5. **Update Server Registration**:
   - Update all tool registrations to use the correct parameter schema format
   - Ensure all tools are properly typed

By addressing these issues, we'll resolve the current errors and ensure compatibility with the latest MCP SDK while following Firebase best practices. 