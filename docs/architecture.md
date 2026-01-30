# Architecture

## How MCP Works

MCP (Model Context Protocol) is a standard protocol that allows AI assistants like Claude to communicate with external tools.

```
Claude Code / MCP Client
 │
 │ User: "Show me my Convex schema"
 │
 ▼
┌─────────────────────────────────────┐
│     Convex MCP Visual Server        │
│                                     │
│  - Receives tool requests via MCP   │
│  - Authenticates with Convex        │
│  - Queries Convex Cloud APIs        │
│  - Returns structured responses     │
│  - Opens browser UI on localhost    │
└─────────────────────────────────────┘
       │                      │
       ▼                      ▼
┌──────────────┐     ┌────────────────┐
│ Convex Cloud │     │  Browser UI    │
│              │     │ localhost:3456 │
│ Your data at │     │                │
│ xyz.convex   │     │ Interactive    │
│ .cloud       │     │ graph, tables  │
└──────────────┘     └────────────────┘
```

## File Structure

```
convex-mcp-visual/
├── src/
│   ├── index.ts           # CLI entry (--stdio, --http, --test, --setup)
│   ├── server.ts          # MCP server + tool handlers
│   ├── convex-client.ts   # Convex authentication + queries
│   ├── ui-server.ts       # Local HTTP server (port 3456)
│   ├── tools/
│   │   ├── schema-browser.ts  # Schema browser tool handler
│   │   └── dashboard.ts       # Dashboard tool handler
│   └── resources/
│       ├── schema-browser.ts  # Fallback HTML resource
│       └── dashboard.ts       # Fallback HTML resource
├── apps/
│   ├── schema-browser/    # Graph + list view UI application
│   │   ├── index.html
│   │   └── src/
│   │       ├── app.ts
│   │       └── styles.css
│   └── realtime-dashboard/
│       ├── index.html
│       └── src/
│           ├── app.ts
│           └── styles.css
├── docs/                  # Documentation
└── dist/                  # Compiled output (published to npm)
```

## Convex System Queries

The server uses internal Convex APIs:

| Endpoint                        | Purpose                      |
| ------------------------------- | ---------------------------- |
| `/api/shapes2`                  | Inferred schema from data    |
| `_system/frontend/getSchemas`   | Declared schema              |
| `_system/cli/tableSize:default` | Document counts              |
| `_system/cli/tableData`         | Paginated document retrieval |

## Tech Stack

### Server

- Node.js 18+
- TypeScript
- @modelcontextprotocol/sdk (official MCP SDK)
- Convex SDK

### UI Applications

- Vanilla TypeScript (no framework)
- HTML5 Canvas for graph rendering
- CSS3 Variables for theming
- Vite for bundling

### Design Decisions

**No UI framework**: Keeps bundle small (~62KB), loads instantly
**Canvas for graphs**: Smooth 60fps rendering, handles 100+ nodes
**CSS Variables**: Runtime theme switching without JavaScript
**TypeScript everywhere**: Type safety from server to UI
