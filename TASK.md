# Task Tracker

Current development tasks and progress.

## Completed (v1.1.0)

- [x] Add direct CLI subcommands (schema, dashboard, diagram)
- [x] Create Claude Code plugin structure (.claude-plugin/plugin.json)
- [x] Create MCP server config (.mcp.json)
- [x] Create plugin skills (skills/convex-schema/SKILL.md)
- [x] Create deployplugin.md with marketplace distribution guide
- [x] Update OVERVIEW.md with three distribution methods
- [x] Update package.json with plugin files
- [x] Update files.md with new structure
- [x] Update changelog.md with v1.1.0 changes
- [x] Add --json flag for JSON output
- [x] Add --no-browser flag option
- [x] Add subcommand-specific help
- [x] Build and verify all three distribution methods work
- [x] Verify TypeScript type safety (tsc --noEmit passes)

## Completed (v1.0.22)

- [x] Add schema_diagram tool with Mermaid ER diagram generation
- [x] Auto relationship detection from foreign key patterns
- [x] ASCII/Unicode terminal output using beautiful-mermaid
- [x] SVG browser output with theme options
- [x] Fix dashboard scroll when content exceeds viewport
- [x] Add clear MCP command instructions to README
- [x] Add --config flag to show all detected config sources
- [x] Add config source tracking to --test output
- [x] Add warning in --setup when env var will override config file
- [x] Add --deployment flag for explicit deployment selection
- [x] Multi deployment support documentation
- [x] Convex reference links in README and setup docs
- [x] Auto detect project in --setup wizard from .env.local

## Completed (Prior)

- [x] Fix data access in `src/convex-client.ts` using Convex system queries
- [x] Implement `queryDocuments()` with `_system/cli/tableData`
- [x] Implement `getTableCount()` with `_system/cli/tableSize:default`
- [x] Implement `getAllDocuments()` for document sampling
- [x] Wire real data into `schema-browser.ts` tool handler
- [x] Wire real data into `dashboard.ts` tool handler
- [x] Replace emoji icons with SVG icons in UI apps
- [x] Replace browser `alert()` calls with console logging
- [x] Add `--setup` CLI command for interactive deploy key configuration
- [x] Shorten README.md
- [x] Move detailed docs to `docs/` folder
- [x] Normalize naming to convex-mcp-visual
- [x] Create project hygiene files (files.md, changelog.md, TASK.md)
- [x] Update README naming for schema visualizer and dashboard view
- [x] Add junior guide doc for Claude web, stack, and read only access

## Completed (v1.0.9)

- [x] Build and test the project (successful)
- [x] Verify npm test passes with 50 tables found
- [x] Shortened README.md for npm publication
- [x] Updated files.md, changelog.md, TASK.md

## Completed (v1.0.10)

- [x] List view now uses declared schema fields when available
- [x] Added schema source indicator (declared vs inferred)
- [x] Fixed document count display (loaded of total)
- [x] Added deploy key required message for documents

## Completed (v1.0.13)

- [x] Fixed document fetching with correct Convex API parameters
- [x] Version is now read dynamically from package.json

## Completed (v1.0.14)

- [x] Added comprehensive tooltips throughout UI
- [x] Added keyboard shortcuts help modal
- [x] Tooltips on table items, schema fields, badges, indexes
- [x] Tooltips on dashboard metrics and chart bars
- [x] Connection status tooltips
- [x] Verified universal compatibility with any Convex app
- [x] Fixed TypeScript type safety (WindowWithConfig pattern)
- [x] Fixed boolean type for isHighlighted edge detection

## Completed (v1.0.15)

- [x] Fixed documents table scrolling in list view
- [x] Added min-height: 0 to flex containers for proper overflow
- [x] Pagination bar now visible at bottom of documents panel
- [x] Auto Arrange now fits to view after rearranging tables

## Backlog

- [ ] Submit to Claude Code official marketplace
- [ ] Add query builder UI
- [ ] Improve relationship detection for array references
- [ ] Add table statistics (min/max/avg for numeric fields)
- [ ] Add full-text search across documents
- [ ] Add schema diff view between environments
- [ ] Add collaborative viewing (share schema views)
- [ ] Investigate Claude.ai web integration options
- [ ] Add flowchart diagram type for data flows
- [ ] Add opencode CLI integration guide
