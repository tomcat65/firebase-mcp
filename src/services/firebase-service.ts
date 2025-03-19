import admin from 'firebase-admin';
import { App, getApp, initializeApp, cert } from 'firebase-admin/app';
import * as fs from 'fs';
import * as path from 'path';
import { SecurityConfig } from '../config.js';
import { logger } from '../utils/logger.js';

// Initialize Firebase Admin SDK
export function initializeFirebase(
  credentialsPath?: string,
  projectId?: string,
  databaseURL?: string
): App {
  try {
    // Try to load credentials from provided path
    if (credentialsPath) {
      logger.info(`Initializing Firebase with credentials from: ${credentialsPath}`);
      // Use fs.readFileSync instead of require
      const serviceAccountContent = fs.readFileSync(credentialsPath, 'utf8');
      const serviceAccount = JSON.parse(serviceAccountContent);
      
      return initializeApp({
        credential: cert(serviceAccount),
        databaseURL: databaseURL || process.env.FIREBASE_DATABASE_URL,
        projectId: projectId || serviceAccount.project_id
      });
    } 
    
    // Try to load credentials from environment variable
    else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      logger.info(`Initializing Firebase with credentials from GOOGLE_APPLICATION_CREDENTIALS`);
      return initializeApp({
        credential: admin.credential.applicationDefault(),
        databaseURL: databaseURL || process.env.FIREBASE_DATABASE_URL,
        projectId: projectId || process.env.FIREBASE_PROJECT_ID
      });
    } 
    
    // Try application default credentials
    else {
      logger.info(`Initializing Firebase with application default credentials`);
      return initializeApp({
        credential: admin.credential.applicationDefault(),
        databaseURL: databaseURL || process.env.FIREBASE_DATABASE_URL,
        projectId: projectId || process.env.FIREBASE_PROJECT_ID
      });
    }
  } catch (error) {
    logger.error("Failed to initialize Firebase Admin SDK:", error);
    throw error;
  }
}

// Service Factory for creating Firebase service instances
export class FirebaseServiceFactory {
  private app: App;
  private securityConfig: SecurityConfig;
  
  constructor(app: App, securityConfig: SecurityConfig) {
    this.app = app;
    this.securityConfig = securityConfig;
  }
  
  createFirestoreService(): FirestoreService {
    return new FirestoreServiceImpl(
      admin.firestore(),
      this.securityConfig
    );
  }
  
  createAuthService(): AuthService {
    return new AuthServiceImpl(
      admin.auth(),
      this.securityConfig
    );
  }
  
  createStorageService(): StorageService {
    return new StorageServiceImpl(
      admin.storage(),
      this.securityConfig
    );
  }
}

// Firestore Service Interface
export interface FirestoreService {
  getDocument(collection: string, documentId: string): Promise<any>;
  queryCollection(collection: string, options?: QueryOptions): Promise<QueryResult>;
  addDocument(collection: string, data: any): Promise<string>;
  setDocument(collection: string, documentId: string, data: any, merge?: boolean): Promise<void>;
  updateDocument(collection: string, documentId: string, data: any): Promise<void>;
  deleteDocument(collection: string, documentId: string): Promise<void>;
  batchWrite(operations: BatchOperation[]): Promise<void>;
  deleteCollection(collection: string, batchSize?: number): Promise<number>;
  listCollections(): Promise<string[]>;
}

// Auth Service Interface
export interface AuthService {
  listUsers(maxResults?: number, pageToken?: string): Promise<ListUsersResult>;
  getUser(uid?: string, email?: string, phoneNumber?: string): Promise<UserRecord>;
  createUser(userData: CreateUserData): Promise<UserRecord>;
  updateUser(uid: string, userData: UpdateUserData): Promise<UserRecord>;
  deleteUser(uid: string): Promise<void>;
  setCustomClaims(uid: string, claims: Record<string, any>): Promise<void>;
}

// Storage Service Interface
export interface StorageService {
  listFiles(options?: ListFilesOptions): Promise<StorageFileList>;
  getFileMetadata(path: string, bucket?: string): Promise<any>;
  getDownloadUrl(path: string, expiresIn?: number, bucket?: string): Promise<string>;
  getUploadUrl(path: string, contentType?: string, expiresIn?: number, bucket?: string): Promise<string>;
  deleteFile(path: string, bucket?: string): Promise<void>;
}

