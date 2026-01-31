/**
 * Schema Diagram Tool
 *
 * MCP tool that generates Mermaid ER diagrams from Convex schema.
 * Outputs ASCII for terminal and SVG for browser.
 */
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ConvexClient } from "../convex-client.js";
export declare const schemaDiagramTool: Tool;
interface ToolResponse {
    content: Array<{
        type: string;
        text: string;
    }>;
    isError?: boolean;
}
export declare function handleSchemaDiagram(client: ConvexClient, args?: Record<string, unknown>): Promise<ToolResponse>;
export {};
//# sourceMappingURL=schema-diagram.d.ts.map