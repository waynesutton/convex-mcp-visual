/**
 * Kanban Board Tool
 *
 * MCP tool that creates kanban board visualizations for:
 * 1. Scheduled functions and cron jobs (--jobs)
 * 2. AI Agent threads and workflows (--agents)
 *
 * The tool displays items in columns based on their status:
 * - Jobs: Pending | Running | Completed | Failed
 * - Agents: Idle | Processing | Waiting | Completed
 *
 * NOTE ON AGENTS:
 * The --agents view requires the @convex-dev/agent component to be installed.
 * See: https://www.convex.dev/components/agent
 *
 * If using a custom agent implementation, the tool will attempt to detect
 * agent-related tables but may not work with all configurations.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type {
  ConvexClient,
  ScheduledFunction,
  CronJob,
  AgentThread,
  AgentComponentInfo,
} from "../convex-client.js";
import { launchUIApp } from "../ui-server.js";
import { getSharedStyles, getThemeToggleScript } from "./shared-styles.js";

export const kanbanBoardTool: Tool = {
  name: "kanban_board",
  description: `Displays a kanban board view of Convex scheduled functions, cron jobs, or AI agents.

Use --jobs to show scheduled functions and cron jobs in columns:
- Pending: Functions waiting to run
- Running: Currently executing
- Completed: Successfully finished
- Failed: Errored or canceled

Use --agents to show AI agent threads (requires @convex-dev/agent component):
- Idle: Threads waiting for input
- Processing: Agent is generating response
- Waiting: Waiting for tool call results
- Completed: Conversation finished

Auto-detects available features if no flag specified.`,
  inputSchema: {
    type: "object",
    properties: {
      mode: {
        type: "string",
        enum: ["jobs", "agents", "auto"],
        description:
          "What to display: jobs (scheduled functions/crons), agents (AI agent threads), or auto (detect both)",
        default: "auto",
      },
      theme: {
        type: "string",
        enum: ["github-dark", "github-light", "dracula", "nord", "tokyo-night"],
        description: "Color theme for the board",
        default: "github-dark",
      },
      noBrowser: {
        type: "boolean",
        description: "If true, only output to terminal without opening browser",
        default: false,
      },
    },
    required: [],
  },
};

interface ToolResponse {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

interface KanbanColumn<T> {
  id: string;
  title: string;
  items: T[];
  color: string;
}

interface KanbanData {
  jobs: {
    columns: KanbanColumn<ScheduledFunction | CronJob>[];
    totalCount: number;
  };
  agents: {
    columns: KanbanColumn<AgentThread>[];
    totalCount: number;
    componentInfo: AgentComponentInfo;
  };
}

export async function handleKanbanBoard(
  client: ConvexClient,
  args: Record<string, unknown> = {},
): Promise<ToolResponse> {
  const {
    mode = "auto",
    theme = "github-dark",
    noBrowser = false,
  } = args as {
    mode?: "jobs" | "agents" | "auto";
    theme?: string;
    noBrowser?: boolean;
  };

  if (!client.isConnected()) {
    return {
      content: [
        {
          type: "text",
          text: `## Kanban Board

**Connection Error**: No Convex deployment configured.

To connect:
1. Run \`npx convex login\` to authenticate
2. Or set \`CONVEX_URL\` and \`CONVEX_DEPLOY_KEY\` environment variables`,
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
          text: `## Kanban Board

**Access Error**: Admin access required.

The kanban board needs to query system tables for scheduled functions and agent data.
Please set CONVEX_DEPLOY_KEY environment variable with a deploy key from:
https://dashboard.convex.dev → Settings → Deploy Keys`,
        },
      ],
      isError: true,
    };
  }

  try {
    const data: KanbanData = {
      jobs: { columns: [], totalCount: 0 },
      agents: {
        columns: [],
        totalCount: 0,
        componentInfo: { installed: false, tables: [] },
      },
    };

    // Fetch jobs data if mode is jobs or auto
    if (mode === "jobs" || mode === "auto") {
      const [scheduledFunctions, cronJobs] = await Promise.all([
        client.getScheduledFunctions(),
        client.getCronJobs(),
      ]);

      data.jobs = organizeJobsIntoColumns(scheduledFunctions, cronJobs);
    }

    // Fetch agents data if mode is agents or auto
    if (mode === "agents" || mode === "auto") {
      const componentInfo = await client.detectAgentComponent();
      data.agents.componentInfo = componentInfo;

      if (componentInfo.installed) {
        const threads = await client.getAgentThreads();
        data.agents = {
          ...organizeAgentsIntoColumns(threads),
          componentInfo,
        };
      }
    }

    // Build config for UI app
    const config = {
      deploymentUrl: client.getDeploymentUrl(),
      mode,
      theme,
      data,
      timestamp: Date.now(),
    };

    // Launch the interactive UI in browser (unless noBrowser)
    let uiUrl = "";
    if (!noBrowser) {
      try {
        const uiServer = await launchUIApp({
          appName: "kanban-board",
          config,
          port: 3459,
          autoClose: 30 * 60 * 1000, // Auto-close after 30 minutes
        });
        uiUrl = uiServer.url;
      } catch (error) {
        console.error("Failed to launch UI:", error);
      }
    }

    // Build terminal output
    const terminalOutput = buildTerminalOutput(
      data,
      mode,
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
          text: `## Kanban Board

**Error**: ${error instanceof Error ? error.message : String(error)}

Please check your Convex credentials and deployment URL.`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Organize scheduled functions and cron jobs into kanban columns
 */
