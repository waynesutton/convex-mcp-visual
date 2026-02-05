#!/usr/bin/env node
/**
 * Convex MCP Visual Server
 *
 * An MCP server that provides interactive UI components for exploring Convex databases.
 * Supports three distribution modes:
 * 1. MCP Server (stdio/HTTP) - For Claude Code, Claude Desktop, Cursor
 * 2. Direct CLI - schema, dashboard, diagram subcommands
 * 3. Claude Code Plugin - Via marketplace distribution
 */

import { createServer } from "./server.js";
import type { ConvexClient } from "./convex-client.js";
import { parseArgs } from "util";
import { writeFileSync, existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import { createInterface } from "readline";
import { fileURLToPath } from "url";

const CONFIG_FILE = join(homedir(), ".convex-mcp-visual.json");

// Read version from package.json dynamically
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = join(__dirname, "..", "package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
const VERSION = packageJson.version as string;

// Subcommand type for direct CLI usage
type Subcommand =
  | "schema"
  | "dashboard"
  | "diagram"
  | "subway"
  | "table-heatmap"
  | "schema-drift"
  | "write-conflicts"
  | "kanban";

async function main() {
  // Check for subcommands first (schema, dashboard, diagram, subway, heatmap)
  const args = process.argv.slice(2);
  const subcommand = args[0] as Subcommand | undefined;

  // Handle direct CLI subcommands
  if (
    subcommand === "schema" ||
    subcommand === "dashboard" ||
    subcommand === "diagram" ||
    subcommand === "subway" ||
    subcommand === "table-heatmap" ||
    subcommand === "schema-drift" ||
    subcommand === "write-conflicts" ||
    subcommand === "kanban"
  ) {
    await handleDirectCLI(subcommand, args.slice(1));
    return;
  }

  const { values } = parseArgs({
    options: {
      stdio: { type: "boolean", default: false },
      http: { type: "boolean", default: false },
      port: { type: "string", default: "3001" },
      test: { type: "boolean", default: false },
      setup: { type: "boolean", default: false },
      config: { type: "boolean", default: false },
      deployment: { type: "string" },
      version: { type: "boolean", short: "v", default: false },
      help: { type: "boolean", short: "h", default: false },
      // CLI install options for MCP clients
      install: { type: "boolean", default: false },
      "install-cursor": { type: "boolean", default: false },
      "install-opencode": { type: "boolean", default: false },
      "install-claude": { type: "boolean", default: false },
      "install-codex": { type: "boolean", default: false },
      uninstall: { type: "boolean", default: false },
      "uninstall-cursor": { type: "boolean", default: false },
      "uninstall-opencode": { type: "boolean", default: false },
      "uninstall-claude": { type: "boolean", default: false },
      "uninstall-codex": { type: "boolean", default: false },
    },
    allowPositionals: false,
  });

  if (values.version) {
    console.log(`convex-mcp-visual v${VERSION}`);
    process.exit(0);
  }

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  if (values.config) {
    await showConfigSources();
    return;
  }

  // Handle install/uninstall commands for MCP clients
  if (
    values.install ||
    values["install-cursor"] ||
    values["install-opencode"] ||
    values["install-claude"] ||
    values["install-codex"]
  ) {
    await handleInstall(values);
    return;
  }

  if (
    values.uninstall ||
    values["uninstall-cursor"] ||
    values["uninstall-opencode"] ||
    values["uninstall-claude"] ||
    values["uninstall-codex"]
  ) {
    await handleUninstall(values);
    return;
  }

  if (values.setup) {
    await runSetupWizard();
    return;
  }

  // Handle --deployment flag to connect to a specific deployment
  if (values.deployment) {
    const deploymentName = values.deployment;
    // Set the URL so the client uses this deployment
    process.env.CONVEX_URL = `https://${deploymentName}.convex.cloud`;
    console.error(`Connecting to deployment: ${deploymentName}`);
  }

  if (values.test) {
    await runConnectionTest();
    return;
  }

  const server = await createServer();

  if (values.http) {
    const port = parseInt(values.port || "3001", 10);
    await server.startHttp(port);
    console.error(
      `Convex MCP Visual server running on http://localhost:${port}/mcp`,
    );
  } else {
    // Default to stdio mode
    await server.startStdio();
    console.error("Convex MCP Visual server running in stdio mode");
  }
}

/**
 * Print help message with all usage modes
 */
function printHelp(): void {
  console.log(`
Convex MCP Visual v${VERSION}

Visual schema browser, dashboard, and diagrams for Convex databases.
Works as MCP server, standalone CLI, or Claude Code plugin.

USAGE:
  convex-mcp-visual [command] [options]

COMMANDS (Direct CLI):
  schema              Show database schema (opens browser + terminal output)
  dashboard           Show metrics dashboard (opens browser + terminal output)
  diagram             Generate ER diagram (opens browser + terminal output)
  subway              Generate codebase subway map (opens browser + terminal output)
  table-heatmap       Show writes per minute heatmap (opens browser + terminal output)
  schema-drift         Compare declared vs inferred schemas (opens browser + terminal output)
  write-conflicts     Summarize write conflicts from logs (opens browser + terminal output)
  kanban              Kanban board view of scheduled jobs and AI agents

MCP CLIENT INSTALL (adds MCP config automatically):
  --install           Install to all detected MCP clients
  --install-cursor    Install to Cursor only
  --install-opencode  Install to OpenCode only
  --install-claude    Install to Claude Desktop only
  --install-codex     Install to Codex CLI only
  --uninstall         Remove from all MCP clients
  --uninstall-cursor  Remove from Cursor only
  --uninstall-opencode Remove from OpenCode only
  --uninstall-claude  Remove from Claude Desktop only
  --uninstall-codex   Remove from Codex CLI only

MCP SERVER OPTIONS:
  --stdio             Run as MCP server in stdio mode (default)
  --http              Run as MCP server in HTTP mode
  --port <num>        Port for HTTP mode (default: 3001)

CONFIGURATION:
  --deployment <name> Connect to specific deployment (e.g., happy-animal-123)
  --test              Test Convex connection and exit
  --setup             Interactive setup wizard for deploy key
  --config            Show all detected config sources

OTHER:
  -v, --version       Show version number
  -h, --help          Show this help message

INSTALL EXAMPLES:
  npx convex-mcp-visual --install             # Install to all MCP clients
  npx convex-mcp-visual --install-cursor      # Install to Cursor only
  npx convex-mcp-visual --install-opencode    # Install to OpenCode only
  npx convex-mcp-visual --install-codex       # Install to Codex CLI only
  npx convex-mcp-visual --setup               # Then configure deploy key

DIRECT CLI EXAMPLES:
  convex-mcp-visual schema                    # Browse schema in graph view (default)
  convex-mcp-visual schema --graph            # Explicitly open graph view
  convex-mcp-visual schema --list             # Browse schema in list view
  convex-mcp-visual schema --table users      # Focus on users table
  convex-mcp-visual schema --json             # JSON output only (no browser)
  convex-mcp-visual dashboard                 # Open metrics dashboard
  convex-mcp-visual diagram                   # Generate Mermaid ER diagram
  convex-mcp-visual diagram --theme dracula   # Use dracula theme
  convex-mcp-visual subway                    # Generate codebase subway map
  convex-mcp-visual subway --root ./apps      # Focus on a subfolder
  convex-mcp-visual subway --max-nodes 80     # Limit map size
  convex-mcp-visual table-heatmap             # Heatmap of recent writes
  convex-mcp-visual schema-drift              # Compare declared vs inferred schemas
  convex-mcp-visual write-conflicts --log-file logs.txt
  convex-mcp-visual kanban                    # Auto-detect jobs and agents
  convex-mcp-visual kanban --jobs             # Show scheduled functions/crons only
  convex-mcp-visual kanban --agents           # Show AI agent threads only

MCP SERVER EXAMPLES:
  convex-mcp-visual --stdio                   # For Claude Code/Desktop/Cursor
  convex-mcp-visual --http --port 3001        # For team deployments

CLAUDE CODE PLUGIN:
  See deployplugin.md for marketplace distribution instructions.
  Install via: /plugin install convex-visual@convex-tools

ENVIRONMENT VARIABLES:
  CONVEX_URL          Override deployment URL
  CONVEX_DEPLOY_KEY   Deploy key for authentication

Docs: https://github.com/waynesutton/convex-mcp-visual
`);
}

/**
 * Handle direct CLI subcommands (schema, dashboard, diagram, subway, heatmap)
 * These run the tools directly without MCP protocol
 */
async function handleDirectCLI(
  subcommand: Subcommand,
  args: string[],
): Promise<void> {
  // Parse subcommand-specific options
  const options: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--json") {
      options.json = true;
    } else if (arg === "--no-browser") {
      options.noBrowser = true;
    } else if (arg === "--table" && args[i + 1]) {
      options.table = args[++i];
    } else if (arg === "--theme" && args[i + 1]) {
      options.theme = args[++i];
    } else if (arg === "--ascii") {
      options.ascii = true;
    } else if (arg === "--graph") {
      options.graph = true;
    } else if (arg === "--list") {
      options.list = true;
    } else if (arg === "--root" && args[i + 1]) {
      options.root = args[++i];
    } else if (arg === "--max-depth" && args[i + 1]) {
      options.maxDepth = args[++i];
    } else if (arg === "--max-nodes" && args[i + 1]) {
      options.maxNodes = args[++i];
    } else if (arg === "--window-minutes" && args[i + 1]) {
      options.windowMinutes = args[++i];
    } else if (arg === "--max-docs" && args[i + 1]) {
      options.maxDocs = args[++i];
    } else if (arg === "--max-tables" && args[i + 1]) {
      options.maxTables = args[++i];
    } else if (arg === "--log-file" && args[i + 1]) {
      options.logFile = args[++i];
    } else if (arg === "--since-minutes" && args[i + 1]) {
      options.sinceMinutes = args[++i];
    } else if (arg === "--max-lines" && args[i + 1]) {
      options.maxLines = args[++i];
    } else if (arg === "--jobs") {
      options.jobs = true;
    } else if (arg === "--agents") {
      options.agents = true;
    } else if (arg === "--deployment" && args[i + 1]) {
      const deploymentName = args[++i];
      process.env.CONVEX_URL = `https://${deploymentName}.convex.cloud`;
    } else if (arg === "--help" || arg === "-h") {
      printSubcommandHelp(subcommand);
      return;
    }
  }

  // Import tool handlers
  let client: ConvexClient | null = null;
  if (subcommand !== "subway" && subcommand !== "write-conflicts") {
    const { ConvexClient } = await import("./convex-client.js");
    client = new ConvexClient();

    // Check connection
    if (!client.isConnected()) {
      console.error("Error: No Convex deployment configured.\n");
      console.error("To connect:");
      console.error("  1. Run: npx convex-mcp-visual --setup");
      console.error("  2. Or set CONVEX_DEPLOY_KEY environment variable\n");
      process.exit(1);
    }

    console.log(`Connected to: ${client.getDeploymentUrl()}\n`);
  }

  // Execute the appropriate tool
  switch (subcommand) {
    case "schema": {
      const { handleSchemaBrowser } = await import("./tools/schema-browser.js");
      const result = await handleSchemaBrowser(client!, {
        table: options.table,
        showInferred: true,
        pageSize: 50,
        viewMode: options.list ? "list" : "graph",
      });
      if (options.json) {
        // JSON output mode - extract structured data
        console.log(
          JSON.stringify({ output: result.content[0].text }, null, 2),
        );
      } else {
        console.log(result.content[0].text);
      }
      break;
    }

    case "dashboard": {
      const { handleDashboard } = await import("./tools/dashboard.js");
      const result = await handleDashboard(client!, {
        metrics: [],
        charts: [],
        refreshInterval: 5,
      });
      if (options.json) {
        console.log(
          JSON.stringify({ output: result.content[0].text }, null, 2),
        );
      } else {
        console.log(result.content[0].text);
      }
      break;
    }

    case "diagram": {
      const { handleSchemaDiagram } = await import("./tools/schema-diagram.js");
      const result = await handleSchemaDiagram(client!, {
        theme: options.theme || "github-dark",
        ascii: options.ascii || false,
      });
      if (options.json) {
        console.log(
          JSON.stringify({ output: result.content[0].text }, null, 2),
        );
      } else {
        console.log(result.content[0].text);
      }
      break;
    }

    case "subway": {
      const { handleCodebaseSubwayMap } =
        await import("./tools/codebase-subway-map.js");
      const result = await handleCodebaseSubwayMap({
        root: options.root,
        maxDepth: options.maxDepth,
        maxNodes: options.maxNodes,
        theme: options.theme,
        ascii: options.ascii,
        noBrowser: options.noBrowser,
      });
      if (options.json) {
        console.log(
          JSON.stringify({ output: result.content[0].text }, null, 2),
        );
      } else {
        console.log(result.content[0].text);
      }
      break;
    }

    case "table-heatmap": {
      const { handleTableHeatmap } = await import("./tools/table-heatmap.js");
      const result = await handleTableHeatmap(client!, {
        windowMinutes: options.windowMinutes,
        maxDocsPerTable: options.maxDocs,
        maxTables: options.maxTables,
        theme: options.theme,
        noBrowser: options.noBrowser,
      });
      if (options.json) {
        console.log(
          JSON.stringify({ output: result.content[0].text }, null, 2),
        );
      } else {
        console.log(result.content[0].text);
      }
      break;
    }

    case "schema-drift": {
      const { handleSchemaDrift } = await import("./tools/schema-drift.js");
      const result = await handleSchemaDrift(client!, {
        maxTables: options.maxTables,
        theme: options.theme,
        noBrowser: options.noBrowser,
      });
      if (options.json) {
        console.log(
          JSON.stringify({ output: result.content[0].text }, null, 2),
        );
      } else {
        console.log(result.content[0].text);
      }
      break;
    }

    case "write-conflicts": {
      const { handleWriteConflictReport } =
        await import("./tools/write-conflict-report.js");
      const result = await handleWriteConflictReport({
        logFile: options.logFile,
        sinceMinutes: options.sinceMinutes,
        maxLines: options.maxLines,
        theme: options.theme,
        noBrowser: options.noBrowser,
      });
      if (options.json) {
        console.log(
          JSON.stringify({ output: result.content[0].text }, null, 2),
        );
      } else {
        console.log(result.content[0].text);
      }
      break;
    }

    case "kanban": {
      const { handleKanbanBoard } = await import("./tools/kanban-board.js");
      // Determine mode from flags
      let mode: "jobs" | "agents" | "auto" = "auto";
      if (options.jobs) mode = "jobs";
      if (options.agents) mode = "agents";

      const result = await handleKanbanBoard(client!, {
        mode,
        theme: options.theme,
        noBrowser: options.noBrowser,
      });
      if (options.json) {
        console.log(
          JSON.stringify({ output: result.content[0].text }, null, 2),
        );
      } else {
        console.log(result.content[0].text);
      }
      break;
    }
  }
}

