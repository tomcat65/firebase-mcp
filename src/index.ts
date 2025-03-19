#!/usr/bin/env node

/**
 * Firebase MCP Server
 *
 * This server implements the Model Context Protocol (MCP) for Firebase services.
 * It provides tools for interacting with Firebase Authentication, Firestore, and Storage
 * through a standardized interface that can be used by AI assistants and other MCP clients.
 *
 * @module firebase-mcp
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { logger } from './utils/logger.js';
import { validateConfig } from './utils/config.js';
import {
  firestore_add_document,
  firestore_get_document,
  firestore_query_documents,
  firestore_update_document,
  firestore_delete_document,
  firestore_batch_operations
} from './tools/firestore-tools.js';
import {
  auth_create_user,
  auth_sign_in,
  auth_sign_out,
  auth_update_profile,
  auth_update_email,
  auth_update_password,
  auth_delete_user,
  auth_send_password_reset,
  auth_send_verification
} from './tools/auth-tools.js';
import {
  storage_upload_file,
  storage_get_download_url,
  storage_delete_file,
  storage_list_files,
  storage_get_metadata,
  storage_update_metadata
} from './tools/storage-tools.js';

// Import authentication utilities
import { initializeAuth, SecurityLevel } from './auth-utils.js';

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config();

// Import type from Firestore to use for tools
import { WhereFilterOp } from 'firebase/firestore';

// Load and validate Firebase config early
import './firebase.js';

/**
 * Initialize and run the Firebase MCP server
 */
async function main() {
  try {
    // Validate configuration
    const configCheck = validateConfig();
    if (!configCheck.valid) {
      configCheck.errors.forEach((error: string) => console.error(`Configuration Error: ${error}`));
      process.exit(1);
    }

    // Initialize authentication
    await initializeAuth();
    logger.info(`Server running in ${process.env.SECURITY_LEVEL || SecurityLevel.DEVELOPMENT} security mode`);

    // Create a new MCP server with the simplified API
    const server = new McpServer({
      name: 'firebase-mcp',
      version: '1.0.0'
    });

    // Register auth tools
    server.tool('auth_create_user', {
      email: z.string(),
      password: z.string(),
      displayName: z.string().optional(),
      photoURL: z.string().optional(),
      sendEmailVerification: z.boolean().optional()
    }, auth_create_user);

    server.tool('auth_sign_in', {
      email: z.string(),
      password: z.string()
    }, auth_sign_in);

    server.tool('auth_sign_out', {}, auth_sign_out);

    server.tool('auth_update_profile', {
      displayName: z.string().optional(),
      photoURL: z.string().optional()
    }, auth_update_profile);

    server.tool('auth_update_email', {
      newEmail: z.string()
    }, auth_update_email);

    server.tool('auth_update_password', {
      newPassword: z.string()
    }, auth_update_password);

    server.tool('auth_delete_user', {}, auth_delete_user);

    server.tool('auth_send_password_reset', {
      email: z.string()
    }, auth_send_password_reset);

    server.tool('auth_send_verification', {}, auth_send_verification);

    // Register Firestore tools
    server.tool('firestore_add_document', {
      collection: z.string(),
      data: z.record(z.any())
    }, firestore_add_document);

    server.tool('firestore_get_document', {
      path: z.string()
    }, firestore_get_document);

    server.tool('firestore_query_documents', {
      collection: z.string(),
      query: z.object({
        where: z.array(z.tuple([z.string(), z.string(), z.any()])).optional(),
        orderBy: z.array(z.tuple([z.string(), z.enum(['asc', 'desc']).optional()])).optional(),
        limit: z.number().optional()
      }).optional()
    }, firestore_query_documents as any);

    server.tool('firestore_update_document', {
      path: z.string(),
      data: z.record(z.any())
    }, firestore_update_document);

    server.tool('firestore_delete_document', {
      path: z.string()
    }, firestore_delete_document);

    server.tool('firestore_batch_operations', {
      operations: z.array(z.object({
        type: z.enum(['set', 'update', 'delete']),
        path: z.string(),
        data: z.record(z.any()).optional()
      }))
    }, firestore_batch_operations as any);

    // Register Storage tools
    server.tool('storage_upload_file', {
      path: z.string(),
      data: z.string(),
      contentType: z.string().optional(),
      customMetadata: z.record(z.string()).optional()
    }, storage_upload_file);

    server.tool('storage_get_download_url', {
      path: z.string()
    }, storage_get_download_url);

    server.tool('storage_delete_file', {
      path: z.string()
    }, storage_delete_file);

    server.tool('storage_list_files', {
      path: z.string()
    }, storage_list_files);

    server.tool('storage_get_metadata', {
      path: z.string()
    }, storage_get_metadata);

    server.tool('storage_update_metadata', {
      path: z.string(),
      metadata: z.object({
        contentType: z.string().optional(),
        customMetadata: z.record(z.string()).optional()
      })
    }, storage_update_metadata);

    // Create stdio transport
    const transport = new StdioServerTransport();

    // Start the server using stdio transport
    await server.connect(transport);
    logger.info('Firebase MCP server running on stdio');

    // Set up graceful shutdown
    process.on('SIGINT', async () => {
      logger.info("Received SIGINT signal, cleaning up...");
      try {
        await server.close();
        logger.info("Server closed successfully");
        process.exit(0);
      } catch (err) {
        logger.error("Error during shutdown:", err);
        process.exit(1);
      }
    });

    process.on('SIGTERM', async () => {
      logger.info("Received SIGTERM signal, cleaning up...");
      try {
        await server.close();
        logger.info("Server closed successfully");
        process.exit(0);
      } catch (err) {
        logger.error("Error during shutdown:", err);
        process.exit(1);
      }
    });
  } catch (error) {
    logger.error('Error starting Firebase MCP server:', error);
    process.exit(1);
  }
}

// Start the server
main();