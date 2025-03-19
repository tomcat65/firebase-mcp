import { z } from 'zod';
import { FirestoreService } from '../services/firebase-service.js';
import { createErrorResponse, createSuccessResponse, withErrorHandling, ErrorType, getErrorMessage } from '../utils/error-handler.js';
import { RateLimiter } from '../utils/rate-limiter.js';
import { logger } from '../utils/logger.js';

// Rate limiter for Firestore operations
const firestoreRateLimiter = new RateLimiter();

// Define Firestore tool schemas
export const GetDocumentSchema = z.object({
  collection: z.string().min(1),
  documentId: z.string().min(1)
});

export const QueryCollectionSchema = z.object({
  collection: z.string().min(1),
  where: z.array(
    z.tuple([
      z.string(),
      z.enum(['==', '<', '<=', '>', '>=', '!=', 'array-contains', 'array-contains-any', 'in', 'not-in']),
      z.any()
    ])
  ).optional(),
  orderBy: z.array(
    z.tuple([
      z.string(),
      z.enum(['asc', 'desc']).optional().default('asc')
    ])
  ).optional(),
  limit: z.number().positive().optional(),
  startAfter: z.any().optional(),
  startAt: z.any().optional(),
  endBefore: z.any().optional(),
  endAt: z.any().optional()
});

export const AddDocumentSchema = z.object({
  collection: z.string().min(1),
  data: z.record(z.any())
});

export const SetDocumentSchema = z.object({
  collection: z.string().min(1),
  documentId: z.string().min(1),
  data: z.record(z.any()),
  merge: z.boolean().optional().default(false)
});

export const UpdateDocumentSchema = z.object({
  collection: z.string().min(1),
  documentId: z.string().min(1),
  data: z.record(z.any())
});

export const DeleteDocumentSchema = z.object({
  collection: z.string().min(1),
  documentId: z.string().min(1)
});

export const BatchWriteSchema = z.object({
  operations: z.array(
    z.object({
      type: z.enum(['set', 'update', 'delete']),
      collection: z.string().min(1),
      documentId: z.string().min(1),
      data: z.record(z.any()).optional(),
      merge: z.boolean().optional().default(false)
    })
  )
});

export const DeleteCollectionSchema = z.object({
  collection: z.string().min(1),
  batchSize: z.number().positive().optional().default(100)
});

// Type definitions for args to provide proper typing
type GetDocumentArgs = z.infer<typeof GetDocumentSchema>;
type QueryCollectionArgs = z.infer<typeof QueryCollectionSchema>;
type AddDocumentArgs = z.infer<typeof AddDocumentSchema>;
type SetDocumentArgs = z.infer<typeof SetDocumentSchema>;
type UpdateDocumentArgs = z.infer<typeof UpdateDocumentSchema>;
type DeleteDocumentArgs = z.infer<typeof DeleteDocumentSchema>;
type BatchWriteArgs = z.infer<typeof BatchWriteSchema>;
type DeleteCollectionArgs = z.infer<typeof DeleteCollectionSchema>;

/**
 * Register Firestore tool handlers
 * @param server MCP server instance
 * @param firestoreService Firestore service instance
 */
