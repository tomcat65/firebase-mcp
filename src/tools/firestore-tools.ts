import { getDb } from '../firebase.js';
import { logger } from '../utils/logger.js';
import { defaultRateLimiter } from '../utils/rate-limiter.js';
import { 
  validateRequiredParams,
  validateCollectionPath,
  validateDocumentPath,
  validateQueryParams,
  validateBatchOperations,
  validateDocumentData
} from '../utils/validation.js';
import { createErrorResponse, FirebaseMcpError, ErrorType, createSuccessResponse } from '../utils/error-handler.js';
import { 
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  DocumentData,
  QueryConstraint,
  QueryDocumentSnapshot,
  WhereFilterOp
} from 'firebase/firestore';
import { McpResponse, RequestHandlerExtra } from '@modelcontextprotocol/sdk/server/mcp.js';

type FirestoreAddDocumentParams = {
  collection: string;
  data: Record<string, any>;
};

type FirestoreGetDocumentParams = {
  path: string;
};

type FirestoreQueryDocumentsParams = {
  collection: string;
  query?: {
    where?: [string, WhereFilterOp, any][];
    orderBy?: [string, ('asc' | 'desc' | undefined)][];
    limit?: number;
  };
};

type FirestoreUpdateDocumentParams = {
  path: string;
  data: Record<string, any>;
};

type FirestoreDeleteDocumentParams = {
  path: string;
};

type FirestoreBatchOperationParams = {
  operations: {
    type: 'set' | 'update' | 'delete';
    path: string;
    data?: Record<string, any>;
  }[];
};

/**
 * Safely get a Firestore instance, with error handling
 */
function safeGetDb() {
  try {
    return getDb();
  } catch (error: any) {
    logger.error('Error accessing Firestore:', error);
    throw new FirebaseMcpError(
      ErrorType.FIREBASE,
      'Firestore is not available. Please check your Firebase configuration.',
      error
    );
  }
}

/**
 * Add a document to a collection
 */
export async function firestore_add_document(params: FirestoreAddDocumentParams, extra: RequestHandlerExtra): Promise<McpResponse> {
  try {
    // Log received parameters for debugging
    console.log('firestore_add_document received params:', JSON.stringify(params));
    
    // Ensure required parameters are present
    if (!params || !params.collection || !params.data) {
      throw new FirebaseMcpError(
        ErrorType.INVALID_PARAMS,
        `Missing required parameters. Required: collection, data. Received: ${JSON.stringify(params)}`
      );
    }

    // Validate collection path
    validateCollectionPath(params.collection);

    // Validate document data
    validateDocumentData(params.data);

    // Check rate limit
    if (!defaultRateLimiter.check('firestore_add')) {
      throw new FirebaseMcpError(
        ErrorType.RATE_LIMIT,
        'Rate limit exceeded for adding documents. Please try again later.'
      );
    }

    // Get Firestore instance safely
    const db = safeGetDb();

    // Create a new document reference
    const docRef = doc(collection(db, params.collection));

    // Add the document
    await setDoc(docRef, params.data);

    logger.info(`Document added successfully at ${docRef.path}`);

    return createSuccessResponse({
      id: docRef.id,
      path: docRef.path,
      message: 'Document added successfully'
    });
  } catch (error: any) {
    logger.error('Error adding document:', error);
    
    if (error instanceof FirebaseMcpError) {
      throw error;
    }
    
    throw new FirebaseMcpError(
      ErrorType.FIREBASE,
      `Error adding document: ${error.message || 'Unknown error'}`
    );
  }
}

/**
 * Get a document from Firestore
 */
export async function firestore_get_document(params: FirestoreGetDocumentParams, extra: RequestHandlerExtra): Promise<McpResponse> {
  try {
    // Validate document path
    validateDocumentPath(params.path);

    // Check rate limit
    if (!defaultRateLimiter.check('firestore_get')) {
      throw new FirebaseMcpError(
        ErrorType.RATE_LIMIT,
        'Rate limit exceeded for getting documents. Please try again later.'
      );
    }

    // Get the document
    const docRef = doc(safeGetDb(), params.path);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new FirebaseMcpError(
        ErrorType.NOT_FOUND,
        `Document not found at ${params.path}`
      );
    }

    return createSuccessResponse({
      id: docSnap.id,
      path: params.path,
      data: docSnap.data()
    });
  } catch (error: any) {
    logger.error('Error getting document:', error);
    
    if (error instanceof FirebaseMcpError) {
      throw error;
    }
    
    throw new FirebaseMcpError(
      ErrorType.FIREBASE,
      `Error getting document: ${error.message || 'Unknown error'}`
    );
  }
}

/**
 * Query documents in a collection
 */
