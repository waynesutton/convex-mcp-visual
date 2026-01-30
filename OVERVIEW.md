# Convex MCP Apps - Project Overview

This document summarizes the project structure and how all the pieces fit together.

## What this project is

Convex MCP Apps brings interactive UI components to Claude (and other MCP Apps hosts) for exploring and visualizing Convex data. Instead of text-only responses about your database, you get:

- **Schema Browser** - Click through tables, view schemas, inspect documents
- **Realtime Dashboard** - Live charts and metrics that update as your data changes

## Architecture

```
User asks Claude: "Show me my schema"
         │
         ▼
┌─────────────────────────────────────┐
│         Claude / Host               │
│  Calls schema_browser tool          │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│      Convex MCP Apps Server         │
│  1. Returns tool result             │
│  2. Returns UI resource             │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│     Host renders UI in iframe       │
│  - Schema Browser appears           │
│  - User clicks tables               │
│  - Queries sent back to server      │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│       Convex Deployment             │
│  - Tables and schemas               │
│  - Real-time subscriptions          │
└─────────────────────────────────────┘
```

## Key components

### MCP Server (`src/`)

The server exposes tools and UI resources:

- `schema_browser` tool - Opens the schema browser
- `dashboard_view` tool - Creates dashboard visualizations
- `ui://schema-browser/*` resource - HTML for schema browser
- `ui://dashboard/*` resource - HTML for dashboard

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

## How MCP Apps work

MCP Apps extend the Model Context Protocol with interactive UIs. The pattern:

1. **Tool definition** declares a `ui://` resource
2. **Host calls tool** and receives result + resource URI
3. **Host fetches resource** (HTML bundle)
4. **Host renders in iframe** with sandboxing
5. **UI communicates** with host via JSON-RPC postMessage

This project implements that pattern for Convex-specific tools.

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
├── CONTRIBUTING.md           # Contribution guide
│
├── src/                      # Server source
│   ├── index.ts             # Entry point
│   ├── server.ts            # MCP server setup
│   ├── tools/               # Tool implementations
│   │   ├── schema-browser.ts
│   │   └── dashboard.ts
│   └── resources/           # UI resource handlers
│       ├── schema-browser.ts
│       └── dashboard.ts
│
├── apps/                     # UI applications
│   ├── schema-browser/
│   │   ├── README.md        # Developer docs
│   │   ├── index.html       # Entry HTML
│   │   └── src/
│   │       ├── app.ts       # Main app logic
│   │       ├── components/  # UI components
│   │       └── styles.css
│   │
│   └── realtime-dashboard/
│       ├── README.md        # Developer docs
│       ├── index.html       # Entry HTML
│       └── src/
│           ├── app.ts       # Main app logic
│           ├── components/  # Chart components
│           └── styles.css
│
├── docs/                     # User documentation
│   ├── SETUP.md             # Installation guide
│   ├── USER_GUIDE_SCHEMA_BROWSER.md
│   └── USER_GUIDE_DASHBOARD.md
│
└── dist/                     # Build output (generated)
    ├── index.js             # Compiled server
    └── apps/
        ├── schema-browser.html
        └── realtime-dashboard.html
```

## Hosting requirements

**None for basic usage.** The MCP server runs locally via stdio. UI resources are bundled into the server and served as data URIs.

For team deployments:

- HTTP transport available (`--http --port 3001`)
- Docker support included
- No external hosting needed

## Relationship to official Convex MCP server

This project complements (doesn't replace) the official `npx convex mcp start`:

| Official Convex MCP     | This Project                       |
| ----------------------- | ---------------------------------- |
| Text-only tools         | Interactive UI tools               |
| `tables`, `data`, `run` | `schema_browser`, `dashboard_view` |
| CLI-integrated          | Standalone package                 |

You can run both together. The official server handles function execution and raw data queries. This project adds visual exploration.

## Next steps

1. Clone and install: `npm install`
2. Build: `npm run build`
3. Add to Claude: See [SETUP.md](docs/SETUP.md)
4. Try it: "Show me my Convex schema"
