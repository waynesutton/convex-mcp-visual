/**
 * MCP Server Setup
 *
 * Creates and configures the MCP server with tools and resources
 * for Convex database exploration.
 *
 * Supports MCP Apps (SEP-1865) for embedded UI rendering in ChatGPT,
 * Claude web, VS Code, and other MCP Apps compatible hosts.
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
import { createServer as createHttpServer, IncomingMessage, ServerResponse } from "http";

import {
  schemaBrowserTool,
  handleSchemaBrowser,
} from "./tools/schema-browser.js";
import { dashboardTool, handleDashboard } from "./tools/dashboard.js";
import {
  schemaDiagramTool,
  handleSchemaDiagram,
} from "./tools/schema-diagram.js";
import {
  codebaseSubwayMapTool,
  handleCodebaseSubwayMap,
} from "./tools/codebase-subway-map.js";
import { tableHeatmapTool, handleTableHeatmap } from "./tools/table-heatmap.js";
import { schemaDriftTool, handleSchemaDrift } from "./tools/schema-drift.js";
import {
  writeConflictReportTool,
  handleWriteConflictReport,
} from "./tools/write-conflict-report.js";
import { kanbanBoardTool, handleKanbanBoard } from "./tools/kanban-board.js";
import {
  componentBrowserTool,
  handleComponentBrowser,
} from "./tools/component-browser.js";
import { getSchemaResourceContent } from "./resources/schema-browser.js";
import { getDashboardResourceContent } from "./resources/dashboard.js";
import { getKanbanResourceContent } from "./resources/kanban-board.js";
import { ConvexClient } from "./convex-client.js";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Read version from package.json dynamically
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = join(__dirname, "..", "package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
const VERSION = packageJson.version as string;

// MCP Apps MIME type for embedded UI rendering (SEP-1865)
const MCP_APPS_MIME_TYPE = "text/html;profile=mcp-app";

// In-memory store for dynamically generated HTML (diagram, heatmap, etc.)
// This allows MCP Apps hosts to fetch the generated HTML as a resource
const dynamicHtmlStore = new Map<string, string>();

/**
 * Store dynamically generated HTML for MCP Apps resource serving
 */
export function storeDynamicHtml(resourceUri: string, html: string): void {
  dynamicHtmlStore.set(resourceUri, html);
}

/**
 * Get stored dynamic HTML
 */
export function getDynamicHtml(resourceUri: string): string | undefined {
  return dynamicHtmlStore.get(resourceUri);
}

// Resource URIs for MCP Apps
const RESOURCE_URIS = {
  schemaBrowser: "ui://convex-visual/schema-browser.html",
  dashboard: "ui://convex-visual/dashboard.html",
  schemaDiagram: "ui://convex-visual/schema-diagram.html",
  subwayMap: "ui://convex-visual/subway-map.html",
  tableHeatmap: "ui://convex-visual/table-heatmap.html",
  schemaDrift: "ui://convex-visual/schema-drift.html",
  writeConflicts: "ui://convex-visual/write-conflicts.html",
  kanbanBoard: "ui://convex-visual/kanban-board.html",
  componentBrowser: "ui://convex-visual/component-browser.html",
};

export interface ConvexMcpServer {
  startStdio: () => Promise<void>;
  startHttp: (port: number) => Promise<void>;
}

/**
 * Helper to add MCP Apps metadata to tool definitions
 */
