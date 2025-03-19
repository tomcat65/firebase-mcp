import { z } from 'zod';
import { AuthService } from '../services/firebase-service.js';
import { createErrorResponse, createSuccessResponse, withErrorHandling, ErrorType, getErrorMessage, FirebaseMcpError } from '../utils/error-handler.js';
import { RateLimiter } from '../utils/rate-limiter.js';
import * as admin from 'firebase-admin';
import type { UserRecord } from 'firebase-admin/auth';

// Rate limiter for Auth operations
const authRateLimiter = new RateLimiter({
  maxRequests: 100,  // 100 requests per minute
  windowMs: 60000    // 1 minute window
});

interface McpHandlerExtra {
  user?: {
    roles?: string[];
  };
}

// Helper function to check admin status
function isAdmin(extra: McpHandlerExtra): boolean {
  return extra.user?.roles?.includes('admin') || false;
}

// Define Firebase Auth tool schemas
export const ListUsersSchema = z.object({
  maxResults: z.number().positive().optional().default(1000),
  pageToken: z.string().optional()
});

export const GetUserSchema = z.object({
  uid: z.string().optional(),
  email: z.string().email().optional(),
  phoneNumber: z.string().optional()
}).refine(data => data.uid || data.email || data.phoneNumber, {
  message: "At least one of uid, email, or phoneNumber must be provided"
});

export const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().optional(),
  displayName: z.string().optional(),
  phoneNumber: z.string().optional(),
  photoURL: z.string().optional(),
  emailVerified: z.boolean().optional(),
  disabled: z.boolean().optional()
});

export const UpdateUserSchema = z.object({
  uid: z.string(),
  email: z.string().email().optional(),
  password: z.string().optional(),
  displayName: z.string().optional(),
  phoneNumber: z.string().optional(),
  photoURL: z.string().optional(),
  emailVerified: z.boolean().optional(),
  disabled: z.boolean().optional()
});

export const DeleteUserSchema = z.object({
  uid: z.string()
});

export const SetCustomClaimsSchema = z.object({
  uid: z.string(),
  claims: z.record(z.any())
});

// Type definitions for args
type ListUsersArgs = z.infer<typeof ListUsersSchema>;
type GetUserArgs = z.infer<typeof GetUserSchema>;
type CreateUserArgs = z.infer<typeof CreateUserSchema>;
type UpdateUserArgs = z.infer<typeof UpdateUserSchema>;
type DeleteUserArgs = z.infer<typeof DeleteUserSchema>;
type SetCustomClaimsArgs = z.infer<typeof SetCustomClaimsSchema>;

/**
 * Register Auth tool handlers
 * @param server MCP server instance
 * @param authService Auth service instance
 */