export function registerFirestoreHandlers(
  server: any,
  firestoreService: FirestoreService
): void {
  // Handler for get_document
  server.tool(
    "get_document", 
    GetDocumentSchema, 
    withErrorHandling(async (args: GetDocumentArgs) => {
      // Check rate limiting
      if (!firestoreRateLimiter.check('get_document')) {
        return createErrorResponse(
          "Rate limit exceeded for get_document. Please try again later.",
          ErrorType.RATE_LIMIT
        );
      }
      
      const { collection, documentId } = args;
      
      try {
        const document = await firestoreService.getDocument(collection, documentId);
        return createSuccessResponse(document);
      } catch (error: unknown) {
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
  
  // Handler for query_collection
  server.tool(
    "query_collection", 
    QueryCollectionSchema, 
    withErrorHandling(async (args: QueryCollectionArgs) => {
      // Check rate limiting
      if (!firestoreRateLimiter.check('query_collection')) {
        return createErrorResponse(
          "Rate limit exceeded for query_collection. Please try again later.",
          ErrorType.RATE_LIMIT
        );
      }
      
      try {
        const result = await firestoreService.queryCollection(args.collection, {
          where: args.where,
          orderBy: args.orderBy,
          limit: args.limit,
          startAfter: args.startAfter,
          startAt: args.startAt,
          endBefore: args.endBefore,
          endAt: args.endAt
        });
        
        return createSuccessResponse(result);
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error);
        
        if (errorMessage.includes('not allowed')) {
          return createErrorResponse(
            errorMessage,
            ErrorType.AUTHORIZATION
          );
        }
        
        return createErrorResponse(
          `Error querying collection: ${errorMessage}`,
          ErrorType.FIREBASE,
          error
        );
      }
    })
  );
  
  // Handler for add_document
  server.tool(
    "add_document", 
    AddDocumentSchema, 
    withErrorHandling(async (args: AddDocumentArgs) => {
      // Check rate limiting
      if (!firestoreRateLimiter.check('add_document')) {
        return createErrorResponse(
          "Rate limit exceeded for add_document. Please try again later.",
          ErrorType.RATE_LIMIT
        );
      }
      
      const { collection, data } = args;
      
      try {
        const documentId = await firestoreService.addDocument(collection, data);
        
        return createSuccessResponse({
          message: `Document successfully added to collection '${collection}'`,
          documentId
        });
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error);
        
        if (errorMessage.includes('read-only mode')) {
          return createErrorResponse(
            errorMessage,
            ErrorType.AUTHORIZATION
          );
        }
        
        if (errorMessage.includes('not allowed')) {
          return createErrorResponse(
            errorMessage,
            ErrorType.AUTHORIZATION
          );
        }
        
        return createErrorResponse(
          `Error adding document: ${errorMessage}`,
          ErrorType.FIREBASE,
          error
        );
      }
    })
  );
  
  // Handler for set_document
  server.tool(
    "set_document", 
    SetDocumentSchema, 
    withErrorHandling(async (args: SetDocumentArgs) => {
      // Check rate limiting
      if (!firestoreRateLimiter.check('set_document')) {
        return createErrorResponse(
          "Rate limit exceeded for set_document. Please try again later.",
          ErrorType.RATE_LIMIT
        );
      }
      
      const { collection, documentId, data, merge } = args;
      
      try {
        await firestoreService.setDocument(collection, documentId, data, merge);
        
        return createSuccessResponse(
          `Document '${documentId}' successfully ${merge ? 'merged' : 'set'} in collection '${collection}'`
        );
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error);
        
        if (errorMessage.includes('read-only mode')) {
          return createErrorResponse(
            errorMessage,
            ErrorType.AUTHORIZATION
          );
        }
        
        if (errorMessage.includes('not allowed')) {
          return createErrorResponse(
            errorMessage,
            ErrorType.AUTHORIZATION
          );
        }
        
        return createErrorResponse(
          `Error setting document: ${errorMessage}`,
          ErrorType.FIREBASE,
          error
        );
      }
    })
  );
  
  // Handler for update_document
  server.tool(
    "update_document", 
    UpdateDocumentSchema, 
    withErrorHandling(async (args: UpdateDocumentArgs) => {
      // Check rate limiting
      if (!firestoreRateLimiter.check('update_document')) {
        return createErrorResponse(
          "Rate limit exceeded for update_document. Please try again later.",
          ErrorType.RATE_LIMIT
        );
      }
      
      const { collection, documentId, data } = args;
      
      try {
        await firestoreService.updateDocument(collection, documentId, data);
        
        return createSuccessResponse(
          `Document '${documentId}' successfully updated in collection '${collection}'`
        );
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error);
        
        if (errorMessage.includes('read-only mode')) {
          return createErrorResponse(
            errorMessage,
            ErrorType.AUTHORIZATION
          );
        }
        
        if (errorMessage.includes('not allowed')) {
          return createErrorResponse(
            errorMessage,
            ErrorType.AUTHORIZATION
          );
        }
        
        if (errorMessage.includes('No document to update')) {
          return createErrorResponse(
            `Document '${documentId}' not found in collection '${collection}'`,
            ErrorType.NOT_FOUND
          );
        }
        
        return createErrorResponse(
          `Error updating document: ${errorMessage}`,
          ErrorType.FIREBASE,
          error
        );
      }
    })
  );
  
  // Handler for delete_document
  server.tool(
    "delete_document", 
    DeleteDocumentSchema, 
    withErrorHandling(async (args: DeleteDocumentArgs) => {
      // Check rate limiting
      if (!firestoreRateLimiter.check('delete_document')) {
        return createErrorResponse(
          "Rate limit exceeded for delete_document. Please try again later.",
          ErrorType.RATE_LIMIT
        );
      }
      
      const { collection, documentId } = args;
      
      try {
        await firestoreService.deleteDocument(collection, documentId);
        
        return createSuccessResponse(
          `Document '${documentId}' successfully deleted from collection '${collection}'`
        );
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error);
        
        if (errorMessage.includes('read-only mode')) {
          return createErrorResponse(
            errorMessage,
            ErrorType.AUTHORIZATION
          );
        }
        
        if (errorMessage.includes('not allowed')) {
          return createErrorResponse(
            errorMessage,
            ErrorType.AUTHORIZATION
          );
        }
        
        return createErrorResponse(
          `Error deleting document: ${errorMessage}`,
          ErrorType.FIREBASE,
          error
        );
      }
    })
  );
  
  // Handler for batch_write
  server.tool(
    "batch_write", 
    BatchWriteSchema, 
    withErrorHandling(async (args: BatchWriteArgs) => {
      // Check rate limiting
      if (!firestoreRateLimiter.check('batch_write')) {
        return createErrorResponse(
          "Rate limit exceeded for batch_write. Please try again later.",
          ErrorType.RATE_LIMIT
        );
      }
      
      const { operations } = args;
      
      try {
        // Map to BatchOperation interface
        const mappedOperations = operations.map((op) => ({
          type: op.type,
          collection: op.collection,
          documentId: op.documentId,
          data: op.data,
          merge: op.merge
        }));
        
        await firestoreService.batchWrite(mappedOperations);
        
        return createSuccessResponse(
          `Successfully executed batch write with ${operations.length} operations`
        );
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error);
        
        if (errorMessage.includes('read-only mode')) {
          return createErrorResponse(
            errorMessage,
            ErrorType.AUTHORIZATION
          );
        }
        
        if (errorMessage.includes('not allowed')) {
          return createErrorResponse(
            errorMessage,
            ErrorType.AUTHORIZATION
          );
        }
        
        return createErrorResponse(
          `Error executing batch write: ${errorMessage}`,
          ErrorType.FIREBASE,
          error
        );
      }
    })
  );
  
  // Handler for delete_collection
  server.tool(
    "delete_collection", 
    DeleteCollectionSchema, 
    withErrorHandling(async (args: DeleteCollectionArgs) => {
      // Check rate limiting
      if (!firestoreRateLimiter.check('delete_collection')) {
        return createErrorResponse(
          "Rate limit exceeded for delete_collection. Please try again later.",
          ErrorType.RATE_LIMIT
        );
      }
      
      const { collection, batchSize } = args;
      
      try {
        const totalDeleted = await firestoreService.deleteCollection(collection, batchSize);
        
        return createSuccessResponse(
          `Successfully deleted ${totalDeleted} documents from collection '${collection}'`
        );
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error);
        
        if (errorMessage.includes('read-only mode')) {
          return createErrorResponse(
            errorMessage,
            ErrorType.AUTHORIZATION
          );
        }
        
        if (errorMessage.includes('not allowed')) {
          return createErrorResponse(
            errorMessage,
            ErrorType.AUTHORIZATION
          );
        }
        
        return createErrorResponse(
          `Error deleting collection: ${errorMessage}`,
          ErrorType.FIREBASE,
          error
        );
      }
    })
  );
}
