/**
 * Table Heatmap Tool
 *
 * Shows writes per minute by table using recent document creation times.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { ConvexClient } from "../convex-client.js";
import { launchUIApp } from "../ui-server.js";

export const tableHeatmapTool: Tool = {
  name: "table_heatmap",
  description: `Generate a heatmap of recent writes per table.

Uses document creation times to estimate writes per minute.
Requires admin access for table data.`,
  inputSchema: {
    type: "object",
    properties: {
      windowMinutes: {
        type: "number",
        description: "Minutes to look back for writes (default: 1)",
        default: 1,
      },
      maxDocsPerTable: {
        type: "number",
        description: "Max documents to scan per table (default: 1500)",
        default: 1500,
      },
      maxTables: {
        type: "number",
        description: "Max tables to scan (default: 60)",
        default: 60,
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

interface HeatmapRow {
  table: string;
  writes: number;
  writesPerMinute: number;
  scanned: number;
}

export async function handleTableHeatmap(
  client: ConvexClient,
  args: Record<string, unknown> = {},
): Promise<ToolResponse> {
  const {
    windowMinutes = 1,
    maxDocsPerTable = 1500,
    maxTables = 60,
    noBrowser = false,
    theme = "github-dark",
  } = args as {
    windowMinutes?: number;
    maxDocsPerTable?: number;
    maxTables?: number;
    noBrowser?: boolean;
    theme?: string;
  };

  if (!client.isConnected()) {
    return {
      content: [
        {
          type: "text",
          text: `## Table Heatmap

**Connection Error**: No Convex deployment configured.

To connect:
1. Run \`npx convex-mcp-visual --setup\`
2. Or set \`CONVEX_URL\` and \`CONVEX_DEPLOY_KEY\``,
        },
      ],
      isError: true,
    };
  }

  if (!client.hasAdminAccess()) {
    return {
      content: [
        {
          type: "text",
          text: `## Table Heatmap

**Admin Access Required**: This view needs document access.

Set \`CONVEX_DEPLOY_KEY\` and try again.`,
        },
      ],
      isError: true,
    };
  }

  try {
    const windowMins = toNumber(windowMinutes, 1);
    const docLimit = toNumber(maxDocsPerTable, 1500);
    const tableLimit = toNumber(maxTables, 60);
    const windowMs = windowMins * 60 * 1000;
    const cutoff = Date.now() - windowMs;

    const tables = await client.listTables();
    const selectedTables = tables
      .slice()
      .sort((a, b) => b.documentCount - a.documentCount)
      .slice(0, tableLimit);

    const rows: HeatmapRow[] = [];
    for (const table of selectedTables) {
      const result = await countRecentWrites(
        client,
        table.name,
        cutoff,
        docLimit,
      );
      rows.push({
        table: table.name,
        writes: result.writes,
        writesPerMinute: windowMins > 0 ? result.writes / windowMins : 0,
        scanned: result.scanned,
      });
    }

    rows.sort((a, b) => b.writesPerMinute - a.writesPerMinute);

    let uiUrl = "";
    if (!noBrowser) {
      try {
        const uiServer = await launchUIApp({
          appName: "table-heatmap",
          config: {
            deploymentUrl: client.getDeploymentUrl(),
            rows,
            windowMinutes: windowMins,
          },
          port: 3460,
          autoClose: 30 * 60 * 1000,
          customHtml: buildHeatmapHtml(rows, windowMins, theme),
        });
        uiUrl = uiServer.url;
      } catch (error) {
        console.error("Failed to launch UI:", error);
      }
    }

    const terminalOutput = buildTerminalOutput(
      rows,
      client.getDeploymentUrl(),
      uiUrl,
      windowMins,
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
          text: `## Table Heatmap

**Error**: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

async function countRecentWrites(
  client: ConvexClient,
  tableName: string,
  cutoffTime: number,
  maxDocs: number,
): Promise<{ writes: number; scanned: number }> {
  let writes = 0;
  let scanned = 0;
  let cursor: string | undefined = undefined;
  let done = false;

  while (!done && scanned < maxDocs) {
    const page = await client.queryDocuments(tableName, {
      limit: Math.min(100, maxDocs - scanned),
      cursor,
      order: "desc",
    });

    for (const doc of page.documents) {
      scanned += 1;
      if (doc._creationTime >= cutoffTime) {
        writes += 1;
      } else {
        done = true;
        break;
      }
    }

    if (page.isDone || !page.continueCursor) {
      done = true;
      break;
    }

    cursor = page.continueCursor;
  }

  return { writes, scanned };
}

function buildTerminalOutput(
  rows: HeatmapRow[],
  deploymentUrl: string | null,
  uiUrl: string,
  windowMinutes: number,
): string {
  const lines: string[] = [];
  lines.push("## Table Heatmap");
  lines.push("");
  if (uiUrl) {
    lines.push(`**Interactive UI**: ${uiUrl}`);
    lines.push("");
  }
  lines.push(`Connected to: \`${deploymentUrl}\``);
  lines.push(
    `Window: last ${windowMinutes} minute${windowMinutes === 1 ? "" : "s"}`,
  );
  lines.push("");

  if (rows.length === 0) {
    lines.push("*No tables found.*");
    return lines.join("\n");
  }

  const maxRate = Math.max(...rows.map((r) => r.writesPerMinute), 1);
  lines.push("| Table | Writes/min | Recent | Scanned |");
  lines.push("|-------|------------|--------|---------|");
  for (const row of rows) {
    const bar = buildBar(row.writesPerMinute, maxRate, 10);
    lines.push(
      `| ${row.table} | ${formatNumber(row.writesPerMinute)} ${bar} | ${row.writes} | ${row.scanned} |`,
    );
  }

  return lines.join("\n");
}

function buildBar(value: number, max: number, width: number): string {
  if (max <= 0) return "";
  const filled = Math.round((value / max) * width);
  const fill = "█".repeat(Math.max(filled, 0));
  const empty = "░".repeat(Math.max(width - filled, 0));
  return `${fill}${empty}`;
}

function buildHeatmapHtml(
  rows: HeatmapRow[],
  windowMinutes: number,
  theme: string,
): string {
  const isDark =
    theme.includes("dark") ||
    theme === "tokyo-night" ||
    theme === "dracula" ||
    theme === "nord";
  const maxRate = Math.max(...rows.map((r) => r.writesPerMinute), 1);

  const cards = rows
    .map((row) => {
      const intensity = maxRate > 0 ? row.writesPerMinute / maxRate : 0;
      const bg = heatColor(intensity, isDark);
      return `<div class="cell" style="background:${bg}">
        <div class="cell-title">${row.table}</div>
        <div class="cell-value">${formatNumber(row.writesPerMinute)} / min</div>
        <div class="cell-sub">${row.writes} writes · ${row.scanned} scanned</div>
      </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Table Heatmap</title>
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
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .title {
      font-size: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: #4a8c5c;
    }
    .subtitle {
      font-size: 12px;
      color: ${isDark ? "#9a9a9a" : "#6b6b6b"};
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
      gap: 12px;
    }
    .cell {
      border-radius: 12px;
      padding: 14px;
      border: 1px solid ${isDark ? "#2f2f2f" : "#e3e1de"};
      min-height: 100px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .cell-title {
      font-weight: 600;
      font-size: 14px;
    }
    .cell-value {
      font-size: 18px;
      font-weight: 700;
    }
    .cell-sub {
      font-size: 12px;
      color: ${isDark ? "#bdbdbd" : "#5a5a5a"};
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="title"><span class="status-dot"></span> Table heatmap</div>
    <div class="subtitle">Last ${windowMinutes} minute${windowMinutes === 1 ? "" : "s"}</div>
  </div>
  <div class="grid">${cards}</div>
</body>
</html>`;
}

function heatColor(intensity: number, isDark: boolean): string {
  const clamped = Math.max(0, Math.min(1, intensity));
  const base = isDark ? [34, 34, 34] : [250, 248, 245];
  const hot = isDark ? [210, 120, 60] : [235, 126, 52];
  const r = Math.round(base[0] + (hot[0] - base[0]) * clamped);
  const g = Math.round(base[1] + (hot[1] - base[1]) * clamped);
  const b = Math.round(base[2] + (hot[2] - base[2]) * clamped);
  return `rgb(${r}, ${g}, ${b})`;
}

function formatNumber(num: number): string {
  if (!Number.isFinite(num)) return "0";
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "k";
  if (Number.isInteger(num)) return num.toString();
  return num.toFixed(2);
}

function toNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}