export async function firestore_query_documents(params: FirestoreQueryDocumentsParams, extra: RequestHandlerExtra): Promise<McpResponse> {
  try {
    // Validate collection path
    validateCollectionPath(params.collection);

    // Validate query parameters if provided
    if (params.query) {
      validateQueryParams(params.query);
    }

    // Check rate limit
    if (!defaultRateLimiter.check('firestore_query')) {
      throw new FirebaseMcpError(
        ErrorType.RATE_LIMIT,
        'Rate limit exceeded for querying documents. Please try again later.'
      );
    }

    // Build query constraints
    const constraints: QueryConstraint[] = [];
    if (params.query?.where) {
      for (const [field, op, value] of params.query.where) {
        constraints.push(where(field, op, value));
      }
    }
    if (params.query?.orderBy) {
      for (const [field, direction] of params.query.orderBy) {
        constraints.push(orderBy(field, direction));
      }
    }
    if (params.query?.limit) {
      constraints.push(limit(params.query.limit));
    }

    // Execute query
    const q = query(collection(safeGetDb(), params.collection), ...constraints);
    const querySnapshot = await getDocs(q);

    const results = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return createSuccessResponse({
      collection: params.collection,
      count: results.length,
      results
    });
  } catch (error: any) {
    logger.error('Error querying documents:', error);
    
    if (error instanceof FirebaseMcpError) {
      throw error;
    }
    
    throw new FirebaseMcpError(
      ErrorType.FIREBASE,
      `Error querying documents: ${error.message || 'Unknown error'}`
    );
  }
}

/**
 * Update a document in Firestore
 */
export async function firestore_update_document(params: FirestoreUpdateDocumentParams, extra: RequestHandlerExtra): Promise<McpResponse> {
  try {
    // Validate document path
    validateDocumentPath(params.path);

    // Validate document data
    validateDocumentData(params.data);

    // Check rate limit
    if (!defaultRateLimiter.check('firestore_update')) {
      throw new FirebaseMcpError(
        ErrorType.RATE_LIMIT,
        'Rate limit exceeded for updating documents. Please try again later.'
      );
    }

    // Update the document
    const docRef = doc(safeGetDb(), params.path);
    await updateDoc(docRef, params.data);

    return createSuccessResponse({
      path: params.path,
      message: 'Document updated successfully'
    });
  } catch (error: any) {
    logger.error('Error updating document:', error);
    
    if (error instanceof FirebaseMcpError) {
      throw error;
    }
    
    throw new FirebaseMcpError(
      ErrorType.FIREBASE,
      `Error updating document: ${error.message || 'Unknown error'}`
    );
  }
}

/**
 * Delete a document from Firestore
 */
export async function firestore_delete_document(params: FirestoreDeleteDocumentParams, extra: RequestHandlerExtra): Promise<McpResponse> {
  try {
    // Validate document path
    validateDocumentPath(params.path);

    // Check rate limit
    if (!defaultRateLimiter.check('firestore_delete')) {
      throw new FirebaseMcpError(
        ErrorType.RATE_LIMIT,
        'Rate limit exceeded for deleting documents. Please try again later.'
      );
    }

    // Delete the document
    const docRef = doc(safeGetDb(), params.path);
    await deleteDoc(docRef);

    return createSuccessResponse({
      path: params.path,
      message: 'Document deleted successfully'
    });
  } catch (error: any) {
    logger.error('Error deleting document:', error);
    
    if (error instanceof FirebaseMcpError) {
      throw error;
    }
    
    throw new FirebaseMcpError(
      ErrorType.FIREBASE,
      `Error deleting document: ${error.message || 'Unknown error'}`
    );
  }
}

/**
 * Batch write operations to Firestore
 */
export async function firestore_batch_operations(params: FirestoreBatchOperationParams, extra: RequestHandlerExtra): Promise<McpResponse> {
  try {
    // Validate batch operations
    validateBatchOperations(params.operations);

    // Check rate limit
    if (!defaultRateLimiter.check('firestore_batch')) {
      throw new FirebaseMcpError(
        ErrorType.RATE_LIMIT,
        'Rate limit exceeded for batch operations. Please try again later.'
      );
    }

    // Create a new batch
    const batch = writeBatch(safeGetDb());

    // Add operations to batch
    for (const op of params.operations) {
      const docRef = doc(safeGetDb(), op.path);
      
      switch (op.type) {
        case 'set':
          batch.set(docRef, op.data!);
          break;
        case 'update':
          batch.update(docRef, op.data!);
          break;
        case 'delete':
          batch.delete(docRef);
          break;
      }
    }

    // Commit the batch
    await batch.commit();

    return createSuccessResponse({
      count: params.operations.length,
      message: 'Batch operations completed successfully'
    });
  } catch (error: any) {
    logger.error('Error in batch operations:', error);
    
    if (error instanceof FirebaseMcpError) {
      throw error;
    }
    
    throw new FirebaseMcpError(
      ErrorType.FIREBASE,
      `Error in batch operations: ${error.message || 'Unknown error'}`
    );
  }
} 