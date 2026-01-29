#!/usr/bin/env node
/**
 * Convex MCP Apps Server
 *
 * An MCP server that provides interactive UI components for exploring Convex databases.
 * Supports stdio (default) and HTTP transports.
 */

import { createServer } from './server.js';
import { parseArgs } from 'util';

async function main() {
  const { values } = parseArgs({
    options: {
      stdio: { type: 'boolean', default: false },
      http: { type: 'boolean', default: false },
      port: { type: 'string', default: '3001' },
      test: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: false,
  });

  if (values.help) {
    console.log(`
Convex MCP Apps Server

Usage:
  convex-mcp-apps [options]

Options:
  --stdio       Run in stdio mode (default if no mode specified)
  --http        Run in HTTP mode
  --port <num>  Port for HTTP mode (default: 3001)
  --test        Run connection test and exit
  -h, --help    Show this help message

Examples:
  convex-mcp-apps --stdio              # For Claude Code/Desktop
  convex-mcp-apps --http --port 3001   # For team deployments
  convex-mcp-apps --test               # Test Convex connection

Environment Variables:
  CONVEX_URL         Override deployment URL
  CONVEX_DEPLOY_KEY  Deploy key for authentication
  MCP_TIMEOUT        Server startup timeout (ms, default: 10000)
`);
    process.exit(0);
  }

  if (values.test) {
    await runConnectionTest();
    return;
  }

  const server = await createServer();

  if (values.http) {
    const port = parseInt(values.port || '3001', 10);
    await server.startHttp(port);
    console.error(`Convex MCP Apps server running on http://localhost:${port}/mcp`);
  } else {
    // Default to stdio mode
    await server.startStdio();
    console.error('Convex MCP Apps server running in stdio mode');
  }
}

async function runConnectionTest() {
  console.log('Testing Convex connection...\n');

  const { ConvexClient } = await import('./convex-client.js');
  const client = new ConvexClient();

  try {
    const result = await client.testConnection();

    if (result.success) {
      console.log('✓ Connection successful!');
      console.log(`  Deployment: ${result.deploymentUrl}`);
      console.log(`  Tables found: ${result.tableCount}`);
      if (result.tables && result.tables.length > 0) {
        console.log(`  Tables: ${result.tables.slice(0, 5).join(', ')}${result.tables.length > 5 ? '...' : ''}`);
      }
    } else {
      console.log('✗ Connection failed');
      console.log(`  Error: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.log('✗ Connection failed');
    console.log(`  Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
