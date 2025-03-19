import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerFirestoreTools } from './firestore/index.js';
import { registerAuthTools } from './auth/index.js';
import { registerStorageTools } from './storage/index.js';

/**
 * Register all tools with the MCP server
 * @param server The MCP server instance
 */
export function registerTools(server: McpServer): void {
  // Register tools by category
  registerFirestoreTools(server);
  registerAuthTools(server);
  registerStorageTools(server);
}