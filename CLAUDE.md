# CLAUDE.md

Development guidance for Claude Code when working with this repository.

## Project Summary

**convex-mcp-visual** is an MCP server providing visual UI tools for exploring Convex databases.

**Tools:**

- `schema_browser` - Interactive schema explorer with graph/list views
- `dashboard_view` - Real-time metrics and charts
- `schema_diagram` - Mermaid ER diagrams

**Outputs:** Terminal markdown + browser UI on localhost:3456

## Quick Test

```bash
# Build and test
npm install && npm run build
npx convex-mcp-visual --test

# Install to MCP clients (auto-configures Cursor, OpenCode, Claude Desktop)
npx convex-mcp-visual --install

# Or add to Claude Code CLI
claude mcp add convex-visual -- npx convex-mcp-visual --stdio
```

## Build Commands

| Command         | Description            |
| --------------- | ---------------------- |
| `npm run build` | Build server + UI apps |
| `npm run dev`   | Watch mode for server  |
| `npm test`      | Test Convex connection |
| `npm run clean` | Remove dist/ folder    |

## Key Files

| File                   | Purpose                      |
| ---------------------- | ---------------------------- |
| `src/index.ts`         | CLI entry point              |
| `src/server.ts`        | MCP server and tool handlers |
| `src/convex-client.ts` | Convex API authentication    |
| `src/tools/*.ts`       | Tool implementations         |
| `apps/*/src/app.ts`    | Browser UI applications      |

## Environment Variables

| Variable            | Purpose                                   |
| ------------------- | ----------------------------------------- |
| `CONVEX_DEPLOY_KEY` | Deploy key for auth                       |
| `CONVEX_URL`        | Override deployment URL                   |
| `MCP_TIMEOUT`       | Server startup timeout (default: 10000ms) |

## Adding a Tool

1. Create `src/tools/your-tool.ts` with tool definition and handler
2. Register in `src/server.ts` (ListToolsRequestSchema + CallToolRequestSchema)
3. Run `npm run build`

## Documentation

- [Setup Guide](docs/setup.md) - Configuration
- [Tools Reference](docs/tools.md) - Parameters and shortcuts
- [Architecture](docs/architecture.md) - Technical details
- [Troubleshooting](docs/troubleshooting.md) - Common issues
