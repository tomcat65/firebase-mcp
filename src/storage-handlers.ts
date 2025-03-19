import admin from "firebase-admin";

// Firebase Storage instance
const storage = admin.storage();

/**
 * List files in a Firebase Storage bucket
 */
export async function listFiles(args: { bucket?: string; prefix?: string; maxResults?: number }) {
  const { bucket, prefix, maxResults = 1000 } = args;
  
  try {
    const bucketInstance = bucket ? storage.bucket(bucket) : storage.bucket();
    const options: { maxResults: number; prefix?: string } = { maxResults };
    
    if (prefix) {
      options.prefix = prefix;
    }
    
    const [files] = await bucketInstance.getFiles(options);
    
    return {
      content: [{ 
        type: "text", 
        text: JSON.stringify({
          bucket: bucketInstance.name,
          files: files.map((file: any) => ({
            name: file.name,
            size: file.metadata.size,
            contentType: file.metadata.contentType,
            updated: file.metadata.updated,
            timeCreated: file.metadata.timeCreated,
            md5Hash: file.metadata.md5Hash,
          })),
          count: files.length,
        }, null, 2) 
      }],
      isError: false,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error listing files: ${errorMessage}` }],
      isError: true,
    };
  }
}

/**
 * Get metadata for a file in Firebase Storage
 */
export async function getFileMetadata(args: { bucket?: string; path: string }) {
  const { bucket, path } = args;
  
  try {
    const bucketInstance = bucket ? storage.bucket(bucket) : storage.bucket();
    const file = bucketInstance.file(path);
    const [metadata] = await file.getMetadata();
    
    return {
      content: [{ 
        type: "text", 
        text: JSON.stringify(metadata, null, 2) 
      }],
      isError: false,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error getting file metadata: ${errorMessage}` }],
      isError: true,
    };
  }
}

/**
 * Get a download URL for a file in Firebase Storage
 */
export async function getDownloadUrl(args: { bucket?: string; path: string; expiresIn?: number }) {
  const { bucket, path, expiresIn = 3600 } = args;
  
  try {
    const bucketInstance = bucket ? storage.bucket(bucket) : storage.bucket();
    const file = bucketInstance.file(path);
    
    // Get signed URL that expires after specified time
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + expiresIn * 1000,
    });
    
    return {
      content: [{ 
        type: "text", 
        text: JSON.stringify({
          url,
          path,
          bucket: bucketInstance.name,
          expiresIn,
          expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
        }, null, 2) 
      }],
      isError: false,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error generating download URL: ${errorMessage}` }],
      isError: true,
    };
  }
}

/**
 * Delete a file from Firebase Storage
 */
export async function deleteFile(args: { bucket?: string; path: string }) {
  const { bucket, path } = args;
  
  try {
    const bucketInstance = bucket ? storage.bucket(bucket) : storage.bucket();
    const file = bucketInstance.file(path);
    
    await file.delete();
    
    return {
      content: [{ 
        type: "text", 
        text: `File '${path}' successfully deleted from bucket '${bucketInstance.name}'` 
      }],
      isError: false,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error deleting file: ${errorMessage}` }],
      isError: true,
    };
  }
}

/**
 * Generate an upload URL for a file in Firebase Storage
 */
export async function getUploadUrl(args: { bucket?: string; path: string; contentType?: string; expiresIn?: number }) {
  const { bucket, path, contentType = 'application/octet-stream', expiresIn = 3600 } = args;
  
  try {
    const bucketInstance = bucket ? storage.bucket(bucket) : storage.bucket();
    const file = bucketInstance.file(path);
    
    // Get signed URL for uploading
    const [url] = await file.getSignedUrl({
      action: 'write',
      contentType,
      expires: Date.now() + expiresIn * 1000,
    });
    
    return {
      content: [{ 
        type: "text", 
        text: JSON.stringify({
          url,
          path,
          bucket: bucketInstance.name,
          contentType,
          expiresIn,
          expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
          note: "Use this URL with an HTTP PUT request to upload the file directly."
        }, null, 2) 
      }],
      isError: false,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error generating upload URL: ${errorMessage}` }],
      isError: true,
    };
  }
}
