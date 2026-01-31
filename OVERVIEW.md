# Convex MCP Visual - Project Overview

This document summarizes the project structure and how all the pieces fit together.

## What this project is

Convex MCP Visual brings interactive UI components for exploring and visualizing Convex data. Instead of text-only responses about your database, you get:

- **Schema Browser** - Click through tables, view schemas, inspect documents
- **Realtime Dashboard** - Live charts and metrics that update as your data changes
- **Schema Diagram** - Mermaid ER diagrams showing table relationships

## Distribution methods

This project supports three ways to use it:

| Method                 | Use case                            | Installation                        |
| ---------------------- | ----------------------------------- | ----------------------------------- |
| **npm package**        | Direct CLI usage from any terminal  | `npm install -g convex-mcp-visual`  |
| **MCP Server**         | Claude Code, Claude Desktop, Cursor | Configure in MCP settings           |
| **Claude Code Plugin** | Claude Code marketplace             | `/plugin install convex-visual@...` |

### 1. Direct CLI (any terminal)

Run tools directly without MCP protocol:

```bash
npx convex-mcp-visual schema          # Browse schema in browser
npx convex-mcp-visual dashboard       # Open metrics dashboard
npx convex-mcp-visual diagram         # Generate ER diagram
```

### 2. MCP Server (Claude/Cursor)

Start as MCP server for AI assistants:

```bash
npx convex-mcp-visual --stdio         # For Claude Code/Desktop
npx convex-mcp-visual --http          # For HTTP transport
```

### 3. Claude Code Plugin

Install from marketplace:

```shell
/plugin marketplace add waynesutton/convex-mcp-visual
/plugin install convex-visual@waynesutton-convex-mcp-visual
```

## Architecture

```
                    ┌─────────────────────────────────────┐
                    │           User Interface            │
                    │  CLI / Claude / Cursor / VS Code    │
                    └─────────────────────────────────────┘
                                     │
                                     ▼
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
         ▼                           ▼                           ▼
┌─────────────────┐     ┌─────────────────────┐     ┌─────────────────┐
│   Direct CLI    │     │     MCP Server      │     │  Claude Plugin  │
│  schema         │     │  stdio / http       │     │  marketplace    │
│  dashboard      │     │                     │     │                 │
│  diagram        │     │                     │     │                 │
└─────────────────┘     └─────────────────────┘     └─────────────────┘
         │                           │                           │
         └───────────────────────────┼───────────────────────────┘
                                     │
                                     ▼
                    ┌─────────────────────────────────────┐
                    │        Convex MCP Visual Core       │
                    │  - schema_browser tool              │
                    │  - dashboard_view tool              │
                    │  - schema_diagram tool              │
                    └─────────────────────────────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
           ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
           │   Terminal   │  │   Browser    │  │   Convex     │
           │   Output     │  │   UI Apps    │  │   Cloud      │
           │   (markdown) │  │   (port 3456)│  │   (API)      │
           └──────────────┘  └──────────────┘  └──────────────┘
```

## Key components

### CLI and MCP Server (`src/`)

The main entry point handles three modes:

- **Direct CLI**: `schema`, `dashboard`, `diagram` subcommands
- **MCP stdio**: `--stdio` flag for Claude/Cursor integration
- **MCP HTTP**: `--http` flag for team deployments

Tools exposed:

- `schema_browser` - Interactive schema explorer
- `dashboard_view` - Real-time metrics and charts
- `schema_diagram` - Mermaid ER diagrams

### Claude Code Plugin (`.claude-plugin/`)

Plugin distribution files:

- `plugin.json` - Plugin manifest with metadata
- `.mcp.json` - MCP server configuration
- `skills/` - Skills that help Claude use the tools

### Schema Browser (`apps/schema-browser/`)

Interactive table explorer:

- Left panel: table list
- Right panel: schema view (declared vs inferred)
- Bottom panel: document browser with pagination
- Query builder for custom queries

### Realtime Dashboard (`apps/realtime-dashboard/`)

Live data visualizations:

- Metric cards for single values
- Line/bar charts for time series
- Tables for detailed records
- Real-time updates via Convex subscriptions

## How the tools work

All three distribution methods use the same underlying tool handlers:

1. **Tool handler** fetches data from Convex using system queries
2. **Terminal output** returns markdown formatted results
3. **Browser UI** launches local server and opens interactive app
4. **Both outputs** happen simultaneously (terminal + browser)

## Authentication and security

**How credentials flow:**