function organizeJobsIntoColumns(
  scheduledFunctions: ScheduledFunction[],
  cronJobs: CronJob[],
): {
  columns: KanbanColumn<ScheduledFunction | CronJob>[];
  totalCount: number;
} {
  // Create columns for job states
  const columns: KanbanColumn<ScheduledFunction | CronJob>[] = [
    { id: "pending", title: "Pending", items: [], color: "#f59e0b" },
    { id: "running", title: "Running", items: [], color: "#3b82f6" },
    { id: "completed", title: "Completed", items: [], color: "#22c55e" },
    { id: "failed", title: "Failed", items: [], color: "#ef4444" },
  ];

  // Sort scheduled functions into columns
  for (const fn of scheduledFunctions) {
    switch (fn.state) {
      case "pending":
        columns[0].items.push(fn);
        break;
      case "inProgress":
        columns[1].items.push(fn);
        break;
      case "success":
        columns[2].items.push(fn);
        break;
      case "failed":
      case "canceled":
        columns[3].items.push(fn);
        break;
    }
  }

  // Add cron jobs to appropriate columns (they're always "pending" next run)
  for (const cron of cronJobs) {
    columns[0].items.push(cron);
  }

  const totalCount = scheduledFunctions.length + cronJobs.length;

  return { columns, totalCount };
}

/**
 * Organize agent threads into kanban columns
 */
function organizeAgentsIntoColumns(threads: AgentThread[]): {
  columns: KanbanColumn<AgentThread>[];
  totalCount: number;
} {
  // Create columns for agent states
  const columns: KanbanColumn<AgentThread>[] = [
    { id: "idle", title: "Idle", items: [], color: "#6b7280" },
    { id: "processing", title: "Processing", items: [], color: "#3b82f6" },
    { id: "waiting", title: "Waiting for Tool", items: [], color: "#f59e0b" },
    { id: "completed", title: "Completed", items: [], color: "#22c55e" },
  ];

  // Sort threads into columns
  for (const thread of threads) {
    switch (thread.status) {
      case "idle":
        columns[0].items.push(thread);
        break;
      case "processing":
        columns[1].items.push(thread);
        break;
      case "waiting":
        columns[2].items.push(thread);
        break;
      case "completed":
        columns[3].items.push(thread);
        break;
      case "error":
        // Add errors to a special section in completed column
        columns[3].items.push(thread);
        break;
    }
  }

  return { columns, totalCount: threads.length };
}

/**
 * Build terminal-friendly kanban board output
 */
