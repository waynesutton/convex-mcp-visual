#!/usr/bin/env node
/**
 * Convex MCP Visual Server
 *
 * An MCP server that provides interactive UI components for exploring Convex databases.
 * Supports stdio (default) and HTTP transports.
 */

import { createServer } from "./server.js";
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

async function main() {
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
    },
    allowPositionals: false,
  });

  if (values.version) {
    console.log(`convex-mcp-visual v${VERSION}`);
    process.exit(0);
  }

  if (values.help) {
    console.log(`
Convex MCP Visual Server v${VERSION}

Usage:
  convex-mcp-visual [options]

Options:
  --stdio              Run in stdio mode (default if no mode specified)
  --http               Run in HTTP mode
  --port <num>         Port for HTTP mode (default: 3001)
  --deployment <name>  Connect to specific deployment (e.g., happy-animal-123)
  --test               Run connection test and exit
  --setup              Interactive setup wizard for deploy key
  --config             Show all detected config sources
  -v, --version        Show version number
  -h, --help           Show this help message

Examples:
  convex-mcp-visual --stdio                           # For Claude Code/Desktop
  convex-mcp-visual --deployment happy-animal-123     # Connect to specific deployment
  convex-mcp-visual --http --port 3001                # For team deployments
  convex-mcp-visual --test                            # Test Convex connection
  convex-mcp-visual --setup                           # Setup deploy key
  convex-mcp-visual --config                          # Debug config sources

Environment Variables:
  CONVEX_URL         Override deployment URL
  CONVEX_DEPLOY_KEY  Deploy key for authentication
  MCP_TIMEOUT        Server startup timeout (ms, default: 10000)

Docs: https://docs.convex.dev/cli/deploy-key-types
`);
    process.exit(0);
  }

  if (values.config) {
    await showConfigSources();
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
    console.log(`  Deployment: ${detectedProject.name}`);
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

  // Check existing config file
  let existingConfig: { deploymentUrl?: string; adminKey?: string } = {};
  if (existsSync(CONFIG_FILE)) {
    try {
      existingConfig = JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
      console.log(`Found existing config at ${CONFIG_FILE}`);
      if (existingConfig.deploymentUrl) {
        console.log(`  Current deployment: ${existingConfig.deploymentUrl}\n`);
      }
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

  if (detectedProject) {
    console.log("Steps to get your deploy key:");
    console.log(
      `1. Open dashboard and select project: ${detectedProject.name}`,
    );
    console.log("2. Go to Settings > Deploy Keys");
    console.log('3. Click "Generate Deploy Key"');
    console.log("4. Copy the full key (format: prod:deployment-name|key...)\n");
  } else {
    console.log("Steps to get your deploy key:");
    console.log("1. Go to https://dashboard.convex.dev");
    console.log("2. Select your project");
    console.log("3. Go to Settings > Deploy Keys");
    console.log('4. Click "Generate Deploy Key"');
    console.log("5. Copy the full key (format: prod:deployment-name|key...)\n");
  }

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

    if (detectedProject) {
      console.log(
        `\nOpened dashboard. Select project "${detectedProject.name}" then go to Settings > Deploy Keys\n`,
      );
    } else {
      console.log("\nOpened dashboard in browser.\n");
    }
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
      console.log(`\nUsing detected deployment: ${detectedProject.name}`);
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

  // Save config
  const config = {
    deploymentUrl: finalDeploymentUrl,
    adminKey,
    savedAt: new Date().toISOString(),
  };

  try {
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    console.log(`\nConfig saved to ${CONFIG_FILE}`);

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

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
