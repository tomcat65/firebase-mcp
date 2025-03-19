/**
 * Authentication utilities for Firebase MCP Server
 * Implements helper functions for working with Firestore security rules
 */

import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { logger } from './utils/logger.js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// API key for AI assistant access - should be set in .env
const AI_ASSISTANT_API_KEY = process.env.AI_ASSISTANT_API_KEY || 'default-development-key';

// Security level configuration
export enum SecurityLevel {
  DEVELOPMENT = 'development',
  TESTING = 'testing',
  PRODUCTION = 'production'
}

// Get configured security level from environment or default to development
export const SECURITY_LEVEL = (process.env.SECURITY_LEVEL as SecurityLevel) || SecurityLevel.DEVELOPMENT;

/**
 * Validates if the provided API key is authorized for AI assistant access
 * @param apiKey The API key to validate
 * @returns Boolean indicating whether the key is valid
 */
export function isValidAPIKey(apiKey: string): boolean {
  // In development mode, accept any key
  if (SECURITY_LEVEL === SecurityLevel.DEVELOPMENT) {
    return true;
  }
  
  // In testing/production, verify against configured key
  return apiKey === AI_ASSISTANT_API_KEY;
}

/**
 * Authenticates as an AI assistant user for Firestore operations
 * @param apiKey Optional API key (defaults to environment variable)
 * @returns Promise resolving to the authenticated user credential
 */
export async function authenticateAsAIAssistant(apiKey: string = AI_ASSISTANT_API_KEY) {
  try {
    // Skip in development mode
    if (SECURITY_LEVEL === SecurityLevel.DEVELOPMENT) {
      logger.info('Running in development mode - authentication skipped');
      return null;
    }
    
    const auth = getAuth();
    
    // For demo purposes, this uses a predefined token
    // In production, you would generate this token on your server
    // using Firebase Admin SDK's createCustomToken() with appropriate claims
    
    // This is a placeholder token generation approach
    // For a real implementation, you would:
    // 1. Use Firebase Admin SDK on server-side 
    // 2. Create a custom token with appropriate claims
    // 3. Return the token to client
    
    // Custom token with AI assistant role would be created like:
    // const token = await admin.auth().createCustomToken('ai-assistant', { role: 'ai_assistant' });
    
    // For this demo, we'd use a pre-generated token or generate one securely
    // using a separate authenticated endpoint
    
    // Example placeholder (you would implement token acquisition securely):
    const customToken = process.env.AI_ASSISTANT_TOKEN || 'YOUR_CUSTOM_TOKEN_HERE';
    
    if (customToken && customToken !== 'YOUR_CUSTOM_TOKEN_HERE') {
      const userCredential = await signInWithCustomToken(auth, customToken);
      logger.info('Authenticated as AI assistant');
      return userCredential;
    } else {
      logger.warn('No valid AI assistant token found in environment');
      return null;
    }
  } catch (error) {
    logger.error('Error authenticating as AI assistant:', error);
    return null;
  }
}

/**
 * Gets the current authenticated user if available
 * @returns The current user or null
 */
export function getCurrentUser() {
  const auth = getAuth();
  return auth.currentUser;
}

/**
 * Checks if the current user has AI assistant role
 * @returns Boolean indicating if user has AI assistant role
 */
export function isAIAssistant() {
  // Skip in development mode
  if (SECURITY_LEVEL === SecurityLevel.DEVELOPMENT) {
    return true;
  }
  
  const user = getCurrentUser();
  if (!user) return false;
  
  // Check for AI assistant role in custom claims
  // Get token result returns a promise, we need to use this differently
  return user.getIdTokenResult()
    .then(idTokenResult => idTokenResult.claims?.role === 'ai_assistant')
    .catch(error => {
      logger.error('Error checking AI assistant role:', error);
      return false;
    });
}

/**
 * Initializes authentication based on configuration
 * Should be called during server startup
 */
export async function initializeAuth() {
  try {
    logger.info(`Initializing authentication in ${SECURITY_LEVEL} mode`);
    
    if (SECURITY_LEVEL !== SecurityLevel.DEVELOPMENT) {
      // Authenticate as AI assistant for non-development environments
      await authenticateAsAIAssistant();
    }
    
    logger.info('Authentication initialized successfully');
  } catch (error) {
    logger.error('Error initializing authentication:', error);
  }
} 