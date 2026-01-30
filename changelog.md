# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
