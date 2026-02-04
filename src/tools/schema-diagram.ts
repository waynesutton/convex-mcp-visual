/**
 * Schema Diagram Tool
 *
 * MCP tool that generates Mermaid ER diagrams from Convex schema.
 * Outputs ASCII for terminal and SVG for browser.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ConvexClient } from "../convex-client.js";
import { renderMermaid, renderMermaidAscii, THEMES } from "beautiful-mermaid";
import { launchUIApp } from "../ui-server.js";

export const schemaDiagramTool: Tool = {
  name: "schema_diagram",
  description: `Generates a Mermaid ER diagram showing database table relationships.

ONLY use this tool when the user explicitly requests:
- "diagram" or "ER diagram"
- "Mermaid diagram"
- "visualize database relationships"
- "show table relationships as a diagram"

For interactive schema exploration, use schema_browser instead.
For file dependency maps, use codebase_subway_map instead.`,
  inputSchema: {
    type: "object",
    properties: {
      theme: {
        type: "string",
        enum: [
          "zinc-light",
          "zinc-dark",
          "tokyo-night",
          "github-light",
          "github-dark",
          "dracula",
          "nord",
        ],
        description: "Color theme for SVG output (default: github-dark)",
        default: "github-dark",
      },
      ascii: {
        type: "boolean",
        description: "Use ASCII characters instead of Unicode (default: false)",
        default: false,
      },
      tables: {
        type: "array",
        items: { type: "string" },
        description: "Specific tables to include (default: all tables)",
      },
    },
    required: [],
  },
};

interface ToolResponse {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

interface TableRelation {
  from: string;
  to: string;
  field: string;
  cardinality: string;
}

export async function handleSchemaDiagram(
  client: ConvexClient,
  args: Record<string, unknown> = {},
): Promise<ToolResponse> {
  const {
    theme = "github-dark",
    ascii = false,
    tables: filterTables,
  } = args as {
    theme?: string;
    ascii?: boolean;
    tables?: string[];
  };

  if (!client.isConnected()) {
    return {
      content: [
        {
          type: "text",
          text: `## Schema Diagram

**Connection Error**: No Convex deployment configured.

To connect:
1. Run \`npx convex-mcp-visual --setup\`
2. Or set \`CONVEX_DEPLOY_KEY\` environment variable`,
        },
      ],
      isError: true,
    };
  }

  try {
    // Get all tables
    const allTables = await client.listTables();
    const tableNames = allTables.map((t) => t.name);

    // Filter tables if specified
    const tablesToInclude = filterTables
      ? tableNames.filter((t) => filterTables.includes(t))
      : tableNames;

    // Get schema for each table
    const tableSchemas = await Promise.all(
      tablesToInclude.map(async (tableName) => {
        const schema = await client.getTableSchema(tableName);
        const tableInfo = allTables.find((t) => t.name === tableName);
        return {
          name: tableName,
          fields:
            schema.declaredFields.length > 0
              ? schema.declaredFields
              : schema.inferredFields,
          documentCount: tableInfo?.documentCount || 0,
        };
      }),
    );

    // Detect relationships from field names
    const relations = detectRelationships(tableSchemas, tableNames);

    // Generate Mermaid ER diagram syntax
    const mermaidCode = generateMermaidER(tableSchemas, relations);

    // Render ASCII for terminal
    let asciiDiagram = "";
    try {
      asciiDiagram = renderMermaidAscii(mermaidCode, { useAscii: ascii });
    } catch (err) {
      // Fall back to showing the mermaid code if ASCII rendering fails
      asciiDiagram = `[ASCII rendering not available for this diagram]\n\n${mermaidCode}`;
    }

    // Render SVG for browser
    let svgContent = "";
    let uiUrl = "";
    try {
      const themeConfig =
        THEMES[theme as keyof typeof THEMES] || THEMES["github-dark"];
      svgContent = await renderMermaid(mermaidCode, themeConfig);

      // Launch browser UI with diagram
      const uiServer = await launchUIApp({
        appName: "schema-diagram",
        config: {
          svg: svgContent,
          mermaidCode,
          theme,
          deploymentUrl: client.getDeploymentUrl(),
          tables: tableSchemas,
          relations,
        },
        port: 3458,
        autoClose: 30 * 60 * 1000,
        customHtml: generateDiagramHtml(svgContent, mermaidCode, theme),
      });
      uiUrl = uiServer.url;
    } catch (err) {
      console.error("Failed to render SVG:", err);
    }

    // Build terminal output
    const lines: string[] = [];
    lines.push("## Schema Diagram");
    lines.push("");
    if (uiUrl) {
      lines.push(`**Interactive SVG**: ${uiUrl}`);
      lines.push("");
    }
    lines.push(`Connected to: \`${client.getDeploymentUrl()}\``);
    lines.push(
      `Tables: ${tablesToInclude.length} | Relationships: ${relations.length}`,
    );
    lines.push("");

    // Show relationships summary
    if (relations.length > 0) {
      lines.push("**Detected Relationships:**");
      lines.push("");
      for (const rel of relations) {
        lines.push(
          `- \`${rel.from}\` ${rel.cardinality} \`${rel.to}\` (via ${rel.field})`,
        );
      }
      lines.push("");
    }

    lines.push("**ASCII Diagram:**");
    lines.push("");
    lines.push("```");
    lines.push(asciiDiagram);
    lines.push("```");
    lines.push("");

    lines.push("**Mermaid Code:**");
    lines.push("");
    lines.push("```mermaid");
    lines.push(mermaidCode);
    lines.push("```");

    return {
      content: [
        {
          type: "text",
          text: lines.join("\n"),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `## Schema Diagram

**Error**: ${error instanceof Error ? error.message : String(error)}

Please check your Convex credentials and try again.`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Detect relationships from field names ending in Id
 */
