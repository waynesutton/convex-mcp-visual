/**
 * Write Conflict Report Tool
 *
 * Parses Convex logs and summarizes write conflicts by function and table.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { launchUIApp } from "../ui-server.js";
import { readFile } from "fs/promises";
import {
  getSharedStyles,
  getThemeToggleHtml,
  getThemeToggleScript,
  escapeHtml,
} from "./shared-styles.js";

export const writeConflictReportTool: Tool = {
  name: "write_conflict_report",
  description: `Analyze Convex logs for write conflicts.

Use this when the user asks:
- "analyze write conflicts" or "write conflict report"
- "check for write conflicts in logs"
- "summarize conflicts by function"

Requires a log file exported via: npx convex logs > logs.txt
Shows conflicts grouped by function and table.`,
  inputSchema: {
    type: "object",
    properties: {
      logFile: {
        type: "string",
        description: "Path to log file from `npx convex logs`",
      },
      sinceMinutes: {
        type: "number",
        description: "Window size for rate calculations (default: 60)",
        default: 60,
      },
      maxLines: {
        type: "number",
        description: "Max log lines to scan (default: 5000)",
        default: 5000,
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

interface ConflictRow {
  functionName: string;
  table: string;
  count: number;
}

interface ParsedLog {
  timestamp?: number;
  functionName?: string;
  table?: string;
  message: string;
}

export async function handleWriteConflictReport(
  args: Record<string, unknown> = {},
): Promise<ToolResponse> {
  const {
    logFile,
    sinceMinutes = 60,
    maxLines = 5000,
    noBrowser = false,
    theme = "github-dark",
  } = args as {
    logFile?: string;
    sinceMinutes?: number;
    maxLines?: number;
    noBrowser?: boolean;
    theme?: string;
  };

  if (!logFile) {
    return {
      content: [
        {
          type: "text",
          text: `## Write Conflict Report

**Log file required**: Provide a log file exported from Convex.

Example:
\`\`\`bash
npx convex logs --limit 1000 > logs.txt
convex-mcp-visual write-conflicts --log-file logs.txt
\`\`\``,
        },
      ],
      isError: true,
    };
  }

  try {
    const raw = await readFile(logFile, "utf-8");
    const lines = raw.split("\n").slice(0, toNumber(maxLines, 5000));
    const parsed = parseLogs(lines);
    const conflicts = parsed.filter((entry) => isWriteConflict(entry.message));

    if (conflicts.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `## Write Conflict Report

No write conflicts found in logs.

Log file: \`${logFile}\``,
          },
        ],
      };
    }

    const rows = aggregateConflicts(conflicts);
    const windowMinutes = toNumber(sinceMinutes, 60);
    const uiUrl = await maybeLaunchUi(rows, windowMinutes, theme, noBrowser);
    const terminalOutput = buildTerminalOutput(
      rows,
      logFile,
      uiUrl,
      windowMinutes,
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
          text: `## Write Conflict Report

**Error**: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

function parseLogs(lines: string[]): ParsedLog[] {
  const results: ParsedLog[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parsed = parseLogLine(trimmed);
    results.push(parsed);
  }
  return results;
}

function parseLogLine(line: string): ParsedLog {
  try {
    const json = JSON.parse(line);
    const message =
      json.message ||
      json.msg ||
      json.error ||
      json.text ||
      JSON.stringify(json);
    return {
      timestamp: parseTimestamp(json.timestamp || json.time || json.ts),
      functionName:
        json.functionName || json.function || json.udfName || json.name,
      table: json.tableName || json.table || json.table_name,
      message: String(message),
    };
  } catch {
    return {
      message: line,
      functionName: extractFunctionName(line),
      table: extractTableName(line),
    };
  }
}

function parseTimestamp(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

function isWriteConflict(message: string): boolean {
  const lowered = message.toLowerCase();
  return (
    lowered.includes("write conflict") || lowered.includes("writeconflict")
  );
}

function extractFunctionName(text: string): string | undefined {
  const match =
    text.match(/function\s+([a-zA-Z0-9_.-]+)/i) ||
    text.match(/mutation\s+([a-zA-Z0-9_.-]+)/i);
  return match ? match[1] : undefined;
}

function extractTableName(text: string): string | undefined {
  const match =
    text.match(/table\s+["'`]?([a-zA-Z0-9_]+)["'`]?/i) ||
    text.match(/tableName[:=]\s*([a-zA-Z0-9_]+)/i);
  return match ? match[1] : undefined;
}

function aggregateConflicts(entries: ParsedLog[]): ConflictRow[] {
  const counts = new Map<string, ConflictRow>();
  for (const entry of entries) {
    const functionName = entry.functionName || "unknown";
    const table = entry.table || "unknown";
    const key = `${functionName}::${table}`;
    const current = counts.get(key);
    if (current) {
      current.count += 1;
    } else {
      counts.set(key, { functionName, table, count: 1 });
    }
  }
  return Array.from(counts.values()).sort((a, b) => b.count - a.count);
}

async function maybeLaunchUi(
  rows: ConflictRow[],
  windowMinutes: number,
  theme: string,
  noBrowser: boolean,
): Promise<string> {
  if (noBrowser) return "";
  try {
    const uiServer = await launchUIApp({
      appName: "write-conflicts",
      config: { rows, windowMinutes },
      port: 3462,
      autoClose: 30 * 60 * 1000,
      customHtml: buildReportHtml(rows, windowMinutes, theme),
    });
    return uiServer.url;
  } catch (error) {
    console.error("Failed to launch UI:", error);
    return "";
  }
}

function buildTerminalOutput(
  rows: ConflictRow[],
  logFile: string,
  uiUrl: string,
  windowMinutes: number,
): string {
  const lines: string[] = [];
  lines.push("## Write Conflict Report");
  lines.push("");
  if (uiUrl) {
    lines.push(`**Interactive UI**: ${uiUrl}`);
    lines.push("");
  }
  lines.push(`Log file: \`${logFile}\``);
  lines.push(
    `Window: ${windowMinutes} minute${windowMinutes === 1 ? "" : "s"}`,
  );
  lines.push("");

  lines.push("| Function | Table | Conflicts |");
  lines.push("|----------|-------|-----------|");
  for (const row of rows) {
    lines.push(`| ${row.functionName} | ${row.table} | ${row.count} |`);
  }

  return lines.join("\n");
}

function buildReportHtml(
  rows: ConflictRow[],
  windowMinutes: number,
  _theme: string,
): string {
  const totalConflicts = rows.reduce((sum, r) => sum + r.count, 0);
  const uniqueFunctions = new Set(rows.map((r) => r.functionName)).size;
  const uniqueTables = new Set(rows.map((r) => r.table)).size;

  const bodyRows = rows
    .map(
      (row) =>
        `<tr>
          <td class="mono" style="color: var(--accent-interactive);">${escapeHtml(row.functionName)}</td>
          <td class="mono">${escapeHtml(row.table)}</td>
          <td><span class="badge badge-error">${row.count}</span></td>
        </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Write Conflict Report</title>
  <style>${getSharedStyles()}</style>
</head>
<body>
  <header class="header">
    <div class="header-left">
      <h1><span class="status-dot error"></span> Write Conflict Report</h1>
      <span class="header-info">${windowMinutes} min window</span>
    </div>
    <div class="header-actions">
      ${getThemeToggleHtml()}
    </div>
  </header>

  <main class="main-content">
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px;">
      <div class="card">
        <div class="card-body" style="text-align: center;">
          <div style="font-size: 11px; text-transform: uppercase; color: var(--text-secondary); letter-spacing: 0.5px;">Total Conflicts</div>
          <div style="font-size: 28px; font-weight: 700; margin-top: 4px; color: var(--error);">${totalConflicts}</div>
        </div>
      </div>
      <div class="card">
        <div class="card-body" style="text-align: center;">
          <div style="font-size: 11px; text-transform: uppercase; color: var(--text-secondary); letter-spacing: 0.5px;">Functions Affected</div>
          <div style="font-size: 28px; font-weight: 700; margin-top: 4px;">${uniqueFunctions}</div>
        </div>
      </div>
      <div class="card">
        <div class="card-body" style="text-align: center;">
          <div style="font-size: 11px; text-transform: uppercase; color: var(--text-secondary); letter-spacing: 0.5px;">Tables Affected</div>
          <div style="font-size: 28px; font-weight: 700; margin-top: 4px;">${uniqueTables}</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title">Conflicts by Function and Table</div>
        <span class="badge badge-neutral">${rows.length} entries</span>
      </div>
      <div style="overflow-x: auto;">
        <table>
          <thead>
            <tr><th>Function</th><th>Table</th><th>Conflicts</th></tr>
          </thead>
          <tbody>${bodyRows || "<tr><td colspan='3' style='text-align: center; color: var(--text-muted);'>No conflicts found</td></tr>"}</tbody>
        </table>
      </div>
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
