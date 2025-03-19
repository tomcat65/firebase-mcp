import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  updateEmail,
  updatePassword,
  deleteUser,
  sendEmailVerification,
  sendPasswordResetEmail,
  User
} from 'firebase/auth';
import { logger } from '../utils/logger.js';
import { defaultRateLimiter } from '../utils/rate-limiter.js';
import { validateRequiredParams } from '../utils/validation.js';
import { createSuccessResponse, createErrorResponse, FirebaseMcpError, ErrorType } from '../utils/error-handler.js';
import { McpResponse, RequestHandlerExtra } from '@modelcontextprotocol/sdk/server/mcp.js';

// Don't initialize auth at the module level to avoid startup errors with invalid API keys
// Will initialize in each function instead

type AuthCreateUserParams = {
  email: string;
  password: string;
  displayName?: string;
  photoURL?: string;
  sendEmailVerification?: boolean;
};

type AuthSignInParams = {
  email: string;
  password: string;
};

type AuthUpdateProfileParams = {
  displayName?: string;
  photoURL?: string;
};

type AuthUpdateEmailParams = {
  newEmail: string;
};

type AuthUpdatePasswordParams = {
  newPassword: string;
};

type AuthSendPasswordResetParams = {
  email: string;
};

/**
 * Helper function to safely get Firebase Auth instance
 */
function safeGetAuth() {
  try {
    return getAuth();
  } catch (error: any) {
    logger.error('Error initializing Firebase Auth:', error);
    throw new FirebaseMcpError(
      ErrorType.FIREBASE,
      'Firebase Authentication is not available. Please check your Firebase configuration.',
      error
    );
  }
}

/**
 * Create a new user account
 */
export async function auth_create_user(params: AuthCreateUserParams, extra: RequestHandlerExtra): Promise<McpResponse> {
  try {
    // Validate required parameters
    validateRequiredParams(params, [
      { name: 'email', type: 'string' },
      { name: 'password', type: 'string' }
    ]);

    // Check rate limit
    if (!defaultRateLimiter.check('auth_create')) {
      throw new FirebaseMcpError(
        ErrorType.RATE_LIMIT,
        'Rate limit exceeded for creating users. Please try again later.'
      );
    }

    // Safely get auth instance
    const auth = safeGetAuth();

    // Create user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      params.email,
      params.password
    );

    // Update profile if provided
    if (params.displayName || params.photoURL) {
      await updateProfile(userCredential.user, {
        displayName: params.displayName,
        photoURL: params.photoURL
      });
    }

    // Send email verification if requested
    if (params.sendEmailVerification) {
      await sendEmailVerification(userCredential.user);
    }

    logger.info(`Created user account for ${params.email}`);
    return createSuccessResponse({
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      message: 'User account created successfully'
    });
  } catch (error: any) {
    logger.error('Error creating user account:', error);
    
    if (error instanceof FirebaseMcpError) {
      throw error;
    }
    
    throw new FirebaseMcpError(
      ErrorType.FIREBASE,
      `Error creating user account: ${error.message || 'Unknown error'}`
    );
  }
}

/**
 * Sign in a user
 */
export async function auth_sign_in(params: AuthSignInParams, extra: RequestHandlerExtra): Promise<McpResponse> {
  try {
    // Validate required parameters
    validateRequiredParams(params, [
      { name: 'email', type: 'string' },
      { name: 'password', type: 'string' }
    ]);

    // Check rate limit
    if (!defaultRateLimiter.check('auth_sign_in')) {
      throw new FirebaseMcpError(
        ErrorType.RATE_LIMIT,
        'Rate limit exceeded for sign in attempts. Please try again later.'
      );
    }

    // Safely get auth instance
    const auth = safeGetAuth();

    // Sign in user
    const userCredential = await signInWithEmailAndPassword(
      auth,
      params.email,
      params.password
    );

    logger.info(`User signed in: ${params.email}`);
    return createSuccessResponse({
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      message: 'Signed in successfully'
    });
  } catch (error: any) {
    logger.error('Error signing in:', error);
    
    if (error instanceof FirebaseMcpError) {
      throw error;
    }
    
    throw new FirebaseMcpError(
      ErrorType.FIREBASE,
      `Error signing in: ${error.message || 'Unknown error'}`
    );
  }
}

/**
 * Sign out the current user
 */
