#!/usr/bin/env node

// Load environment variables
require('dotenv').config();

// Import required modules
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const readline = require('readline');

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

// Launch MCP Inspector with the correct path
const inspector = spawn('npx', ['@modelcontextprotocol/inspector', distPath], {
  stdio: 'inherit',
  env: process.env
});

inspector.on('error', (err) => {
  console.error('Failed to start MCP Inspector:', err);
});

inspector.on('close', (code) => {
  console.log(`MCP Inspector exited with code ${code}`);
});
