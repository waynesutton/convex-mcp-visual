# Convex MCP Schema Visualizer

Schema visualizer and dashboard view tools for exploring Convex databases. Opens interactive browser UIs alongside terminal output.

**Features:**

- Schema visualizer graph view with draggable table nodes and relationship lines
- List view with document browser and schema details
- Dashboard view with real time metrics and charts
- Dark mode support
- Multi deployment support for developers with multiple Convex apps

Works with Claude Code, Claude Desktop, Cursor, and any MCP client.

**Convex References:**

- [Deploy Keys](https://docs.convex.dev/cli/deploy-key-types) - Authentication for deployments
- [Management API](https://docs.convex.dev/management-api) - Programmatic project management
- [Platform APIs](https://docs.convex.dev/platform-apis) - Building on Convex

## Quick Start

### 1. Install

```bash
# Claude Code
claude mcp add convex-visual -- npx convex-mcp-visual --stdio

# Or install globally
npm install -g convex-mcp-visual
```

### 2. Setup Deploy Key

Run setup from your Convex project folder:

```bash
cd my-convex-app/
npx convex-mcp-visual --setup
```

The setup wizard detects your project from `.env.local` and shows which deployment to look for in the dashboard. Just copy and paste the key.

Or set the environment variable manually:

```bash
export CONVEX_DEPLOY_KEY="prod:your-deployment|your-key"
```

Get your deploy key from [dashboard.convex.dev](https://dashboard.convex.dev) under Settings > Deploy Keys.

### Multiple Convex Apps

**One-time setup for each project:**

```bash
cd my-app-1/
npx convex-mcp-visual --setup
# Paste your deploy key when prompted, it saves to .env.local
```

**Switching between apps:** Just `cd` to the project folder. The MCP server reads from that folder's `.env.local` automatically.

```bash
cd my-app-1/   # Now using my-app-1's Convex deployment
cd ../my-app-2/ # Now using my-app-2's Convex deployment
```

No need to run `--setup` again after the initial setup.

See [Convex Deploy Keys](https://docs.convex.dev/cli/deploy-key-types) for more details.

### 3. Test Connection

```bash
npx convex-mcp-visual --test
```

### 4. Use It

**MCP Commands for Claude:**

| What you say                          | Tool triggered                    |
| ------------------------------------- | --------------------------------- |
| "Show me my Convex schema"            | `schema_browser`                  |
| "What tables do I have?"              | `schema_browser`                  |
| "Browse my database"                  | `schema_browser`                  |
| "Show schema for users table"         | `schema_browser` with table param |
| "Create a dashboard for my data"      | `dashboard_view`                  |
| "Show me metrics for my app"          | `dashboard_view`                  |
| "Generate a diagram of my schema"     | `schema_diagram`                  |
| "Show me a Mermaid ER diagram"        | `schema_diagram`                  |
| "Visualize my database relationships" | `schema_diagram`                  |

All tools open an interactive browser UI and return output to the terminal.

**Schema Diagram Features:**

- Auto detects table relationships from foreign key patterns
- ASCII/Unicode output for terminal
- SVG diagram in browser with theme options
- Exportable Mermaid code

## Documentation

- [Setup Guide](docs/setup.md) - Detailed configuration options
- [Junior Guide](docs/junior-guide.md) - Intro for Claude web, stack, and read only access
- [Tools Reference](docs/tools.md) - Parameters and keyboard shortcuts
- [Architecture](docs/architecture.md) - How it works
- [Troubleshooting](docs/troubleshooting.md) - Common issues and fixes
- [Limitations](docs/limitations.md) - Known limitations

## Configuration

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "convex-visual": {
      "command": "npx",
      "args": ["convex-mcp-visual", "--stdio"],
      "env": {
        "CONVEX_DEPLOY_KEY": "prod:your-deployment|your-key"
      }
    }
  }
}
```

### Cursor / VS Code

Add to MCP settings:

```json
{
  "mcp.servers": {
    "convex-visual": {
      "command": "npx",
      "args": ["convex-mcp-visual", "--stdio"]
    }
  }
}
```

## CLI Options

```
convex-mcp-visual [options]

Options:
  --stdio              Run in stdio mode (default)
  --http               Run in HTTP mode
  --port <num>         Port for HTTP mode (default: 3001)
  --test               Test Convex connection
  --setup              Interactive setup wizard
  --config             Show all detected config sources
  -v, --version        Show version number
  -h, --help           Show help
```

## Upgrading

```bash
# Check your current version
npx convex-mcp-visual --version

# If using npx, you get the latest version automatically
npx convex-mcp-visual@latest --version

# If installed globally, update with
npm update -g convex-mcp-visual
```

## Uninstalling

```bash
# Remove from Claude Code
claude mcp remove convex-visual

# Remove global package
npm uninstall -g convex-mcp-visual
```

## Contributing

See [Development](docs/architecture.md) for build instructions.

```bash
git clone https://github.com/waynesutton/convex-mcp-visual.git
cd convex-mcp-visual
npm install
npm run build
```

## License

MIT
