/**
 * Schema Drift Tool
 *
 * Compares declared vs inferred schema fields.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ConvexClient, SchemaField } from "../convex-client.js";
import { launchUIApp } from "../ui-server.js";

export const schemaDriftTool: Tool = {
  name: "schema_drift",
  description: `Compare declared and inferred schema fields to find drift.

Shows missing fields and type mismatches by table.`,
  inputSchema: {
    type: "object",
    properties: {
      maxTables: {
        type: "number",
        description: "Max tables to scan (default: 80)",
        default: 80,
      },
      noBrowser: {
        type: "boolean",
        description: "Skip browser UI output (default: false)",
        default: false,
      },
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
        description: "Color theme for UI output (default: github-dark)",
        default: "github-dark",
      },
    },
    required: [],
  },
};

interface ToolResponse {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

interface DriftRow {
  table: string;
  missingDeclared: string[];
  missingInferred: string[];
  mismatched: Array<{ field: string; declared: string; inferred: string }>;
}

export async function handleSchemaDrift(
  client: ConvexClient,
  args: Record<string, unknown> = {},
): Promise<ToolResponse> {
  const {
    maxTables = 80,
    noBrowser = false,
    theme = "github-dark",
  } = args as {
    maxTables?: number;
    noBrowser?: boolean;
    theme?: string;
  };

  if (!client.isConnected()) {
    return {
      content: [
        {
          type: "text",
          text: `## Schema Drift

**Connection Error**: No Convex deployment configured.

To connect:
1. Run \`npx convex-mcp-visual --setup\`
2. Or set \`CONVEX_URL\` and \`CONVEX_DEPLOY_KEY\``,
        },
      ],
      isError: true,
    };
  }

  try {
    const limit = toNumber(maxTables, 80);
    const tables = await client.listTables();
    const selectedTables = tables.slice(0, limit);

    const driftRows: DriftRow[] = [];
    for (const table of selectedTables) {
      const schema = await client.getTableSchema(table.name);
      const drift = computeDrift(schema.declaredFields, schema.inferredFields);
      driftRows.push({
        table: table.name,
        missingDeclared: drift.missingDeclared,
        missingInferred: drift.missingInferred,
        mismatched: drift.mismatched,
      });
    }

    driftRows.sort((a, b) => totalDrift(b) - totalDrift(a));

    let uiUrl = "";
    if (!noBrowser) {
      try {
        const uiServer = await launchUIApp({
          appName: "schema-drift",
          config: {
            deploymentUrl: client.getDeploymentUrl(),
            drift: driftRows,
          },
          port: 3461,
          autoClose: 30 * 60 * 1000,
          customHtml: buildDriftHtml(driftRows, theme),
        });
        uiUrl = uiServer.url;
      } catch (error) {
        console.error("Failed to launch UI:", error);
      }
    }

    const terminalOutput = buildTerminalOutput(
      driftRows,
      client.getDeploymentUrl(),
      uiUrl,
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
          text: `## Schema Drift

**Error**: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

function computeDrift(
  declaredFields: SchemaField[],
  inferredFields: SchemaField[],
): {
  missingDeclared: string[];
  missingInferred: string[];
  mismatched: Array<{ field: string; declared: string; inferred: string }>;
} {
  const declaredMap = new Map<string, SchemaField>();
  const inferredMap = new Map<string, SchemaField>();

  for (const field of declaredFields) {
    declaredMap.set(field.name, field);
  }
  for (const field of inferredFields) {
    inferredMap.set(field.name, field);
  }

  const missingDeclared: string[] = [];
  const missingInferred: string[] = [];
  const mismatched: Array<{
    field: string;
    declared: string;
    inferred: string;
  }> = [];

  for (const [name, inferred] of inferredMap.entries()) {
    if (!declaredMap.has(name)) {
      missingDeclared.push(name);
    } else {
      const declared = declaredMap.get(name);
      const declaredType = normalizeType(declared?.type || "");
      const inferredType = normalizeType(inferred.type);
      if (declaredType && inferredType && declaredType !== inferredType) {
        mismatched.push({
          field: name,
          declared: declared?.type || "",
          inferred: inferred.type,
        });
      }
    }
  }

  for (const [name] of declaredMap.entries()) {
    if (!inferredMap.has(name)) {
      missingInferred.push(name);
    }
  }

  return { missingDeclared, missingInferred, mismatched };
}

function normalizeType(type: string): string {
  return type.replace(/\?/g, "").replace(/\s+/g, "").toLowerCase();
}

function totalDrift(row: DriftRow): number {
  return (
    row.missingDeclared.length +
    row.missingInferred.length +
    row.mismatched.length
  );
}

function buildTerminalOutput(
  rows: DriftRow[],
  deploymentUrl: string | null,
  uiUrl: string,
): string {
  const lines: string[] = [];
  lines.push("## Schema Drift");
  lines.push("");
  if (uiUrl) {
    lines.push(`**Interactive UI**: ${uiUrl}`);
    lines.push("");
  }
  lines.push(`Connected to: \`${deploymentUrl}\``);
  lines.push("");

  if (rows.length === 0) {
    lines.push("*No tables found.*");
    return lines.join("\n");
  }

  lines.push(
    "| Table | Missing Declared | Missing Inferred | Type Mismatches |",
  );
  lines.push(
    "|-------|------------------|------------------|-----------------|",
  );
  for (const row of rows) {
    lines.push(
      `| ${row.table} | ${row.missingDeclared.length} | ${row.missingInferred.length} | ${row.mismatched.length} |`,
    );
  }
  lines.push("");

  for (const row of rows) {
    if (totalDrift(row) === 0) continue;
    lines.push(`### ${row.table}`);
    lines.push("");
    if (row.missingDeclared.length > 0) {
      lines.push("Missing in declared:");
      lines.push(row.missingDeclared.map((f) => `- ${f}`).join("\n"));
      lines.push("");
    }
    if (row.missingInferred.length > 0) {
      lines.push("Missing in inferred:");
      lines.push(row.missingInferred.map((f) => `- ${f}`).join("\n"));
      lines.push("");
    }
    if (row.mismatched.length > 0) {
      lines.push("Type mismatches:");
      lines.push("");
      lines.push("| Field | Declared | Inferred |");
      lines.push("|-------|----------|----------|");
      for (const item of row.mismatched) {
        lines.push(
          `| ${item.field} | \`${item.declared}\` | \`${item.inferred}\` |`,
        );
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

function buildDriftHtml(rows: DriftRow[], theme: string): string {
  const isDark =
    theme.includes("dark") ||
    theme === "tokyo-night" ||
    theme === "dracula" ||
    theme === "nord";

  const list = rows
    .map((row) => {
      const total = totalDrift(row);
      const badge =
        total === 0
          ? `<span class="badge ok">Clean</span>`
          : `<span class="badge warn">${total} drift</span>`;
      const missingDeclared = row.missingDeclared
        .map((f) => `<li>${f}</li>`)
        .join("");
      const missingInferred = row.missingInferred
        .map((f) => `<li>${f}</li>`)
        .join("");
      const mismatched = row.mismatched
        .map(
          (m) =>
            `<tr><td>${m.field}</td><td>${m.declared}</td><td>${m.inferred}</td></tr>`,
        )
        .join("");
      return `<div class="card">
        <div class="card-header">
          <div class="card-title">${row.table}</div>
          ${badge}
        </div>
        <div class="card-body">
          <div class="section">
            <div class="section-title">Missing in declared</div>
            <ul>${missingDeclared || "<li>None</li>"}</ul>
          </div>
          <div class="section">
            <div class="section-title">Missing in inferred</div>
            <ul>${missingInferred || "<li>None</li>"}</ul>
          </div>
          <div class="section">
            <div class="section-title">Type mismatches</div>
            <table>
              <thead><tr><th>Field</th><th>Declared</th><th>Inferred</th></tr></thead>
              <tbody>${mismatched || "<tr><td colspan='3'>None</td></tr>"}</tbody>
            </table>
          </div>
        </div>
      </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Schema Drift</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: ${isDark ? "#1e1e1e" : "#faf8f5"};
      color: ${isDark ? "#e6e6e6" : "#1a1a1a"};
      padding: 20px;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: #4a8c5c;
    }
    .card {
      border: 1px solid ${isDark ? "#2f2f2f" : "#e3e1de"};
      border-radius: 12px;
      padding: 16px;
      background: ${isDark ? "#252526" : "#ffffff"};
      margin-bottom: 12px;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .card-title {
      font-weight: 600;
      font-size: 16px;
    }
    .badge {
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 999px;
      border: 1px solid transparent;
    }
    .badge.ok {
      background: ${isDark ? "#1f2f25" : "#e7f5ed"};
      color: ${isDark ? "#9ae6b4" : "#246b3d"};
      border-color: ${isDark ? "#2f513a" : "#bfe3cc"};
    }
    .badge.warn {
      background: ${isDark ? "#33241c" : "#fff1e6"};
      color: ${isDark ? "#f6ad55" : "#8b4b1f"};
      border-color: ${isDark ? "#4a3628" : "#f0c9a8"};
    }
    .section {
      margin-top: 12px;
    }
    .section-title {
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 6px;
    }
    ul {
      padding-left: 16px;
      font-size: 13px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    th, td {
      text-align: left;
      padding: 6px 8px;
      border-bottom: 1px solid ${isDark ? "#323232" : "#e6e4e1"};
    }
    th {
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="header">
    <span class="status-dot"></span>
    <h1>Schema drift</h1>
  </div>
  ${list}
</body>
</html>`;
}

function toNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}
