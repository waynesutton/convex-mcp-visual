# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- MCP Apps support (SEP-1865) for embedded UI rendering in ChatGPT, Claude web, VS Code, and other compatible hosts
- Tool metadata with `_meta.ui.resourceUri` linking each tool to its HTML resource
- 8 UI resources registered with `text/html;profile=mcp-app` MIME type for MCP Apps compatibility
- In-memory store for dynamically generated HTML resources (diagrams, heatmaps, etc.)
- HTTP mode with CORS headers for cross-origin MCP Apps requests
- Direct HTTP endpoints for UI resources at `/ui/*.html`
- `docs/mcp-apps.md` usage guide for MCP Apps integration
- `src/resources/kanban-board.ts` fallback HTML resource
- Kanban board CLI and MCP tool for visualizing scheduled functions, cron jobs, and AI agent threads
- New CLI command: `convex-mcp-visual kanban` with `--jobs` and `--agents` flags
- Kanban board browser UI at `apps/kanban-board/` with interactive columns
- Support for @convex-dev/agent component detection and thread visualization
- Support for other Convex agent patterns with similar table structures
- ConvexClient methods: `getScheduledFunctions()`, `getCronJobs()`, `detectAgentComponent()`, `getAgentThreads()`, `getAgentMessages()`
- Codex CLI support with `--install-codex` and `--uninstall-codex` flags
- TOML config writer for Codex at `~/.codex/config.toml`
- Codex documentation in README.md and docs/setup.md
- `codex` keyword in package.json
- Codebase subway map CLI and MCP tool
- Table heatmap CLI and MCP tool
- Schema drift CLI and MCP tool
- Write conflict report CLI and MCP tool
- Tools reference entries for new CLI commands
- Shared CSS styling utility for consistent tan/dark mode across all tool UIs
- Theme toggle button (sun/moon icon) in all tool browser views
- Summary stats cards in heatmap, drift, and conflict report views

### Changed

- All tool UIs now use consistent tan (light) and dark mode matching schema_browser
- Tool descriptions updated to clarify when each tool should be used
- schema_diagram now only triggers for explicit Mermaid ER diagram requests
- Theme toggle available in all tool views (session only, no persistence)
- Codebase subway map redesigned from horizontal to vertical layout for better readability
- Subway map lines now run vertically with stations stacked top to bottom
- Station labels now appear to the right of stations instead of above
- Cross-line connections now use horizontal bezier curves
- Added title and stats header to subway map SVG
- Added legend box showing all line colors and names
- Increased line spacing to 480px between lines for better visibility
- Subway map content properly centered in container
- Added separate header height (80px) and margin top (80px) for better layout
- Line labels positioned between header and first station (no overlap)
- Lines sorted by station count (multi-station lines first, single-station at end)
- Single-station lines now show a vertical stub instead of invisible point
- Kanban board theme toggle now uses sun/moon icons (no text label)

### Fixed

- Graph node headers in schema browser now use flat colors instead of gradients
- Schema diagram view now has theme toggle button and uses CSS variables for light/dark mode
- All UI views now always default to tan (light) mode on page load
- Removed localStorage persistence for theme preference (toggle works during session only)
- Scoped app CSS variables by `data-app` to prevent bundled styles from overriding defaults
- Subway map now uses its own viewer instead of schema diagram
- Subway map completely redesigned to look like actual transit map (NYC subway style)
- Each folder is now a colored line with files as stations along the route
- Transfer stations show connections between folders/modules
- Removed Mermaid dependency from subway map in favor of custom SVG
- Subway map stations are now draggable (click and drag to reposition)
- Line paths and transfer connections update in real-time when dragging stations
- Touch support for mobile drag interactions

## [1.2.7] - 2026-02-01

### Changed

- Dashboard Tables Overview now uses horizontal bar chart layout for better readability
- Table names display on the left with bars extending right, sorted by document count
- Tables Overview section is scrollable when there are many tables
- Added total document count in section header
- Recent Activity section now spans full width with improved table styling
- Added table name badges and sticky header in Recent Activity

### Fixed

- Table names no longer overlap when there are many tables in the database
- Recent Activity section now responsive and consistent with dashboard layout

## [1.2.5] - 2026-01-31

### Added

- npm version badge/shield in README.md linking to npmjs.com package page

## [1.2.4] - 2026-01-31

### Added

- `.claude-plugin/marketplace.json` for Claude Code marketplace distribution
- `docs/files-claude-plugin.md` documenting plugin and marketplace file structure
- Official marketplace requirements table in documentation

### Changed

- README plugin install instructions now use correct marketplace name
- `package.json` files array includes both `plugin.json` and `marketplace.json`
- Updated `files.md` and `docs/files-docs.md` with new plugin files

### Fixed

- `/plugin marketplace add` now works (was missing marketplace.json)

## [1.2.3] - 2026-01-31

### Fixed

- OpenCode MCP config format in `--install-opencode` command
- OpenCode requires `type: "local"`, `command` as array, and `enabled: true`
- Updated docs/setup.md with correct OpenCode manual configuration example

## [1.2.3] - 2026-01-31

### Added

- `viewMode` parameter for `schema_browser` MCP tool (accepts "graph" or "list")
- `--graph` and `--list` flags for CLI `schema` command to explicitly set view mode

### Changed

- Schema browser now defaults to graph view (visual diagram) for all usage modes
- MCP "Show me my Convex schema" opens graph view by default
- CLI `schema` command opens graph view by default

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
