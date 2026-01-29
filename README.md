# Convex MCP Visual

Visual MCP (Model Context Protocol) tools for exploring Convex databases. Opens interactive browser UIs alongside terminal output.

**Features:**
- **Graph View** - Visual schema diagram with draggable nodes and relationship lines
- **List View** - Table-based schema explorer with document browser
- **Dashboard** - Real-time metrics and charts
- **Dark Mode** - VS Code-style dark theme (toggle in header)
- **Dual Output** - Terminal markdown + browser UI simultaneously

Works with Claude Code and any MCP-compatible client.

---

## Table of Contents

- [How MCP Works](#how-mcp-works)
- [Installation](#installation)
- [Setup](#setup)
- [Usage](#usage)
- [Switching Convex Backends](#switching-convex-backends)
- [Tools Reference](#tools-reference)
- [Architecture](#architecture)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Testing](#testing)
- [Stopping the MCP Server](#stopping-the-mcp-server)
- [Uninstalling](#uninstalling)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Security](#security)
- [License](#license)

---

## How MCP Works

MCP (Model Context Protocol) is a standard protocol that allows AI assistants like Claude to communicate with external tools and services. Here's how this MCP server works:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Claude Code / MCP Client                        │
│                                                                         │
│  User: "Show me my Convex schema"                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ MCP Protocol (JSON-RPC over stdio)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       Convex MCP Visual Server                          │
│                                                                         │
│  • Receives tool requests via MCP protocol                              │
│  • Authenticates with Convex using local credentials                    │
│  • Queries Convex Cloud for schema/document data                        │
│  • Returns structured responses to Claude                               │
│  • Optionally opens browser UI on localhost:3456                        │
└─────────────────────────────────────────────────────────────────────────┘
            │                                           │
            │ HTTP Client                               │ Local HTTP Server
            ▼                                           ▼
┌───────────────────────┐                    ┌───────────────────────────┐
│    Convex Cloud       │                    │   Browser UI              │
│                       │                    │   (localhost:3456)        │
│  Your deployment at   │                    │                           │
│  xyz.convex.cloud     │                    │  Interactive graph view,  │
└───────────────────────┘                    │  tables, dashboards       │
                                             └───────────────────────────┘
```

**Key Concepts:**

1. **stdio Mode**: The MCP server runs as a subprocess of Claude Code, communicating via stdin/stdout using JSON-RPC messages.

2. **Tools**: The server exposes two tools (`schema_browser`, `dashboard_view`) that Claude can invoke on your behalf.

3. **Dual Output**: Each tool returns both structured text for Claude AND opens a visual browser interface for you.

4. **Authentication**: The server reads your Convex credentials from `~/.convex/` (created by `npx convex login`) or from environment variables.

---

## Installation

### Option 1: npx (Recommended)

```bash
# Add to Claude Code directly
claude mcp add convex-visual -- npx convex-mcp-visual --stdio
```

### Option 2: Global Install

```bash
npm install -g convex-mcp-visual
claude mcp add convex-visual -- convex-mcp-visual --stdio
```

### Option 3: Local Development

```bash
git clone https://github.com/your-username/convex-mcp-visual.git
cd convex-mcp-visual
npm install
npm run build
claude mcp add convex-visual -- node /absolute/path/to/convex-mcp-visual/dist/index.js --stdio
```

**Important**: Always use absolute paths when adding local MCP servers.

---

## Setup

### 1. Convex Authentication

You need valid Convex credentials. The server checks these locations in order:

| Priority | Source | How to Set |
|----------|--------|------------|
| 1 | `CONVEX_DEPLOY_KEY` env var | `export CONVEX_DEPLOY_KEY=prod:xxx` |
| 2 | `CONVEX_URL` env var | `export CONVEX_URL=https://xxx.convex.cloud` |
| 3 | `~/.convex/config.json` | Run `npx convex login` |

**Recommended for local development:**

```bash
# Login to Convex (creates ~/.convex/config.json)
npx convex login

# Navigate to your Convex project directory
cd your-convex-project

# Deploy your project (optional, updates local config)
npx convex dev
```

**For CI/CD or servers:**

```bash
export CONVEX_DEPLOY_KEY=prod:your-deploy-key-here
```

### 2. Verify Installation

```bash
# Check MCP server is registered
claude mcp list

# You should see: convex-visual
```

### 3. Test Connection

```bash
# If installed globally or via npx
npx convex-mcp-visual --test

# If local development
npm test
```

---

## Usage

In Claude Code, simply ask:

| Request | What Happens |
|---------|--------------|
| "Show me my Convex schema" | Opens Schema Browser (graph view) |
| "What tables do I have?" | Shows tables in terminal + browser |
| "Show me the users table" | Opens Schema Browser pre-selected to users |
| "Create a dashboard for my data" | Opens Realtime Dashboard |

### Example Conversation

```
You: Show me my Convex schema

Claude: I'll open the Schema Browser for your Convex deployment.

[Opens browser with interactive graph view]

Here's your schema:
- users (245 documents)
- posts (1,234 documents)
- comments (892 documents)

The users table references posts, and comments reference both users and posts.
```

---

## Switching Convex Backends

You may need to switch between different Convex deployments (dev, staging, production).

### Method 1: Re-login to Different Project

```bash
# Logout from current deployment
npx convex logout

# Login to a different project
cd /path/to/other-convex-project
npx convex login
npx convex dev
```

### Method 2: Set Environment Variable

```bash
# Temporarily use a different deployment
export CONVEX_URL=https://different-project.convex.cloud

# Or with a deploy key
export CONVEX_DEPLOY_KEY=prod:your-other-key
```

### Method 3: Multiple MCP Registrations

You can register multiple instances for different backends:

```bash
# Production
claude mcp add convex-prod -- npx convex-mcp-visual --stdio
# Set CONVEX_DEPLOY_KEY in Claude Code settings for this instance

# Development
claude mcp add convex-dev -- npx convex-mcp-visual --stdio
```

### Viewing Current Deployment

In Claude Code, ask: "What Convex deployment am I connected to?"

The Schema Browser header also displays the current deployment URL.

---

## Tools Reference

### schema_browser

Interactive schema explorer with two view modes.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `table` | string | none | Pre-select a specific table |
| `showInferred` | boolean | true | Show inferred schemas from documents |
| `pageSize` | number | 50 | Documents per page in list view |

**Views:**

- **Graph View**: Visual diagram showing tables as nodes with relationship lines
  - Drag nodes to rearrange
  - Pan/zoom to navigate
  - Click nodes to select
  - Toggle dark mode in header

- **List View**: Traditional table list with schema details
  - Paginated document browser
  - Field types and optionality
  - Search across tables

### dashboard_view

Real-time dashboard with metrics and charts.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `metrics` | array | [] | Metric definitions |
| `charts` | array | [] | Chart configurations |
| `refreshInterval` | number | 5 | Refresh interval in seconds |

**Metric Aggregations:** count, sum, avg, min, max

**Chart Types:** line, bar, pie

---

## Architecture

```
convex-mcp-visual/
├── src/
│   ├── index.ts           # CLI entry (--stdio, --http, --test)
│   ├── server.ts          # MCP server + tool handlers
│   ├── convex-client.ts   # Convex authentication + queries
│   ├── ui-server.ts       # Local HTTP server (port 3456)
│   ├── tools/
│   │   ├── schema-browser.ts
│   │   └── dashboard.ts
│   └── resources/
│       ├── schema-browser.ts
│       └── dashboard.ts
├── apps/
│   ├── schema-browser/    # Graph + list view UI
│   └── realtime-dashboard/
└── dist/                  # Compiled output (published to npm)
```

---

## Keyboard Shortcuts

### Schema Browser

| Key | Action |
|-----|--------|
| `G` | Toggle Graph/List view |
| `B` | Toggle sidebar panel |
| `R` | Refresh data |
| `↑/↓` | Navigate tables |
| `←/→` | Change page (List view) |
| `/` | Focus search |
| `+/-` | Zoom in/out (Graph view) |

### Dashboard

| Key | Action |
|-----|--------|
| `R` | Refresh data |

---

## Testing

### Test Connection

```bash
# Test that Convex credentials work
npm test
# or
npx convex-mcp-visual --test
```

**Expected output:**
```
Testing Convex connection...
✓ Connected to: https://your-deployment.convex.cloud
✓ Found 5 tables: users, posts, comments, likes, sessions
```

### Test MCP Protocol

```bash
# Run in HTTP mode for debugging
npm run start:http
# Server runs on http://localhost:3001

# Test with curl
curl -X POST http://localhost:3001 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

### Debug in Claude Code

If tools aren't working:
1. Check `claude mcp list` shows the server
2. Try `claude mcp logs convex-visual` for error messages
3. Verify Convex credentials with `npm test`

---

## Stopping the MCP Server

MCP servers are managed by Claude Code and run as subprocesses.

### Stop Temporarily

The server stops automatically when Claude Code closes.

### Disable the Server

```bash
# Remove from Claude Code
claude mcp remove convex-visual
```

### Kill Running Instances

If the server gets stuck:

```bash
# Find the process
ps aux | grep convex-mcp-visual

# Kill it
kill <pid>

# Or kill all node MCP servers
pkill -f "convex-mcp-visual"
```

---

## Uninstalling

### Remove from Claude Code

```bash
claude mcp remove convex-visual
```

### Remove Global Package

```bash
npm uninstall -g convex-mcp-visual
```

### Remove Local Installation

```bash
rm -rf /path/to/convex-mcp-visual
```

### Logout from Convex (Optional)

```bash
npx convex logout
```

This removes `~/.convex/config.json` but doesn't affect your Convex deployment.

---

## Troubleshooting

### Server not showing in Claude Code

```bash
# 1. Verify the MCP server is registered
claude mcp list

# 2. If not listed, re-add with absolute path
claude mcp add convex-visual -- node /full/path/to/dist/index.js --stdio

# 3. Restart Claude Code
```

### "No Convex deployment configured"

```bash
# Login to Convex
npx convex login

# Or set environment variable
export CONVEX_URL=https://your-deployment.convex.cloud
```

### Browser doesn't open

- Check if port 3456 is available: `lsof -i :3456`
- The terminal output always works even if browser fails
- Try opening manually: `http://localhost:3456`

### Authentication errors

```bash
# Clear credentials and re-login
npx convex logout
npx convex login
```

### Windows users

Use cmd wrapper in Claude Code settings:

```json
{
  "command": "cmd",
  "args": ["/c", "npx", "convex-mcp-visual", "--stdio"]
}
```

### "Connection closed" errors

This usually means the server crashed. Check:
1. Node.js version (requires 18+)
2. Run `npm test` to verify credentials
3. Check for error output in Claude Code logs

### Canvas appears blurry

The graph view scales for retina displays. If blurry, try:
- Refreshing the browser
- Zooming to 100% with the zoom controls

---

## Development

### Build Commands

```bash
npm install          # Install dependencies
npm run build        # Build server + UI apps
npm run build:server # Build only TypeScript server
npm run build:apps   # Build only UI apps (Vite)
npm run dev          # Watch mode for server
npm run clean        # Remove dist/ folder
```

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `CONVEX_URL` | Override deployment URL | From ~/.convex/ |
| `CONVEX_DEPLOY_KEY` | Deploy key for auth | None |
| `MCP_TIMEOUT` | Server startup timeout | 10000ms |

---

## Security

### What Data Does This Server Access?

- **Schema information**: Table names, field types, document counts
- **Sample documents**: First 50 documents per table (for display)
- **No write access**: This tool only reads data, never modifies

### Credentials Storage

- Credentials are read from `~/.convex/` or environment variables
- Credentials are never logged, stored, or transmitted elsewhere
- The local web server only binds to `localhost` (127.0.0.1)

### Network Security

- All Convex API calls use HTTPS
- The local UI server (port 3456) only accepts connections from localhost
- No data is sent to third parties

### Production Deploy Keys

If using `CONVEX_DEPLOY_KEY`:
- Use read-only deploy keys when possible
- Never commit deploy keys to version control
- Use environment variables or secrets management

---

## How It Differs from Official Convex MCP

| Feature | Official `npx convex mcp` | This Project |
|---------|---------------------------|--------------|
| Output | Text/JSON for AI | Visual browser UI |
| Purpose | AI coding assistant | Human exploration |
| Schema view | Text tables | Interactive graph diagram |
| Documents | JSON output | Paginated table browser |
| Dashboard | None | Real-time charts |
| Dark mode | No | Yes (VS Code style) |

**Use the official Convex MCP** for AI-assisted coding tasks.
**Use this project** when you want to visually explore your database.

---

## License

MIT
# convex-mcp-visual
