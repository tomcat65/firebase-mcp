# Firebase MCP Server Metadata

## Version History

### v0.2.0 (Current)
- Added support for SSE transport
- Implemented better security controls (read-only mode, collection restriction)
- Added rate limiting to prevent abuse
- Improved error handling with standardized responses
- Enhanced logging capabilities
- Added pagination support for large collections
- Modularized codebase for better maintainability
- Updated to latest MCP SDK (1.1.0)
- Added comprehensive tests

### v0.1.0 (Initial Release)
- Basic Firebase Firestore operations (CRUD)
- Authentication operations
- Storage operations
- Resource browsing
- Support for stdio transport

## Dependencies

- Node.js >= 16.0.0
- @modelcontextprotocol/sdk: ^1.1.0
- firebase-admin: ^11.11.0
- dotenv: ^16.3.1
- zod: ^3.21.4

## Testing

This server includes Jest-based tests for:
- Configuration parsing
- Utility functions
- Error handling
- Rate limiting

## Maintainers

The Firebase MCP Server is maintained by the MCP community.

## License

MIT License