/**
 * Print help for a specific subcommand
 */
function printSubcommandHelp(subcommand: Subcommand): void {
  switch (subcommand) {
    case "schema":
      console.log(`
convex-mcp-visual schema

Browse your Convex database schema with interactive UI.
Opens in graph view by default (visual diagram with table relationships).

OPTIONS:
  --graph             Open in graph view (default)
  --list              Open in list view (table-based)
  --table <name>      Pre-select a specific table
  --json              Output JSON only (no browser)
  --no-browser        Terminal output only
  --deployment <name> Connect to specific deployment
  -h, --help          Show this help

EXAMPLES:
  convex-mcp-visual schema
  convex-mcp-visual schema --graph
  convex-mcp-visual schema --list
  convex-mcp-visual schema --table users
  convex-mcp-visual schema --json
`);
      break;

    case "dashboard":
      console.log(`
convex-mcp-visual dashboard

View real-time metrics dashboard for your Convex database.

OPTIONS:
  --json              Output JSON only (no browser)
  --no-browser        Terminal output only
  --deployment <name> Connect to specific deployment
  -h, --help          Show this help

EXAMPLES:
  convex-mcp-visual dashboard
  convex-mcp-visual dashboard --json
`);
      break;

    case "diagram":
      console.log(`
convex-mcp-visual diagram

Generate Mermaid ER diagram of your Convex schema.

OPTIONS:
  --theme <name>      Color theme: github-dark, github-light, dracula, nord, tokyo-night
  --ascii             Use ASCII characters for terminal output
  --json              Output JSON only (no browser)
  --no-browser        Terminal output only
  --deployment <name> Connect to specific deployment
  -h, --help          Show this help

EXAMPLES:
  convex-mcp-visual diagram
  convex-mcp-visual diagram --theme dracula
  convex-mcp-visual diagram --ascii
`);
      break;

    case "subway":
      console.log(`
convex-mcp-visual subway

Generate a subway map style diagram for your codebase.
Focuses on files and local imports to build the map.

OPTIONS:
  --root <path>       Root folder to scan (default: current directory)
  --max-depth <num>   Max folder depth to scan (default: 6)
  --max-nodes <num>   Max nodes to render (default: 120)
  --theme <name>      Color theme: github-dark, github-light, dracula, nord, tokyo-night
  --ascii             Use ASCII characters for terminal output
  --json              Output JSON only (no browser)
  --no-browser        Terminal output only
  -h, --help          Show this help

EXAMPLES:
  convex-mcp-visual subway
  convex-mcp-visual subway --root ./apps
  convex-mcp-visual subway --max-nodes 80
`);
      break;

    case "table-heatmap":
      console.log(`
convex-mcp-visual table-heatmap

Show a heatmap of recent writes per table.
Uses document creation times to estimate writes per minute.

OPTIONS:
  --window-minutes <num>  Lookback window in minutes (default: 1)
  --max-docs <num>        Max documents to scan per table (default: 1500)
  --max-tables <num>      Max tables to scan (default: 60)
  --theme <name>          Color theme: github-dark, github-light, dracula, nord, tokyo-night
  --json                  Output JSON only (no browser)
  --no-browser            Terminal output only
  -h, --help              Show this help

EXAMPLES:
  convex-mcp-visual table-heatmap
  convex-mcp-visual table-heatmap --window-minutes 5
  convex-mcp-visual table-heatmap --max-tables 30
`);
      break;

    case "schema-drift":
      console.log(`
convex-mcp-visual schema-drift

Compare declared and inferred schema fields.
Highlights missing fields and type mismatches.

OPTIONS:
  --max-tables <num>   Max tables to scan (default: 80)
  --theme <name>       Color theme: github-dark, github-light, dracula, nord, tokyo-night
  --json               Output JSON only (no browser)
  --no-browser         Terminal output only
  -h, --help           Show this help

EXAMPLES:
  convex-mcp-visual schema-drift
  convex-mcp-visual schema-drift --max-tables 40
`);
      break;

    case "write-conflicts":
      console.log(`
convex-mcp-visual write-conflicts

Summarize write conflicts from Convex logs.
Requires a log file exported from \`npx convex logs\`.

OPTIONS:
  --log-file <path>     Path to log file (required)
  --since-minutes <n>   Window size for rate calculations (default: 60)
  --max-lines <num>     Max log lines to scan (default: 5000)
  --theme <name>        Color theme: github-dark, github-light, dracula, nord, tokyo-night
  --json                Output JSON only (no browser)
  --no-browser          Terminal output only
  -h, --help            Show this help

EXAMPLES:
  npx convex logs --limit 1000 > logs.txt
  convex-mcp-visual write-conflicts --log-file logs.txt
`);
      break;

    case "kanban":
      console.log(`
convex-mcp-visual kanban

Display a kanban board view of Convex scheduled functions, cron jobs, and AI agent threads.

MODE OPTIONS:
  --jobs                Show only scheduled functions and cron jobs
  --agents              Show only AI agent threads (requires @convex-dev/agent component)
  (default)             Auto-detect and show both if available

DISPLAY OPTIONS:
  --theme <name>        Color theme: github-dark, github-light
  --json                Output JSON only (no browser)
  --no-browser          Terminal output only
  --deployment <name>   Connect to specific deployment
  -h, --help            Show this help

NOTES:
  The agents view requires the @convex-dev/agent component to be installed.
  Other Convex agent patterns may also be detected if they use similar table structures.
  See: https://www.convex.dev/components/agent

EXAMPLES:
  convex-mcp-visual kanban                    # Auto-detect jobs and agents
  convex-mcp-visual kanban --jobs             # Scheduled functions and crons only
  convex-mcp-visual kanban --agents           # AI agent threads only
  convex-mcp-visual kanban --theme github-light
`);
      break;
  }
}

