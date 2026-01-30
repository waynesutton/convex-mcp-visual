# Convex MCP Visual

Visual MCP tools for exploring Convex databases. Opens interactive browser UIs alongside terminal output.

**Features:**

- Graph View with draggable table nodes and relationship lines
- List View with document browser and schema details
- Dashboard with real-time metrics and charts
- Dark mode support

Works with Claude Code, Claude Desktop, Cursor, and any MCP client.

## Quick Start

### 1. Install

```bash
# Claude Code
claude mcp add convex-visual -- npx convex-mcp-visual --stdio

# Or install globally
npm install -g convex-mcp-visual
```

### 2. Setup Deploy Key

Run the interactive setup:

```bash
npx convex-mcp-visual --setup
```

Or set the environment variable:

```bash
export CONVEX_DEPLOY_KEY="prod:your-deployment|your-key"
```

Get your deploy key from [dashboard.convex.dev](https://dashboard.convex.dev) under Settings > Deploy Keys.

### 3. Test Connection

```bash
npx convex-mcp-visual --test
```

### 4. Use It

In Claude, try:

- "Show me my Convex schema"
- "What tables do I have?"
- "Create a dashboard for my data"

## Documentation

- [Setup Guide](docs/setup.md) - Detailed configuration options
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
  --stdio       Run in stdio mode (default)
  --http        Run in HTTP mode
  --port <num>  Port for HTTP mode (default: 3001)
  --test        Test Convex connection
  --setup       Interactive setup wizard
  -v, --version Show version number
  -h, --help    Show help
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
