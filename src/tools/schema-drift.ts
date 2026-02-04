/**
 * Schema Drift Tool
 *
 * Compares declared vs inferred schema fields.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ConvexClient, SchemaField } from "../convex-client.js";
import { launchUIApp } from "../ui-server.js";
import {
  getSharedStyles,
  getThemeToggleHtml,
  getThemeToggleScript,
  escapeHtml,
} from "./shared-styles.js";

export const schemaDriftTool: Tool = {
  name: "schema_drift",
  description: `Compare declared vs inferred schema to detect drift.

Use this when the user asks:
- "check schema drift" or "schema drift view"
- "compare declared vs inferred schema"
- "find missing schema fields"

Shows which fields exist in data but not in schema (and vice versa).
Also shows type mismatches between declared and inferred fields.`,
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

function buildDriftHtml(rows: DriftRow[], _theme: string): string {
  const cleanCount = rows.filter((r) => totalDrift(r) === 0).length;
  const driftCount = rows.length - cleanCount;

  const list = rows
    .map((row) => {
      const total = totalDrift(row);
      const badgeClass = total === 0 ? "badge-success" : "badge-warning";
      const badgeText = total === 0 ? "Clean" : `${total} drift`;
      const missingDeclared = row.missingDeclared
        .map((f) => `<li><code>${escapeHtml(f)}</code></li>`)
        .join("");
      const missingInferred = row.missingInferred
        .map((f) => `<li><code>${escapeHtml(f)}</code></li>`)
        .join("");
      const mismatched = row.mismatched
        .map(
          (m) =>
            `<tr><td class="mono">${escapeHtml(m.field)}</td><td class="mono">${escapeHtml(m.declared)}</td><td class="mono">${escapeHtml(m.inferred)}</td></tr>`,
        )
        .join("");
      return `<div class="card">
        <div class="card-header">
          <div class="card-title">${escapeHtml(row.table)}</div>
          <span class="badge ${badgeClass}">${badgeText}</span>
        </div>
        <div class="card-body">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div>
              <div class="section-title">Missing in declared schema</div>
              <ul style="font-size: 13px;">${missingDeclared || "<li style='color: var(--text-muted);'>None</li>"}</ul>
            </div>
            <div>
              <div class="section-title">Missing in inferred (from data)</div>
              <ul style="font-size: 13px;">${missingInferred || "<li style='color: var(--text-muted);'>None</li>"}</ul>
            </div>
          </div>
          ${
            row.mismatched.length > 0
              ? `
          <div style="margin-top: 16px;">
            <div class="section-title">Type mismatches</div>
            <table style="margin-top: 8px;">
              <thead><tr><th>Field</th><th>Declared</th><th>Inferred</th></tr></thead>
              <tbody>${mismatched}</tbody>
            </table>
          </div>
          `
              : ""
          }
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
  <style>${getSharedStyles()}</style>
</head>
<body>
  <header class="header">
    <div class="header-left">
      <h1><span class="status-dot ${driftCount > 0 ? "warning" : ""}"></span> Schema Drift</h1>
      <span class="header-info">${rows.length} tables analyzed</span>
    </div>
    <div class="header-actions">
      ${getThemeToggleHtml()}
    </div>
  </header>

  <main class="main-content">
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px;">
      <div class="card">
        <div class="card-body" style="text-align: center;">
          <div style="font-size: 11px; text-transform: uppercase; color: var(--text-secondary); letter-spacing: 0.5px;">Tables with Drift</div>
          <div style="font-size: 28px; font-weight: 700; margin-top: 4px; color: ${driftCount > 0 ? "var(--warning)" : "var(--success)"};">${driftCount}</div>
        </div>
      </div>
      <div class="card">
        <div class="card-body" style="text-align: center;">
          <div style="font-size: 11px; text-transform: uppercase; color: var(--text-secondary); letter-spacing: 0.5px;">Clean Tables</div>
          <div style="font-size: 28px; font-weight: 700; margin-top: 4px; color: var(--success);">${cleanCount}</div>
        </div>
      </div>
      <div class="card">
        <div class="card-body" style="text-align: center;">
          <div style="font-size: 11px; text-transform: uppercase; color: var(--text-secondary); letter-spacing: 0.5px;">Total Analyzed</div>
          <div style="font-size: 28px; font-weight: 700; margin-top: 4px;">${rows.length}</div>
        </div>
      </div>
    </div>

    <div style="display: flex; flex-direction: column; gap: 16px;">
      ${list}
    </div>
  </main>

  <script>${getThemeToggleScript()}</script>
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
