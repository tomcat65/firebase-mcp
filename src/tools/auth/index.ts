import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { auth } from '../../utils/firebase-admin.js';
import { logger } from '../../utils/logger.js';

/**
 * Register all Auth tools with the MCP server
 * @param server The MCP server instance
 */
export function registerAuthTools(server: McpServer): void {
  // Register get user tool
  server.tool(
    'auth_get_user',
    {
      identifier: z.string().describe('User ID or email address')
    },
    async ({ identifier }: { identifier: string }) => {
      try {
        let user;
        // Check if it's an email or UID
        if (identifier.includes('@')) {
          user = await auth.getUserByEmail(identifier);
        } else {
          user = await auth.getUser(identifier);
        }
        
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
              disabled: user.disabled,
              emailVerified: user.emailVerified,
              metadata: {
                creationTime: user.metadata.creationTime,
                lastSignInTime: user.metadata.lastSignInTime
              }
            }, null, 2)
          }]
        };
      } catch (error) {
        logger.error('Error getting user:', error);
        return {
          content: [{ 
            type: 'text', 
            text: `Error getting user: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );

  // List users tool
  server.tool(
    'auth_list_users',
    {
      maxResults: z.number().optional().default(100).describe('Maximum number of users to return')
    },
    async ({ maxResults }: { maxResults?: number }) => {
      try {
        const listUsersResult = await auth.listUsers(maxResults);
        
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({
              users: listUsersResult.users.map((user: any) => ({
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                disabled: user.disabled
              }))
            }, null, 2)
          }]
        };
      } catch (error) {
        logger.error('Error listing users:', error);
        return {
          content: [{ 
            type: 'text', 
            text: `Error listing users: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );
}