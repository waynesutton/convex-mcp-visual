# Files

Overview of the codebase structure.

## Source Files (`src/`)

| File                             | Description                                                          |
| -------------------------------- | -------------------------------------------------------------------- |
| `index.ts`                       | CLI entry point: subcommands, MCP modes, and client install commands |
| `server.ts`                      | MCP server setup, tool registration, and request handlers            |
| `convex-client.ts`               | Convex API client with system queries for schema and documents       |
| `ui-server.ts`                   | Local HTTP server for browser UI (port 3456)                         |
| `tools/schema-browser.ts`        | Schema browser tool (defaults to graph view) with real data          |
| `tools/dashboard.ts`             | Dashboard tool with real metrics from Convex                         |
| `tools/schema-diagram.ts`        | Schema diagram tool with Mermaid ER diagrams and ASCII output        |
| `tools/codebase-subway-map.ts`   | Codebase subway map tool for visualizing project structure           |
| `tools/table-heatmap.ts`         | Table heatmap tool for recent writes per minute                      |
| `tools/schema-drift.ts`          | Schema drift tool for declared vs inferred fields                    |
| `tools/write-conflict-report.ts` | Write conflict report tool for log-based analysis                    |
| `tools/kanban-board.ts`          | Kanban board tool for scheduled jobs and AI agent threads            |
| `tools/shared-styles.ts`         | Shared CSS and HTML utilities for tan/dark mode and theme toggle     |
| `resources/schema-browser.ts`    | Fallback HTML for schema browser                                     |
| `resources/dashboard.ts`         | Fallback HTML for dashboard                                          |
| `resources/kanban-board.ts`      | Fallback HTML for kanban board                                       |

**MCP client install support:**

- Cursor, OpenCode, Claude Desktop: JSON config format
- Codex CLI: TOML config format at `~/.codex/config.toml`

## Claude Code Plugin (`.claude-plugin/`)

| File               | Description                                       |
| ------------------ | ------------------------------------------------- |
| `plugin.json`      | Plugin manifest with metadata and version         |
| `marketplace.json` | Marketplace catalog for `/plugin marketplace add` |

| File        | Description              |
| ----------- | ------------------------ |
| `.mcp.json` | MCP server configuration |

## Plugin Skills (`skills/`)

| Directory        | Description                                     |
| ---------------- | ----------------------------------------------- |
| `convex-schema/` | Skill for browsing Convex schemas with SKILL.md |

## UI Applications (`apps/`)

| Directory             | Description                                                          |
| --------------------- | -------------------------------------------------------------------- |
| `schema-browser/`     | Interactive schema explorer (graph view default, list view optional) |
| `realtime-dashboard/` | Real-time metrics and charts dashboard                               |
| `kanban-board/`       | Kanban board for scheduled functions and AI agent threads            |

Each app contains:

- `index.html` - Entry HTML file
- `src/app.ts` - Main application logic
- `src/styles.css` - Component styles

**Theme management:**

- All UI apps default to tan (light) mode on page load
- Theme toggle available in all views (no persistence between sessions)
- Kanban board has separate theme management
- CSS variables are scoped per app via `data-app` to avoid bundled style collisions

**Dashboard app features:**

- Tables Overview: horizontal bar chart with scrollable container
- Recent Activity: full-width table with sticky header and table badges

## Documentation (`docs/`)

| File                           | Description                                  |
| ------------------------------ | -------------------------------------------- |
| `setup.md`                     | Installation, per-project config, MCP clients, Docker |
| `tools.md`                     | Tool parameters and keyboard shortcuts       |
| `architecture.md`              | Technical architecture and design            |
| `troubleshooting.md`           | Common issues, stuck deploy keys, multi-project config |
| `limitations.md`               | Known limitations and compatibility          |
| `OVERVIEW.md`                  | Project summary for GitHub/marketplace       |
| `deployplugin.md`              | Claude Code plugin distribution guide        |
| `PUBLISHING.md`                | npm publishing checklist and security        |
| `101-guide.md`                 | Internal guide: data flow and read-only mode |
| `user-guide-schema-browser.md` | How to use the schema browser                |
| `user-guide-dashboard.md`      | How to use the dashboard                     |
| `files-docs.md`                | Documentation file descriptions              |
| `files-claude-plugin.md`       | Claude plugin and marketplace structure      |
| `mcp-apps.md`                  | MCP Apps embedded UI support guide           |

## Root Files

| File           | Description                                   |
| -------------- | --------------------------------------------- |
| `README.md`    | Quick start and overview (includes npm badge) |
| `CLAUDE.md`    | Development guidance for Claude               |
| `AGENTS.md`    | Instructions for AI coding agents             |
| `changelog.md` | Version history                               |
| `files.md`     | This file: codebase structure                 |
| `TASK.md`      | Development task tracker                      |

## Configuration Files

| File                   | Description                            |
| ---------------------- | -------------------------------------- |
| `package.json`         | npm package metadata and scripts       |
| `tsconfig.json`        | TypeScript compiler configuration      |
| `tsconfig.server.json` | Server-specific TypeScript config      |
| `vite.config.ts`       | Vite bundler configuration for UI apps |
| `.gitignore`           | Files to exclude from git tracking     |
| `.npmignore`           | Files to exclude from npm package      |

## Build Output (`dist/`)

Generated by `npm run build`. Contains:

- Compiled JavaScript server files
- Bundled UI applications
- Type definitions

## Dependencies

| Package                     | Purpose                                   |
| --------------------------- | ----------------------------------------- |
| `@modelcontextprotocol/sdk` | MCP server protocol implementation        |
| `convex`                    | Convex client for database queries        |
| `beautiful-mermaid`         | Mermaid diagram rendering (ASCII and SVG) |
