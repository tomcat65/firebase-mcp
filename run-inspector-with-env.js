// This script loads environment variables from .env file
// and runs the MCP Inspector with those variables
require('dotenv').config();
const { spawn } = require('child_process');

console.log('Running MCP Inspector with environment variables from .env file');
console.log('SERVICE_ACCOUNT_KEY_PATH:', process.env.SERVICE_ACCOUNT_KEY_PATH);

const inspector = spawn('npx', ['@modelcontextprotocol/inspector', 'dist/index.js'], {
  stdio: 'inherit',
  env: process.env
});

inspector.on('close', (code) => {
  process.exit(code);
});