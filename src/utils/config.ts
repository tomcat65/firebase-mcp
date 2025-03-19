import * as dotenv from 'dotenv';
import * as fs from 'fs';

// Load environment variables from .env file
dotenv.config();

/**
 * Required environment variables for Firebase configuration
 */
const REQUIRED_ENV_VARS = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID'
];

/**
 * Validates that all required environment variables are present
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for required environment variables
  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
      errors.push(`Missing required environment variable: ${envVar}`);
    }
  }

  // Check for valid Firebase project ID format
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (projectId && !/^[a-z0-9-]+$/.test(projectId)) {
    errors.push('FIREBASE_PROJECT_ID must contain only lowercase letters, numbers, and hyphens');
  }

  // Check for valid Firebase API key format
  const apiKey = process.env.FIREBASE_API_KEY;
  if (apiKey && !/^AIza[0-9A-Za-z-_]{35}$/.test(apiKey)) {
    errors.push('FIREBASE_API_KEY must be a valid Firebase API key');
  }

  // Check for valid Firebase app ID format
  const appId = process.env.FIREBASE_APP_ID;
  if (appId && !/^\d+:[\d\w-]+:(web|ios|android):[\da-f]+$/.test(appId)) {
    errors.push('FIREBASE_APP_ID must be a valid Firebase app ID');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get configuration values with defaults
 */
export const appConfig = {
  serviceAccountKeyPath: process.env.SERVICE_ACCOUNT_KEY_PATH,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  logLevel: process.env.LOG_LEVEL || 'info',
  rateLimiting: {
    enabled: process.env.RATE_LIMIT_ENABLED !== 'false', // Default to true
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)
  }
};

export default appConfig;