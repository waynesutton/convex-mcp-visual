/**
 * Component Browser Tool
 *
 * MCP tool that displays installed Convex components and their schemas.
 * Components are detected by their namespaced tables (componentName:tableName).
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ConvexClient, ConvexComponent, ComponentTable } from "../convex-client.js";
import { launchUIApp } from "../ui-server.js";

export const componentBrowserTool: Tool = {
  name: "component_browser",
  description: `Browse installed Convex components and their schemas.

Features:
- List all installed components detected by namespaced tables
- View component table schemas and document counts
- Identify known component types (agent, auth, ratelimiter, etc.)
- See table relationships within components

Components use the "componentName:tableName" naming convention.
For example, @convex-dev/agent creates tables like "agent:threads" and "agent:messages".`,
  inputSchema: {
    type: "object",
    properties: {
      component: {
        type: "string",
        description: "Filter to a specific component by name",
      },
      showTables: {
        type: "boolean",
        description: "Show detailed table information (default: true)",
        default: true,
      },
      showFields: {
        type: "boolean",
        description: "Show field schemas for each table (default: true)",
        default: true,
      },
    },
    required: [],
  },
};

interface ToolResponse {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

export async function handleComponentBrowser(
  client: ConvexClient,
  args: Record<string, unknown> = {},
): Promise<ToolResponse> {
  const {
    component,
    showTables = true,
    showFields = true,
  } = args as {
    component?: string;
    showTables?: boolean;
    showFields?: boolean;
  };

  if (!client.isConnected()) {
    return {
      content: [
        {
          type: "text",
          text: `## Component Browser

**Connection Error**: No Convex deployment configured.

To connect:
1. Run \`npx convex login\` to authenticate
2. Or set \`CONVEX_URL\` and \`CONVEX_DEPLOY_KEY\` environment variables

Once connected, the Component Browser will display your installed components.`,
        },
      ],
      isError: true,
    };
  }

  try {
    const { app: appTables, components } = await client.getTablesGroupedByComponent();

    // Filter to specific component if requested
    let filteredComponents = components;
    if (component) {
      filteredComponents = components.filter(
        c => c.name.toLowerCase() === component.toLowerCase()
      );
      if (filteredComponents.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `## Component Browser

**Not Found**: No component named "${component}" was found.

Available components: ${components.map(c => c.name).join(", ") || "(none)"}`,
            },
          ],
          isError: true,
        };
      }
    }

    // Build config for UI app
    const config = {
      deploymentUrl: client.getDeploymentUrl(),
      components: filteredComponents,
      appTables,
      selectedComponent: component || null,
      showTables,
      showFields,
      hasAdminAccess: client.hasAdminAccess(),
    };

    // Launch the interactive UI in browser (reuses schema-browser with components tab)
    let uiUrl = "";
    try {
      const uiServer = await launchUIApp({
        appName: "schema-browser",
        config: {
          ...config,
          viewMode: "components",
          tables: appTables.map(t => ({
            name: t.name,
            documentCount: t.documentCount,
            hasIndexes: t.indexes.length > 0,
            indexes: t.indexes,
          })),
        },
        port: 3456,
        autoClose: 30 * 60 * 1000,
      });
      uiUrl = uiServer.url;
    } catch (error) {
      console.error("Failed to launch UI:", error);
    }

    // Build terminal output
    const terminalOutput = buildTerminalOutput(
      filteredComponents,
      appTables.length,
      client.getDeploymentUrl(),
      uiUrl,
      showTables,
      showFields,
      client.hasAdminAccess(),
    );

    return {
      content: [
        {
          type: "text",
          text: terminalOutput,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `## Component Browser

**Error**: ${error instanceof Error ? error.message : String(error)}

Please check:
1. Your Convex credentials are valid
2. You have access to this deployment
3. The deployment URL is correct`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Build terminal-friendly markdown output for components
 */
function buildTerminalOutput(
  components: ConvexComponent[],
  appTableCount: number,
  deploymentUrl: string | null,
  uiUrl: string,
  showTables: boolean,
  showFields: boolean,
  hasAdminAccess: boolean,
): string {
  const lines: string[] = [];

  lines.push("## Component Browser");
  lines.push("");
  if (uiUrl) {
    lines.push(`**Interactive UI**: ${uiUrl}`);
    lines.push("");
  }
  lines.push(`Connected to: \`${deploymentUrl}\``);
  if (!hasAdminAccess) {
    lines.push("");
    lines.push(
      "*Note: Document counts require admin access. Set CONVEX_DEPLOY_KEY for full access.*",
    );
  }
  lines.push("");

  // Summary
  lines.push("### Summary");
  lines.push("");
  lines.push(`| Category | Count |`);
  lines.push(`|----------|-------|`);
  lines.push(`| Installed Components | ${components.length} |`);
  lines.push(`| App Tables | ${appTableCount} |`);
  lines.push(`| Component Tables | ${components.reduce((sum, c) => sum + c.tableCount, 0)} |`);
  lines.push("");

  if (components.length === 0) {
    lines.push("*No components detected in this deployment.*");
    lines.push("");
    lines.push("Components are detected by namespaced tables (e.g., `agent:threads`).");
    lines.push("Install a Convex component to see it here:");
    lines.push("- [@convex-dev/agent](https://www.convex.dev/components/agent)");
    lines.push("- [@convex-dev/auth](https://www.convex.dev/components/auth)");
    lines.push("- [Browse all components](https://www.convex.dev/components)");
    return lines.join("\n");
  }

  // List each component
  lines.push("### Installed Components");
  lines.push("");

  for (const comp of components) {
    lines.push("---");
    lines.push(`#### ${comp.name}`);
    if (comp.isKnownComponent && comp.knownComponentType) {
      lines.push(`*${comp.knownComponentType}*`);
    }
    lines.push("");
    lines.push(`- **Tables**: ${comp.tableCount}`);
    lines.push(`- **Total Documents**: ${formatNumber(comp.totalDocuments)}`);
    lines.push("");

    if (showTables && comp.tables.length > 0) {
      lines.push("**Tables:**");
      lines.push("");
      lines.push("| Table | Documents | Fields |");
      lines.push("|-------|-----------|--------|");

      for (const table of comp.tables) {
        const fieldCount = table.fields.length;
        lines.push(
          `| ${table.name} | ${formatNumber(table.documentCount)} | ${fieldCount} |`,
        );
      }
      lines.push("");

      if (showFields) {
        for (const table of comp.tables) {
          if (table.fields.length > 0) {
            lines.push(`**${table.name} schema:**`);
            lines.push("");
            lines.push("| Field | Type | Optional |");
            lines.push("|-------|------|----------|");
            for (const field of table.fields.slice(0, 10)) {
              lines.push(
                `| ${field.name} | \`${field.type}\` | ${field.optional ? "Yes" : "No"} |`,
              );
            }
            if (table.fields.length > 10) {
              lines.push(`| *... ${table.fields.length - 10} more fields* | | |`);
            }
            lines.push("");
          }
        }
      }
    }
  }

  return lines.join("\n");
}

/**
 * Format large numbers with commas
 */
function formatNumber(num: number): string {
  return num.toLocaleString();
}