function detectRelationships(
  tables: Array<{
    name: string;
    fields: Array<{ name: string; type: string }>;
  }>,
  allTableNames: string[],
): TableRelation[] {
  const relations: TableRelation[] = [];
  const tableNameSet = new Set(allTableNames.map((n) => n.toLowerCase()));

  for (const table of tables) {
    for (const field of table.fields) {
      // Skip system fields
      if (field.name.startsWith("_")) continue;

      // Check for foreign key pattern: fieldId or field_id
      const match = field.name.match(/^(.+?)(?:Id|_id)$/i);
      if (match) {
        const possibleTable = match[1].toLowerCase();
        // Check if there's a matching table (singular or plural)
        const targetTable = allTableNames.find(
          (t) =>
            t.toLowerCase() === possibleTable ||
            t.toLowerCase() === possibleTable + "s" ||
            t.toLowerCase() + "s" === possibleTable,
        );

        if (targetTable && targetTable !== table.name) {
          relations.push({
            from: table.name,
            to: targetTable,
            field: field.name,
            cardinality: "||--o{", // one to many
          });
        }
      }

      // Check for v.id("tableName") type
      const idMatch = field.type.match(/v\.id\("([^"]+)"\)/);
      if (idMatch) {
        const targetTable = idMatch[1];
        if (allTableNames.includes(targetTable) && targetTable !== table.name) {
          // Avoid duplicates
          const exists = relations.some(
            (r) =>
              r.from === table.name &&
              r.to === targetTable &&
              r.field === field.name,
          );
          if (!exists) {
            relations.push({
              from: table.name,
              to: targetTable,
              field: field.name,
              cardinality: "||--o{",
            });
          }
        }
      }
    }
  }

  return relations;
}

/**
 * Generate Mermaid ER diagram syntax
 */
