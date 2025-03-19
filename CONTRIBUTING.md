# Contributing to Firebase MCP Server

Thank you for your interest in contributing to the Firebase MCP Server project! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to abide by the [Model Context Protocol Code of Conduct](https://github.com/modelcontextprotocol/servers/blob/main/CODE_OF_CONDUCT.md).

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with the following information:

1. A clear, descriptive title
2. Steps to reproduce the issue
3. Expected behavior
4. Actual behavior
5. Any relevant logs or error messages
6. Environment information (OS, Node.js version, etc.)

### Suggesting Features

To suggest a new feature:

1. Create an issue with a clear title and detailed description
2. Explain why this feature would be useful
3. Describe how it should work
4. Include any relevant examples or mock-ups

### Pull Requests

We welcome pull requests! To submit a change:

1. Fork the repository
2. Create a new branch for your changes
3. Make your changes
4. Add or update tests as necessary
5. Run `npm test` to ensure tests pass
6. Submit a pull request with a detailed description of your changes

## Development Setup

### Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher)

### Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/firebase-mcp.git
   cd firebase-mcp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the sample environment file:
   ```bash
   cp sample.env .env
   ```
   And update it with your Firebase credentials.

4. Build the project:
   ```bash
   npm run build
   ```

5. Run the server:
   ```bash
   npm start
   ```

## Project Structure

```
firebase-mcp/
├── dist/               # Compiled JavaScript files
├── src/                # Source TypeScript files
│   ├── handlers/       # Tool handler implementations
│   ├── resources/      # Resource implementations
│   ├── services/       # Service interfaces and implementations
│   ├── utils/          # Utility functions
│   ├── config.ts       # Configuration handling
│   └── index.ts        # Main entry point
├── test/               # Test files
├── .env                # Environment variables (ignored by git)
├── sample.env          # Sample environment variables
├── tsconfig.json       # TypeScript configuration
└── package.json        # Project dependencies and scripts
```

## Coding Standards

- Use TypeScript for all new code
- Follow the existing code style (spaces, not tabs)
- Include proper type definitions
- Document public APIs with JSDoc comments
- Keep functions small and focused on a single responsibility
- Write tests for new functionality

## Testing

We use Jest for testing. Run tests with:

```bash
npm test
```

For development, you can watch for changes:

```bash
npm test -- --watch
```

## Commit Guidelines

- Use clear, descriptive commit messages
- Reference issue numbers in commit messages when relevant
- Keep commits focused on a single change
- Squash multiple commits if they address the same issue

## License

By contributing to this project, you agree that your contributions will be licensed under the project's MIT license.