```
┌─────────────────────────────────────────────────────────────────┐
│                       Your Machine                               │
│                                                                  │
│   ~/.convex/              MCP Server              UI Iframe      │
│   ┌─────────┐            ┌──────────┐           ┌──────────┐    │
│   │ Auth    │──reads────▶│ Queries  │◀─JSON-RPC─│ Renders  │    │
│   │ Token   │            │ Convex   │           │ Data     │    │
│   └─────────┘            └──────────┘           └──────────┘    │
│        │                       │                      │          │
│        │                       │ HTTPS                │          │
│        ▼                       ▼                      │          │
│   Created by            Convex Cloud             No direct      │
│   `npx convex           validates &              access to      │
│    login`               returns data             credentials    │
└─────────────────────────────────────────────────────────────────┘
```

**Key points:**

1. **Credentials stay local** - Your Convex auth token lives in `~/.convex/`, never sent to Claude
2. **MCP server authenticates** - Reads local credentials or uses `CONVEX_DEPLOY_KEY`
3. **Iframe is sandboxed** - No network access, no credentials, communicates only via postMessage
4. **Queries are read-only** - Run in Convex's sandbox, can't modify data
5. **Convex enforces access** - You only see what your account has permission to see

For CI/CD or team setups, use a deploy key from your Convex dashboard instead of personal credentials.

## File structure

```
convex-mcp-visual/
├── README.md                 # Project overview
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript config (apps)
├── tsconfig.server.json      # TypeScript config (server)
├── vite.config.ts            # Vite bundler config
├── deployplugin.md           # Claude Code plugin distribution guide
│
├── .claude-plugin/           # Claude Code plugin
│   └── plugin.json          # Plugin manifest
├── .mcp.json                 # MCP server configuration
├── skills/                   # Plugin skills
│   └── convex-schema/
│       └── SKILL.md         # Schema browsing skill
│
├── src/                      # Server and CLI source
│   ├── index.ts             # CLI entry point (schema, dashboard, diagram)
│   ├── server.ts            # MCP server setup
│   ├── convex-client.ts     # Convex API client
│   ├── ui-server.ts         # Local browser UI server
│   ├── tools/               # Tool implementations
│   │   ├── schema-browser.ts
│   │   ├── dashboard.ts
│   │   └── schema-diagram.ts
│   └── resources/           # UI resource handlers
│       ├── schema-browser.ts
│       └── dashboard.ts
│
├── apps/                     # Browser UI applications
│   ├── schema-browser/
│   │   ├── index.html
│   │   └── src/
│   │       ├── app.ts
│   │       └── styles.css
│   │
│   └── realtime-dashboard/
│       ├── index.html
│       └── src/
│           ├── app.ts
│           └── styles.css
│
├── docs/                     # User documentation
│   ├── setup.md
│   ├── tools.md
│   ├── architecture.md
│   └── troubleshooting.md
│
└── dist/                     # Build output (generated)
    ├── index.js             # Compiled server/CLI
    └── apps/
        └── assets/          # Bundled UI apps
```

## Hosting requirements

**None for basic usage.** The CLI and MCP server run locally. Browser UIs are served from a local HTTP server (port 3456).

For team deployments:

- HTTP transport available (`--http --port 3001`)
- Docker support included
- No external hosting needed

## Relationship to official Convex MCP server

This project complements (doesn't replace) the official `npx convex mcp start`:

| Official Convex MCP     | This Project                                         |
| ----------------------- | ---------------------------------------------------- |
| Text-only tools         | Interactive UI tools                                 |
| `tables`, `data`, `run` | `schema_browser`, `dashboard_view`, `schema_diagram` |
| CLI-integrated          | Standalone CLI + MCP + Plugin                        |

You can run both together. The official server handles function execution and raw data queries. This project adds visual exploration.

## Quick start by distribution method

### npm CLI (any terminal)

```bash
npm install -g convex-mcp-visual
convex-mcp-visual --setup
convex-mcp-visual schema
```

### MCP Server (Claude/Cursor)

```bash
# Claude Code
claude mcp add convex-visual -- npx convex-mcp-visual --stdio

# Cursor - add to ~/.cursor/mcp.json
```

### Claude Code Plugin

```shell
/plugin marketplace add waynesutton/convex-mcp-visual
/plugin install convex-visual@waynesutton-convex-mcp-visual
```

## Documentation

- [README.md](README.md) - Quick start and overview
- [SETUP.md](SETUP.md) - Detailed configuration
- [deployplugin.md](deployplugin.md) - Claude Code plugin distribution
- [docs/](docs/) - Tool reference and troubleshooting
