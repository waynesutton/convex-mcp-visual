# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0] - 2026-01-31

### Added

- CLI install commands for MCP clients: `--install`, `--install-cursor`, `--install-opencode`, `--install-claude`
- CLI uninstall commands: `--uninstall`, `--uninstall-cursor`, `--uninstall-opencode`, `--uninstall-claude`
- Auto-configuration of Cursor, OpenCode, and Claude Desktop MCP settings
- OpenCode support with proper `mcp` config key format
- `AGENTS.md` for AI coding agents following agents.md spec
- `.gitignore` to prevent committing generated files
- `docs/files-docs.md` explaining each documentation file

### Changed

- Improved setup wizard instructions (removed cryptic deployment names)
- Updated README with CLI install instructions
- Updated docs/setup.md with MCP client install table
- Consolidated two SETUP.md files into single `docs/setup.md`
- Moved user guides to `docs/` folder (user-guide-dashboard.md, user-guide-schema-browser.md)
- Simplified `docs/OVERVIEW.md` to remove duplicate architecture content
- Condensed `CLAUDE.md` to development essentials only
- Expanded `skills/convex-schema/SKILL.md` with all tool parameters
- Updated `.npmignore` to exclude docs/ from npm package
- Updated `docs/PUBLISHING.md` file references

### Removed

- `test-convex-project/` sample project (no longer needed)
- Tracked build artifacts from git (node_modules, dist, .cursor, mnt)
- Root `SETUP.md` (merged into docs/setup.md)
- Root `USER_GUIDE_DASHBOARD.md` (moved to docs/)
- Root `USER_GUIDE_SCHEMA_BROWSER.md` (moved to docs/)

## [1.1.0] - 2026-01-31

### Added

- Direct CLI subcommands: `schema`, `dashboard`, `diagram` for terminal usage without MCP
- Claude Code plugin structure (`.claude-plugin/plugin.json`, `.mcp.json`)
- Plugin skills for automatic tool discovery (`skills/convex-schema/SKILL.md`)
- `deployplugin.md` with Claude Code marketplace distribution instructions
- `--json` flag for JSON output in direct CLI mode
- `--no-browser` flag to skip browser UI in direct CLI mode
- Subcommand-specific help (`convex-mcp-visual schema --help`)

### Changed

- Package now supports three distribution methods: npm CLI, MCP server, Claude Code plugin
- Updated help text to show all usage modes
- Updated OVERVIEW.md with distribution method documentation
- Updated files.md with new plugin files
- Version bump to 1.1.0 for new feature release

## [1.0.22] - 2026-01-31

### Added

- `schema_diagram` tool for generating Mermaid ER diagrams from Convex schema
- Auto relationship detection from foreign key patterns (`userId`, `tableId`, etc.)
- ASCII/Unicode diagram output for terminal using beautiful-mermaid
- SVG diagram output in browser with theme options (github-dark, tokyo-night, dracula, etc.)
- Exportable Mermaid code from diagram viewer
- Clear MCP command instructions table in README
- `--config` CLI flag to show all detected config sources and which one wins
- Config source tracking in `--test` output
- Warning in `--setup` when CONVEX_DEPLOY_KEY env var will override config file
- `--deployment <name>` CLI flag to connect to specific deployment by name
- Multi deployment support for developers with multiple Convex apps
- Convex reference links in README and setup docs
- Auto project detection in `--setup` wizard reads `.env.local` and `.convex/deployment.json`

### Changed

- `--setup` now saves deploy key to `.env.local` in current directory (per project)
- MCP server reads `CONVEX_DEPLOY_KEY` from `.env.local` automatically
- Just `cd` to project folder and it uses that folder's deploy key
- README updated with MCP commands table for all three tools
- Setup wizard shows which project to select when run in a Convex project folder
- Legacy global config (`~/.convex-mcp-visual.json`) still read for backwards compatibility

### Fixed

- Dashboard page now scrolls properly when content exceeds viewport height

## [1.0.15] - 2026-01-30

### Fixed

- Documents table now scrolls properly in list view
- Added min-height: 0 to flex containers for proper overflow scrolling
- Pagination bar now visible at bottom of documents panel
- Auto Arrange now calls Fit to View so all tables are visible after rearranging

## [1.0.14] - 2026-01-30

### Added

- Comprehensive tooltips throughout Schema Browser and Dashboard UIs
- Keyboard shortcuts help modal (click keyboard icon or hover buttons for hints)
- Tooltips on table items showing document counts and index status
- Tooltips on schema fields explaining field types and references
- Tooltips on declared/inferred badges explaining schema source
- Tooltips on index names with query usage hints
- Tooltips on dashboard metrics explaining aggregation types
- Tooltips on chart bars showing exact document counts
- Connection status tooltips on status indicators

### Changed

- Enhanced header buttons with keyboard shortcut hints in tooltips
- Improved field type tooltips with context-aware descriptions

### Fixed

- TypeScript type safety with WindowWithConfig pattern for global config
- Boolean type for edge highlight detection in graph view

## [1.0.13] - 2026-01-30

### Fixed

- Document fetching now works correctly with Convex system API
- Fixed `_system/cli/tableData` query parameters (table, paginationOpts format)
- Documents now load and display in the list view

### Changed

- Version is now read dynamically from package.json (no more hardcoded versions)
- List view now uses declared schema fields when available, falling back to inferred
- List view shows schema source indicator (declared vs inferred)
- Document count shows "loaded of total" for clarity
- Added deploy key required message when documents cannot be fetched

## [1.0.9] - 2026-01-29

### Added

- Interactive CLI setup wizard with `--setup` command
- Real data fetching using Convex system queries
- Document count display using `_system/cli/tableSize:default`
- Paginated document retrieval using `_system/cli/tableData`
- Schema inference from `/api/shapes2` and `_system/frontend/getSchemas`
- Admin access detection with `hasAdminAccess()` method
- Support for `~/.convex-mcp-visual.json` config file
- Support for global `~/.convex/config.json` access token
- Configurable document sample limit via `CONVEX_DOC_SAMPLE_LIMIT`

### Changed

- Shortened README.md with documentation moved to `docs/` folder
- Replaced emoji icons with SVG icons in UI apps
- Replaced browser `alert()` with console logging
- Updated naming from convex-mcp-apps to convex-mcp-visual
- Schema browser now shows declared and inferred schema fields
- Dashboard now displays actual document counts from Convex

### Fixed

- Schema browser showing empty tables (was using stub data)
- Dashboard showing 0 for all metrics (was not fetching real data)
- Theme toggle icons now use proper SVG instead of Unicode

## [1.0.8] - 2025-01-28

### Added

- Initial npm package release
- Schema browser with graph and list views
- Real-time dashboard with metrics and charts
- Dark mode support
- MCP stdio and HTTP transports
- Deploy key authentication

### Fixed

- Canvas rendering on retina displays
