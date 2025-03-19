# Firebase & MCP SDK Integration Best Practices (2025)

This document outlines the latest best practices for integrating Firebase services with the Model Context Protocol (MCP) SDK. It draws from official Firebase documentation, MCP SDK specifications, and real-world implementation examples.

## Table of Contents
1. [Introduction to MCP & Firebase Integration](#introduction-to-mcp--firebase-integration)
2. [Server Architecture](#server-architecture)
3. [Firebase Services Integration](#firebase-services-integration)
4. [Data Modeling Best Practices](#data-modeling-best-practices)
5. [Authentication & Security](#authentication--security)
6. [Error Handling](#error-handling)
7. [Rate Limiting](#rate-limiting)
8. [Deployment & Configuration](#deployment--configuration)
9. [Testing & Debugging](#testing--debugging)
10. [Performance Optimization](#performance-optimization)
11. [Advanced Techniques](#advanced-techniques)
12. [References](#references)

## Introduction to MCP & Firebase Integration

The Model Context Protocol (MCP) provides a standardized way for AI models to access external data and functionality. Firebase offers a suite of cloud services that can be exposed through MCP:

- **Firestore**: Document database for storing and querying data
- **Authentication**: User management and identity verification
- **Cloud Storage**: File storage and retrieval
- **Cloud Functions**: Serverless computing for business logic

Integrating Firebase with MCP allows AI assistants to:
- Access real-time data from Firestore
- Perform user authentication and authorization
- Store and retrieve files
- Execute complex business logic with transactional guarantees

## Server Architecture

### MCP Server Implementation

The recommended architecture for a Firebase MCP server follows these principles:

1. **Service Separation**: Create dedicated modules for each Firebase service:
   - `firebase-config.ts`: Core configuration and initialization
   - `firestore-tools.ts`: Firestore operations
   - `auth-tools.ts`: Authentication operations
   - `storage-tools.ts`: Storage operations

2. **Type Safety**: Define TypeScript interfaces for all parameters and responses:
   ```typescript
   interface FirestoreAddDocumentParams {
     collection: string;
     data: Record<string, any>;
   }
   
   interface McpResponse {
     content: Array<{ type: string; text: string }>;
     isError?: boolean;
     errorType?: string;
   }
   ```

3. **Error Handling**: Implement consistent error handling across all tools:
   ```typescript
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
   ```

4. **Tool Registration**: Use the appropriate parameter schema format:
   ```typescript
   server.tool('firestore_add_document', {
     collection: { type: 'string' },
     data: { type: 'object' }
   }, firestore_add_document);
   ```

### MCP SDK Integration

The latest MCP SDK (v1.7.0+) requires specific patterns for server registration:

1. **Server Initialization**:
   ```typescript
   const server = new McpServer({
     name: 'firebase-mcp',
     version: '1.0.0'
   });
   ```

2. **Transport Configuration**:
   ```typescript
   // For stdio-based transport (most common)
   const transport = new StdioServerTransport();
   await server.connect(transport);
   
   // For HTTP/SSE-based transport
   const app = express();
   app.get("/sse", async (req, res) => {
     const transport = new SSEServerTransport("/messages", res);
     await server.connect(transport);
   });
   ```

## Firebase Services Integration

### Firestore Integration

1. **Document Operations**:
   - `firestore_add_document`: Add new documents
   - `firestore_get_document`: Retrieve documents
   - `firestore_query_documents`: Query with filters
   - `firestore_update_document`: Update existing documents
   - `firestore_delete_document`: Delete documents
   - `firestore_batch_operations`: Execute multiple operations atomically

2. **Parameter Validation**:
   ```typescript
   export async function firestore_add_document(
     params: { collection: string; data: Record<string, any> }
   ): Promise<McpResponse> {
     // Validate collection path
     if (!params.collection) {
       throw new FirebaseMcpError(
         ErrorType.VALIDATION,
         "Collection path is required"
       );
     }
     // Validate document data
     if (!params.data || typeof params.data !== 'object') {
       throw new FirebaseMcpError(
         ErrorType.VALIDATION,
         "Document data must be a valid object"
       );
     }
     
     // Proceed with operation...
   }
   ```

3. **Response Format**:
   ```typescript
   return {
     content: [{
       type: 'text',
       text: JSON.stringify({
         id: docRef.id,
         collection: params.collection,
         message: 'Document added successfully'
       })
     }]
   };
   ```

### Authentication Integration

1. **User Operations**:
   - `auth_create_user`: Register new users
   - `auth_sign_in`: Authenticate users
   - `auth_sign_out`: End user sessions
   - `auth_update_profile`: Modify user profiles
   - `auth_delete_user`: Remove user accounts

2. **Security Checks**:
   ```typescript
   export async function auth_list_users(
     params: Record<string, never>,
     extra: McpHandlerExtra
   ): Promise<McpResponse> {
     // Check if user is authenticated and has admin role
     if (!isAdmin(extra)) {
       throw new FirebaseMcpError(
         ErrorType.AUTHORIZATION,
         'Only admin users can list users'
       );
     }
     
     // Proceed with operation...
   }
   ```

### Storage Integration

1. **File Operations**:
   - `storage_upload_file`: Upload files
   - `storage_get_download_url`: Generate download URLs
   - `storage_delete_file`: Remove files
   - `storage_list_files`: Browse directories
   - `storage_get_metadata`: Retrieve file information

2. **Metadata Handling**:
   ```typescript
   export async function storage_get_metadata(
     params: { path: string }
   ): Promise<McpResponse> {
     try {
       const fileRef = storage.bucket().file(params.path);
       const [metadata] = await fileRef.getMetadata();
       
       return {
         content: [{
           type: 'text',
           text: JSON.stringify({
             name: metadata.name,
             contentType: metadata.contentType,
             size: metadata.size,
             updated: metadata.updated,
             md5Hash: metadata.md5Hash,
             customMetadata: metadata.metadata || {}
           })
         }]
       };
     } catch (error) {
       // Error handling...
     }
   }
   ```

## Data Modeling Best Practices

### Document Structure

Follow Firestore best practices when designing your data model:

1. **Document Size**: Keep documents under 1MB (hard limit)
2. **Denormalization**: Consider denormalizing frequently accessed data
3. **Field Naming**: Avoid special characters in field names
   - Problematic: `.`, `[`, `]`, `*`, `` ` ``
4. **Document IDs**:
   - Avoid sequential IDs to prevent hotspotting
   - Use auto-generated IDs for better distribution
   - Use custom IDs only when necessary for lookups

### Collection Organization

Choose the right structure for your collections:

1. **Root-Level Collections**:
   - Best for many-to-many relationships
   - Enables powerful querying
   - Example: `users`, `products`, `orders`

2. **Subcollections**:
   - Use for hierarchical data
   - Doesn't increase parent document size
   - Example: `users/{userId}/addresses/{addressId}`

3. **Nested Data**:
   - For simple, fixed lists
   - Limited to 1MB total document size
   - Example: User preferences as embedded object

### MCP Response Formatting

When returning Firestore data through MCP:

1. **Document Transformation**:
   ```typescript
   const docData = doc.data();
   return {
     content: [{
       type: 'text',
       text: JSON.stringify({
         id: doc.id,
         ...docData,
         // Optional: Format timestamps and references
         created: docData.created?.toDate?.()?.toISOString()
       })
     }]
   };
   ```

2. **Collection Handling**:
   ```typescript
   const results = snapshot.docs.map(doc => ({
     id: doc.id,
     ...doc.data()
   }));
   
   return {
     content: [{
       type: 'text',
       text: JSON.stringify({
         collection: params.collection,
         count: results.length,
         results,
         // Include pagination info
         pagination: {
           hasMore: snapshot.docs.length === effectiveLimit,
           lastDocumentId: lastDoc?.id
         }
       })
     }]
   };
   ```

## Authentication & Security

### Service Account Setup

1. **Initialize Firebase Admin SDK**:
   ```typescript
   import * as admin from 'firebase-admin';
   import { getFirestore } from 'firebase-admin/firestore';
   import { getAuth } from 'firebase-admin/auth';
   import { getStorage } from 'firebase-admin/storage';
   
   // Initialize using service account
   export function initializeFirebaseAdmin(): void {
     if (admin.apps.length === 0) {
       const serviceAccountPath = process.env.SERVICE_ACCOUNT_KEY_PATH;
       if (!serviceAccountPath) {
         throw new Error('SERVICE_ACCOUNT_KEY_PATH environment variable not set');
       }
       
       const serviceAccount = require(serviceAccountPath);
       admin.initializeApp({
         credential: admin.credential.cert(serviceAccount),
         storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.appspot.com`
       });
     }
   }
   
   export const db = getFirestore();
   export const auth = getAuth();
   export const storage = getStorage();
   ```

2. **Authorization Checks**:
   ```typescript
   interface McpHandlerExtra {
     user?: {
       uid?: string;
       roles?: string[];
     };
   }
   
   function isAdmin(extra: McpHandlerExtra): boolean {
     return extra.user?.roles?.includes('admin') || false;
   }
   
   function isAuthenticated(extra: McpHandlerExtra): boolean {
     return !!extra.user?.uid;
   }
   
   function isResourceOwner(extra: McpHandlerExtra, ownerId: string): boolean {
     return extra.user?.uid === ownerId;
   }
   ```

3. **Security Rules Check**:
   ```typescript
   export function checkCollectionAccess(
     collection: string, 
     operation: 'read' | 'write',
     extra: McpHandlerExtra
   ): void {
     // Check role-based access
     if (operation === 'write' && !isAdmin(extra) && !WRITABLE_COLLECTIONS.includes(collection)) {
       throw new FirebaseMcpError(
         ErrorType.AUTHORIZATION,
         `You don't have permission to ${operation} in collection '${collection}'`
       );
     }
     
     // Check user-specific collections
     if (collection.startsWith('users/') && !collection.startsWith(`users/${extra.user?.uid}/`)) {
       if (!isAdmin(extra)) {
         throw new FirebaseMcpError(
           ErrorType.AUTHORIZATION,
           'You can only access your own user data'
         );
       }
     }
   }
   ```

## Error Handling

### Error Classification

Categorize errors for consistent user experience:

```typescript
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
  FIREBASE = 'firebase_error'
}
```

### Error Response Format

Format error responses consistently:

```typescript
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
      type: 'text',
      text: errorMessage
    }],
    isError: true,
    errorType
  };
}
```

### Error Handling Middleware

Wrap handlers with consistent error handling:

```typescript
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
```

## Rate Limiting

Implement rate limiting to protect your Firebase resources:

```typescript
export class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(options?: { maxRequests?: number; windowMs?: number }) {
    this.maxRequests = options?.maxRequests || 100; // Default: 100 requests
    this.windowMs = options?.windowMs || 60000;     // Default: 1 minute window
  }

  check(key: string): boolean {
    try {
      this.checkRateLimit(key);
      return true;
    } catch (error) {
      return false;
    }
  }

  private checkRateLimit(key: string): void {
    const now = Date.now();
    let record = this.requests.get(key);

    // Clean up expired records
    this.cleanup();

    if (!record || now >= record.resetTime) {
      // First request or window expired, create new record
      record = {
        count: 1,
        resetTime: now + this.windowMs
      };
      this.requests.set(key, record);
      return;
    }

    // Increment request count
    record.count++;

    // Check if limit exceeded
    if (record.count > this.maxRequests) {
      const waitTime = Math.ceil((record.resetTime - now) / 1000);
      throw new FirebaseMcpError(
        ErrorType.RATE_LIMIT,
        `Rate limit exceeded. Please try again in ${waitTime} seconds.`
      );
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.requests.entries()) {
      if (now >= record.resetTime) {
        this.requests.delete(key);
      }
    }
  }
}

// Create rate limiters for different services
export const firestoreRateLimiter = new RateLimiter({ maxRequests: 200, windowMs: 60000 });
export const authRateLimiter = new RateLimiter({ maxRequests: 50, windowMs: 60000 });
export const storageRateLimiter = new RateLimiter({ maxRequests: 100, windowMs: 60000 });
```

## Deployment & Configuration

### Environment Variables

Configure your server using environment variables:

```typescript
// Required environment variables
export const requiredEnvVars = [
  'SERVICE_ACCOUNT_KEY_PATH'
];

// Optional environment variables with defaults
export const envConfig = {
  FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS ? 
    parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) : 60000,
  RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS ? 
    parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) : 100
};

// Validate required environment variables
export function validateEnv(): void {
  const missing = requiredEnvVars.filter(name => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
```

### Docker Deployment

For containerized deployment:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY dist/ ./dist/

# Set environment variables
ENV NODE_ENV=production

# Start the server
CMD ["node", "dist/index.js"]
```

### LLM Client Configuration

Configure MCP in different LLM clients:

```json
{
  "firebase-mcp": {
    "command": "npx",
    "args": ["-y", "@your-org/firebase-mcp"],
    "env": {
      "SERVICE_ACCOUNT_KEY_PATH": "/path/to/serviceAccountKey.json",
      "FIREBASE_STORAGE_BUCKET": "your-project-id.appspot.com"
    },
    "disabled": false,
    "autoApprove": []
  }
}
```

## Testing & Debugging

### Firebase Emulator Integration

Test against Firebase emulators:

```typescript
export function initializeFirebaseForTesting(): void {
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
  process.env.FIREBASE_STORAGE_EMULATOR_HOST = 'localhost:9199';
  
  admin.initializeApp({
    projectId: 'demo-project-id',
    credential: admin.credential.applicationDefault()
  });
}
```

### Logging

Implement structured logging:

```typescript
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      stderrLevels: ['error', 'warn']
    })
  ]
});

// Important: For MCP, all logs must go to stderr
// stdout is reserved for protocol messages
```

## Performance Optimization

### Batch Operations

Optimize multiple operations with batching:

```typescript
export async function firestore_batch_operations(
  params: { operations: BatchOperation[] }
): Promise<McpResponse> {
  // Check batch size for performance
  if (params.operations.length > 500) {
    logger.warn("Batch operations with more than 500 operations may impact performance");
  }
  
  const batch = db.batch();
  
  for (const op of params.operations) {
    const { type, collection, documentId, data } = op;
    
    const docRef = db.collection(collection).doc(documentId);
    
    switch (type) {
      case 'set':
        if (!data) throw new FirebaseMcpError(
          ErrorType.VALIDATION,
          "Data is required for 'set' operations"
        );
        batch.set(docRef, data, { merge: op.merge || false });
        break;
      case 'update':
        if (!data) throw new FirebaseMcpError(
          ErrorType.VALIDATION,
          "Data is required for 'update' operations"
        );
        batch.update(docRef, data);
        break;
      case 'delete':
        batch.delete(docRef);
        break;
    }
  }
  
  await batch.commit();
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        message: `Successfully executed ${params.operations.length} operations`,
        operations: params.operations.map(op => ({
          type: op.type,
          collection: op.collection,
          documentId: op.documentId
        }))
      })
    }]
  };
}
```

### Query Optimization

Implement efficient queries:

```typescript
export async function firestore_query_documents(
  params: {
    collection: string;
    query?: {
      where?: Array<[string, string, any]>;
      orderBy?: Array<[string, 'asc' | 'desc']>;
      limit?: number;
      startAfter?: any;
      endBefore?: any;
    }
  }
): Promise<McpResponse> {
  // Performance warnings
  if (params.query?.where?.some(([_, operator]) => 
      operator === '!=' || operator === 'not-in')) {
    logger.warn("Using '!=' or 'not-in' operators may lead to full collection scans");
  }
  
  if (params.query?.limit && params.query.limit > 100) {
    logger.warn("Large query limits may impact performance");
  }
  
  let query = db.collection(params.collection);
  
  // Apply filters
  if (params.query?.where) {
    for (const [field, operator, value] of params.query.where) {
      query = query.where(field, operator as FirebaseFirestore.WhereFilterOp, value);
    }
  }
  
  // Apply sorting
  if (params.query?.orderBy) {
    for (const [field, direction = 'asc'] of params.query.orderBy) {
      query = query.orderBy(field, direction);
    }
  }
  
  // Apply pagination
  if (params.query?.startAfter) {
    query = query.startAfter(params.query.startAfter);
  }
  
  if (params.query?.endBefore) {
    query = query.endBefore(params.query.endBefore);
  }
  
  // Always use a limit to prevent large result sets
  const limit = params.query?.limit || 50;
  query = query.limit(limit);
  
  // Execute query
  const snapshot = await query.get();
  const lastDoc = snapshot.docs[snapshot.docs.length - 1];
  
  // Return formatted results
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        collection: params.collection,
        count: snapshot.docs.length,
        results: snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })),
        pagination: {
          hasMore: snapshot.docs.length === limit,
          lastDocumentId: lastDoc?.id || null
        }
      })
    }]
  };
}
```

## Advanced Techniques

### Transactions

Implement atomic operations with transactions:

```typescript
export async function firestore_run_transaction(
  params: {
    operations: Array<{
      type: 'get' | 'set' | 'update' | 'delete';
      collection: string;
      documentId: string;
      data?: Record<string, any>;
    }>
  }
): Promise<McpResponse> {
  const result = await db.runTransaction(async (transaction) => {
    const transactionResults = [];
    
    for (const op of params.operations) {
      const docRef = db.collection(op.collection).doc(op.documentId);
      
      switch (op.type) {
        case 'get': {
          const doc = await transaction.get(docRef);
          transactionResults.push({
            type: 'get',
            collection: op.collection,
            documentId: op.documentId,
            exists: doc.exists,
            data: doc.exists ? doc.data() : null
          });
          break;
        }
        case 'set': {
          if (!op.data) throw new FirebaseMcpError(
            ErrorType.VALIDATION,
            "Data is required for 'set' operations"
          );
          transaction.set(docRef, op.data);
          transactionResults.push({
            type: 'set',
            collection: op.collection,
            documentId: op.documentId
          });
          break;
        }
        case 'update': {
          if (!op.data) throw new FirebaseMcpError(
            ErrorType.VALIDATION,
            "Data is required for 'update' operations"
          );
          transaction.update(docRef, op.data);
          transactionResults.push({
            type: 'update',
            collection: op.collection,
            documentId: op.documentId
          });
          break;
        }
        case 'delete': {
          transaction.delete(docRef);
          transactionResults.push({
            type: 'delete',
            collection: op.collection,
            documentId: op.documentId
          });
          break;
        }
      }
    }
    
    return transactionResults;
  });
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        message: 'Transaction completed successfully',
        operations: result
      })
    }]
  };
}
```

### Custom Claims

Implement role-based access control:

```typescript
export async function auth_set_custom_claims(
  params: {
    uid: string;
    claims: Record<string, any>;
  }
): Promise<McpResponse> {
  // Check rate limiting
  if (!authRateLimiter.check('set_custom_claims')) {
    throw new FirebaseMcpError(
      ErrorType.RATE_LIMIT,
      'Too many custom claims requests. Please try again later.'
    );
  }
  
  try {
    await auth.setCustomUserClaims(params.uid, params.claims);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          message: `Custom claims for user ${params.uid} successfully updated`,
          claims: params.claims
        })
      }]
    };
  } catch (error) {
    logger.error('Error setting custom claims:', error);
    throw new FirebaseMcpError(
      ErrorType.FIREBASE,
      getErrorMessage(error)
    );
  }
}
```

### Real-time Updates (Future Direction)

While MCP does not currently support real-time updates directly, you can design your architecture to support future capabilities:

```typescript
// This is a conceptual example of how real-time updates might be implemented
// in a future version of the MCP protocol
export async function firestore_subscribe_document(
  params: {
    collection: string;
    documentId: string;
  },
  callback: (document: any) => void
): Promise<void> {
  const docRef = db.collection(params.collection).doc(params.documentId);
  
  const unsubscribe = docRef.onSnapshot((doc) => {
    if (doc.exists) {
      callback({
        id: doc.id,
        ...doc.data()
      });
    } else {
      callback(null);
    }
  }, (error) => {
    logger.error('Error in document subscription:', error);
  });
  
  // Return a function to unsubscribe when needed
  return unsubscribe;
}
```

## References

1. Firebase Documentation
   - [Firestore Best Practices](https://firebase.google.com/docs/firestore/best-practices)
   - [Firebase Security Rules](https://firebase.google.com/docs/rules)
   - [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)

2. Model Context Protocol
   - [MCP Specification](https://modelcontextprotocol.io/specification)
   - [TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) (v1.7.0)
   - [Python SDK](https://github.com/modelcontextprotocol/python-sdk)

3. Implementation Examples
   - [Firebase MCP Server](https://github.com/gannonh/firebase-mcp)
   - [TypeScript SDK Examples](https://github.com/modelcontextprotocol/typescript-sdk/tree/main/examples)

4. Additional Resources
   - [Google Cloud Firestore Documentation](https://cloud.google.com/firestore/docs)
   - [Firebase Blog - Best Practices](https://firebase.blog/category/best-practices/)
   - [MCP Workshop Materials](https://modelcontextprotocol.io/tutorials) 