function withMcpAppsMetadata(tool: typeof schemaBrowserTool, resourceUri: string) {
  return {
    ...tool,
    _meta: {
      ...((tool as Record<string, unknown>)._meta as Record<string, unknown> || {}),
      ui: {
        resourceUri,
      },
    },
  };
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

  // List available tools with MCP Apps metadata
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        withMcpAppsMetadata(schemaBrowserTool, RESOURCE_URIS.schemaBrowser),
        withMcpAppsMetadata(dashboardTool, RESOURCE_URIS.dashboard),
        withMcpAppsMetadata(schemaDiagramTool, RESOURCE_URIS.schemaDiagram),
        withMcpAppsMetadata(codebaseSubwayMapTool, RESOURCE_URIS.subwayMap),
        withMcpAppsMetadata(tableHeatmapTool, RESOURCE_URIS.tableHeatmap),
        withMcpAppsMetadata(schemaDriftTool, RESOURCE_URIS.schemaDrift),
        withMcpAppsMetadata(writeConflictReportTool, RESOURCE_URIS.writeConflicts),
        withMcpAppsMetadata(kanbanBoardTool, RESOURCE_URIS.kanbanBoard),
        withMcpAppsMetadata(componentBrowserTool, RESOURCE_URIS.componentBrowser),
      ],
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
      case "schema_diagram":
        result = await handleSchemaDiagram(convexClient, args);
        break;
      case "codebase_subway_map":
        result = await handleCodebaseSubwayMap(args);
        break;
      case "table_heatmap":
        result = await handleTableHeatmap(convexClient, args);
        break;
      case "schema_drift":
        result = await handleSchemaDrift(convexClient, args);
        break;
      case "write_conflict_report":
        result = await handleWriteConflictReport(args);
        break;
      case "kanban_board":
        result = await handleKanbanBoard(convexClient, args);
        break;
      case "component_browser":
        result = await handleComponentBrowser(convexClient, args);
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

  // List available resources (MCP Apps compatible with profile MIME type)
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: RESOURCE_URIS.schemaBrowser,
          name: "Schema Browser",
          description: "Interactive UI for browsing Convex database schemas",
          mimeType: MCP_APPS_MIME_TYPE,
        },
        {
          uri: RESOURCE_URIS.dashboard,
          name: "Realtime Dashboard",
          description: "Live charts and metrics for Convex data",
          mimeType: MCP_APPS_MIME_TYPE,
        },
        {
          uri: RESOURCE_URIS.schemaDiagram,
          name: "Schema Diagram",
          description: "Mermaid ER diagram of database relationships",
          mimeType: MCP_APPS_MIME_TYPE,
        },
        {
          uri: RESOURCE_URIS.subwayMap,
          name: "Codebase Subway Map",
          description: "Visual map of codebase file dependencies",
          mimeType: MCP_APPS_MIME_TYPE,
        },
        {
          uri: RESOURCE_URIS.tableHeatmap,
          name: "Table Heatmap",
          description: "Heatmap showing table write activity",
          mimeType: MCP_APPS_MIME_TYPE,
        },
        {
          uri: RESOURCE_URIS.schemaDrift,
          name: "Schema Drift",
          description: "Compare declared vs inferred schema",
          mimeType: MCP_APPS_MIME_TYPE,
        },
        {
          uri: RESOURCE_URIS.writeConflicts,
          name: "Write Conflicts Report",
          description: "Analysis of write conflicts from logs",
          mimeType: MCP_APPS_MIME_TYPE,
        },
        {
          uri: RESOURCE_URIS.kanbanBoard,
          name: "Kanban Board",
          description: "Kanban view of scheduled functions and agents",
          mimeType: MCP_APPS_MIME_TYPE,
        },
        {
          uri: RESOURCE_URIS.componentBrowser,
          name: "Component Browser",
          description: "Browse installed Convex components and their schemas",
          mimeType: MCP_APPS_MIME_TYPE,
        },
      ],
    };
  });

  // Handle resource reads (serves HTML for MCP Apps hosts)
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    // Schema Browser
    if (uri === RESOURCE_URIS.schemaBrowser || uri.startsWith("ui://schema-browser")) {
      return {
        contents: [
          {
            uri,
            mimeType: MCP_APPS_MIME_TYPE,
            text: await getSchemaResourceContent(),
          },
        ],
      };
    }

    // Dashboard
    if (uri === RESOURCE_URIS.dashboard || uri.startsWith("ui://dashboard")) {
      return {
        contents: [
          {
            uri,
            mimeType: MCP_APPS_MIME_TYPE,
            text: await getDashboardResourceContent(),
          },
        ],
      };
    }

    // Kanban Board
    if (uri === RESOURCE_URIS.kanbanBoard || uri.startsWith("ui://kanban")) {
      return {
        contents: [
          {
            uri,
            mimeType: MCP_APPS_MIME_TYPE,
            text: await getKanbanResourceContent(),
          },
        ],
      };
    }

    // Dynamic HTML resources (diagram, heatmap, drift, subway map, write conflicts)
    // These are generated when the tool is called and stored in memory
    const dynamicHtml = getDynamicHtml(uri);
    if (dynamicHtml) {
      return {
        contents: [
          {
            uri,
            mimeType: MCP_APPS_MIME_TYPE,
            text: dynamicHtml,
          },
        ],
      };
    }

    // Fallback for dynamic resources: return a placeholder that fetches data
    if (uri === RESOURCE_URIS.schemaDiagram ||
        uri === RESOURCE_URIS.subwayMap ||
        uri === RESOURCE_URIS.tableHeatmap ||
        uri === RESOURCE_URIS.schemaDrift ||
        uri === RESOURCE_URIS.writeConflicts) {
      return {
        contents: [
          {
            uri,
            mimeType: MCP_APPS_MIME_TYPE,
            text: getPlaceholderHtml(uri),
          },
        ],
      };
    }

    throw new Error(`Unknown resource: ${uri}`);
  });

  /**
   * Returns placeholder HTML for dynamic resources
   * The actual content is generated when the tool is called
   */
  function getPlaceholderHtml(uri: string): string {
    const toolName = uri.split("/").pop()?.replace(".html", "") || "tool";
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${toolName} - Convex MCP Apps</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #faf8f5;
      color: #1a1a1a;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .message {
      text-align: center;
      padding: 40px;
    }
    .message h2 {
      margin-bottom: 8px;
    }
    .message p {
      color: #6b6b6b;
    }
  </style>
