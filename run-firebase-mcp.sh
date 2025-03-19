#!/bin/bash

# Firebase MCP Server quick start script
# This script helps you run the Firebase MCP server with common configurations

# Default values
CREDENTIALS=""
TRANSPORT="stdio"
PORT=3000
READ_ONLY=false
ALLOWED_COLLECTIONS=""
DISABLE_AUTH=false
DISABLE_STORAGE=false
LOG_LEVEL="info"

# Function to display help
show_help() {
  echo "Firebase MCP Server - Quick Start Script"
  echo ""
  echo "Usage: ./run-firebase-mcp.sh [OPTIONS]"
  echo ""
  echo "Options:"
  echo "  -c, --credentials FILE     Path to Firebase service account JSON"
  echo "  -t, --transport TYPE       Transport type: stdio or sse (default: stdio)"
  echo "  -p, --port NUMBER          Port for SSE transport (default: 3000)"
  echo "  -r, --read-only            Enable read-only mode"
  echo "  -a, --allowed COLLECTIONS  Comma-separated list of allowed collections"
  echo "  --disable-auth             Disable authentication operations"
  echo "  --disable-storage          Disable storage operations"
  echo "  -l, --log-level LEVEL      Set log level: debug, info, warn, error"
  echo "  -h, --help                 Show this help message"
  echo ""
  echo "Examples:"
  echo "  ./run-firebase-mcp.sh --credentials=./serviceAccountKey.json"
  echo "  ./run-firebase-mcp.sh -c ./serviceAccountKey.json -t sse -p 3030 -r"
  echo "  ./run-firebase-mcp.sh -c ./serviceAccountKey.json -a users,products,orders"
  exit 0
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help)
      show_help
      ;;
    -c|--credentials)
      CREDENTIALS="$2"
      shift 2
      ;;
    --credentials=*)
      CREDENTIALS="${1#*=}"
      shift
      ;;
    -t|--transport)
      TRANSPORT="$2"
      shift 2
      ;;
    --transport=*)
      TRANSPORT="${1#*=}"
      shift
      ;;
    -p|--port)
      PORT="$2"
      shift 2
      ;;
    --port=*)
      PORT="${1#*=}"
      shift
      ;;
    -r|--read-only)
      READ_ONLY=true
      shift
      ;;
    -a|--allowed)
      ALLOWED_COLLECTIONS="$2"
      shift 2
      ;;
    --allowed=*)
      ALLOWED_COLLECTIONS="${1#*=}"
      shift
      ;;
    --disable-auth)
      DISABLE_AUTH=true
      shift
      ;;
    --disable-storage)
      DISABLE_STORAGE=true
      shift
      ;;
    -l|--log-level)
      LOG_LEVEL="$2"
      shift 2
      ;;
    --log-level=*)
      LOG_LEVEL="${1#*=}"
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help to see available options"
      exit 1
      ;;
  esac
done

# Check if credentials are provided
if [ -z "$CREDENTIALS" ]; then
  echo "Error: Firebase credentials file is required"
  echo "Use --credentials option to specify the path to your serviceAccountKey.json file"
  echo "Or run with --help for more information"
  exit 1
fi

# Validate transport type
if [ "$TRANSPORT" != "stdio" ] && [ "$TRANSPORT" != "sse" ]; then
  echo "Error: Invalid transport type. Must be 'stdio' or 'sse'"
  exit 1
fi

# Build command
CMD="npx @modelcontextprotocol/server-firebase --credentials=$CREDENTIALS --transport=$TRANSPORT --port=$PORT"

# Add optional flags
if [ "$READ_ONLY" = true ]; then
  CMD="$CMD --read-only"
fi

if [ ! -z "$ALLOWED_COLLECTIONS" ]; then
  CMD="$CMD --allowed-collections=$ALLOWED_COLLECTIONS"
fi

if [ "$DISABLE_AUTH" = true ]; then
  CMD="$CMD --disable-auth"
fi

if [ "$DISABLE_STORAGE" = true ]; then
  CMD="$CMD --disable-storage"
fi

# Set environment variables
export LOG_LEVEL=$LOG_LEVEL

echo "Starting Firebase MCP Server..."
echo "Command: $CMD"
echo ""

# Execute the command
eval $CMD
