# Firebase & Firestore Best Practices for MCP Servers

This guide covers best practices for implementing Firebase and Firestore integration in Model Context Protocol (MCP) servers. It's based on official Firebase documentation and practical implementation strategies.

## Table of Contents

1. [Data Modeling Best Practices](#data-modeling-best-practices)
2. [Query Performance Optimization](#query-performance-optimization)
3. [Security Best Practices](#security-best-practices)
4. [Authentication Best Practices](#authentication-best-practices)
5. [Storage Best Practices](#storage-best-practices)
6. [MCP Server Implementation](#mcp-server-implementation)
7. [Performance Optimization](#performance-optimization)
8. [Error Handling](#error-handling)
9. [Code Examples](#code-examples)

## Data Modeling Best Practices

### Document Structure

- **Document Size:** Keep documents small; aim for < 1MB per document (hard limit is 1MB)
- **Denormalization:** For frequently accessed data, consider denormalization to reduce queries
- **Field Naming:** Avoid special characters in field names (`.`, `[`, `]`, `*`, `` ` ``)
- **Document IDs:** 
  - Avoid sequential IDs (e.g., `user1`, `user2`) to prevent hotspotting
  - Prefer auto-generated document IDs for better distribution
  - Use custom IDs only when necessary (e.g., for lookups)

### Collection Organization

When designing your Firestore database, consider these structures:

1. **Root-Level Collections**
   - Best for many-to-many relationships
   - Provides powerful querying
   - Simplifies security rules
   - Example: `users`, `products`, `orders`

2. **Subcollections**
   - Use for hierarchical data
   - Doesn't increase parent document size
   - Supports collection group queries
   - Example: `users/{userId}/addresses/{addressId}`

3. **Nested Data**
   - Useful for simple, fixed lists of data
   - Limited to 1MB total document size
   - Consider alternatives if data grows over time
   - Example: User profile with small preferences object

### Implementation in MCP

```typescript
// Helper function for generating non-sequential document IDs
export function generateFirestoreId(prefix?: string): string {
  const randomId = Math.random().toString(36).substring(2, 15);
  return prefix ? `${prefix}_${randomId}` : randomId;
}

// MCP tool for creating documents with best practices
server.tool(
  "create_document",
  {
    collection: z.string().min(1),
    data: z.record(z.any()),
    useCustomId: z.boolean().optional().default(false),
    customId: z.string().optional()
  },
  async (args) => {
    try {
      let docId;
      
      if (args.useCustomId && args.customId) {
        // Check if custom ID follows best practices
        if (/^\d+$/.test(args.customId) || /^[a-zA-Z]+\d+$/.test(args.customId)) {
          logger.warn("Using sequential IDs may lead to hotspotting issues");
        }
        docId = args.customId;
        await firestoreService.setDocument(args.collection, docId, args.data);
      } else {
        // Use Firestore's auto-generated IDs
        docId = await firestoreService.addDocument(args.collection, args.data);
      }
      
      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify({
            id: docId,
            collection: args.collection,
            message: "Document created successfully"
          }, null, 2)
        }]
      };
    } catch (error) {
      // Error handling
    }
  }
);
```

## Query Performance Optimization

### Query Best Practices

- **Use Indexes:** Create composite indexes for complex queries
- **Query Limits:** Always use the `.limit()` method to restrict result size
- **Avoid `!=` and `not-in`:** These operators require scanning all documents
- **Use Cursors:** Instead of offset-based pagination, use cursors
- **Minimize Field Return:** Use `.select()` to return only needed fields
- **Compound Queries:** Optimize compound queries with proper indexing

### Implementation in MCP

```typescript
server.tool(
  "optimized_query",
  {
    collection: z.string().min(1),
    filters: z.array(
      z.tuple([
        z.string(),
        z.enum(['==', '<', '<=', '>', '>=', 'array-contains', 'array-contains-any', 'in']),
        z.any()
      ])
    ).optional(),
    orderBy: z.array(
      z.tuple([
        z.string(),
        z.enum(['asc', 'desc']).optional()
      ])
    ).optional(),
    limit: z.number().min(1).max(1000).default(50),
    select: z.array(z.string()).optional(),
    startAfter: z.any().optional(),
  },
  async (args) => {
    // Implementation with performance warnings
    if (args.filters && args.filters.some(f => f[1] === '!=' || f[1] === 'not-in')) {
      logger.warn("Using '!=' or 'not-in' operators may lead to full collection scans");
    }
    
    if (args.limit > 100) {
      logger.warn("Large query limits may impact performance");
    }
    
    // Query implementation
    // ...
  }
);
```

## Security Best Practices

### Firestore Rules

- **Default Deny:** Start with denying all access, then add specific allow rules
- **Authenticate First:** Always check authentication before authorization
- **Data Validation:** Validate data structure in security rules
- **Field-Level Security:** Control access to specific fields
- **Rate Limiting:** Implement rate limiting in your MCP server

### Implementation in MCP

```typescript
// Rate limiting middleware
const rateLimiter = new RateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 100  // 100 requests per minute
});

// Security validation function
function validateSecurity(collection: string, operation: 'read' | 'write'): void {
  // Check if in read-only mode and trying to write
  if (config.security.readOnly && operation === 'write') {
    throw new Error('Server is in read-only mode. Write operations are not allowed.');
  }
  
  // Check collection access restrictions
  if (config.security.allowedCollections?.length && 
      !config.security.allowedCollections.includes(collection)) {
    throw new Error(`Access to collection '${collection}' is not allowed.`);
  }
  
  // Check rate limiting
  if (!rateLimiter.check(collection + '_' + operation)) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }
}

// Tool for managing security rules
server.tool(
  "update_security_rules",
  {
    rules: z.string()
  },
  async (args) => {
    // Implementation for updating security rules
    // ...
  }
);
```

## Authentication Best Practices

### Firebase Auth

- **Custom Claims:** Use for role-based access control
- **Token Revocation:** Provide methods to revoke tokens when needed
- **User Management:** Follow best practices for user data storage
- **Session Management:** Don't store sessions in Firestore; use Firebase Auth

### Implementation in MCP

```typescript
server.tool(
  "set_custom_claims",
  {
    uid: z.string().min(1),
    claims: z.record(z.any())
  },
  async (args) => {
    // Implementation for setting custom claims
    // ...
  }
);

server.tool(
  "revoke_user_tokens",
  {
    uid: z.string().min(1)
  },
  async (args) => {
    // Implementation for revoking tokens
    // ...
  }
);
```

## Storage Best Practices

### Firebase Storage

- **File Security:** Implement proper security rules for storage
- **Metadata:** Use metadata for file organization and search
- **Download URLs:** Generate short-lived download URLs
- **Upload URLs:** Use signed URLs for client-side uploads
- **File Organization:** Organize files in directories by user/purpose

### Implementation in MCP

```typescript
server.tool(
  "get_download_url",
  {
    path: z.string().min(1),
    expiresIn: z.number().min(60).max(86400).default(3600) // 1 hour default, max 24 hours
  },
  async (args) => {
    // Implementation for generating download URLs
    // ...
  }
);

server.tool(
  "get_upload_url",
  {
    path: z.string().min(1),
    contentType: z.string().default('application/octet-stream'),
    expiresIn: z.number().min(60).max(3600).default(300) // 5 minutes default, max 1 hour
  },
  async (args) => {
    // Implementation for generating upload URLs
    // ...
  }
);
```

## MCP Server Implementation

### Server Design

- **Service Separation:** Use separate service classes for Firestore, Auth, and Storage
- **Tool Registration:** Register tools with proper validation and error handling
- **Resource Exposure:** Use resources for exposing static or low-update-frequency data
- **Prompts:** Create useful prompt templates for common operations

### Configuration Best Practices

- **Environment Variables:** Support configuration via environment variables
- **Secure Credentials:** Store Firebase credentials securely
- **Flexible Configuration:** Support multiple configuration methods (env vars, config file, CLI args)
- **Default Security:** Set secure defaults for all options

```typescript
// Configuration loading with secure defaults
export function getConfig(args: string[] = []): ServerConfig {
  const configPath = process.env.CONFIG_FILE || path.join(process.cwd(), 'firebase-mcp-config.json');
  
  const fileConfig = loadFileConfig(configPath);
  const envConfig = loadEnvConfig();
  const argsConfig = parseArgs(args);

  return {
    ...defaultConfig,
    ...fileConfig,
    ...envConfig,
    ...argsConfig,
    security: {
      ...defaultConfig.security,
      ...(fileConfig.security || {}),
      ...(envConfig.security || {}),
      ...(argsConfig.security || {}),
    }
  };
}

// Default secure configuration
const defaultConfig: ServerConfig = {
  transport: 'stdio',
  port: 3000,
  security: {
    readOnly: false,
    disableAuth: false,
    disableStorage: false,
    rateLimitWindowMs: 60000,
    rateLimitMaxRequests: 100,
    logLevel: 'info'
  }
};
```

## Performance Optimization

### Optimizing Firestore Operations

- **Batch Operations:** Use batch operations for multiple writes
- **Transactions:** Use transactions for atomic read-write operations
- **Parallelization:** Perform independent operations in parallel
- **Caching:** Implement appropriate caching strategies
- **Index Management:** Create and manage indexes properly

### Implementation in MCP

```typescript
server.tool(
  "batch_write",
  {
    operations: z.array(
      z.object({
        type: z.enum(['set', 'update', 'delete']),
        collection: z.string().min(1),
        documentId: z.string().min(1),
        data: z.record(z.any()).optional(),
        merge: z.boolean().optional().default(false)
      })
    )
  },
  async (args) => {
    // Check batch size for performance
    if (args.operations.length > 500) {
      logger.warn("Batch operations with more than 500 operations may impact performance");
    }
    
    // Implementation for batch operations
    // ...
  }
);

server.tool(
  "run_transaction",
  {
    operations: z.array(
      z.object({
        type: z.enum(['get', 'set', 'update', 'delete']),
        collection: z.string().min(1),
        documentId: z.string().min(1),
        data: z.record(z.any()).optional(),
        merge: z.boolean().optional().default(false)
      })
    )
  },
  async (args) => {
    // Implementation for transactions
    // ...
  }
);
```

## Error Handling

### Best Practices

- **Structured Errors:** Use structured error responses
- **Error Types:** Categorize errors by type
- **User-Friendly Messages:** Provide user-friendly error messages
- **Logging:** Log detailed error information for debugging
- **Rate Limiting:** Handle rate limiting errors gracefully

### Implementation in MCP

```typescript
// Error types enum
export enum ErrorType {
  VALIDATION = 'validation_error',
  AUTHORIZATION = 'authorization_error',
  AUTHENTICATION = 'authentication_error',
  NOT_FOUND = 'not_found',
  FIREBASE = 'firebase_error',
  RATE_LIMIT = 'rate_limit',
  INTERNAL = 'internal_error'
}

// Create standardized error response
export function createErrorResponse(
  message: string, 
  type: ErrorType = ErrorType.INTERNAL,
  originalError?: unknown
): any {
  // Log detailed error for debugging
  if (originalError) {
    logger.error(`${type} error:`, originalError);
  } else {
    logger.error(`${type} error: ${message}`);
  }
  
  return {
    content: [{ 
      type: "text", 
      text: message
    }],
    isError: true,
    errorType: type
  };
}

// Error handling wrapper
export function withErrorHandling(fn: Function) {
  return async (args: any) => {
    try {
      return await fn(args);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Classify error type
      if (errorMessage.includes('not found')) {
        return createErrorResponse(errorMessage, ErrorType.NOT_FOUND, error);
      } else if (errorMessage.includes('permission denied') || errorMessage.includes('not allowed')) {
        return createErrorResponse(errorMessage, ErrorType.AUTHORIZATION, error);
      } else if (errorMessage.includes('unauthenticated')) {
        return createErrorResponse(errorMessage, ErrorType.AUTHENTICATION, error);
      } else if (errorMessage.includes('rate limit')) {
        return createErrorResponse(errorMessage, ErrorType.RATE_LIMIT, error);
      } else if (errorMessage.includes('validation')) {
        return createErrorResponse(errorMessage, ErrorType.VALIDATION, error);
      }
      
      return createErrorResponse(
        `An unexpected error occurred: ${errorMessage}`,
        ErrorType.INTERNAL,
        error
      );
    }
  };
}
```

## Code Examples

### Complete Firestore Service Implementation

```typescript
export class FirestoreServiceImpl implements FirestoreService {
  private db: FirebaseFirestore.Firestore;
  private securityConfig: SecurityConfig;
  
  constructor(db: FirebaseFirestore.Firestore, securityConfig: SecurityConfig) {
    this.db = db;
    this.securityConfig = securityConfig;
  }
  
  /**
   * Check if access to a collection is allowed
   */
  private checkCollectionAccess(collection: string): void {
    if (this.securityConfig.readOnly) {
      throw new Error('Server is in read-only mode. Write operations are not allowed.');
    }
    
    if (this.securityConfig.allowedCollections?.length && 
        !this.securityConfig.allowedCollections.includes(collection)) {
      throw new Error(`Access to collection '${collection}' is not allowed.`);
    }
  }
  
  async getDocument(collection: string, documentId: string): Promise<any> {
    if (this.securityConfig.allowedCollections?.length && 
        !this.securityConfig.allowedCollections.includes(collection)) {
      throw new Error(`Access to collection '${collection}' is not allowed.`);
    }
    
    const docRef = this.db.collection(collection).doc(documentId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      throw new Error(`Document '${documentId}' not found in collection '${collection}'`);
    }
    
    return { 
      id: doc.id,
      ...doc.data()
    };
  }
  
  async queryCollection(collection: string, options: QueryOptions = {}): Promise<QueryResult> {
    if (this.securityConfig.allowedCollections?.length && 
        !this.securityConfig.allowedCollections.includes(collection)) {
      throw new Error(`Access to collection '${collection}' is not allowed.`);
    }
    
    const { where, orderBy, limit, startAfter, startAt, endBefore, endAt } = options;
    let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = this.db.collection(collection);
    
    // Apply where clauses
    if (where && where.length > 0) {
      for (const [field, operator, value] of where) {
        query = query.where(field, operator, value);
      }
    }
    
    // Apply orderBy clauses
    if (orderBy && orderBy.length > 0) {
      for (const [field, direction = 'asc'] of orderBy) {
        query = query.orderBy(field, direction);
      }
    }
    
    // Apply pagination cursors
    if (startAfter) {
      query = query.startAfter(startAfter);
    } else if (startAt) {
      query = query.startAt(startAt);
    }
    
    if (endBefore) {
      query = query.endBefore(endBefore);
    } else if (endAt) {
      query = query.endAt(endAt);
    }
    
    // Apply limit - always use a limit to prevent large result sets
    const effectiveLimit = limit || 50; // Default limit to 50
    query = query.limit(effectiveLimit);
    
    const snapshot = await query.get();
    
    // Get last document for cursor-based pagination
    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
    
    const results = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return {
      collection,
      count: results.length,
      results,
      pagination: {
        hasMore: snapshot.docs.length === effectiveLimit,
        lastDocumentId: lastDoc ? lastDoc.id : null,
        lastDocumentData: lastDoc ? lastDoc.data() : null,
      }
    };
  }
  
  async addDocument(collection: string, data: any): Promise<string> {
    this.checkCollectionAccess(collection);
    
    const docRef = await this.db.collection(collection).add(data);
    return docRef.id;
  }
  
  async setDocument(collection: string, documentId: string, data: any, merge: boolean = false): Promise<void> {
    this.checkCollectionAccess(collection);
    
    await this.db.collection(collection).doc(documentId).set(data, { merge });
  }
  
  async updateDocument(collection: string, documentId: string, data: any): Promise<void> {
    this.checkCollectionAccess(collection);
    
    await this.db.collection(collection).doc(documentId).update(data);
  }
  
  async deleteDocument(collection: string, documentId: string): Promise<void> {
    this.checkCollectionAccess(collection);
    
    await this.db.collection(collection).doc(documentId).delete();
  }
  
  async batchWrite(operations: BatchOperation[]): Promise<void> {
    if (this.securityConfig.readOnly) {
      throw new Error('Server is in read-only mode. Write operations are not allowed.');
    }
    
    const batch = this.db.batch();
    
    for (const op of operations) {
      const { type, collection, documentId, data, merge } = op;
      
      // Check collection access for each operation
      if (this.securityConfig.allowedCollections?.length && 
          !this.securityConfig.allowedCollections.includes(collection)) {
        throw new Error(`Access to collection '${collection}' is not allowed.`);
      }
      
      const docRef = this.db.collection(collection).doc(documentId);
      
      switch (type) {
        case 'set':
          if (!data) throw new Error("Data is required for 'set' operations");
          batch.set(docRef, data, { merge: merge || false });
          break;
        case 'update':
          if (!data) throw new Error("Data is required for 'update' operations");
          batch.update(docRef, data);
          break;
        case 'delete':
          batch.delete(docRef);
          break;
      }
    }
    
    await batch.commit();
  }
  
  async runTransaction<T>(
    updateFunction: (transaction: FirebaseFirestore.Transaction) => Promise<T>
  ): Promise<T> {
    if (this.securityConfig.readOnly) {
      throw new Error('Server is in read-only mode. Write operations are not allowed.');
    }
    
    return this.db.runTransaction(updateFunction);
  }
  
  async listCollections(): Promise<string[]> {
    const collections = await this.db.listCollections();
    return collections.map(collection => collection.id);
  }
}
```

### MCP Tool Registration

```typescript
export function registerFirestoreHandlers(
  server: any,
  firestoreService: FirestoreService
): void {
  // Handler for get_document
  server.tool(
    "get_document", 
    GetDocumentSchema, 
    withErrorHandling(async (args: GetDocumentArgs) => {
      const { collection, documentId } = args;
      
      try {
        const document = await firestoreService.getDocument(collection, documentId);
        return createSuccessResponse(document);
      } catch (error) {
        // Error handling with proper error types
        const errorMessage = getErrorMessage(error);
        
        if (errorMessage.includes('not found')) {
          return createErrorResponse(
            `Document '${documentId}' not found in collection '${collection}'`,
            ErrorType.NOT_FOUND
          );
        }
        
        if (errorMessage.includes('not allowed')) {
          return createErrorResponse(
            errorMessage,
            ErrorType.AUTHORIZATION
          );
        }
        
        return createErrorResponse(
          `Error retrieving document: ${errorMessage}`,
          ErrorType.FIREBASE,
          error
        );
      }
    })
  );
  
  // Additional tool registrations...
}
```

By following these best practices, you'll create a robust, secure, and performant MCP server for Firebase and Firestore integration that follows industry standard patterns and official recommendations.
