# Setup Guide

Complete setup instructions for Convex MCP Visual.

## Prerequisites

- Node.js 18+
- A Convex project with data
- An MCP client (Claude Code, Claude Desktop, Cursor, etc.)

## Getting Your Deploy Key

1. Go to [dashboard.convex.dev](https://dashboard.convex.dev)
2. Select your project
3. Click Settings (gear icon)
4. Click Deploy Keys in the sidebar
5. Click Generate Deploy Key
6. Copy the key (format: `prod:happy-animal-123|convex_deploy_abc123...`)

## Configuration Methods

### Method 1: Interactive Setup (Recommended)

Run the setup wizard:

```bash
npx convex-mcp-visual --setup
```

This will:

- Open the Convex dashboard for you
- Prompt you to paste your deploy key
- Save the config to `~/.convex-mcp-visual.json`
- Test the connection

### Method 2: Environment Variable

Add to your shell profile:

**macOS/Linux (zsh):**

```bash
echo 'export CONVEX_DEPLOY_KEY="prod:your-deployment|your-key"' >> ~/.zshrc
source ~/.zshrc
```

**macOS/Linux (bash):**

```bash
echo 'export CONVEX_DEPLOY_KEY="prod:your-deployment|your-key"' >> ~/.bashrc
source ~/.bashrc
```

**Windows (PowerShell):**

```powershell
[Environment]::SetEnvironmentVariable("CONVEX_DEPLOY_KEY", "prod:your-deployment|your-key", "User")
```

### Method 3: MCP Client Config

Pass the key directly in your MCP client configuration:

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

## Verifying Setup

Test your connection:

```bash
npx convex-mcp-visual --test
```

Expected output:

```
Testing Convex connection...
[OK] Connection successful!
  Deployment: https://your-deployment.convex.cloud
  Tables found: 5
  Admin access: Yes
```

## Switching Deployments

### Change Deploy Key

```bash
# Run setup again
npx convex-mcp-visual --setup

# Or edit your shell profile
nano ~/.zshrc
# Update the CONVEX_DEPLOY_KEY line
source ~/.zshrc
```

### Multiple Deployments

Register multiple MCP servers:

```bash
# Production
claude mcp add convex-prod -e CONVEX_DEPLOY_KEY=prod:key1 -- npx convex-mcp-visual --stdio

# Development
claude mcp add convex-dev -e CONVEX_DEPLOY_KEY=dev:key2 -- npx convex-mcp-visual --stdio
```

## Environment Variables

| Variable                  | Purpose                           | Default            |
| ------------------------- | --------------------------------- | ------------------ |
| `CONVEX_DEPLOY_KEY`       | Deploy key for authentication     | None               |
| `CONVEX_URL`              | Override deployment URL           | Extracted from key |
| `CONVEX_DOC_SAMPLE_LIMIT` | Max documents to sample per table | 100                |
| `MCP_TIMEOUT`             | Server startup timeout (ms)       | 10000              |
| `DEBUG`                   | Enable debug logging              | false              |
