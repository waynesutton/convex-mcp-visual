/**
 * Dashboard Tool
 *
 * MCP tool that creates real-time dashboard visualizations
 * for Convex data - both in terminal AND in browser.
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ConvexClient } from '../convex-client.js';
export declare const dashboardTool: Tool;
interface ToolResponse {
    content: Array<{
        type: string;
        text: string;
    }>;
    isError?: boolean;
}
export declare function handleDashboard(client: ConvexClient, args?: Record<string, unknown>): Promise<ToolResponse>;
export {};
//# sourceMappingURL=dashboard.d.ts.map