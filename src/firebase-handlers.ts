import admin from "firebase-admin";
import { z } from "zod";
// Using CommonJS require instead of ES modules

const NodeCache = require('node-cache');

// Firebase services
const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage();

// Initialize cache
const cache = new NodeCache({ 
  stdTTL: 600, // 10 minutes default TTL
  checkperiod: 120 // Check for expired keys every 2 minutes
});

// Validation schemas
const userSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  displayName: z.string().optional(),
  phoneNumber: z.string().optional(),
  photoURL: z.string().url().optional(),
  emailVerified: z.boolean().optional(),
  disabled: z.boolean().optional()
});

// Authentication Operations
export async function listUsers(args: { maxResults?: number; pageToken?: string }) {
  const { maxResults = 1000, pageToken } = args;
  const listUsersResult = await auth.listUsers(maxResults);
  
  return {
    content: [{ 
      type: "text", 
      text: JSON.stringify({
        users: listUsersResult.users.map((user: any) => ({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          phoneNumber: user.phoneNumber,
          photoURL: user.photoURL,
          disabled: user.disabled,
          emailVerified: user.emailVerified,
          metadata: {
            creationTime: user.metadata.creationTime,
            lastSignInTime: user.metadata.lastSignInTime,
          },
          customClaims: user.customClaims,
        })),
        // pageToken is not available in the current version
        // pageToken: listUsersResult.pageToken,
      }, null, 2) 
    }],
    isError: false,
  };
}

export async function getUser(args: { uid?: string; email?: string; phoneNumber?: string }) {
  const { uid, email, phoneNumber } = args;
  const cacheKey = uid || email || phoneNumber;
  
  try {
    // Check cache first
    const cachedUser = cache.get(cacheKey);
    if (cachedUser) {
      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify(cachedUser, null, 2) 
        }],
        isError: false,
      };
    }

    let userRecord;
    if (uid) {
      userRecord = await auth.getUser(uid);
    } else if (email) {
      userRecord = await auth.getUserByEmail(email);
    } else if (phoneNumber) {
      userRecord = await auth.getUserByPhoneNumber(phoneNumber);
    } else {
      throw new Error("At least one of uid, email, or phoneNumber must be provided");
    }
    
    const userData = {
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      phoneNumber: userRecord.phoneNumber,
      photoURL: userRecord.photoURL,
      disabled: userRecord.disabled,
      emailVerified: userRecord.emailVerified,
      metadata: {
        creationTime: userRecord.metadata.creationTime,
        lastSignInTime: userRecord.metadata.lastSignInTime,
      },
      customClaims: userRecord.customClaims,
      providerData: userRecord.providerData,
    };

    // Cache the user data
    cache.set(cacheKey, userData);
    
    return {
      content: [{ 
        type: "text", 
        text: JSON.stringify(userData, null, 2) 
      }],
      isError: false,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error retrieving user: ${errorMessage}` }],
      isError: true,
    };
  }
}

export async function createUser(args: { 
  email: string; 
  password?: string;
  displayName?: string;
  phoneNumber?: string;
  photoURL?: string;
  emailVerified?: boolean;
  disabled?: boolean;
}) {
  try {
    // Validate input
    const validatedData = userSchema.parse(args);
    
    const userRecord = await auth.createUser(validatedData);
    
    return {
      content: [{ 
        type: "text", 
        text: JSON.stringify({
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
          phoneNumber: userRecord.phoneNumber,
          photoURL: userRecord.photoURL,
          disabled: userRecord.disabled,
          emailVerified: userRecord.emailVerified,
          metadata: {
            creationTime: userRecord.metadata.creationTime,
            lastSignInTime: userRecord.metadata.lastSignInTime,
          },
        }, null, 2) 
      }],
      isError: false,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error creating user: ${errorMessage}` }],
      isError: true,
    };
  }
}

export async function updateUser(args: { 
  uid: string;
  email?: string;
  password?: string;
  displayName?: string;
  phoneNumber?: string;
  photoURL?: string;
  emailVerified?: boolean;
  disabled?: boolean;
}) {
  const { uid, ...updateData } = args;
  
  try {
    const userRecord = await auth.updateUser(uid, updateData);
    
    return {
      content: [{ 
        type: "text", 
        text: JSON.stringify({
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
          phoneNumber: userRecord.phoneNumber,
          photoURL: userRecord.photoURL,
          disabled: userRecord.disabled,
          emailVerified: userRecord.emailVerified,
          metadata: {
            creationTime: userRecord.metadata.creationTime,
            lastSignInTime: userRecord.metadata.lastSignInTime,
          },
        }, null, 2) 
      }],
      isError: false,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error updating user: ${errorMessage}` }],
      isError: true,
    };
  }
}

export async function deleteUser(args: { uid: string }) {
  const { uid } = args;
  
  try {
    await auth.deleteUser(uid);
    
    return {
      content: [{ type: "text", text: `User with ID ${uid} successfully deleted` }],
      isError: false,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error deleting user: ${errorMessage}` }],
      isError: true,
    };
  }
}

export async function setCustomClaims(args: { uid: string; claims: Record<string, any> }) {
  const { uid, claims } = args;
  
  try {
    await auth.setCustomUserClaims(uid, claims);
    
    return {
      content: [{ 
        type: "text", 
        text: `Custom claims for user ${uid} successfully updated: ${JSON.stringify(claims)}` 
      }],
      isError: false,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error setting custom claims: ${errorMessage}` }],
      isError: true,
    };
  }
}

// Storage Operations
export async function listFiles(args: { bucket?: string; prefix?: string; maxResults?: number }) {
  const { bucket, prefix, maxResults = 1000 } = args;
  
  try {
    const bucketInstance = bucket ? storage.bucket(bucket) : storage.bucket();
    const options: any = { maxResults };
    
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

// Firestore Rules Operations
export async function getFirestoreRules() {
  // Note: This requires the Firebase Admin SDK to have project-level access
  // This is a simplified version as the actual implementation would require using
  // the Firebase Management API, which isn't directly available in the Admin SDK
  
  return {
    content: [{ 
      type: "text", 
      text: "To get Firestore security rules, you'll need to use the Firebase Management API or the Firebase CLI. This functionality isn't directly available through the Firebase Admin SDK." 
    }],
    isError: false,
  };
}

export async function updateFirestoreRules(args: { rules: string }) {
  // Note: This requires the Firebase Admin SDK to have project-level access
  // This is a simplified version as the actual implementation would require using
  // the Firebase Management API, which isn't directly available in the Admin SDK
  
  return {
    content: [{ 
      type: "text", 
      text: "To update Firestore security rules, you'll need to use the Firebase Management API or the Firebase CLI. This functionality isn't directly available through the Firebase Admin SDK." 
    }],
    isError: false,
  };
}

// Batch operations
export async function batchWrite(args: {
  operations: Array<{
    type: 'create' | 'update' | 'delete';
    collection: string;
    doc: string;
    data?: any;
  }>
}) {
  try {
    const batch = db.batch();
    
    args.operations.forEach(op => {
      const ref = db.collection(op.collection).doc(op.doc);
      switch (op.type) {
        case 'create':
          batch.create(ref, op.data);
          break;
        case 'update':
          batch.update(ref, op.data);
          break;
        case 'delete':
          batch.delete(ref);
          break;
      }
    });
    
    await batch.commit();
    
    return {
      content: [{ 
        type: "text", 
        text: `Successfully executed ${args.operations.length} operations in batch` 
      }],
      isError: false,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error executing batch operations: ${errorMessage}` }],
      isError: true,
    };
  }
}
