import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { storage } from '../../utils/firebase-admin.js';
import { logger } from '../../utils/logger.js';

/**
 * Register all Storage tools with the MCP server
 * @param server The MCP server instance
 */
export function registerStorageTools(server: McpServer): void {
  // Register list files tool
  server.tool(
    'storage_list_files',
    {
      directoryPath: z.string().optional().describe('Directory path to list files from'),
      pageSize: z.number().optional().default(100).describe('Number of files to return')
    },
    async ({ directoryPath, pageSize }: { directoryPath?: string; pageSize?: number }) => {
      try {
        const bucket = storage.bucket();
        const options: { maxResults: number; prefix?: string } = { 
          maxResults: pageSize || 100
        };
        
        if (directoryPath) {
          options.prefix = directoryPath;
        }
        
        const [files] = await bucket.getFiles(options);
        
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({
              files: files.map((file: any) => ({
                name: file.name,
                size: file.metadata.size,
                contentType: file.metadata.contentType,
                updated: file.metadata.updated
              }))
            }, null, 2)
          }]
        };
      } catch (error) {
        logger.error('Error listing files:', error);
        return {
          content: [{ 
            type: 'text', 
            text: `Error listing files: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );

  // Get file info tool
  server.tool(
    'storage_get_file_info',
    {
      filePath: z.string().describe('Path to the file in storage')
    },
    async ({ filePath }: { filePath: string }) => {
      try {
        const bucket = storage.bucket();
        const file = bucket.file(filePath);
        const [exists] = await file.exists();
        
        if (!exists) {
          return {
            content: [{ 
              type: 'text', 
              text: `File not found: ${filePath}`
            }],
            isError: true
          };
        }
        
        const [metadata] = await file.getMetadata();
        const [url] = await file.getSignedUrl({
          action: 'read',
          expires: Date.now() + 15 * 60 * 1000 // 15 minutes
        });
        
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({
              name: metadata.name,
              bucket: metadata.bucket,
              size: metadata.size,
              contentType: metadata.contentType,
              created: metadata.timeCreated,
              updated: metadata.updated,
              downloadUrl: url
            }, null, 2)
          }]
        };
      } catch (error) {
        logger.error('Error getting file info:', error);
        return {
          content: [{ 
            type: 'text', 
            text: `Error getting file info: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );
}