/**
 * Schema Browser Tool
 *
 * MCP tool that displays database schema in terminal AND
 * opens an interactive schema browser UI in the browser.
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ConvexClient } from '../convex-client.js';
export declare const schemaBrowserTool: Tool;
interface ToolResponse {
    content: Array<{
        type: string;
        text: string;
    }>;
    isError?: boolean;
}
export declare function handleSchemaBrowser(client: ConvexClient, args?: Record<string, unknown>): Promise<ToolResponse>;
export {};
//# sourceMappingURL=schema-browser.d.ts.map