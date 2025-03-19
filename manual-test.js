#!/usr/bin/env node

import { spawn } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CREDENTIALS_PATH = process.env.FIREBASE_CREDENTIALS_PATH || 'C:/Users/TOMAS/coding/projects/ai_coding/docs/llm-memory-resorce-6fb1f4500a7d.json';

async function runTest() {
  console.log('Starting Firebase MCP server...');
  
  // Start the server process
  const serverProcess = spawn('node', [
    path.join(__dirname, './dist/index.js'),
    `--credentials=${CREDENTIALS_PATH}`,
    '--log-level=debug'
  ], {
    stdio: ['pipe', 'pipe', process.stderr]
  });
  
  console.log('Waiting for server initialization...');
  // Wait for server to initialize
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Create client with stdio transport
  console.log('Creating MCP client...');
  const transport = new StdioClientTransport(serverProcess.stdin, serverProcess.stdout);
  const client = new Client(transport);
  
  try {
    // List tools
    console.log('\n--- Testing tool listing ---');
    const tools = await client.listTools();
    console.log(`Available tools (${tools.length}):`);
    tools.forEach(tool => console.log(`- ${tool}`));
    
    // Test a simple query if you have data in your Firestore
    // Uncomment and modify these sections as needed
    
    /*
    console.log('\n--- Testing query_collection tool ---');
    const queryResult = await client.callTool('query_collection', {
      collection: 'your_collection',
      limit: 3
    });
    console.log('Query result:', JSON.parse(queryResult.content[0].text));
    
    console.log('\n--- Testing get_document tool ---');
    const docResult = await client.callTool('get_document', {
      collection: 'your_collection',
      documentId: 'your_document_id'
    });
    console.log('Document result:', JSON.parse(docResult.content[0].text));
    */
    
    console.log('\n--- All tests completed successfully ---');
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Clean up
    console.log('Shutting down server...');
    serverProcess.kill();
  }
}

runTest().catch(err => {
  console.error('Error in test:', err);
  process.exit(1);
}); 