/**
 * MCP Server Setup
 *
 * Creates and configures the MCP server with tools and resources
 * for Convex database exploration.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  TextContent,
} from "@modelcontextprotocol/sdk/types.js";
import { createServer as createHttpServer } from "http";

import {
  schemaBrowserTool,
  handleSchemaBrowser,
} from "./tools/schema-browser.js";
import { dashboardTool, handleDashboard } from "./tools/dashboard.js";
import { getSchemaResourceContent } from "./resources/schema-browser.js";
import { getDashboardResourceContent } from "./resources/dashboard.js";
import { ConvexClient } from "./convex-client.js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Read version from package.json dynamically
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = join(__dirname, "..", "package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
const VERSION = packageJson.version as string;

export interface ConvexMcpServer {
  startStdio: () => Promise<void>;
  startHttp: (port: number) => Promise<void>;
}

export async function createServer(): Promise<ConvexMcpServer> {
  const convexClient = new ConvexClient();

  const server = new Server(
    {
      name: "convex-mcp-visual",
      version: VERSION,
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    },
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [schemaBrowserTool, dashboardTool],
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    let result;
    switch (name) {
      case "schema_browser":
        result = await handleSchemaBrowser(convexClient, args);
        break;
      case "dashboard_view":
        result = await handleDashboard(convexClient, args);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    // Return properly typed response
    return {
      content: result.content.map(
        (c): TextContent => ({
          type: "text" as const,
          text: c.text,
        }),
      ),
      isError: result.isError,
    };
  });

  // List available resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: "ui://schema-browser",
          name: "Schema Browser",
          description: "Interactive UI for browsing Convex database schemas",
          mimeType: "text/html",
        },
        {
          uri: "ui://dashboard",
          name: "Realtime Dashboard",
          description: "Live charts and metrics for Convex data",
          mimeType: "text/html",
        },
      ],
    };
  });

  // Handle resource reads
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    if (uri.startsWith("ui://schema-browser")) {
      return {
        contents: [
          {
            uri,
            mimeType: "text/html",
            text: await getSchemaResourceContent(),
          },
        ],
      };
    }

    if (uri.startsWith("ui://dashboard")) {
      return {
        contents: [
          {
            uri,
            mimeType: "text/html",
            text: await getDashboardResourceContent(),
          },
        ],
      };
    }

    throw new Error(`Unknown resource: ${uri}`);
  });

  return {
    async startStdio() {
      const transport = new StdioServerTransport();
      await server.connect(transport);
    },

    async startHttp(port: number) {
      // Simple HTTP transport for MCP
      const httpServer = createHttpServer(async (req, res) => {
        if (req.url === "/mcp" && req.method === "POST") {
          let body = "";
          req.on("data", (chunk) => (body += chunk));
          req.on("end", async () => {
            try {
              const request = JSON.parse(body);
              // Process MCP request through server
              // This is a simplified implementation
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({ jsonrpc: "2.0", id: request.id, result: {} }),
              );
            } catch (error) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Invalid request" }));
            }
          });
        } else if (req.url === "/health") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: "ok" }));
        } else {
          res.writeHead(404);
          res.end("Not found");
        }
      });

      return new Promise((resolve) => {
        httpServer.listen(port, () => resolve());
      });
    },
  };
}
