/**
 * MCP Server Setup
 *
 * Creates and configures the MCP server with tools and resources
 * for Convex database exploration.
 */
export interface ConvexMcpServer {
    startStdio: () => Promise<void>;
    startHttp: (port: number) => Promise<void>;
}
export declare function createServer(): Promise<ConvexMcpServer>;
//# sourceMappingURL=server.d.ts.map