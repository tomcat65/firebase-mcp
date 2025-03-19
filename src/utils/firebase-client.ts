/**
 * Firebase Client Utility
 * 
 * This module provides properly typed Firebase clients to use throughout the application.
 * It handles the initialization and type safety of Firebase services.
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import appConfig from './config.js';

// Get configuration
const serviceAccountKeyPath = appConfig.serviceAccountKeyPath;
const storageBucket = appConfig.storageBucket;

// Initialize Firebase if not already initialized
let app: any; // Using any to avoid namespace issues
try {
  app = admin.app();
} catch (err) {
  // Check if service account key path is provided
  if (!serviceAccountKeyPath) {
    throw new Error('SERVICE_ACCOUNT_KEY_PATH environment variable is required');
  }

  // Load the service account key file
  let serviceAccount;
  try {
    const serviceAccountFile = fs.readFileSync(serviceAccountKeyPath, 'utf8');
    serviceAccount = JSON.parse(serviceAccountFile);
  } catch (error) {
    throw new Error(`Error loading service account key: ${error}`);
  }

  // Initialize the Firebase app
  const appOptions: any = { // Using any to avoid namespace issues
    credential: admin.credential.cert(serviceAccount)
  };

  // Add storage bucket if provided
  if (storageBucket) {
    appOptions.storageBucket = storageBucket;
  }

  app = admin.initializeApp(appOptions);
}

// Export typed Firebase services
export const firestoreDb = admin.firestore();
export const authClient = admin.auth();
export const storageClient = admin.storage();

// Helper function to get project ID
export function getProjectId(): string {
  return app.options.projectId || '';
}
