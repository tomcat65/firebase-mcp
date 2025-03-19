import { z } from 'zod';
import { StorageService } from '../services/firebase-service.js';
import { createErrorResponse, createSuccessResponse, withErrorHandling, ErrorType, getErrorMessage } from '../utils/error-handler.js';
import { RateLimiter } from '../utils/rate-limiter.js';

// Rate limiter for Storage operations
const storageRateLimiter = new RateLimiter();

// Define Firebase Storage tool schemas
export const ListFilesSchema = z.object({
  bucket: z.string().optional(),
  prefix: z.string().optional(),
  maxResults: z.number().positive().optional().default(1000)
});

export const GetFileMetadataSchema = z.object({
  bucket: z.string().optional(),
  path: z.string()
});

export const GetDownloadUrlSchema = z.object({
  bucket: z.string().optional(),
  path: z.string(),
  expiresIn: z.number().positive().optional().default(3600)
});

export const GetUploadUrlSchema = z.object({
  bucket: z.string().optional(),
  path: z.string(),
  contentType: z.string().optional().default('application/octet-stream'),
  expiresIn: z.number().positive().optional().default(3600)
});

export const DeleteFileSchema = z.object({
  bucket: z.string().optional(),
  path: z.string()
});

// Type definitions for args
type ListFilesArgs = z.infer<typeof ListFilesSchema>;
type GetFileMetadataArgs = z.infer<typeof GetFileMetadataSchema>;
type GetDownloadUrlArgs = z.infer<typeof GetDownloadUrlSchema>;
type GetUploadUrlArgs = z.infer<typeof GetUploadUrlSchema>;
type DeleteFileArgs = z.infer<typeof DeleteFileSchema>;

/**
 * Register Storage tool handlers
 * @param server MCP server instance
 * @param storageService Storage service instance
 */
export function registerStorageHandlers(
  server: any,
  storageService: StorageService
): void {
  // Handler for list_files
  server.tool(
    "list_files", 
    ListFilesSchema, 
    withErrorHandling(async (args: ListFilesArgs) => {
      // Check rate limiting
      if (!storageRateLimiter.check('list_files')) {
        return createErrorResponse(
          "Rate limit exceeded for list_files. Please try again later.",
          ErrorType.RATE_LIMIT
        );
      }
      
      const { bucket, prefix, maxResults } = args;
      
      try {
        const result = await storageService.listFiles({
          bucket,
          prefix,
          maxResults
        });
        
        return createSuccessResponse(result);
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error);
        
        if (errorMessage.includes('disabled')) {
          return createErrorResponse(
            errorMessage,
            ErrorType.AUTHORIZATION
          );
        }
        
        return createErrorResponse(
          `Error listing files: ${errorMessage}`,
          ErrorType.FIREBASE,
          error
        );
      }
    })
  );
  
  // Handler for get_file_metadata
  server.tool(
    "get_file_metadata", 
    GetFileMetadataSchema, 
    withErrorHandling(async (args: GetFileMetadataArgs) => {
      // Check rate limiting
      if (!storageRateLimiter.check('get_file_metadata')) {
        return createErrorResponse(
          "Rate limit exceeded for get_file_metadata. Please try again later.",
          ErrorType.RATE_LIMIT
        );
      }
      
      const { bucket, path } = args;
      
      try {
        const metadata = await storageService.getFileMetadata(path, bucket);
        return createSuccessResponse(metadata);
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error);
        
        if (errorMessage.includes('disabled')) {
          return createErrorResponse(
            errorMessage,
            ErrorType.AUTHORIZATION
          );
        }
        
        if (errorMessage.includes('does not exist') || errorMessage.includes('not found')) {
          return createErrorResponse(
            `File '${path}' not found`,
            ErrorType.NOT_FOUND
          );
        }
        
        return createErrorResponse(
          `Error getting file metadata: ${errorMessage}`,
          ErrorType.FIREBASE,
          error
        );
      }
    })
  );
  
  // Handler for get_download_url
  server.tool(
    "get_download_url", 
    GetDownloadUrlSchema, 
    withErrorHandling(async (args: GetDownloadUrlArgs) => {
      // Check rate limiting
      if (!storageRateLimiter.check('get_download_url')) {
        return createErrorResponse(
          "Rate limit exceeded for get_download_url. Please try again later.",
          ErrorType.RATE_LIMIT
        );
      }
      
      const { bucket, path, expiresIn } = args;
      
      try {
        const url = await storageService.getDownloadUrl(path, expiresIn, bucket);
        
        return createSuccessResponse({
          url,
          path,
          bucket: bucket || '(default)',
          expiresIn,
          expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
        });
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error);
        
        if (errorMessage.includes('disabled')) {
          return createErrorResponse(
            errorMessage,
            ErrorType.AUTHORIZATION
          );
        }
        
        if (errorMessage.includes('does not exist') || errorMessage.includes('not found')) {
          return createErrorResponse(
            `File '${path}' not found`,
            ErrorType.NOT_FOUND
          );
        }
        
        return createErrorResponse(
          `Error generating download URL: ${errorMessage}`,
          ErrorType.FIREBASE,
          error
        );
      }
    })
  );
  
  // Handler for get_upload_url
  server.tool(
    "get_upload_url", 
    GetUploadUrlSchema, 
    withErrorHandling(async (args: GetUploadUrlArgs) => {
      // Check rate limiting
      if (!storageRateLimiter.check('get_upload_url')) {
        return createErrorResponse(
          "Rate limit exceeded for get_upload_url. Please try again later.",
          ErrorType.RATE_LIMIT
        );
      }
      
      const { bucket, path, contentType, expiresIn } = args;
      
      try {
        const url = await storageService.getUploadUrl(path, contentType, expiresIn, bucket);
        
        return createSuccessResponse({
          url,
          path,
          bucket: bucket || '(default)',
          contentType,
          expiresIn,
          expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
          note: "Use this URL with an HTTP PUT request to upload the file directly."
        });
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error);
        
        if (errorMessage.includes('disabled') || errorMessage.includes('read-only mode')) {
          return createErrorResponse(
            errorMessage,
            ErrorType.AUTHORIZATION
          );
        }
        
        return createErrorResponse(
          `Error generating upload URL: ${errorMessage}`,
          ErrorType.FIREBASE,
          error
        );
      }
    })
  );
  
  // Handler for delete_file
  server.tool(
    "delete_file", 
    DeleteFileSchema, 
    withErrorHandling(async (args: DeleteFileArgs) => {
      // Check rate limiting
      if (!storageRateLimiter.check('delete_file')) {
        return createErrorResponse(
          "Rate limit exceeded for delete_file. Please try again later.",
          ErrorType.RATE_LIMIT
        );
      }
      
      const { bucket, path } = args;
      
      try {
        await storageService.deleteFile(path, bucket);
        
        return createSuccessResponse(
          `File '${path}' successfully deleted from bucket '${bucket || '(default)'}'`
        );
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error);
        
        if (errorMessage.includes('disabled') || errorMessage.includes('read-only mode')) {
          return createErrorResponse(
            errorMessage,
            ErrorType.AUTHORIZATION
          );
        }
        
        if (errorMessage.includes('does not exist') || errorMessage.includes('not found')) {
          return createErrorResponse(
            `File '${path}' not found`,
            ErrorType.NOT_FOUND
          );
        }
        
        return createErrorResponse(
          `Error deleting file: ${errorMessage}`,
          ErrorType.FIREBASE,
          error
        );
      }
    })
  );
}
