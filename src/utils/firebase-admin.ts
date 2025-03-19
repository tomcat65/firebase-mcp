import admin from 'firebase-admin';
import { cert } from 'firebase-admin/app';
import { Firestore } from 'firebase-admin/firestore';
import { Storage } from 'firebase-admin/storage';
import * as fs from 'fs';

// Initialize Firebase if not already initialized
let app: any; // Using 'any' to avoid namespace issues
try {
  app = admin.app();
} catch (err) {
  // Initialize with service account
  const serviceAccountPath = process.env.SERVICE_ACCOUNT_KEY_PATH;
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
  
  if (!serviceAccountPath) {
    throw new Error('SERVICE_ACCOUNT_KEY_PATH environment variable is required');
  }
  
  // Read service account file
  const serviceAccountFile = fs.readFileSync(serviceAccountPath, 'utf8');
  const serviceAccount = JSON.parse(serviceAccountFile);
  
  const appOptions: any = { // Using 'any' to avoid namespace issues
    credential: cert(serviceAccount)
  };
  
  if (storageBucket) {
    appOptions.storageBucket = storageBucket;
  }
  
  app = admin.initializeApp(appOptions);
}

// Export Firebase services
export const firestore = admin.firestore();
export const auth = admin.auth();
export const storage = admin.storage();

// Helper function to get project ID
export function getProjectId(): string {
  return app.options.projectId || '';
}

export default admin;