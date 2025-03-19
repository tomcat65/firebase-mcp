# Firebase MCP Server

A Model Context Protocol (MCP) server implementation for Firebase services. This server allows AI assistants like Claude and Cursor to securely interact with Firebase Auth, Firestore, and Storage.

## Features

- **Authentication**: Tools for user management, sign-in, and authentication
- **Firestore Database**: Read, write, query, and manage Firestore documents
- **Cloud Storage**: Upload, download, and manage files in Firebase Storage
- **Security**: Configurable security levels with Firestore security rules integration
- **AI Assistant Integration**: Special authentication for AI assistants like Claude/Cursor

## Prerequisites

- Node.js (v16 or higher)
- A Firebase project with the necessary services enabled

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/tomcat65/firebase-mcp.git
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

# Security configuration
SECURITY_LEVEL=development  # Options: development, testing, production
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

## Security Configuration

This project implements multiple security levels to accommodate different usage scenarios:

### Security Levels

Configure the security level in your `.env` file:

```
SECURITY_LEVEL=development  # Options: development, testing, production
```

- **Development**: All operations allowed, suitable for local development
- **Testing**: Basic authentication required, good for staging environments
- **Production**: Full security rules enforced, required for production deployments

### Firestore Security Rules

The project includes template security rules that allow:

- AI assistants to read data with proper authentication
- Users to read and write their own data
- Public access to resources marked as public
- Secure defaults that deny access unless explicitly allowed

You can customize these rules in the Firebase Console under Firestore > Rules.

### AI Assistant Authentication

For AI assistants to properly access data:

1. Set a secure API key in your `.env` file:
   ```
   AI_ASSISTANT_API_KEY=your-secure-random-string
   ```

2. Optionally, provide a pre-generated Firebase custom token:
   ```
   AI_ASSISTANT_TOKEN=your-firebase-custom-token
   ```

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

## Acknowledgements

- Firebase team for their excellent documentation
- Model Context Protocol community for the MCP specification
