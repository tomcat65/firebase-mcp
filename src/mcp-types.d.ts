/**
 * Type declarations for @modelcontextprotocol/sdk
 * These declarations help TypeScript understand the structure of MCP imports
 */

declare module '@modelcontextprotocol/sdk/server/mcp' {
  export class McpServer {
    constructor(options: { name: string; version: string });
    
    resource(
      name: string,
      template: ResourceTemplate,
      handler: (uri: URL, params: any) => Promise<any>
    ): this;
    
    tool(
      name: string,
      schema: any,
      handler: (args: any) => Promise<any>
    ): this;
    
    connect(transport: any): Promise<void>;
    close(): Promise<void>;
    
    on(event: string, handler: (data: any) => void): void;
  }
  
  export class ResourceTemplate {
    constructor(template: string, options: { list: any });
  }
}

declare module '@modelcontextprotocol/sdk/server/stdio' {
  export class StdioServerTransport {
    constructor(options?: any);
  }
}
