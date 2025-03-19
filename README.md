# Firebase MCP Server

A Model Context Protocol (MCP) server that provides access to Firebase services. This server allows MCP clients like Claude Desktop or Cursor to interact with Firebase Authentication, Firestore, and Storage.

## Features

- 🔐 **Authentication**: Create users, sign in/out, update profiles, and more
- 📋 **Firestore**: Add, query, update, and delete documents
- 🗄️ **Storage**: Upload files, get download URLs, manage file metadata

## Prerequisites

- Node.js (v16 or higher)
- A Firebase project with the necessary services enabled

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/firebase-mcp.git
cd firebase-mcp
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure Firebase

Create a `.env` file in the root directory with your Firebase configuration:

```
# Required Firebase configuration
FIREBASE_API_KEY=your-api-key
FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id

# Optional Firebase configuration
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
FIREBASE_APP_ID=your-app-id

# Server configuration
LOG_LEVEL=info
```

You can find these values in your Firebase project settings (Project settings > General > Your apps > SDK setup and configuration).

## Usage

### Build and Run

```bash
npm run build
npm start
```

### Debug Mode

```bash
./debug-firebase.bat  # Windows
./debug-firebase.sh   # Unix/Linux/MacOS
```

### Integrating with MCP Clients

#### Claude Desktop

Add the following to your Claude Desktop configuration file (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "firebase-mcp": {
    "command": "npx",
    "args": ["-y", "firebase-mcp"],
    "env": {
      "FIREBASE_API_KEY": "your-api-key",
      "FIREBASE_AUTH_DOMAIN": "your-project-id.firebaseapp.com",
      "FIREBASE_PROJECT_ID": "your-project-id",
      "FIREBASE_STORAGE_BUCKET": "your-project-id.appspot.com"
    }
  }
}
```

#### Cursor

Add the following to your project's `.cursor/mcp.json` file:

```json
{
  "firebase-mcp": {
    "command": "npx",
    "args": ["-y", "firebase-mcp"],
    "env": {
      "FIREBASE_API_KEY": "your-api-key",
      "FIREBASE_AUTH_DOMAIN": "your-project-id.firebaseapp.com",
      "FIREBASE_PROJECT_ID": "your-project-id",
      "FIREBASE_STORAGE_BUCKET": "your-project-id.appspot.com"
    }
  }
}
```

## Available Tools

### Firestore Tools

- **firestore_add_document**: Add a document to a collection
- **firestore_get_document**: Get a document by path
- **firestore_query_documents**: Query documents with filters
- **firestore_update_document**: Update an existing document
- **firestore_delete_document**: Delete a document
- **firestore_batch_operations**: Execute multiple operations in a batch

### Authentication Tools

- **auth_create_user**: Create a new user account
- **auth_sign_in**: Sign in a user
- **auth_sign_out**: Sign out the current user
- **auth_update_profile**: Update user profile
- **auth_update_email**: Update user email
- **auth_update_password**: Update user password
- **auth_delete_user**: Delete the current user
- **auth_send_password_reset**: Send password reset email
- **auth_send_verification**: Send email verification

### Storage Tools

- **storage_upload_file**: Upload a file
- **storage_get_download_url**: Get a download URL
- **storage_delete_file**: Delete a file
- **storage_list_files**: List files in a directory
- **storage_get_metadata**: Get file metadata
- **storage_update_metadata**: Update file metadata

## Troubleshooting

### Firebase Authentication Errors

If you see `auth/invalid-api-key` errors:
- Check that your `FIREBASE_API_KEY` is correct
- Ensure that Authentication is enabled in your Firebase project
- Make sure the API key has not been restricted to certain domains/IPs

### Firestore Errors

- Ensure Firestore is properly initialized in the Firebase console
- Check that your service account has the necessary permissions

### Storage Errors

If you encounter storage errors:
- Verify that Firebase Storage is enabled in your project
- Check if your `FIREBASE_STORAGE_BUCKET` is correctly configured

## License

[MIT](LICENSE)