// Type Definitions for Firestore Service
export interface QueryOptions {
  where?: [string, string, any][];
  orderBy?: [string, string?][];
  limit?: number;
  startAfter?: any;
  startAt?: any;
  endBefore?: any;
  endAt?: any;
}

export interface QueryResult {
  collection: string;
  count: number;
  results: any[];
  pagination?: {
    hasMore: boolean;
    lastDocumentId: string | null;
    lastDocumentData: any | null;
  };
}

export interface BatchOperation {
  type: 'set' | 'update' | 'delete';
  collection: string;
  documentId: string;
  data?: any;
  merge?: boolean;
}

// Type Definitions for Auth Service
export interface UserRecord {
  uid: string;
  email?: string;
  emailVerified?: boolean;
  displayName?: string;
  photoURL?: string;
  phoneNumber?: string;
  disabled?: boolean;
  metadata?: {
    creationTime?: string;
    lastSignInTime?: string;
  };
  providerData?: any[];
  customClaims?: Record<string, any>;
}

export interface ListUsersResult {
  users: UserRecord[];
  pageToken?: string;
  count: number;
}

export interface CreateUserData {
  email?: string;
  password?: string;
  displayName?: string;
  phoneNumber?: string;
  photoURL?: string;
  emailVerified?: boolean;
  disabled?: boolean;
}

export interface UpdateUserData {
  email?: string;
  password?: string;
  displayName?: string;
  phoneNumber?: string;
  photoURL?: string;
  emailVerified?: boolean;
  disabled?: boolean;
}

// Type Definitions for Storage Service
export interface ListFilesOptions {
  bucket?: string;
  prefix?: string;
  maxResults?: number;
}

export interface StorageFile {
  name: string;
  size?: string | number;
  contentType?: string;
  updated?: string;
  timeCreated?: string;
  md5Hash?: string;
}

export interface StorageFileList {
  bucket: string;
  files: StorageFile[];
  count: number;
}

// Implementation of Firestore Service
class FirestoreServiceImpl implements FirestoreService {
  private db: any; // Using any to avoid type incompatibility
  private securityConfig: SecurityConfig;
  
