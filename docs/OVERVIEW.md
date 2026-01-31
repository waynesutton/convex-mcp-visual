# Convex MCP Visual

Interactive UI components for exploring and visualizing Convex databases. Instead of text-only responses about your database, you get visual tools that open in your browser.

## What it does

- **Schema Browser** - Click through tables, view schemas, inspect documents
- **Realtime Dashboard** - Live charts and metrics that update as your data changes
- **Schema Diagram** - Mermaid ER diagrams showing table relationships

## Three ways to use it

| Method                 | Use case                            | Installation                        |
| ---------------------- | ----------------------------------- | ----------------------------------- |
| **npm package**        | Direct CLI usage from any terminal  | `npm install -g convex-mcp-visual`  |
| **MCP Server**         | Claude Code, Claude Desktop, Cursor | Configure in MCP settings           |
| **Claude Code Plugin** | Claude Code marketplace             | `/plugin install convex-visual@...` |

### Direct CLI

```bash
npx convex-mcp-visual schema          # Browse schema in browser
npx convex-mcp-visual dashboard       # Open metrics dashboard
npx convex-mcp-visual diagram         # Generate ER diagram
```

### MCP Server

```bash
npx convex-mcp-visual --stdio         # For Claude Code/Desktop
npx convex-mcp-visual --http          # For HTTP transport
```

### Claude Code Plugin

```shell
/plugin marketplace add waynesutton/convex-mcp-visual
/plugin install convex-visual@waynesutton-convex-mcp-visual
```

## Authentication

The server reads credentials in this order:

1. `CONVEX_DEPLOY_KEY` environment variable
2. Local Convex credentials from `~/.convex/`

Get a deploy key from [dashboard.convex.dev](https://dashboard.convex.dev) under Settings > Deploy Keys.

## Security

- Credentials stay on your machine, never sent to Claude
- All queries are read-only
- Browser UI runs on localhost only
- Convex enforces your deployment's access rules

## Relationship to official Convex MCP

This project complements the official `npx convex mcp start`:

| Official Convex MCP     | This Project                                         |
| ----------------------- | ---------------------------------------------------- |
| Text-only tools         | Interactive UI tools                                 |
| `tables`, `data`, `run` | `schema_browser`, `dashboard_view`, `schema_diagram` |
| CLI-integrated          | Standalone CLI + MCP + Plugin                        |

You can run both together. The official server handles function execution and raw data queries. This project adds visual exploration.

## Documentation

- [Setup Guide](./setup.md) - Installation and configuration
- [Tools Reference](./tools.md) - Tool parameters and shortcuts
- [Architecture](./architecture.md) - Technical details
- [Troubleshooting](./troubleshooting.md) - Common issues and fixes
- [Limitations](./limitations.md) - Known limitations
- [User Guide: Schema Browser](./user-guide-schema-browser.md)
- [User Guide: Dashboard](./user-guide-dashboard.md)
- [Plugin Distribution](./deployplugin.md) - Claude Code marketplace
- [npm Publishing](./PUBLISHING.md) - Publishing to npm
- [Files Guide](./files-docs.md) - Documentation file descriptions
