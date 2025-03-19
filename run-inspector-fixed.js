#!/usr/bin/env node

// Load environment variables
import dotenv from 'dotenv';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

console.log('Firebase MCP Inspector Tool');
console.log('---------------------------');
console.log('Checking environment...');

// Check for required environment variables
const serviceAccountPath = process.env.SERVICE_ACCOUNT_KEY_PATH;
if (!serviceAccountPath) {
  console.error('Error: SERVICE_ACCOUNT_KEY_PATH environment variable is not set.');
  console.error('Please make sure your .env file contains this variable.');
  process.exit(1);
}

console.log(`Using service account from: ${serviceAccountPath}`);
if (!fs.existsSync(serviceAccountPath)) {
  console.error(`Error: Service account file not found at ${serviceAccountPath}`);
  process.exit(1);
}

// Check if dist/index.js exists
const distPath = path.join(__dirname, 'dist', 'index.js');
if (!fs.existsSync(distPath)) {
  console.error(`Error: ${distPath} not found. Have you built the project?`);
  console.error('Run npm run build first.');
  process.exit(1);
}

console.log('All checks passed. Starting MCP Inspector...');

// Use exec instead of spawn, which should find npx in the PATH
const command = `npx @modelcontextprotocol/inspector "${distPath}"`;
console.log(`Running command: ${command}`);

const inspectorProcess = exec(command, { env: process.env }, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error executing command: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`Command stderr: ${stderr}`);
  }
  console.log(`Command stdout: ${stdout}`);
});

inspectorProcess.on('exit', (code) => {
  console.log(`MCP Inspector exited with code ${code}`);
});
