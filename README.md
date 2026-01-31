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

### Switching Deployments

Connect to a specific deployment by name:

```bash
npx convex-mcp-visual --deployment happy-animal-123 --test
```

Or see which config source is being used:

```bash
npx convex-mcp-visual --config
```

Clear config and set up a new deployment:

```bash
rm -f ~/.convex-mcp-visual.json
unset CONVEX_DEPLOY_KEY
npx convex-mcp-visual --setup
```

### Multiple Convex Apps

Register separate MCP servers for each deployment:

```bash
# App 1
claude mcp add convex-app1 -- npx convex-mcp-visual --deployment happy-animal-123 --stdio

# App 2
claude mcp add convex-app2 -- npx convex-mcp-visual --deployment jolly-jaguar-456 --stdio
```

Or use environment variables:

```json
{
  "mcpServers": {
    "convex-prod": {
      "command": "npx",
      "args": ["convex-mcp-visual", "--stdio"],
      "env": { "CONVEX_DEPLOY_KEY": "prod:happy-animal-123|your-key" }
    },
    "convex-dev": {
      "command": "npx",
      "args": ["convex-mcp-visual", "--stdio"],
      "env": { "CONVEX_DEPLOY_KEY": "dev:cool-cat-789|your-key" }
    }
  }
}
```

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
  --deployment <name>  Connect to specific deployment by name
  --test               Test Convex connection
  --setup              Interactive setup wizard
  --config             Show all detected config sources
  -v, --version        Show version number
  -h, --help           Show help
```

The `--deployment` flag lets you connect to any deployment without changing environment variables. This is useful when working with multiple Convex apps.

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