function generateMermaidER(
  tables: Array<{
    name: string;
    fields: Array<{ name: string; type: string; optional?: boolean }>;
    documentCount: number;
  }>,
  relations: TableRelation[],
): string {
  const lines: string[] = [];
  lines.push("erDiagram");

  // Add tables with their fields
  for (const table of tables) {
    lines.push(`    ${table.name} {`);
    for (const field of table.fields) {
      const fieldType = simplifyType(field.type);
      const marker = field.optional ? "?" : "";
      lines.push(`        ${fieldType} ${field.name}${marker}`);
    }
    lines.push("    }");
  }

  // Add relationships
  for (const rel of relations) {
    lines.push(`    ${rel.to} ${rel.cardinality} ${rel.from} : "${rel.field}"`);
  }

  return lines.join("\n");
}

/**
 * Simplify Convex types for Mermaid display
 */
function simplifyType(type: string): string {
  if (type.includes("v.id")) return "id";
  if (type.includes("string")) return "string";
  if (type.includes("number") || type.includes("float")) return "number";
  if (type.includes("boolean")) return "boolean";
  if (type.includes("array")) return "array";
  if (type.includes("object")) return "object";
  if (type.includes("null")) return "null";
  if (type.includes("int64")) return "int64";
  if (type.includes("bytes")) return "bytes";
  return type.slice(0, 10);
}

/**
 * Generate HTML page for diagram viewer
 */
function generateDiagramHtml(
  svg: string,
  mermaidCode: string,
  theme: string,
): string {
  const isDark =
    theme.includes("dark") ||
    theme === "tokyo-night" ||
    theme === "dracula" ||
    theme === "nord";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Schema Diagram</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: ${isDark ? "#1e1e1e" : "#faf8f5"};
      color: ${isDark ? "#cccccc" : "#1a1a1a"};
      min-height: 100vh;
      padding: 20px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid ${isDark ? "#3c3c3c" : "#e6e4e1"};
    }
    h1 {
      font-size: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #4a8c5c;
    }
    .diagram-container {
      background: ${isDark ? "#252526" : "#ffffff"};
      border: 1px solid ${isDark ? "#3c3c3c" : "#e6e4e1"};
      border-radius: 12px;
      padding: 20px;
      overflow: auto;
      max-width: 100%;
    }
    .diagram-container svg {
      max-width: 100%;
      height: auto;
    }
    .code-section {
      margin-top: 20px;
    }
    .code-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .code-title {
      font-size: 14px;
      font-weight: 600;
    }
    .copy-btn {
      background: ${isDark ? "#37373d" : "#f5f3f0"};
      border: 1px solid ${isDark ? "#3c3c3c" : "#e6e4e1"};
      color: ${isDark ? "#cccccc" : "#1a1a1a"};
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
    }
    .copy-btn:hover {
      background: ${isDark ? "#4a4a4f" : "#ebe9e6"};
    }
    pre {
      background: ${isDark ? "#1e1e1e" : "#f5f3f0"};
      border: 1px solid ${isDark ? "#3c3c3c" : "#e6e4e1"};
      border-radius: 8px;
      padding: 16px;
      overflow-x: auto;
      font-family: 'SF Mono', Monaco, monospace;
      font-size: 13px;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1><span class="status-dot"></span> Schema Diagram</h1>
    <span style="font-size: 12px; color: ${isDark ? "#8b8b8b" : "#6b6b6b"};">Theme: ${theme}</span>
  </div>
  
  <div class="diagram-container">
    ${svg}
  </div>
  
  <div class="code-section">
    <div class="code-header">
      <span class="code-title">Mermaid Code</span>
      <button class="copy-btn" onclick="copyCode()">Copy</button>
    </div>
    <pre id="mermaid-code">${escapeHtml(mermaidCode)}</pre>
  </div>
  
  <script>
    function copyCode() {
      const code = document.getElementById('mermaid-code').textContent;
      navigator.clipboard.writeText(code).then(() => {
        const btn = document.querySelector('.copy-btn');
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
      });
    }
  </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