function buildTerminalOutput(
  data: KanbanData,
  mode: string,
  deploymentUrl: string | null,
  uiUrl: string,
): string {
  const lines: string[] = [];

  lines.push("## Kanban Board");
  lines.push("");
  if (uiUrl) {
    lines.push(`**Interactive UI**: ${uiUrl}`);
    lines.push("");
  }
  lines.push(`Connected to: \`${deploymentUrl}\``);
  lines.push("");

  // Jobs section
  if (mode === "jobs" || mode === "auto") {
    lines.push("### Scheduled Functions & Cron Jobs");
    lines.push("");

    if (data.jobs.totalCount === 0) {
      lines.push("*No scheduled functions or cron jobs found.*");
    } else {
      lines.push(`Total: ${data.jobs.totalCount} items`);
      lines.push("");

      // Build ASCII kanban board for jobs
      lines.push("```");
      lines.push(buildAsciiKanban(data.jobs.columns));
      lines.push("```");
    }
    lines.push("");
  }

  // Agents section
  if (mode === "agents" || mode === "auto") {
    lines.push("### AI Agent Threads");
    lines.push("");

    if (!data.agents.componentInfo.installed) {
      lines.push("*No agent component detected.*");
      lines.push("");
      lines.push(
        "**Note**: The agents view requires the @convex-dev/agent component.",
      );
      lines.push("Install it with: `npm install @convex-dev/agent`");
      lines.push("Docs: https://www.convex.dev/components/agent");
    } else {
      if (data.agents.componentInfo.isOfficialComponent) {
        lines.push("*Using @convex-dev/agent component*");
      } else {
        lines.push(
          `*Detected agent tables: ${data.agents.componentInfo.tables.join(", ")}*`,
        );
      }
      lines.push("");

      if (data.agents.totalCount === 0) {
        lines.push("*No agent threads found.*");
      } else {
        lines.push(`Total: ${data.agents.totalCount} threads`);
        lines.push("");

        // Build ASCII kanban board for agents
        lines.push("```");
        lines.push(buildAsciiKanban(data.agents.columns));
        lines.push("```");
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Build ASCII representation of kanban board
 */
function buildAsciiKanban<
  T extends { _id: string; name?: string; title?: string },
>(columns: KanbanColumn<T>[]): string {
  const colWidth = 20;
  const lines: string[] = [];

  // Header row
  const headers = columns.map((c) =>
    ` ${c.title} (${c.items.length}) `.padEnd(colWidth).slice(0, colWidth),
  );
  lines.push("+" + headers.map(() => "-".repeat(colWidth)).join("+") + "+");
  lines.push("|" + headers.join("|") + "|");
  lines.push("+" + headers.map(() => "-".repeat(colWidth)).join("+") + "+");

  // Find max items to display
  const maxRows = Math.max(...columns.map((c) => Math.min(c.items.length, 5)));

  for (let i = 0; i < maxRows; i++) {
    const cells = columns.map((c) => {
      const item = c.items[i];
      if (!item) return " ".repeat(colWidth);

      // Get display name (handle both job and agent items)
      const name =
        (item as any).name ||
        (item as any).title ||
        (item as any).functionPath ||
        item._id.slice(0, 10);
      return ` ${name}`.padEnd(colWidth).slice(0, colWidth);
    });
    lines.push("|" + cells.join("|") + "|");
  }

  // Show overflow indicator
  const hasMore = columns.some((c) => c.items.length > 5);
  if (hasMore) {
    const overflow = columns.map((c) => {
      const extra = c.items.length - 5;
      if (extra > 0) {
        return ` +${extra} more`.padEnd(colWidth).slice(0, colWidth);
      }
      return " ".repeat(colWidth);
    });
    lines.push("|" + overflow.join("|") + "|");
  }

  lines.push("+" + columns.map(() => "-".repeat(colWidth)).join("+") + "+");

  return lines.join("\n");
}

/**
 * Generate HTML for the kanban board UI
 */
export function generateKanbanBoardHTML(config: {
  deploymentUrl: string | null;
  mode: string;
  theme: string;
  data: KanbanData;
  timestamp: number;
}): string {
  const { deploymentUrl, mode, theme, data } = config;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Convex Kanban Board</title>
  <style>
    ${getSharedStyles()}
    
    .kanban-container {
      display: flex;
      gap: 16px;
      overflow-x: auto;
      padding: 16px 0;
      min-height: 400px;
    }
    
    .kanban-column {
      flex: 0 0 280px;
      background: var(--bg-secondary);
      border-radius: 8px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      max-height: calc(100vh - 200px);
    }
    
    .column-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 2px solid var(--border-color);
    }
    
    .column-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }
    
    .column-title {
      font-weight: 600;
      font-size: 14px;
    }
    
    .column-count {
      margin-left: auto;
      background: var(--bg-primary);
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      color: var(--text-muted);
    }
    
    .column-items {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .kanban-card {
      background: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 12px;
      cursor: pointer;
      transition: transform 0.1s, box-shadow 0.1s;
    }
    
    .kanban-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    
    .card-title {
      font-weight: 500;
      font-size: 13px;
      margin-bottom: 4px;
      word-break: break-word;
    }
    
    .card-meta {
      font-size: 11px;
      color: var(--text-muted);
    }
    
    .card-badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 500;
      margin-top: 6px;
    }
    
    .badge-cron {
      background: #8b5cf6;
      color: white;
    }
    
    .badge-scheduled {
      background: #3b82f6;
      color: white;
    }
    
    .badge-agent {
      background: #22c55e;
      color: white;
    }
    
    .section {
      margin-bottom: 32px;
    }
    
    .section-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .section-subtitle {
      font-size: 13px;
      color: var(--text-muted);
      margin-bottom: 16px;
    }
    
    .empty-state {
      text-align: center;
      padding: 40px;
      color: var(--text-muted);
    }
    
    .empty-state a {
      color: var(--text-primary);
    }
    
    .mode-tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 24px;
    }
    
    .mode-tab {
      padding: 8px 16px;
      border-radius: 6px;
      border: 1px solid var(--border-color);
      background: var(--bg-secondary);
      cursor: pointer;
      font-size: 13px;
      transition: background 0.15s;
    }
    
    .mode-tab:hover {
      background: var(--bg-primary);
    }
    
    .mode-tab.active {
      background: var(--text-primary);
      color: var(--bg-primary);
      border-color: var(--text-primary);
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <h1>Kanban Board</h1>
      <div class="header-meta">
        <span class="deployment">${deploymentUrl || "Not connected"}</span>
        <button id="theme-toggle" class="theme-toggle" title="Toggle theme">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="5"/>
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
          </svg>
        </button>
      </div>
    </header>
    
    <div class="mode-tabs">
      <button class="mode-tab ${mode === "auto" || mode === "jobs" ? "active" : ""}" data-mode="jobs">
        Scheduled Jobs
      </button>
      <button class="mode-tab ${mode === "agents" ? "active" : ""}" data-mode="agents">
        AI Agents
      </button>
    </div>
    
    <div id="jobs-section" class="section" style="display: ${mode === "agents" ? "none" : "block"}">
      <div class="section-title">
        <span>Scheduled Functions & Cron Jobs</span>
      </div>
      <div class="section-subtitle">
        ${data.jobs.totalCount} total items
      </div>
      ${
        data.jobs.totalCount === 0
          ? `<div class="empty-state">No scheduled functions or cron jobs found.</div>`
          : `<div class="kanban-container">
              ${data.jobs.columns
                .map(
                  (col) => `
                <div class="kanban-column">
                  <div class="column-header">
                    <div class="column-dot" style="background: ${col.color}"></div>
                    <span class="column-title">${col.title}</span>
                    <span class="column-count">${col.items.length}</span>
                  </div>
                  <div class="column-items">
                    ${col.items
                      .map(
                        (item: any) => `
                      <div class="kanban-card">
                        <div class="card-title">${item.name || item.functionPath || "Unknown"}</div>
                        <div class="card-meta">
                          ${item.cronSpec ? `Cron: ${item.cronSpec}` : formatTime(item.scheduledTime)}
                        </div>
                        <span class="card-badge ${item.cronSpec ? "badge-cron" : "badge-scheduled"}">
                          ${item.cronSpec ? "CRON" : "SCHEDULED"}
                        </span>
                      </div>
                    `,
                      )
                      .join("")}
                  </div>
                </div>
              `,
                )
                .join("")}
            </div>`
      }
    </div>
    
    <div id="agents-section" class="section" style="display: ${mode === "jobs" ? "none" : "block"}">
      <div class="section-title">
        <span>AI Agent Threads</span>
      </div>
      ${
        !data.agents.componentInfo.installed
          ? `
        <div class="empty-state">
          <p>No agent component detected.</p>
          <p style="margin-top: 12px">
            The agents view requires the <strong>@convex-dev/agent</strong> component.<br>
            <a href="https://www.convex.dev/components/agent" target="_blank">Learn more</a>
          </p>
        </div>
      `
          : `
        <div class="section-subtitle">
          ${data.agents.totalCount} threads
          ${data.agents.componentInfo.isOfficialComponent ? "(using @convex-dev/agent)" : `(detected: ${data.agents.componentInfo.tables.join(", ")})`}
        </div>
        ${
          data.agents.totalCount === 0
            ? `<div class="empty-state">No agent threads found.</div>`
            : `<div class="kanban-container">
              ${data.agents.columns
                .map(
                  (col) => `
                <div class="kanban-column">
                  <div class="column-header">
                    <div class="column-dot" style="background: ${col.color}"></div>
                    <span class="column-title">${col.title}</span>
                    <span class="column-count">${col.items.length}</span>
                  </div>
                  <div class="column-items">
                    ${col.items
                      .map(
                        (thread) => `
                      <div class="kanban-card">
                        <div class="card-title">${thread.title}</div>
                        <div class="card-meta">
                          ${thread.messageCount} messages | ${formatTimeAgo(thread.lastMessageAt)}
                        </div>
                        <span class="card-badge badge-agent">${thread.status.toUpperCase()}</span>
                      </div>
                    `,
                      )
                      .join("")}
                  </div>
                </div>
              `,
                )
                .join("")}
            </div>`
        }
      `
      }
    </div>
  </div>
  
  <script>
    ${getThemeToggleScript()}
    
    // Tab switching
    document.querySelectorAll('.mode-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const mode = tab.dataset.mode;
        document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        document.getElementById('jobs-section').style.display = mode === 'jobs' ? 'block' : 'none';
        document.getElementById('agents-section').style.display = mode === 'agents' ? 'block' : 'none';
      });
    });
  </script>
</body>
</html>`;
}

/**
 * Format timestamp for display
 */
function formatTime(timestamp: number | undefined): string {
  if (!timestamp) return "Unknown";
  const date = new Date(timestamp);
  return date.toLocaleString();
}

/**
 * Format timestamp as relative time
 */
function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
