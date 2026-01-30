# Task Tracker

Current development tasks and progress.

## Completed

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

## Backlog

- [ ] Add schema export as PNG/SVG
- [ ] Add query builder UI
- [ ] Improve relationship detection for array references
- [ ] Add table statistics (min/max/avg for numeric fields)
- [ ] Add full-text search across documents
- [ ] Add schema diff view between environments
- [ ] Add collaborative viewing (share schema views)
- [ ] Investigate Claude.ai web integration options