/**
 * Show all detected config sources for debugging
 */
async function showConfigSources() {
  console.log("\nConvex MCP Visual Config Sources\n");

  const { ConvexClient } = await import("./convex-client.js");
  const sources = ConvexClient.getConfigSources();

  if (sources.length === 0) {
    console.log("No config sources found.\n");
    console.log("Run: npx convex-mcp-visual --setup");
    return;
  }

  console.log("Detected sources (first match wins):\n");

  for (const source of sources) {
    const status = source.hasKey ? "[HAS KEY]" : "[URL ONLY]";
    console.log(`  ${status} ${source.source}`);
    if (source.deployment) {
      console.log(`           ${source.deployment}`);
    }
    console.log(`           ${source.path}`);
    console.log();
  }

  // Show which source is currently being used
  const client = new ConvexClient();
  console.log("Currently using:");
  console.log(
    `  URL: ${client.getDeploymentUrl() || "none"} (from ${client.getUrlSource()})`,
  );
  console.log(
    `  Key: ${client.hasAdminAccess() ? "***" : "none"} (from ${client.getKeySource()})`,
  );

  if (sources.length > 1) {
    console.log("\nTo switch deployments, clear higher priority sources:");
    console.log("  rm -f ~/.convex-mcp-visual.json");
    console.log("  unset CONVEX_DEPLOY_KEY");
    console.log("  npx convex-mcp-visual --setup");
  }
}