export async function auth_sign_out(params: Record<string, never>, extra: RequestHandlerExtra): Promise<McpResponse> {
  try {
    // Check rate limit
    if (!defaultRateLimiter.check('auth_sign_out')) {
      throw new FirebaseMcpError(
        ErrorType.RATE_LIMIT,
        'Rate limit exceeded for sign out attempts. Please try again later.'
      );
    }

    // Sign out user
    const auth = safeGetAuth();
    await signOut(auth);

    logger.info('User signed out');
    return createSuccessResponse({
      message: 'Signed out successfully'
    });
  } catch (error: any) {
    logger.error('Error signing out:', error);
    
    if (error instanceof FirebaseMcpError) {
      throw error;
    }
    
    throw new FirebaseMcpError(
      ErrorType.FIREBASE,
      `Error signing out: ${error.message || 'Unknown error'}`
    );
  }
}

/**
 * Update user profile
 */
export async function auth_update_profile(params: AuthUpdateProfileParams, extra: RequestHandlerExtra): Promise<McpResponse> {
  try {
    // Validate required parameters
    if (!params.displayName && !params.photoURL) {
      throw new FirebaseMcpError(
        ErrorType.VALIDATION,
        'At least one of displayName or photoURL must be provided'
      );
    }

    // Check rate limit
    if (!defaultRateLimiter.check('auth_update_profile')) {
      throw new FirebaseMcpError(
        ErrorType.RATE_LIMIT,
        'Rate limit exceeded for updating profile. Please try again later.'
      );
    }

    // Safely get auth instance
    const auth = safeGetAuth();

    // Get current user
    const user = auth.currentUser;
    if (!user) {
      throw new FirebaseMcpError(
        ErrorType.AUTHORIZATION,
        'No user is currently signed in'
      );
    }

    // Update profile
    await updateProfile(user, {
      displayName: params.displayName,
      photoURL: params.photoURL
    });

    logger.info(`Updated profile for user ${user.email}`);
    return createSuccessResponse({
      email: user.email,
      message: 'Profile updated successfully'
    });
  } catch (error: any) {
    logger.error('Error updating profile:', error);
    
    if (error instanceof FirebaseMcpError) {
      throw error;
    }
    
    throw new FirebaseMcpError(
      ErrorType.FIREBASE,
      `Error updating profile: ${error.message || 'Unknown error'}`
    );
  }
}

/**
 * Update user email
 */
export async function auth_update_email(params: AuthUpdateEmailParams, extra: RequestHandlerExtra): Promise<McpResponse> {
  try {
    // Validate required parameters
    validateRequiredParams(params, [
      { name: 'newEmail', type: 'string' }
    ]);

    // Check rate limit
    if (!defaultRateLimiter.check('auth_update_email')) {
      throw new FirebaseMcpError(
        ErrorType.RATE_LIMIT,
        'Rate limit exceeded for updating email. Please try again later.'
      );
    }

    // Safely get auth instance
    const auth = safeGetAuth();

    // Get current user
    const user = auth.currentUser;
    if (!user) {
      throw new FirebaseMcpError(
        ErrorType.AUTHORIZATION,
        'No user is currently signed in'
      );
    }

    // Update email
    await updateEmail(user, params.newEmail);

    logger.info(`Updated email for user to ${params.newEmail}`);
    return createSuccessResponse({
      email: params.newEmail,
      message: 'Email updated successfully'
    });
  } catch (error: any) {
    logger.error('Error updating email:', error);
    
    if (error instanceof FirebaseMcpError) {
      throw error;
    }
    
    throw new FirebaseMcpError(
      ErrorType.FIREBASE,
      `Error updating email: ${error.message || 'Unknown error'}`
    );
  }
}

/**
 * Update user password
 */
