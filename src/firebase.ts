import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { logger } from './utils/logger.js';

// Check for required Firebase config
function validateFirebaseConfig() {
  const requiredVars = [
    'FIREBASE_API_KEY',
    'FIREBASE_AUTH_DOMAIN',
    'FIREBASE_PROJECT_ID'
  ];
  
  const missing = requiredVars.filter(name => !process.env[name]);
  
  if (missing.length > 0) {
    logger.warn(`Missing required Firebase environment variables: ${missing.join(', ')}`);
    logger.warn('Firebase functionality may be limited. Check your .env file.');
    return false;
  }
  
  return true;
}

// Firebase configuration
const firebaseConfig = {
  // Config will be loaded from environment variables
  apiKey: process.env.FIREBASE_API_KEY || '',
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.FIREBASE_APP_ID || ''
};

let app: FirebaseApp | null = null;
let firestore: Firestore | null = null;

// Initialize Firebase if config is valid
if (validateFirebaseConfig()) {
  try {
    app = initializeApp(firebaseConfig);
    firestore = getFirestore(app);
    logger.info('Firebase initialized successfully');
  } catch (error) {
    logger.error('Error initializing Firebase', error);
    // Don't throw, allow the server to start with limited functionality
  }
} else {
  logger.warn('Firebase initialization skipped due to missing configuration');
}

// Safe getter for Firestore
export function getDb(): Firestore {
  if (!firestore) {
    throw new Error('Firestore is not initialized. Check your Firebase configuration.');
  }
  return firestore;
}

// Export Firestore instance for backward compatibility
export const db = firestore; 