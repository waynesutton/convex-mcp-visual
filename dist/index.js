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
import { join } from "path";
import { homedir } from "os";
import { createInterface } from "readline";
const CONFIG_FILE = join(homedir(), ".convex-mcp-visual.json");
// Package version from package.json
const VERSION = "1.0.10";
async function main() {
    const { values } = parseArgs({
        options: {
            stdio: { type: "boolean", default: false },
            http: { type: "boolean", default: false },
            port: { type: "string", default: "3001" },
            test: { type: "boolean", default: false },
            setup: { type: "boolean", default: false },
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
  --stdio       Run in stdio mode (default if no mode specified)
  --http        Run in HTTP mode
  --port <num>  Port for HTTP mode (default: 3001)
  --test        Run connection test and exit
  --setup       Interactive setup wizard for deploy key
  -v, --version Show version number
  -h, --help    Show this help message

Examples:
  convex-mcp-visual --stdio              # For Claude Code/Desktop
  convex-mcp-visual --http --port 3001   # For team deployments
  convex-mcp-visual --test               # Test Convex connection
  convex-mcp-visual --setup              # Setup deploy key

Environment Variables:
  CONVEX_URL         Override deployment URL
  CONVEX_DEPLOY_KEY  Deploy key for authentication
  MCP_TIMEOUT        Server startup timeout (ms, default: 10000)
`);
        process.exit(0);
    }
    if (values.setup) {
        await runSetupWizard();
        return;
    }
    if (values.test) {
        await runConnectionTest();
        return;
    }
    const server = await createServer();
    if (values.http) {
        const port = parseInt(values.port || "3001", 10);
        await server.startHttp(port);
        console.error(`Convex MCP Visual server running on http://localhost:${port}/mcp`);
    }
    else {
        // Default to stdio mode
        await server.startStdio();
        console.error("Convex MCP Visual server running in stdio mode");
    }
}
/**
 * Interactive setup wizard for deploy key configuration
 */
async function runSetupWizard() {
    console.log("\nConvex MCP Visual Setup\n");
    console.log("This wizard will help you configure your Convex deploy key.\n");
    // Check existing config
    let existingConfig = {};
    if (existsSync(CONFIG_FILE)) {
        try {
            existingConfig = JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
            console.log(`Found existing config at ${CONFIG_FILE}`);
            if (existingConfig.deploymentUrl) {
                console.log(`  Current deployment: ${existingConfig.deploymentUrl}\n`);
            }
        }
        catch {
            // Ignore parse errors
        }
    }
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    const question = (prompt) => {
        return new Promise((resolve) => {
            rl.question(prompt, resolve);
        });
    };
    console.log("Steps to get your deploy key:");
    console.log("1. Go to https://dashboard.convex.dev");
    console.log("2. Select your project");
    console.log("3. Go to Settings > Deploy Keys");
    console.log('4. Click "Generate Deploy Key"');
    console.log("5. Copy the full key (format: prod:deployment-name|key...)\n");
    // Ask if user wants to open the dashboard
    const openDashboard = await question("Open Convex dashboard in browser? (y/n): ");
    if (openDashboard.toLowerCase() === "y") {
        const { exec } = await import("child_process");
        const platform = process.platform;
        const url = "https://dashboard.convex.dev";
        if (platform === "darwin") {
            exec(`open "${url}"`);
        }
        else if (platform === "win32") {
            exec(`start "" "${url}"`);
        }
        else {
            exec(`xdg-open "${url}"`);
        }
        console.log("\nOpened dashboard in browser.\n");
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
    }
    else {
        adminKey = trimmedKey;
        console.log("\nWarning: Deploy key format not recognized. Expected format: prod:name|key");
        console.log("Saving key as-is, but you may need to set CONVEX_URL separately.\n");
    }
    // Save config
    const config = {
        deploymentUrl: deploymentUrl || existingConfig.deploymentUrl || "",
        adminKey,
        savedAt: new Date().toISOString(),
    };
    try {
        writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
        console.log(`\nConfig saved to ${CONFIG_FILE}`);
        if (deploymentUrl) {
            console.log(`  Deployment: ${deploymentUrl}`);
        }
        console.log("  Admin key: ***" + adminKey.slice(-8));
        // Test the connection
        console.log("\nTesting connection...");
        process.env.CONVEX_DEPLOY_KEY = trimmedKey;
        if (deploymentUrl) {
            process.env.CONVEX_URL = deploymentUrl;
        }
        const { ConvexClient } = await import("./convex-client.js");
        const client = new ConvexClient();
        const result = await client.testConnection();
        if (result.success) {
            console.log("[OK] Connection successful!");
            console.log(`  Tables found: ${result.tableCount}`);
            console.log("\nSetup complete. You can now use convex-mcp-visual.");
        }
        else {
            console.log("[WARN] Connection test failed:", result.error);
            console.log("Config saved, but you may need to verify your deploy key.");
        }
    }
    catch (error) {
        console.error("Failed to save config:", error instanceof Error ? error.message : String(error));
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
                console.log(`  Tables: ${result.tables.slice(0, 5).join(", ")}${result.tables.length > 5 ? "..." : ""}`);
            }
            console.log(`  Admin access: ${client.hasAdminAccess() ? "Yes" : "No (limited functionality)"}`);
        }
        else {
            console.log("[FAIL] Connection failed");
            console.log(`  Error: ${result.error}`);
            console.log("\nTry running: convex-mcp-visual --setup");
            process.exit(1);
        }
    }
    catch (error) {
        console.log("[FAIL] Connection failed");
        console.log(`  Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    }
}
main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map