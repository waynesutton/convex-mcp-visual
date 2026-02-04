# AGENTS.md

Instructions for AI coding agents working with this repository.

## Project overview

convex-mcp-visual is an MCP server providing visual UI tools for exploring Convex databases. It runs as a CLI, MCP server, or Claude Code plugin.

## Setup commands

```bash
# Install dependencies
npm install

# Build server and UI apps
npm run build

# Run TypeScript type check
npx tsc -p tsconfig.server.json --noEmit

# Test Convex connection
npm test
```

## Dev workflow

```bash
# Watch mode for server changes
npm run dev

# Build everything
npm run build

# Clean build artifacts
npm run clean
```

## Code style

- TypeScript strict mode
- No semicolons (Prettier default)
- Double quotes for strings
- Functional patterns where possible
- No emojis in code or docs

## File structure

| Path                   | Purpose                                        |
| ---------------------- | ---------------------------------------------- |
| `src/index.ts`         | CLI entry point with subcommands and MCP modes |
| `src/server.ts`        | MCP server setup and tool handlers             |
| `src/convex-client.ts` | Convex API authentication and queries          |
| `src/tools/*.ts`       | Individual tool implementations                |
| `apps/*/src/app.ts`    | Browser UI applications                        |

## Adding a new tool

1. Create `src/tools/your-tool.ts` with tool definition
2. Export a handler function that returns `{ content: [{ type: "text", text: string }] }`
3. Register in `src/server.ts` under `ListToolsRequestSchema` and `CallToolRequestSchema`
4. Run `npm run build` and test

## Adding CLI flags

1. Add to `parseArgs` options in `src/index.ts`
2. Add handler logic after the flag checks
3. Update `printHelp()` function
4. Update README.md and docs/setup.md

## MCP client install support

The install commands support these clients:

| Client         | Config Format | Config Path                             |
| -------------- | ------------- | --------------------------------------- |
| Cursor         | JSON          | `~/.cursor/mcp.json`                    |
| OpenCode       | JSON          | `~/.config/opencode/opencode.json`      |
| Claude Desktop | JSON          | `~/Library/Application Support/Claude/` |
| Codex CLI      | TOML          | `~/.codex/config.toml`                  |

Codex uses TOML format. The install logic in `src/index.ts` includes TOML reader/writer functions for Codex support.

## Testing

```bash
# Test connection to Convex
node dist/index.js --test

# Test help output
node dist/index.js --help

# Test specific tool via CLI
node dist/index.js schema
node dist/index.js dashboard
node dist/index.js diagram
```

## Before committing

1. Run `npm run build` to verify compilation
2. Run `npx tsc -p tsconfig.server.json --noEmit` for type safety
3. Update changelog.md following Keep a Changelog format
4. Update TASK.md with completed items
5. Update files.md if adding new files

## Changelog format

Use Keep a Changelog format for GitHub Releases automation:

```markdown
## [X.X.X] - YYYY-MM-DD

### Added

- New feature

### Changed

- Modified behavior

### Fixed

- Bug fix
```

## PR guidelines

- Title format: `feat: description` or `fix: description`
- Run type check before committing
- Keep changes focused on one feature or fix

## Environment variables

| Variable            | Purpose                     |
| ------------------- | --------------------------- |
| `CONVEX_DEPLOY_KEY` | Deploy key for Convex auth  |
| `CONVEX_URL`        | Override deployment URL     |
| `MCP_TIMEOUT`       | Server startup timeout (ms) |

## Key dependencies

| Package                     | Purpose                     |
| --------------------------- | --------------------------- |
| `@modelcontextprotocol/sdk` | MCP protocol implementation |
| `convex`                    | Convex database client      |
| `beautiful-mermaid`         | Mermaid diagram rendering   |