/**
 * Detect deployment from current project directory
 * Reads .env.local or convex.json to find CONVEX_URL
 */
function detectProjectDeployment(): { name: string; url: string } | null {
  // Check .env.local first
  const envLocalPath = join(process.cwd(), ".env.local");
  if (existsSync(envLocalPath)) {
    try {
      const content = readFileSync(envLocalPath, "utf-8");
      const match = content.match(/CONVEX_URL=["']?([^"'\s]+)["']?/);
      if (match) {
        const url = match[1];
        // Extract deployment name from URL: https://deployment-name.convex.cloud
        const nameMatch = url.match(/https:\/\/([^.]+)\.convex\.cloud/);
        if (nameMatch) {
          return { name: nameMatch[1], url };
        }
      }
    } catch {
      // Ignore read errors
    }
  }

  // Check .convex/deployment.json
  const deploymentJsonPath = join(process.cwd(), ".convex", "deployment.json");
  if (existsSync(deploymentJsonPath)) {
    try {
      const config = JSON.parse(readFileSync(deploymentJsonPath, "utf-8"));
      if (config.url) {
        const nameMatch = config.url.match(/https:\/\/([^.]+)\.convex\.cloud/);
        if (nameMatch) {
          return { name: nameMatch[1], url: config.url };
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  return null;
}

/**
 * Interactive setup wizard for deploy key configuration
 * Detects project from current directory and opens correct dashboard URL
 */
async function runSetupWizard() {
  console.log("\nConvex MCP Visual Setup\n");

  // Detect project from current directory
  const detectedProject = detectProjectDeployment();

  if (detectedProject) {
    console.log("[DETECTED] Found Convex project in current directory");
    console.log(`  URL: ${detectedProject.url}\n`);
  }

  // Check for existing config sources that will override setup
  const { ConvexClient } = await import("./convex-client.js");
  const sources = ConvexClient.getConfigSources();

  const envKeySource = sources.find(
    (s) => s.source === "CONVEX_DEPLOY_KEY env",
  );
  if (envKeySource) {
    console.log("[WARNING] CONVEX_DEPLOY_KEY is set in your environment.");
    console.log(`  Deployment: ${envKeySource.deployment || "unknown"}`);
    console.log("\n  This will override the setup wizard config.");
    console.log("  To use setup wizard instead, run:");
    console.log("    unset CONVEX_DEPLOY_KEY\n");
  }

  // Check existing .env.local in current directory
  const currentEnvLocal = join(process.cwd(), ".env.local");
  if (existsSync(currentEnvLocal)) {
    try {
      const content = readFileSync(currentEnvLocal, "utf-8");
      const match = content.match(/CONVEX_DEPLOY_KEY=["']?([^"'\n]+)["']?/);
      if (match) {
        console.log(`Found existing deploy key in ${currentEnvLocal}`);
        console.log("  (will be updated)\n");
      }
    } catch {
      // Ignore parse errors
    }
  }

  // Also check legacy global config file
  let existingConfig: { deploymentUrl?: string; adminKey?: string } = {};
  if (existsSync(CONFIG_FILE)) {
    try {
      existingConfig = JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
      console.log(`Found legacy config at ${CONFIG_FILE}`);
      if (existingConfig.deploymentUrl) {
        console.log(`  Deployment: ${existingConfig.deploymentUrl}`);
      }
      console.log("  Note: New setup saves to .env.local (per project)\n");
    } catch {
      // Ignore parse errors
    }
  }

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(prompt, resolve);
    });
  };

  // Build the dashboard URL
  // Note: Dashboard URLs use project slugs, not deployment names
  // We open the main dashboard and guide the user to their project
  const dashboardUrl = "https://dashboard.convex.dev";

  console.log("Steps to get your deploy key:");
  console.log("1. Go to dashboard.convex.dev");
  console.log("2. Select your Convex project");
  console.log("3. Click Settings (gear icon)");
  console.log("4. Click Deploy Keys in the sidebar");
  console.log('5. Click "Generate Deploy Key" or copy an existing one');
  console.log("6. Paste the full key below (format: prod:name|key...)\n");

  // Ask if user wants to open the dashboard
  const openDashboard = await question(
    "Open Convex dashboard in browser? (y/n): ",
  );
  if (openDashboard.toLowerCase() === "y") {
    const { exec } = await import("child_process");
    const platform = process.platform;

    if (platform === "darwin") {
      exec(`open "${dashboardUrl}"`);
    } else if (platform === "win32") {
      exec(`start "" "${dashboardUrl}"`);
    } else {
      exec(`xdg-open "${dashboardUrl}"`);
    }

    console.log(
      "\nOpened dashboard. Select your project, then go to Settings > Deploy Keys\n",
    );
  }

  // Prompt for deploy key
  const deployKey = await question("Paste your deploy key: ");
  rl.close();

  if (!deployKey || deployKey.trim().length === 0) {
    console.log("\nNo deploy key provided. Setup cancelled.");
    process.exit(1);
  }

  // Parse the deploy key
  const trimmedKey = deployKey.trim();
  let deploymentUrl = "";
  let adminKey = "";

  if (trimmedKey.includes("|")) {
    const pipeIndex = trimmedKey.indexOf("|");
    const prefix = trimmedKey.substring(0, pipeIndex);
    adminKey = trimmedKey.substring(pipeIndex + 1);

    if (prefix.includes(":")) {
      const colonIndex = prefix.indexOf(":");
      const deploymentName = prefix.substring(colonIndex + 1);
      if (deploymentName) {
        deploymentUrl = `https://${deploymentName}.convex.cloud`;
      }
    }
  } else {
    adminKey = trimmedKey;
    // Use detected project URL if available
    if (detectedProject) {
      deploymentUrl = detectedProject.url;
      console.log(`\nUsing detected deployment URL: ${detectedProject.url}`);
    } else {
      console.log(
        "\nWarning: Deploy key format not recognized. Expected format: prod:name|key",
      );
      console.log(
        "Saving key as-is, but you may need to set CONVEX_URL separately.\n",
      );
    }
  }

  // Use detected project as fallback for deployment URL
  const finalDeploymentUrl =
    deploymentUrl ||
    (detectedProject ? detectedProject.url : null) ||
    existingConfig.deploymentUrl ||
    "";

  // Save to .env.local in current directory (per-project config)
  const envLocalPath = join(process.cwd(), ".env.local");
  const deployKeyLine = `CONVEX_DEPLOY_KEY="${trimmedKey}"`;

  try {
    // Check if .env.local exists and already has CONVEX_DEPLOY_KEY
    let envContent = "";
    if (existsSync(envLocalPath)) {
      envContent = readFileSync(envLocalPath, "utf-8");
      if (envContent.includes("CONVEX_DEPLOY_KEY=")) {
        // Replace existing key
        envContent = envContent.replace(
          /CONVEX_DEPLOY_KEY=["']?[^"'\n]+["']?/,
          deployKeyLine,
        );
        console.log(`\nUpdated CONVEX_DEPLOY_KEY in ${envLocalPath}`);
      } else {
        // Append new key
        envContent = envContent.trimEnd() + "\n" + deployKeyLine + "\n";
        console.log(`\nAdded CONVEX_DEPLOY_KEY to ${envLocalPath}`);
      }
    } else {
      // Create new .env.local
      envContent = deployKeyLine + "\n";
      console.log(`\nCreated ${envLocalPath}`);
    }

    writeFileSync(envLocalPath, envContent);

    if (finalDeploymentUrl) {
      console.log(`  Deployment: ${finalDeploymentUrl}`);
    }
    console.log("  Admin key: ***" + adminKey.slice(-8));

    // Test the connection
    console.log("\nTesting connection...");
    process.env.CONVEX_DEPLOY_KEY = trimmedKey;
    if (finalDeploymentUrl) {
      process.env.CONVEX_URL = finalDeploymentUrl;
    }

    const { ConvexClient } = await import("./convex-client.js");
    const client = new ConvexClient();
    const result = await client.testConnection();

    if (result.success) {
      console.log("[OK] Connection successful!");
      console.log(`  Tables found: ${result.tableCount}`);
      console.log("\nSetup complete. You can now use convex-mcp-visual.");
    } else {
      console.log("[WARN] Connection test failed:", result.error);
      console.log("Config saved, but you may need to verify your deploy key.");
    }
  } catch (error) {
    console.error(
      "Failed to save config:",
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
}

/**
 * Test connection to Convex deployment
 */
async function runConnectionTest() {
  console.log("Testing Convex connection...\n");

  const { ConvexClient } = await import("./convex-client.js");
  const client = new ConvexClient();

  try {
    const result = await client.testConnection();

    if (result.success) {
      console.log("[OK] Connection successful!");
      console.log(`  Deployment: ${result.deploymentUrl}`);
      console.log(`  Tables found: ${result.tableCount}`);
      if (result.tables && result.tables.length > 0) {
        console.log(
          `  Tables: ${result.tables.slice(0, 5).join(", ")}${result.tables.length > 5 ? "..." : ""}`,
        );
      }
      console.log(
        `  Admin access: ${client.hasAdminAccess() ? "Yes" : "No (limited functionality)"}`,
      );
      console.log(`  Config source: ${client.getUrlSource()}`);
    } else {
      console.log("[FAIL] Connection failed");
      console.log(`  Error: ${result.error}`);
      console.log("\nTry running: convex-mcp-visual --setup");
      process.exit(1);
    }
  } catch (error) {
    console.log("[FAIL] Connection failed");
    console.log(
      `  Error: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}

// MCP client config file paths
const MCP_CLIENT_PATHS = {
  cursor: {
    mac: join(homedir(), ".cursor", "mcp.json"),
    linux: join(homedir(), ".cursor", "mcp.json"),
    win: join(
      process.env.APPDATA || join(homedir(), "AppData", "Roaming"),
      "Cursor",
      "mcp.json",
    ),
  },
  opencode: {
    mac: join(homedir(), ".config", "opencode", "opencode.json"),
    linux: join(homedir(), ".config", "opencode", "opencode.json"),
    win: join(
      process.env.APPDATA || join(homedir(), "AppData", "Roaming"),
      "opencode",
      "opencode.json",
    ),
  },
  claude: {
    mac: join(
      homedir(),
      "Library",
      "Application Support",
      "Claude",
      "claude_desktop_config.json",
    ),
    linux: join(homedir(), ".config", "claude", "claude_desktop_config.json"),
    win: join(
      process.env.APPDATA || join(homedir(), "AppData", "Roaming"),
      "Claude",
      "claude_desktop_config.json",
    ),
  },
  codex: {
    mac: join(homedir(), ".codex", "config.toml"),
    linux: join(homedir(), ".codex", "config.toml"),
    win: join(homedir(), ".codex", "config.toml"),
  },
};

// Get the config path for the current platform
function getConfigPath(
  client: "cursor" | "opencode" | "claude" | "codex",
): string {
  const platform = process.platform;
  const paths = MCP_CLIENT_PATHS[client];
  if (platform === "darwin") return paths.mac;
  if (platform === "win32") return paths.win;
  return paths.linux;
}

// MCP server config for convex-visual (Claude Desktop / Cursor format)
const MCP_SERVER_CONFIG_STANDARD = {
  command: "npx",
  args: ["convex-mcp-visual", "--stdio"],
};

// MCP server config for OpenCode (different schema)
const MCP_SERVER_CONFIG_OPENCODE = {
  type: "local",
  command: ["npx", "-y", "convex-mcp-visual", "--stdio"],
  enabled: true,
};

// MCP server config for Codex CLI (TOML format)
const MCP_SERVER_CONFIG_CODEX_TOML = `[mcp_servers.convex-visual]
command = "npx"
args = ["-y", "convex-mcp-visual", "--stdio"]
`;

/**
 * Simple TOML parser/writer for Codex config
 * Only handles the mcp_servers section we need
 */
function readCodexConfig(configPath: string): string {
  if (existsSync(configPath)) {
    return readFileSync(configPath, "utf-8");
  }
  return "";
}

function writeCodexConfig(configPath: string, content: string): void {
  writeFileSync(configPath, content);
}

function addConvexVisualToCodexConfig(existingContent: string): string {
  // Check if convex-visual already exists
  if (existingContent.includes("[mcp_servers.convex-visual]")) {
    // Already configured, return as-is
    return existingContent;
  }

  // Append our config section
  const trimmedContent = existingContent.trimEnd();
  if (trimmedContent.length > 0) {
    return trimmedContent + "\n\n" + MCP_SERVER_CONFIG_CODEX_TOML;
  }
  return MCP_SERVER_CONFIG_CODEX_TOML;
}

function removeConvexVisualFromCodexConfig(existingContent: string): string {
  // Remove the [mcp_servers.convex-visual] section and its contents
  // Match the section header and all following lines until next section or end
  const lines = existingContent.split("\n");
  const result: string[] = [];
  let inConvexVisualSection = false;

  for (const line of lines) {
    if (line.trim() === "[mcp_servers.convex-visual]") {
      inConvexVisualSection = true;
      continue;
    }
    // If we hit a new section header, we're done skipping
    if (inConvexVisualSection && line.trim().startsWith("[")) {
      inConvexVisualSection = false;
    }
    if (!inConvexVisualSection) {
      result.push(line);
    }
  }

  // Clean up extra blank lines
  return (
    result
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim() + "\n"
  );
}

/**
 * Handle MCP client install commands
 */
async function handleInstall(values: Record<string, unknown>): Promise<void> {
  const targets: Array<"cursor" | "opencode" | "claude" | "codex"> = [];

  if (values.install) {
    // Install to all detected clients
    targets.push("cursor", "opencode", "claude", "codex");
  } else {
    if (values["install-cursor"]) targets.push("cursor");
    if (values["install-opencode"]) targets.push("opencode");
    if (values["install-claude"]) targets.push("claude");
    if (values["install-codex"]) targets.push("codex");
  }

  console.log("\nConvex MCP Visual Installer\n");

  for (const client of targets) {
    await installToClient(client);
  }

  console.log("\nNext steps:");
  console.log(
    "  1. Run: npx convex-mcp-visual --setup  (configure deploy key)",
  );
  console.log("  2. Restart your MCP client to load the new config");
  console.log("  3. Test: npx convex-mcp-visual --test\n");
}

/**
 * Install MCP server config to a specific client
 */
async function installToClient(
  client: "cursor" | "opencode" | "claude" | "codex",
): Promise<void> {
  const configPath = getConfigPath(client);
  const clientName =
    client === "cursor"
      ? "Cursor"
      : client === "opencode"
        ? "OpenCode"
        : client === "codex"
          ? "Codex CLI"
          : "Claude Desktop";

  console.log(`Installing to ${clientName}...`);
  console.log(`  Config: ${configPath}`);

  try {
    // Ensure parent directory exists
    const parentDir = dirname(configPath);
    const { mkdirSync } = await import("fs");
    if (!existsSync(parentDir)) {
      mkdirSync(parentDir, { recursive: true });
    }

    // Handle Codex separately (uses TOML format)
    if (client === "codex") {
      const existingContent = readCodexConfig(configPath);
      const updatedContent = addConvexVisualToCodexConfig(existingContent);
      writeCodexConfig(configPath, updatedContent);
      console.log(`  [OK] Installed convex-visual to ${clientName}\n`);
      return;
    }

    // Read existing config or create new one (JSON clients)
    let config: Record<string, unknown> = {};
    if (existsSync(configPath)) {
      try {
        const content = readFileSync(configPath, "utf-8");
        config = JSON.parse(content);
      } catch {
        console.log(`  Warning: Could not parse existing config, creating new`);
      }
    }

    // Add MCP server config based on client type
    if (client === "opencode") {
      // OpenCode uses "mcp" key with different schema (type, command array, enabled)
      if (!config.mcp) {
        config.mcp = {};
      }
      (config.mcp as Record<string, unknown>)["convex-visual"] =
        MCP_SERVER_CONFIG_OPENCODE;
    } else {
      // Cursor and Claude Desktop use "mcpServers" key with standard schema
      if (!config.mcpServers) {
        config.mcpServers = {};
      }
      (config.mcpServers as Record<string, unknown>)["convex-visual"] =
        MCP_SERVER_CONFIG_STANDARD;
    }

    // Write updated config
    writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
    console.log(`  [OK] Installed convex-visual to ${clientName}\n`);
  } catch (error) {
    console.log(
      `  [SKIP] Could not install to ${clientName}: ${error instanceof Error ? error.message : String(error)}\n`,
    );
  }
}

/**
 * Handle MCP client uninstall commands
 */
async function handleUninstall(values: Record<string, unknown>): Promise<void> {
  const targets: Array<"cursor" | "opencode" | "claude" | "codex"> = [];

  if (values.uninstall) {
    targets.push("cursor", "opencode", "claude", "codex");
  } else {
    if (values["uninstall-cursor"]) targets.push("cursor");
    if (values["uninstall-opencode"]) targets.push("opencode");
    if (values["uninstall-claude"]) targets.push("claude");
    if (values["uninstall-codex"]) targets.push("codex");
  }

  console.log("\nConvex MCP Visual Uninstaller\n");

  for (const client of targets) {
    await uninstallFromClient(client);
  }

  console.log("\nRestart your MCP client to apply changes.\n");
}

/**
 * Remove MCP server config from a specific client
 */
async function uninstallFromClient(
  client: "cursor" | "opencode" | "claude" | "codex",
): Promise<void> {
  const configPath = getConfigPath(client);
  const clientName =
    client === "cursor"
      ? "Cursor"
      : client === "opencode"
        ? "OpenCode"
        : client === "codex"
          ? "Codex CLI"
          : "Claude Desktop";

  console.log(`Removing from ${clientName}...`);
  console.log(`  Config: ${configPath}`);

  try {
    if (!existsSync(configPath)) {
      console.log(`  [SKIP] Config file not found\n`);
      return;
    }

    // Handle Codex separately (uses TOML format)
    if (client === "codex") {
      const existingContent = readCodexConfig(configPath);
      if (existingContent.includes("[mcp_servers.convex-visual]")) {
        const updatedContent =
          removeConvexVisualFromCodexConfig(existingContent);
        writeCodexConfig(configPath, updatedContent);
        console.log(`  [OK] Removed convex-visual from ${clientName}\n`);
      } else {
        console.log(`  [SKIP] convex-visual not found in config\n`);
      }
      return;
    }

    const content = readFileSync(configPath, "utf-8");
    const config = JSON.parse(content) as Record<string, unknown>;

    // Remove MCP server config based on client type
    let removed = false;
    if (client === "opencode") {
      if (
        config.mcp &&
        typeof config.mcp === "object" &&
        "convex-visual" in (config.mcp as Record<string, unknown>)
      ) {
        delete (config.mcp as Record<string, unknown>)["convex-visual"];
        removed = true;
      }
    } else {
      if (
        config.mcpServers &&
        typeof config.mcpServers === "object" &&
        "convex-visual" in (config.mcpServers as Record<string, unknown>)
      ) {
        delete (config.mcpServers as Record<string, unknown>)["convex-visual"];
        removed = true;
      }
    }

    if (removed) {
      writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
      console.log(`  [OK] Removed convex-visual from ${clientName}\n`);
    } else {
      console.log(`  [SKIP] convex-visual not found in config\n`);
    }
  } catch (error) {
    console.log(
      `  [SKIP] Could not uninstall from ${clientName}: ${error instanceof Error ? error.message : String(error)}\n`,
    );
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
