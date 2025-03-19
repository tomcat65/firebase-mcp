declare module '@modelcontextprotocol/sdk/server/mcp.js' {
  export interface McpServerOptions {
    name?: string;
    version?: string;
  }

  export interface RequestHandlerExtra {
    // Add any extra fields that might be passed to handlers
  }

  export interface McpResponse {
    content: Array<{
      type: 'text';
      text: string;
    } | {
      type: 'image';
      data: string;
      mimeType: string;
    } | {
      type: 'resource';
      resource: {
        text: string;
        uri: string;
        mimeType?: string;
      } | {
        uri: string;
        blob: string;
        mimeType?: string;
      };
    }>;
    _meta?: Record<string, unknown>;
    isError?: boolean;
  }

  export class McpServer {
    constructor(options?: McpServerOptions);
    
    tool<T extends Record<string, unknown>>(
      name: string,
      paramsSchema: T,
      handler: (args: { [K in keyof T]: T[K] extends { _type: infer U } ? U : never }, extra: RequestHandlerExtra) => McpResponse | Promise<McpResponse>
    ): void;
    
    tool(
      name: string,
      description: string,
      handler: (extra: RequestHandlerExtra) => McpResponse | Promise<McpResponse>
    ): void;

    connect(transport: any): Promise<void>;
    close(): Promise<void>;
  }
}

declare module '@modelcontextprotocol/sdk/server/stdio.js' {
  export class StdioServerTransport {
    constructor();
  }
} 