export function registerAuthHandlers(
  server: any,
  authService: AuthService
): void {
  // Handler for list_users
  server.tool(
    "list_users", 
    ListUsersSchema, 
    withErrorHandling(async (params: Record<string, never>, extra: McpHandlerExtra) => {
      if (!authRateLimiter.check('list_users')) {
        throw new FirebaseMcpError(
          ErrorType.RATE_LIMIT,
          'Too many list users requests. Please try again later.'
        );
      }

      // Check if user is authenticated and has admin role
      if (!isAdmin(extra)) {
        throw new FirebaseMcpError(
          ErrorType.AUTHORIZATION,
          'Only admin users can list users'
        );
      }

      const usersList = await admin.auth().listUsers();
      return createSuccessResponse(usersList.users.map((user: UserRecord) => ({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        disabled: user.disabled,
        emailVerified: user.emailVerified,
        creationTime: user.metadata.creationTime,
        lastSignInTime: user.metadata.lastSignInTime
      })));
    }, 'Error listing users')
  );
  
  // Handler for get_user
  server.tool(
    "get_user", 
    GetUserSchema, 
    withErrorHandling(async (args: GetUserArgs) => {
      // Check rate limiting
      if (!authRateLimiter.check('get_user')) {
        return createErrorResponse(
          "Rate limit exceeded for get_user. Please try again later.",
          ErrorType.RATE_LIMIT
        );
      }
      
      const { uid, email, phoneNumber } = args;
      
      try {
        const user = await authService.getUser(uid, email, phoneNumber);
        return createSuccessResponse(user);
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error);
        
        if (errorMessage.includes('disabled')) {
          return createErrorResponse(
            errorMessage,
            ErrorType.AUTHORIZATION
          );
        }
        
        if (errorMessage.includes('no user') || errorMessage.includes('not found')) {
          return createErrorResponse(
            `User not found`,
            ErrorType.NOT_FOUND
          );
        }
        
        return createErrorResponse(
          `Error retrieving user: ${errorMessage}`,
          ErrorType.FIREBASE,
          error
        );
      }
    })
  );
  
  // Handler for create_user
  server.tool(
    "create_user", 
    CreateUserSchema, 
    withErrorHandling(async (args: CreateUserArgs) => {
      // Check rate limiting
      if (!authRateLimiter.check('create_user')) {
        return createErrorResponse(
          "Rate limit exceeded for create_user. Please try again later.",
          ErrorType.RATE_LIMIT
        );
      }
      
      try {
        const user = await authService.createUser(args);
        return createSuccessResponse({
          message: `User successfully created`,
          user
        });
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error);
        
        if (errorMessage.includes('disabled') || errorMessage.includes('read-only mode')) {
          return createErrorResponse(
            errorMessage,
            ErrorType.AUTHORIZATION
          );
        }
        
        if (errorMessage.includes('already exists')) {
          return createErrorResponse(
            `User with this email already exists`,
            ErrorType.VALIDATION
          );
        }
        
        return createErrorResponse(
          `Error creating user: ${errorMessage}`,
          ErrorType.FIREBASE,
          error
        );
      }
    })
  );
  
  // Handler for update_user
  server.tool(
    "update_user", 
    UpdateUserSchema, 
    withErrorHandling(async (args: UpdateUserArgs) => {
      // Check rate limiting
      if (!authRateLimiter.check('update_user')) {
        return createErrorResponse(
          "Rate limit exceeded for update_user. Please try again later.",
          ErrorType.RATE_LIMIT
        );
      }
      
      const { uid, ...userData } = args;
      
      try {
        const user = await authService.updateUser(uid, userData);
        return createSuccessResponse({
          message: `User ${uid} successfully updated`,
          user
        });
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error);
        
        if (errorMessage.includes('disabled') || errorMessage.includes('read-only mode')) {
          return createErrorResponse(
            errorMessage,
            ErrorType.AUTHORIZATION
          );
        }
        
        if (errorMessage.includes('no user') || errorMessage.includes('not found')) {
          return createErrorResponse(
            `User not found with ID: ${uid}`,
            ErrorType.NOT_FOUND
          );
        }
        
        return createErrorResponse(
          `Error updating user: ${errorMessage}`,
          ErrorType.FIREBASE,
          error
        );
      }
    })
  );
  
  // Handler for delete_user
  server.tool(
    "delete_user", 
    DeleteUserSchema, 
    withErrorHandling(async (args: DeleteUserArgs) => {
      // Check rate limiting
      if (!authRateLimiter.check('delete_user')) {
        return createErrorResponse(
          "Rate limit exceeded for delete_user. Please try again later.",
          ErrorType.RATE_LIMIT
        );
      }
      
      const { uid } = args;
      
      try {
        await authService.deleteUser(uid);
        return createSuccessResponse(`User with ID ${uid} successfully deleted`);
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error);
        
        if (errorMessage.includes('disabled') || errorMessage.includes('read-only mode')) {
          return createErrorResponse(
            errorMessage,
            ErrorType.AUTHORIZATION
          );
        }
        
        if (errorMessage.includes('no user') || errorMessage.includes('not found')) {
          return createErrorResponse(
            `User not found with ID: ${uid}`,
            ErrorType.NOT_FOUND
          );
        }
        
        return createErrorResponse(
          `Error deleting user: ${errorMessage}`,
          ErrorType.FIREBASE,
          error
        );
      }
    })
  );
  
  // Handler for set_custom_claims
  server.tool(
    "set_custom_claims", 
    SetCustomClaimsSchema, 
    withErrorHandling(async (args: SetCustomClaimsArgs) => {
      // Check rate limiting
      if (!authRateLimiter.check('set_custom_claims')) {
        return createErrorResponse(
          "Rate limit exceeded for set_custom_claims. Please try again later.",
          ErrorType.RATE_LIMIT
        );
      }
      
      const { uid, claims } = args;
      
      try {
        await authService.setCustomClaims(uid, claims);
        return createSuccessResponse(
          `Custom claims for user ${uid} successfully updated: ${JSON.stringify(claims)}`
        );
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error);
        
        if (errorMessage.includes('disabled') || errorMessage.includes('read-only mode')) {
          return createErrorResponse(
            errorMessage,
            ErrorType.AUTHORIZATION
          );
        }
        
        if (errorMessage.includes('no user') || errorMessage.includes('not found')) {
          return createErrorResponse(
            `User not found with ID: ${uid}`,
            ErrorType.NOT_FOUND
          );
        }
        
        return createErrorResponse(
          `Error setting custom claims: ${errorMessage}`,
          ErrorType.FIREBASE,
          error
        );
      }
    })
  );
}
