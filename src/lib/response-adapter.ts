/**
 * MCP Response Adapter
 * 
 * This module provides an adapter function to convert between the old response format
 * used in the client implementation files and the new format expected by the McpServer API.
 */

/**
 * Adapts a response from the old format to the new toolResult format.
 * This allows reusing the existing client implementation files without modifying them.
 * 
 * @param oldResponse The response object from the client implementation
 * @returns An object containing extracted text or error information
 */
export function adaptMcpResponse(oldResponse: any): { toolResult: string, isError?: boolean } {
    if (oldResponse && oldResponse.content && Array.isArray(oldResponse.content) && oldResponse.content.length > 0) {
      const textContent = oldResponse.content[0]?.text || '';
      
      return {
        toolResult: textContent,
        ...(oldResponse.isError ? { isError: true } : {})
      };
    }
    
    // Fallback for unexpected response format
    return {
      toolResult: 'Invalid response format from tool',
      isError: true
    };
  }