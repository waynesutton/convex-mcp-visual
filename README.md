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
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Testing](#testing)
- [Stopping the MCP Server](#stopping-the-mcp-server)
- [Uninstalling](#uninstalling)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Security](#security)
- [Why This Project Exists](#why-this-project-exists)
- [Current Limitations](#current-limitations)
- [Wishlist & Future Plans](#wishlist--future-plans)
- [Claude.ai Web Integration](#claudeai-web-integration-future)
- [Contributing](#contributing)
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

The easiest way - no local installation needed. Works with any MCP client.

**npm package:** [npmjs.com/package/convex-mcp-visual](https://www.npmjs.com/package/convex-mcp-visual)

#### Claude Code (CLI)

```bash
claude mcp add convex-visual -- npx convex-mcp-visual --stdio
```

#### Claude Desktop

Add to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "convex-visual": {
      "command": "npx",
      "args": ["convex-mcp-visual", "--stdio"]
    }
  }
}
```

#### Cursor / VS Code with MCP Extension

Add to your MCP settings:

```json
{
  "mcp.servers": {
    "convex-visual": {
      "command": "npx",
      "args": ["convex-mcp-visual", "--stdio"]
    }
  }
}
```

#### Any MCP Client

The server uses standard MCP protocol over stdio:

```bash
npx convex-mcp-visual --stdio
```

### Option 2: Global Install

Install once, use anywhere:

```bash
# Install globally
npm install -g convex-mcp-visual

# Then configure your MCP client to run:
convex-mcp-visual --stdio
```

**Claude Code:**
```bash
claude mcp add convex-visual -- convex-mcp-visual --stdio
```

**Claude Desktop / Other clients:**
```json
{
  "mcpServers": {
    "convex-visual": {
      "command": "convex-mcp-visual",
      "args": ["--stdio"]
    }
  }
}
```

### Option 3: From GitHub (For Development)

Clone and build locally if you want to modify the code:

```bash
# 1. Clone the repository
git clone https://github.com/waynesutton/convex-mcp-visual.git
cd convex-mcp-visual

# 2. Install dependencies
npm install

# 3. Build the project
npm run build

# 4. Configure your MCP client to run:
node /absolute/path/to/convex-mcp-visual/dist/index.js --stdio
```

**Important**: When using local installation, you must use the **absolute path** to `dist/index.js`.

**Example paths:**
- macOS: `/Users/yourname/projects/convex-mcp-visual/dist/index.js`
- Linux: `/home/yourname/projects/convex-mcp-visual/dist/index.js`
- Windows: `C:\Users\yourname\projects\convex-mcp-visual\dist\index.js`

### Verify Installation

**Claude Code:**
```bash
claude mcp list
# You should see: convex-visual
```

**Claude Desktop:**
Restart the app, then check the MCP icon in the input area.

**Other clients:**
Check your client's MCP server status panel.

### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│  claude mcp add convex-visual -- npx convex-mcp-visual --stdio  │
│                                                                 │
│  This tells Claude Code:                                        │
│  1. Register a server named "convex-visual"                     │
│  2. When tools are needed, run: npx convex-mcp-visual           │
│  3. Communicate via --stdio (stdin/stdout JSON-RPC)             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  When you say "Show me my Convex schema":                       │
│                                                                 │
│  1. Claude Code starts the MCP server process                   │
│  2. Sends JSON-RPC request: { method: "tools/call", ... }       │
│  3. Server queries your Convex deployment                       │
│  4. Server opens browser UI on localhost:3456                   │
│  5. Server returns markdown to Claude                           │
│  6. You see both: terminal output + browser visualization       │
└─────────────────────────────────────────────────────────────────┘
```

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

## Tech Stack

### Server

| Technology | Purpose |
|------------|---------|
| **Node.js 18+** | Runtime environment |
| **TypeScript** | Type-safe JavaScript |
| **@modelcontextprotocol/sdk** | Official MCP protocol implementation |
| **Convex SDK** | Convex database client |

### UI Applications

| Technology | Purpose |
|------------|---------|
| **Vanilla TypeScript** | No framework dependencies (React, Vue, etc.) |
| **HTML5 Canvas** | Graph rendering with pan/zoom/drag |
| **CSS3 Variables** | Theming (light/dark mode) |
| **Vite** | Fast bundling and hot reload |

### Why These Choices?

- **No UI framework**: Keeps bundle small (~62KB for schema browser), loads instantly
- **Canvas for graphs**: Smooth 60fps rendering, handles 100+ nodes easily
- **CSS Variables**: Runtime theme switching without JavaScript
- **TypeScript everywhere**: Catches errors at build time, better IDE support
- **Vanilla over frameworks**: Fewer dependencies = fewer security vulnerabilities

### Dependencies

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "convex": "^1.17.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "vite": "^6.4.1"
  }
}
```

Only **2 runtime dependencies** - minimal attack surface, fast installs.

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

## Why This Project Exists

### The Problem

When working with Convex databases, developers often need to:
- Quickly visualize table relationships and schema structure
- Browse documents without writing queries
- Understand how data flows between tables
- Get a high-level overview before diving into code

The official `npx convex mcp` is optimized for AI-assisted coding—it returns structured text that Claude can parse and use to help you write code. But humans often want to *see* their data visually.

### The Solution

This project bridges that gap by providing:
- **Visual schema diagrams** that show relationships at a glance
- **Interactive exploration** with drag, pan, and zoom
- **Real-time dashboards** for monitoring data
- **Dual output** so Claude still gets structured data while you get visuals

---

## Current Limitations

### What's Not Yet Supported

| Feature | Status | Notes |
|---------|--------|-------|
| Write operations | Not planned | Read-only by design for safety |
| Custom queries | Not implemented | Would require query builder UI |
| Real-time subscriptions | Partial | Dashboard refreshes on interval, not live |
| Multiple deployments | Manual | Must switch via env vars or re-login |
| Schema editing | Not planned | Use Convex dashboard for schema changes |
| Index visualization | Partial | Shows index names, not full definitions |
| Function introspection | Not implemented | Would show Convex functions |

### Known Issues

- **Large schemas**: Performance may degrade with 50+ tables
- **Complex relationships**: Only detects `Id<"table">` patterns, not custom references
- **Browser popup blockers**: May need to allow popups for localhost:3456

---

## Wishlist & Future Plans

### Short-Term (Next Release)

- [ ] **Export schema as image** - PNG/SVG export of graph view
- [ ] **Query builder** - Visual interface to build simple queries
- [ ] **Improved relationship detection** - Detect array references, nested IDs
- [ ] **Table statistics** - Show min/max/avg for numeric fields
- [ ] **Search within documents** - Full-text search across all tables

### Medium-Term

- [ ] **Schema diff view** - Compare schema between environments
- [ ] **Data sampling** - Statistical overview of field values
- [ ] **Relationship path finder** - Show how two tables connect
- [ ] **Custom themes** - User-defined color schemes
- [ ] **Bookmarks** - Save frequently accessed tables/views

### Long-Term Vision

- [ ] **Claude.ai web integration** (see below)
- [ ] **Collaborative viewing** - Share schema view with team
- [ ] **Schema history** - Track schema changes over time
- [ ] **AI-powered insights** - Claude analyzes schema and suggests optimizations

---

## Claude.ai Web Integration (Future)

### Current State

This MCP server currently works with:
- **Claude Code (CLI)** - Full support via stdio
- **Claude Desktop** - Full support via MCP configuration
- **Any MCP client** - Standard MCP protocol

It does **not** yet work with:
- **Claude.ai (web)** - Browser-based Claude at claude.ai

### Why It Doesn't Work on Claude.ai Web (Yet)

MCP servers run as local processes that communicate via stdio or HTTP. The Claude.ai web interface runs in a browser sandbox and cannot:
1. Spawn local processes
2. Access localhost servers
3. Read local files (~/.convex/)

### How It Could Work in the Future

Several approaches are being explored in the MCP ecosystem:

#### Option 1: MCP Gateway Service
```
Claude.ai (web) → MCP Gateway (cloud) → Your local MCP server
                      ↑
              Authenticated tunnel
```

A cloud gateway that securely proxies MCP requests to your local server. This would require:
- Secure authentication (OAuth, API keys)
- Tunnel software running locally
- Trust model for cloud proxy

#### Option 2: Browser Extension
```
Claude.ai (web) → Browser Extension → Local MCP server
```

A Chrome/Firefox extension that:
- Intercepts MCP tool requests from Claude.ai
- Routes them to localhost MCP servers
- Returns results to the web page

#### Option 3: Convex-Hosted MCP
```
Claude.ai (web) → Convex Cloud MCP endpoint
                      ↓
              Your Convex deployment
```

Convex could host MCP endpoints directly, eliminating the need for local servers. This would require:
- Convex adding MCP protocol support
- Authentication via Convex dashboard
- No local installation needed

#### Option 4: Claude.ai Native MCP Support

Anthropic could add native MCP support to Claude.ai with:
- Secure server registration in account settings
- OAuth-based authentication to your servers
- Sandboxed execution environment

### What You Can Do Now

1. **Use Claude Code CLI** - Full MCP support today
2. **Use Claude Desktop** - Configure MCP in settings
3. **Watch for updates** - MCP ecosystem is evolving rapidly
4. **Star the repo** - Show interest in web integration

### Preparing for Web Support

When web integration becomes available, this project is designed to be ready:

- **Stateless design**: Each request is independent
- **HTTP mode**: Already supports HTTP transport (`--http` flag)
- **Standard MCP**: Uses official MCP SDK
- **No local file requirements**: Can work with `CONVEX_DEPLOY_KEY` env var

---

## Contributing

### Areas Where Help Is Needed

1. **Testing on Windows** - Verify cmd wrapper works correctly
2. **Performance optimization** - Large schema handling
3. **Accessibility** - Keyboard navigation, screen reader support
4. **Documentation** - More examples, video tutorials
5. **UI polish** - Animations, transitions, edge cases

### Development Setup

```bash
git clone https://github.com/waynesutton/convex-mcp-visual.git
cd convex-mcp-visual
npm install
npm run dev  # Watch mode
```

### Submitting Changes

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run build` to verify
5. Submit a pull request

---

## License

MIT