</head>
<body>
  <div class="message">
    <h2>${toolName.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</h2>
    <p>Run the tool to generate this visualization.</p>
  </div>
</body>
</html>`;
  }

  return {
    async startStdio() {
      const transport = new StdioServerTransport();
      await server.connect(transport);
    },

    async startHttp(port: number) {
      // HTTP transport for MCP with CORS support for MCP Apps
      const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      };

      const httpServer = createHttpServer(async (req: IncomingMessage, res: ServerResponse) => {
        // Handle CORS preflight requests
        if (req.method === "OPTIONS") {
          res.writeHead(204, corsHeaders);
          res.end();
          return;
        }

        // Add CORS headers to all responses
        Object.entries(corsHeaders).forEach(([key, value]) => {
          res.setHeader(key, value);
        });

        // Health check endpoint
        if (req.url === "/health") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: "ok", version: VERSION }));
          return;
        }

        // MCP endpoint
        if (req.url === "/mcp" && req.method === "POST") {
          let body = "";
          req.on("data", (chunk) => (body += chunk));
          req.on("end", async () => {
            try {
              const request = JSON.parse(body);
              // Process MCP request
              // This is a simplified implementation for basic MCP Apps compatibility
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({ jsonrpc: "2.0", id: request.id, result: {} }),
              );
            } catch (error) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Invalid request" }));
            }
          });
          return;
        }

        // Serve UI resources directly via HTTP for MCP Apps hosts
        if (req.url?.startsWith("/ui/")) {
          const resourceName = req.url.replace("/ui/", "").replace(".html", "");
          const resourceUri = `ui://convex-visual/${resourceName}.html`;
          
          try {
            let html: string | undefined;
            
            if (resourceName === "schema-browser") {
              html = await getSchemaResourceContent();
            } else if (resourceName === "dashboard" || resourceName === "realtime-dashboard") {
              html = await getDashboardResourceContent();
            } else if (resourceName === "kanban-board") {
              html = await getKanbanResourceContent();
            } else {
              html = getDynamicHtml(resourceUri);
            }

            if (html) {
              res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
              res.end(html);
              return;
            }
          } catch (error) {
            console.error("Error serving UI resource:", error);
          }
        }

        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Not found" }));
      });

      return new Promise<void>((resolve) => {
        httpServer.listen(port, () => resolve());
      });
    },
  };
}
