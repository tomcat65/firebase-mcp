import { 
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata,
  updateMetadata,
  StorageReference,
  UploadMetadata,
  FirebaseStorage
} from 'firebase/storage';
import { logger } from '../utils/logger.js';
import { defaultRateLimiter } from '../utils/rate-limiter.js';
import { validateRequiredParams } from '../utils/validation.js';
import { createSuccessResponse, createErrorResponse, FirebaseMcpError, ErrorType } from '../utils/error-handler.js';
import { McpResponse, RequestHandlerExtra } from '@modelcontextprotocol/sdk/server/mcp.js';

// Don't initialize storage at the module level to avoid startup errors
// We'll initialize it safely inside each function

type StorageUploadFileParams = {
  path: string;
  data: string;
  contentType?: string;
  customMetadata?: Record<string, string>;
};

type StorageGetDownloadUrlParams = {
  path: string;
};

type StorageDeleteFileParams = {
  path: string;
};

type StorageListFilesParams = {
  path: string;
};

type StorageGetMetadataParams = {
  path: string;
};

type StorageUpdateMetadataParams = {
  path: string;
  metadata: {
    contentType?: string;
    customMetadata?: Record<string, string>;
  };
};

/**
 * Safely get a Firebase Storage instance, with error handling
 */
function safeGetStorage(): FirebaseStorage {
  try {
    return getStorage();
  } catch (error: any) {
    logger.error('Error accessing Firebase Storage:', error);
    throw new FirebaseMcpError(
      ErrorType.FIREBASE,
      'Firebase Storage is not available. Please check your Firebase configuration.',
      error
    );
  }
}

/**
 * Upload a file to storage
 */
export async function storage_upload_file(params: StorageUploadFileParams, extra: RequestHandlerExtra): Promise<McpResponse> {
  try {
    // Validate required parameters
    validateRequiredParams(params, [
      { name: 'path', type: 'string' },
      { name: 'data', type: 'string' }
    ]);

    // Check rate limit
    if (!defaultRateLimiter.check('storage_upload_file')) {
      throw new FirebaseMcpError(
        ErrorType.RATE_LIMIT,
        'Rate limit exceeded for file uploads. Please try again later.'
      );
    }

    // Get storage instance safely
    const storage = safeGetStorage();

    // Convert base64 to buffer if needed
    let fileData: Buffer | Uint8Array;
    if (params.data.startsWith('data:')) {
      const base64Data = params.data.split(',')[1];
      fileData = Buffer.from(base64Data, 'base64');
    } else {
      fileData = Buffer.from(params.data);
    }

    // Create metadata if provided
    const metadata: UploadMetadata = {};
    if (params.contentType) {
      metadata.contentType = params.contentType;
    }
    if (params.customMetadata) {
      metadata.customMetadata = params.customMetadata;
    }

    // Upload file
    const fileRef = ref(storage, params.path);
    await uploadBytes(fileRef, fileData, metadata);

    // Get download URL
    const downloadURL = await getDownloadURL(fileRef);

    logger.info(`Uploaded file to ${params.path}`);
    return createSuccessResponse({
      path: params.path,
      downloadURL,
      message: 'File uploaded successfully'
    });
  } catch (error: any) {
    logger.error('Error uploading file:', error);
    
    if (error instanceof FirebaseMcpError) {
      throw error;
    }
    
    throw new FirebaseMcpError(
      ErrorType.FIREBASE,
      `Error uploading file: ${error.message || 'Unknown error'}`
    );
  }
}

/**
 * Get download URL for a file
 */
export async function storage_get_download_url(params: StorageGetDownloadUrlParams, extra: RequestHandlerExtra): Promise<McpResponse> {
  try {
    // Validate required parameters
    validateRequiredParams(params, [
      { name: 'path', type: 'string' }
    ]);

    // Check rate limit
    if (!defaultRateLimiter.check('storage_get_download_url')) {
      throw new FirebaseMcpError(
        ErrorType.RATE_LIMIT,
        'Rate limit exceeded for getting download URLs. Please try again later.'
      );
    }

    // Get download URL
    const storage = safeGetStorage();
    const fileRef = ref(storage, params.path);
    const downloadURL = await getDownloadURL(fileRef);

    logger.info(`Got download URL for ${params.path}`);
    return createSuccessResponse({
      path: params.path,
      downloadURL
    });
  } catch (error: any) {
    logger.error('Error getting download URL:', error);
    
    if (error instanceof FirebaseMcpError) {
      throw error;
    }
    
    throw new FirebaseMcpError(
      ErrorType.FIREBASE,
      `Error getting download URL: ${error.message || 'Unknown error'}`
    );
  }
}

/**
 * Delete a file from storage
 */
