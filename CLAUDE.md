# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**convex-mcp-visual** is an MCP (Model Context Protocol) server that provides visual, interactive UI components for exploring Convex databases. It opens browser-based interfaces (schema graph view, list view, dashboards) while also providing terminal markdown output.

Key features:
- **Graph View** - Visual schema diagram with draggable nodes and relationship lines
- **List View** - Table-based schema explorer with document browser
- **Dashboard** - Real-time metrics and charts
- **Dual Output** - Terminal markdown + browser UI simultaneously

## Quick Start - Testing in Claude Code

### 1. Get a Deploy Key

Get a deploy key from [dashboard.convex.dev](https://dashboard.convex.dev):
- Select your project → **Settings** → **Deploy Keys** → **Generate Deploy Key**
- Copy the key (format: `prod:happy-animal-123|convex_deploy_abc123...`)

### 2. Save the Deploy Key

```bash
echo 'export CONVEX_DEPLOY_KEY="prod:your-deployment|your-key-here"' >> ~/.zshrc
source ~/.zshrc
```

### 3. Install and Build

```bash
cd /Users/waynesutton/Documents/sites/claudemcpconvex
npm install
npm run build
```

### 4. Add to Claude Code

```bash
claude mcp add convex-visual -- node /Users/waynesutton/Documents/sites/claudemcpconvex/dist/index.js --stdio
```

### 5. Verify Installation

```bash
claude mcp list
```

You should see `convex-visual` in the list.

### 6. Test Connection

```bash
npx convex-mcp-visual --test
```

### 7. Use It

In Claude Code, try:
- "Show me my Convex schema" → Opens Schema Browser (graph view + terminal output)
- "Create a dashboard for my Convex data" → Opens Dashboard

### Removing the MCP Server

```bash
claude mcp remove convex-visual
```

## Architecture

```
Claude Code / MCP Client
    │
    ├── User: "Show me my schema"
    │
    ▼
┌─────────────────────────────────────┐
│     convex-mcp-visual               │
│  • schema_browser tool              │
│  • dashboard_view tool              │
│  • Local web server (port 3456)     │
└─────────────────────────────────────┘
    │              │
    │              ├── Opens browser UI
    │              │
    ▼              ▼
Terminal       Browser
Markdown       Interactive
Output         Visual UI
    │
    ▼
┌─────────────────────────────────────┐
│     Convex Client                   │
│  Reads: ~/.convex/ or CONVEX_DEPLOY_KEY│
└─────────────────────────────────────┘
    │
    ▼
    Convex Cloud (your deployment)
```

## File Structure

```
src/
├── index.ts              # CLI entry point (--stdio, --http, --test)
├── server.ts             # MCP server setup and handlers
├── convex-client.ts      # Convex authentication and queries
├── ui-server.ts          # Local HTTP server for browser UIs
├── tools/
│   ├── schema-browser.ts # schema_browser tool (graph + list views)
│   └── dashboard.ts      # dashboard_view tool
└── resources/
    ├── schema-browser.ts # UI HTML resource handler
    └── dashboard.ts      # Dashboard HTML resource handler

apps/
├── schema-browser/       # Interactive schema explorer
│   ├── index.html
│   └── src/
│       ├── app.ts        # Graph view + list view implementation
│       └── styles.css    # Tan color palette styles
└── realtime-dashboard/   # Live charts and metrics
    ├── index.html
    └── src/
        ├── app.ts
        └── styles.css
```

## Build Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run build` | Build server + UI apps |
| `npm run build:server` | Build only TypeScript server |
| `npm run build:apps` | Build only UI apps (Vite) |
| `npm run dev` | Watch mode for server |
| `npm start` | Run in stdio mode |
| `npm run start:http` | Run in HTTP mode (port 3001) |
| `npm test` | Test Convex connection |
| `npm run clean` | Remove dist/ folder |

## Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `CONVEX_URL` | Override deployment URL | From ~/.convex/ |
| `CONVEX_DEPLOY_KEY` | Deploy key for auth | None |
| `MCP_TIMEOUT` | Server startup timeout | 10000ms |

## Convex Authentication

The server reads credentials in this order:

1. **CONVEX_DEPLOY_KEY** environment variable (for CI/CD)
2. **~/.convex/config.json** local credentials (from `npx convex login`)

To authenticate:
```bash
npx convex login
```

## MCP Tools

### schema_browser

Opens an interactive Schema Browser with two view modes:
- **Graph View** - Canvas-based visual diagram with pan/zoom/drag
- **List View** - Traditional table list with document browser

**Parameters:**
- `table` (string, optional): Pre-select a table
- `showInferred` (boolean, default: true): Show inferred schemas
- `pageSize` (number, default: 50): Documents per page

### dashboard_view

Creates a real-time dashboard with metrics and charts.

**Parameters:**
- `metrics` (array): Metric definitions with aggregations (count, sum, avg, min, max)
- `charts` (array): Chart configurations (line, bar, pie)
- `refreshInterval` (number, default: 5): Refresh interval in seconds

## UI Color Palette

The UIs use a tan/warm color scheme:
- Background: `#faf8f5` (cream)
- Secondary: `#f5f3f0` (light tan)
- Border: `#e6e4e1` (warm gray)
- Accent: `#8b7355` (brown)
- Interactive: `#EB5601` (orange)
- Text: `#1a1a1a` (near black)

## Troubleshooting

### "Connection closed" error
On Windows, use cmd wrapper:
```json
{"command":"cmd","args":["/c","node","dist/index.js","--stdio"]}
```

### Server not appearing in Claude Code
1. Ensure path is absolute
2. Run `npm run build` first
3. Restart Claude Code after adding

### Browser doesn't open
- Check if port 3456 is available
- Terminal output still works even if browser fails

### Authentication errors
```bash
npx convex logout
npx convex login
```

### Canvas appears blurry
The graph view uses `devicePixelRatio` for retina displays. Try refreshing the browser if it appears blurry.

## Development

### Adding a New Tool

1. Create `src/tools/your-tool.ts`:
```typescript
export const yourTool: Tool = {
  name: 'your_tool',
  description: '...',
  inputSchema: { ... }
};

export async function handleYourTool(client, args) {
  // Implementation
}
```

2. Register in `src/server.ts`:
```typescript
import { yourTool, handleYourTool } from './tools/your-tool.js';

// In ListToolsRequestSchema handler:
tools: [schemaBrowserTool, dashboardTool, yourTool]

// In CallToolRequestSchema handler:
case 'your_tool':
  return handleYourTool(convexClient, args);
```

3. Rebuild: `npm run build`

### Adding a New UI App

1. Create `apps/your-app/index.html` and `src/app.ts`
2. Add to `vite.config.ts` input
3. Create resource handler in `src/resources/your-app.ts`
4. Register resource in `src/server.ts`

## Publishing to npm

```bash
npm version patch
npm run build
npm publish
```

The package only includes the `dist/` folder (configured in `package.json` files array).
