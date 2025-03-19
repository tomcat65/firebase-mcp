import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { firestore } from '../../utils/firebase-admin.js';
import { logger } from '../../utils/logger.js';

/**
 * Register all Firestore tools with the MCP server
 * @param server The MCP server instance
 */
export function registerFirestoreTools(server: McpServer): void {
  // Register list collections tool
  server.tool(
    'firestore_list_collections',
    {
      path: z.string().optional().describe('Optional path to list collections from')
    },
    async ({ path }: { path?: string }) => {
      try {
        let collections;
        if (path) {
          const docRef = firestore.doc(path);
          collections = await docRef.listCollections();
        } else {
          collections = await firestore.listCollections();
        }
        
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({ 
              collections: collections.map((col: any) => col.id) 
            }, null, 2)
          }]
        };
      } catch (error) {
        logger.error('Error listing collections:', error);
        return {
          content: [{ 
            type: 'text', 
            text: `Error listing collections: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );

  // Add document tool
  server.tool(
    'firestore_add_document',
    {
      collection: z.string().describe('Collection name'),
      data: z.record(z.any()).describe('Document data')
    },
    async ({ collection, data }: { collection: string; data: any }) => {
      try {
        const docRef = await firestore.collection(collection).add(data);
        
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({
              id: docRef.id,
              message: `Document successfully added to collection '${collection}'`
            }, null, 2)
          }]
        };
      } catch (error) {
        logger.error('Error adding document:', error);
        return {
          content: [{ 
            type: 'text', 
            text: `Error adding document: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );

  // Get document tool
  server.tool(
    'firestore_get_document',
    {
      collection: z.string().describe('Collection name'),
      id: z.string().describe('Document ID')
    },
    async ({ collection, id }: { collection: string; id: string }) => {
      try {
        const docRef = firestore.collection(collection).doc(id);
        const doc = await docRef.get();
        
        if (!doc.exists) {
          return {
            content: [{ 
              type: 'text', 
              text: `Document with ID '${id}' not found in collection '${collection}'`
            }],
            isError: true
          };
        }
        
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({
              id: doc.id,
              data: doc.data()
            }, null, 2)
          }]
        };
      } catch (error) {
        logger.error('Error getting document:', error);
        return {
          content: [{ 
            type: 'text', 
            text: `Error getting document: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );

  // Update document tool
  server.tool(
    'firestore_update_document',
    {
      collection: z.string().describe('Collection name'),
      id: z.string().describe('Document ID'),
      data: z.record(z.any()).describe('Updated document data')
    },
    async ({ collection, id, data }: { collection: string; id: string; data: any }) => {
      try {
        const docRef = firestore.collection(collection).doc(id);
        await docRef.update(data);
        
        return {
          content: [{ 
            type: 'text', 
            text: `Document '${id}' successfully updated in collection '${collection}'`
          }]
        };
      } catch (error) {
        logger.error('Error updating document:', error);
        return {
          content: [{ 
            type: 'text', 
            text: `Error updating document: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );

  // Delete document tool
  server.tool(
    'firestore_delete_document',
    {
      collection: z.string().describe('Collection name'),
      id: z.string().describe('Document ID')
    },
    async ({ collection, id }: { collection: string; id: string }) => {
      try {
        await firestore.collection(collection).doc(id).delete();
        
        return {
          content: [{ 
            type: 'text', 
            text: `Document '${id}' successfully deleted from collection '${collection}'`
          }]
        };
      } catch (error) {
        logger.error('Error deleting document:', error);
        return {
          content: [{ 
            type: 'text', 
            text: `Error deleting document: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );
}