export async function storage_delete_file(params: StorageDeleteFileParams, extra: RequestHandlerExtra): Promise<McpResponse> {
  try {
    // Validate required parameters
    validateRequiredParams(params, [
      { name: 'path', type: 'string' }
    ]);

    // Check rate limit
    if (!defaultRateLimiter.check('storage_delete_file')) {
      throw new FirebaseMcpError(
        ErrorType.RATE_LIMIT,
        'Rate limit exceeded for deleting files. Please try again later.'
      );
    }

    // Delete file
    const storage = safeGetStorage();
    const fileRef = ref(storage, params.path);
    await deleteObject(fileRef);

    logger.info(`Deleted file at ${params.path}`);
    return createSuccessResponse({
      path: params.path,
      message: 'File deleted successfully'
    });
  } catch (error: any) {
    logger.error('Error deleting file:', error);
    
    if (error instanceof FirebaseMcpError) {
      throw error;
    }
    
    throw new FirebaseMcpError(
      ErrorType.FIREBASE,
      `Error deleting file: ${error.message || 'Unknown error'}`
    );
  }
}

/**
 * List files in a directory
 */
export async function storage_list_files(params: StorageListFilesParams, extra: RequestHandlerExtra): Promise<McpResponse> {
  try {
    // Validate required parameters
    validateRequiredParams(params, [
      { name: 'path', type: 'string' }
    ]);

    // Check rate limit
    if (!defaultRateLimiter.check('storage_list_files')) {
      throw new FirebaseMcpError(
        ErrorType.RATE_LIMIT,
        'Rate limit exceeded for listing files. Please try again later.'
      );
    }

    // List files
    const storage = safeGetStorage();
    const directoryRef = ref(storage, params.path);
    const result = await listAll(directoryRef);

    // Format results
    const files = result.items.map(item => item.fullPath);
    const directories = result.prefixes.map(prefix => prefix.fullPath);

    logger.info(`Listed files in ${params.path}`);
    return createSuccessResponse({
      path: params.path,
      files,
      directories
    });
  } catch (error: any) {
    logger.error('Error listing files:', error);
    
    if (error instanceof FirebaseMcpError) {
      throw error;
    }
    
    throw new FirebaseMcpError(
      ErrorType.FIREBASE,
      `Error listing files: ${error.message || 'Unknown error'}`
    );
  }
}

/**
 * Get metadata for a file
 */
export async function storage_get_metadata(params: StorageGetMetadataParams, extra: RequestHandlerExtra): Promise<McpResponse> {
  try {
    // Validate required parameters
    validateRequiredParams(params, [
      { name: 'path', type: 'string' }
    ]);

    // Check rate limit
    if (!defaultRateLimiter.check('storage_get_metadata')) {
      throw new FirebaseMcpError(
        ErrorType.RATE_LIMIT,
        'Rate limit exceeded for getting file metadata. Please try again later.'
      );
    }

    // Get metadata
    const storage = safeGetStorage();
    const fileRef = ref(storage, params.path);
    const metadata = await getMetadata(fileRef);

    logger.info(`Got metadata for ${params.path}`);
    return createSuccessResponse(metadata);
  } catch (error: any) {
    logger.error('Error getting metadata:', error);
    
    if (error instanceof FirebaseMcpError) {
      throw error;
    }
    
    throw new FirebaseMcpError(
      ErrorType.FIREBASE,
      `Error getting metadata: ${error.message || 'Unknown error'}`
    );
  }
}

/**
 * Update metadata for a file
 */
export async function storage_update_metadata(params: StorageUpdateMetadataParams, extra: RequestHandlerExtra): Promise<McpResponse> {
  try {
    // Validate required parameters
    validateRequiredParams(params, [
      { name: 'path', type: 'string' },
      { name: 'metadata', type: 'object' }
    ]);

    // Check rate limit
    if (!defaultRateLimiter.check('storage_update_metadata')) {
      throw new FirebaseMcpError(
        ErrorType.RATE_LIMIT,
        'Rate limit exceeded for updating file metadata. Please try again later.'
      );
    }

    // Update metadata
    const storage = safeGetStorage();
    const fileRef = ref(storage, params.path);
    const updatedMetadata = await updateMetadata(fileRef, params.metadata);

    logger.info(`Updated metadata for ${params.path}`);
    return createSuccessResponse(updatedMetadata);
  } catch (error: any) {
    logger.error('Error updating metadata:', error);
    
    if (error instanceof FirebaseMcpError) {
      throw error;
    }
    
    throw new FirebaseMcpError(
      ErrorType.FIREBASE,
      `Error updating metadata: ${error.message || 'Unknown error'}`
    );
  }
} 