  constructor(db: any, securityConfig: SecurityConfig) {
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
    let query: any = this.db.collection(collection);
    
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
    
    // Apply limit
    const effectiveLimit = limit || 50; // Default limit to 50
    query = query.limit(effectiveLimit);
    
    const snapshot = await query.get();
    
    // Get last document for cursor-based pagination
    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
    
    const results = snapshot.docs.map((doc: any) => ({
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
  
  async deleteCollection(collection: string, batchSize: number = 100): Promise<number> {
    this.checkCollectionAccess(collection);
    
    let totalDeleted = 0;
    
    const deleteQueryBatch = async (query: any, size: number) => {
      const snapshot = await query.limit(size).get();
      
      if (snapshot.size === 0) {
        return 0;
      }
      
      // Delete documents in a batch
      const batch = this.db.batch();
      snapshot.docs.forEach((doc: any) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      
      return snapshot.size;
    };
    
    let query: any = this.db.collection(collection);
    let numDeleted = 0;
    
    do {
      numDeleted = await deleteQueryBatch(query, batchSize);
      totalDeleted += numDeleted;
    } while (numDeleted >= batchSize);
    
    return totalDeleted;
  }
  
  async listCollections(): Promise<string[]> {
    const collections = await this.db.listCollections();
    return collections.map((collection: any) => collection.id);
  }
}

// Implementation of Auth Service
class AuthServiceImpl implements AuthService {
  private auth: any; // Using any to avoid namespace issues
  private securityConfig: SecurityConfig;
  
  constructor(auth: any, securityConfig: SecurityConfig) {
    this.auth = auth;
    this.securityConfig = securityConfig;
  }
  
  /**
   * Check if auth operations are allowed
   */
  private checkAuthAccess(): void {
    if (this.securityConfig.disableAuth) {
      throw new Error('Authentication operations are disabled.');
    }
  }
  
  /**
   * Check if write auth operations are allowed
   */
  private checkAuthWriteAccess(): void {
    this.checkAuthAccess();
    
    if (this.securityConfig.readOnly) {
      throw new Error('Server is in read-only mode. Write operations are not allowed.');
    }
  }
  
  async listUsers(maxResults: number = 1000, pageToken?: string): Promise<ListUsersResult> {
    this.checkAuthAccess();
    
    const listUsersResult = await this.auth.listUsers(maxResults, pageToken);
    
    return {
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
      pageToken: listUsersResult.pageToken,
      count: listUsersResult.users.length,
    };
  }
  
  async getUser(uid?: string, email?: string, phoneNumber?: string): Promise<UserRecord> {
    this.checkAuthAccess();
    
    let userRecord;
    
    if (uid) {
      userRecord = await this.auth.getUser(uid);
    } else if (email) {
      userRecord = await this.auth.getUserByEmail(email);
    } else if (phoneNumber) {
      userRecord = await this.auth.getUserByPhoneNumber(phoneNumber);
    } else {
      throw new Error("At least one of uid, email, or phoneNumber must be provided");
    }
    
    return {
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
  }
  
  async createUser(userData: CreateUserData): Promise<UserRecord> {
    this.checkAuthWriteAccess();
    
    const userRecord = await this.auth.createUser(userData);
    
    return {
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
    };
  }
  
  async updateUser(uid: string, userData: UpdateUserData): Promise<UserRecord> {
    this.checkAuthWriteAccess();
    
    const userRecord = await this.auth.updateUser(uid, userData);
    
    return {
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
    };
  }
  
  async deleteUser(uid: string): Promise<void> {
    this.checkAuthWriteAccess();
    
    await this.auth.deleteUser(uid);
  }
  
  async setCustomClaims(uid: string, claims: Record<string, any>): Promise<void> {
    this.checkAuthWriteAccess();
    
    await this.auth.setCustomUserClaims(uid, claims);
  }
}

// Implementation of Storage Service
class StorageServiceImpl implements StorageService {
  private storage: any; // Using any to avoid namespace issues
  private securityConfig: SecurityConfig;
  
  constructor(storage: any, securityConfig: SecurityConfig) {
    this.storage = storage;
    this.securityConfig = securityConfig;
  }
  
  /**
   * Check if storage operations are allowed
   */
  private checkStorageAccess(): void {
    if (this.securityConfig.disableStorage) {
      throw new Error('Storage operations are disabled.');
    }
  }
  
  /**
   * Check if write storage operations are allowed
   */
  private checkStorageWriteAccess(): void {
    this.checkStorageAccess();
    
    if (this.securityConfig.readOnly) {
      throw new Error('Server is in read-only mode. Write operations are not allowed.');
    }
  }
  
  async listFiles(options: ListFilesOptions = {}): Promise<StorageFileList> {
    this.checkStorageAccess();
    
    const { bucket: bucketName, prefix, maxResults = 1000 } = options;
    const bucketInstance = bucketName ? this.storage.bucket(bucketName) : this.storage.bucket();
    const listOptions: any = { maxResults };
    
    if (prefix) {
      listOptions.prefix = prefix;
    }
    
    const [files] = await bucketInstance.getFiles(listOptions);
    
    return {
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
    };
  }
  
  async getFileMetadata(path: string, bucket?: string): Promise<any> {
    this.checkStorageAccess();
    
    const bucketInstance = bucket ? this.storage.bucket(bucket) : this.storage.bucket();
    const file = bucketInstance.file(path);
    const [metadata] = await file.getMetadata();
    
    return metadata;
  }
  
  async getDownloadUrl(path: string, expiresIn: number = 3600, bucket?: string): Promise<string> {
    this.checkStorageAccess();
    
    const bucketInstance = bucket ? this.storage.bucket(bucket) : this.storage.bucket();
    const file = bucketInstance.file(path);
    
    // Get signed URL that expires after specified time
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + expiresIn * 1000,
    });
    
    return url;
  }
  
  async getUploadUrl(
    path: string, 
    contentType: string = 'application/octet-stream', 
    expiresIn: number = 3600, 
    bucket?: string
  ): Promise<string> {
    this.checkStorageWriteAccess();
    
    const bucketInstance = bucket ? this.storage.bucket(bucket) : this.storage.bucket();
    const file = bucketInstance.file(path);
    
    // Get signed URL for uploading
    const [url] = await file.getSignedUrl({
      action: 'write',
      contentType,
      expires: Date.now() + expiresIn * 1000,
    });
    
    return url;
  }
  
  async deleteFile(path: string, bucket?: string): Promise<void> {
    this.checkStorageWriteAccess();
    
    const bucketInstance = bucket ? this.storage.bucket(bucket) : this.storage.bucket();
    const file = bucketInstance.file(path);
    
    await file.delete();
  }
}