export async function auth_update_password(params: AuthUpdatePasswordParams, extra: RequestHandlerExtra): Promise<McpResponse> {
  try {
    // Validate required parameters
    validateRequiredParams(params, [
      { name: 'newPassword', type: 'string' }
    ]);

    // Check rate limit
    if (!defaultRateLimiter.check('auth_update_password')) {
      throw new FirebaseMcpError(
        ErrorType.RATE_LIMIT,
        'Rate limit exceeded for updating password. Please try again later.'
      );
    }

    // Safely get auth instance
    const auth = safeGetAuth();

    // Get current user
    const user = auth.currentUser;
    if (!user) {
      throw new FirebaseMcpError(
        ErrorType.AUTHORIZATION,
        'No user is currently signed in'
      );
    }

    // Update password
    await updatePassword(user, params.newPassword);

    logger.info(`Updated password for user ${user.email}`);
    return createSuccessResponse({
      email: user.email,
      message: 'Password updated successfully'
    });
  } catch (error: any) {
    logger.error('Error updating password:', error);
    
    if (error instanceof FirebaseMcpError) {
      throw error;
    }
    
    throw new FirebaseMcpError(
      ErrorType.FIREBASE,
      `Error updating password: ${error.message || 'Unknown error'}`
    );
  }
}

/**
 * Delete user account
 */
export async function auth_delete_user(params: Record<string, never>, extra: RequestHandlerExtra): Promise<McpResponse> {
  try {
    // Check rate limit
    if (!defaultRateLimiter.check('auth_delete')) {
      throw new FirebaseMcpError(
        ErrorType.RATE_LIMIT,
        'Rate limit exceeded for deleting user account. Please try again later.'
      );
    }

    // Safely get auth instance
    const auth = safeGetAuth();

    // Get current user
    const user = auth.currentUser;
    if (!user) {
      throw new FirebaseMcpError(
        ErrorType.AUTHORIZATION,
        'No user is currently signed in'
      );
    }

    const userEmail = user.email;
    
    // Delete user
    await deleteUser(user);

    logger.info(`Deleted user account ${userEmail}`);
    return createSuccessResponse({
      email: userEmail,
      message: 'User account deleted successfully'
    });
  } catch (error: any) {
    logger.error('Error deleting user account:', error);
    
    if (error instanceof FirebaseMcpError) {
      throw error;
    }
    
    throw new FirebaseMcpError(
      ErrorType.FIREBASE,
      `Error deleting user account: ${error.message || 'Unknown error'}`
    );
  }
}

/**
 * Send password reset email
 */
export async function auth_send_password_reset(params: AuthSendPasswordResetParams, extra: RequestHandlerExtra): Promise<McpResponse> {
  try {
    // Validate required parameters
    validateRequiredParams(params, [
      { name: 'email', type: 'string' }
    ]);

    // Check rate limit
    if (!defaultRateLimiter.check('auth_send_password_reset')) {
      throw new FirebaseMcpError(
        ErrorType.RATE_LIMIT,
        'Rate limit exceeded for sending password reset email. Please try again later.'
      );
    }

    // Safely get auth instance
    const auth = safeGetAuth();

    // Send password reset email
    await sendPasswordResetEmail(auth, params.email);

    logger.info(`Sent password reset email to ${params.email}`);
    return createSuccessResponse({
      email: params.email,
      message: 'Password reset email sent'
    });
  } catch (error: any) {
    logger.error('Error sending password reset email:', error);
    
    if (error instanceof FirebaseMcpError) {
      throw error;
    }
    
    throw new FirebaseMcpError(
      ErrorType.FIREBASE,
      `Error sending password reset email: ${error.message || 'Unknown error'}`
    );
  }
}

/**
 * Send email verification
 */
export async function auth_send_verification(params: Record<string, never>, extra: RequestHandlerExtra): Promise<McpResponse> {
  try {
    // Check rate limit
    if (!defaultRateLimiter.check('auth_send_verification')) {
      throw new FirebaseMcpError(
        ErrorType.RATE_LIMIT,
        'Rate limit exceeded for sending verification email. Please try again later.'
      );
    }

    // Safely get auth instance
    const auth = safeGetAuth();

    // Get current user
    const user = auth.currentUser;
    if (!user) {
      throw new FirebaseMcpError(
        ErrorType.AUTHORIZATION,
        'No user is currently signed in'
      );
    }

    // Send verification email
    await sendEmailVerification(user);

    logger.info(`Sent verification email to ${user.email}`);
    return createSuccessResponse({
      email: user.email,
      message: 'Verification email sent'
    });
  } catch (error: any) {
    logger.error('Error sending verification email:', error);
    
    if (error instanceof FirebaseMcpError) {
      throw error;
    }
    
    throw new FirebaseMcpError(
      ErrorType.FIREBASE,
      `Error sending verification email: ${error.message || 'Unknown error'}`
    );
  }
} 