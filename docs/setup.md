# Setup Guide

Complete setup instructions for Convex MCP Visual.

## Prerequisites

- Node.js 18+
- A Convex project with data
- An MCP client (Claude Code, Claude Desktop, Cursor, etc.)

## Quick Install

```bash
# Install globally
npm install -g convex-mcp-visual

# Or run directly with npx
npx convex-mcp-visual --setup
```

## Convex References

- [Deploy Keys](https://docs.convex.dev/cli/deploy-key-types) - Types of deploy keys and when to use them
- [Management API](https://docs.convex.dev/management-api) - Programmatic project and deployment management
- [Platform APIs](https://docs.convex.dev/platform-apis) - Building integrations on Convex
- [CLI Documentation](https://docs.convex.dev/cli) - Convex command line interface

## Getting Your Deploy Key

1. Go to [dashboard.convex.dev](https://dashboard.convex.dev)
2. Select your project
3. Click Settings (gear icon)
4. Click Deploy Keys in the sidebar
5. Click Generate Deploy Key
6. Copy the key (format: `prod:happy-animal-123|convex_deploy_abc123...`)

## Configuration Methods

### Method 1: Interactive Setup (Recommended)

Run the setup wizard from your Convex project folder:

```bash
cd my-convex-app/
npx convex-mcp-visual --setup
```

This will:

- Detect your project from `.env.local` or `.convex/deployment.json`
- Open the Convex dashboard and tell you which project to select
- Prompt you to paste your deploy key
- Save the deploy key to `.env.local` in the current directory (per-project)
- Test the connection

When run inside a Convex project folder, the wizard shows which deployment it detected so you know which project to select in the dashboard.

### Method 2: Environment Variable (Current Session Only)

Set the variable for a single terminal session. The key is active until you close the terminal.

**macOS/Linux:**

```bash
export CONVEX_DEPLOY_KEY="prod:your-deployment|your-key"
```

**Windows (PowerShell):**

```powershell
$env:CONVEX_DEPLOY_KEY = "prod:your-deployment|your-key"
```

> **Do not add this to your shell profile** (`~/.zshrc`, `~/.bashrc`, `~/.zprofile`, or similar).
> A global export overrides all per-project `.env.local` files and causes every project
> to connect to the same deployment. Use Method 1 (`--setup`) for persistent config.

If you previously added `export CONVEX_DEPLOY_KEY=...` to a shell profile, see
[Removing a global export](#removing-a-global-export) below to undo it.

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

### Debug Config Sources

See all detected config sources and which one is being used:

```bash
npx convex-mcp-visual --config
```

### Change Deploy Key

Run the setup wizard again.

```bash
npx convex-mcp-visual --setup
```

The setup wizard writes to `.env.local` in the current directory. It does not modify your shell profile or MCP client config. If the deployment does not change, a higher-priority config source is taking priority (such as a `CONVEX_DEPLOY_KEY` environment variable). Run `npx convex-mcp-visual --config` to see which source is active.

### Deploy Key Priority

1. `CONVEX_DEPLOY_KEY` environment variable
2. `CONVEX_URL` environment variable for the url
3. `.env.local` for `CONVEX_URL`
4. `.convex/deployment.json` for `url` and `adminKey`
5. `~/.convex/config.json` for `accessToken`
6. `~/.convex-mcp-visual.json` for `deploymentUrl` and `adminKey`

### Clear a Stuck Key

1. Remove the local config file so setup can write a new one.

```bash
rm ~/.convex-mcp-visual.json
```

2. Check if `CONVEX_DEPLOY_KEY` is set in your shell or MCP client config and update or remove it.
3. Restart your terminal and your MCP client so the new env is loaded.
4. Test the connection.

```bash
npx convex-mcp-visual --test
```

### Removing a Global Export

If you previously added `export CONVEX_DEPLOY_KEY=...` to a shell profile, follow these steps to remove it. A global export overrides all per-project `.env.local` files.

**Step 1: Clear the current session**

```bash
unset CONVEX_DEPLOY_KEY
```

**Step 2: Remove the line from your shell profile**

Open the file in your editor and delete the `export CONVEX_DEPLOY_KEY=...` line.

| OS | Shell | File to check |
| --- | --- | --- |
| macOS | zsh (default since Catalina) | `~/.zshrc` or `~/.zprofile` |
| macOS | bash | `~/.bash_profile` or `~/.bashrc` |
| Linux | bash | `~/.bashrc` or `~/.profile` |
| Linux | zsh | `~/.zshrc` |
| Windows | PowerShell | Run `[Environment]::SetEnvironmentVariable("CONVEX_DEPLOY_KEY", $null, "User")` |
| Windows | System env | Settings > System > Advanced > Environment Variables, remove `CONVEX_DEPLOY_KEY` |

**Step 3: Restart your terminal**

Open a new terminal window and verify the variable is gone:

```bash
echo $CONVEX_DEPLOY_KEY
```

If it still prints a value, you have the export in more than one file. Check all files listed in the table above.

**Step 4: Re-run setup**

```bash
cd my-convex-app/
npx convex-mcp-visual --setup
```

### Multiple Deployments

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

#### Alternative: MCP Config (for Claude Desktop)

If you prefer separate MCP servers per project:

```json
{
  "mcpServers": {
    "convex-app1": {
      "command": "npx",
      "args": ["convex-mcp-visual", "--stdio"],
      "env": { "CONVEX_DEPLOY_KEY": "prod:happy-animal-123|your-key" }
    }
  }
}
```

See [Convex Deploy Keys](https://docs.convex.dev/cli/deploy-key-types) for more details.

## Upgrading

### npx users

If you run via `npx convex-mcp-visual`, you get the latest version automatically.

To force a fresh install:

```bash
npx convex-mcp-visual@latest --test
```

### Global install users

```bash
npm update -g convex-mcp-visual
```

### Verify your version

```bash
npx convex-mcp-visual --version
```

## Environment Variables

| Variable                  | Purpose                           | Default            |
| ------------------------- | --------------------------------- | ------------------ |
| `CONVEX_DEPLOY_KEY`       | Deploy key for authentication     | None               |
| `CONVEX_URL`              | Override deployment URL           | Extracted from key |
| `CONVEX_DOC_SAMPLE_LIMIT` | Max documents to sample per table | 100                |
| `MCP_TIMEOUT`             | Server startup timeout (ms)       | 10000              |
| `DEBUG`                   | Enable debug logging              | false              |

## How Deploy Keys Work

Deploy keys are the recommended authentication method for MCP servers and CI/CD environments. They identify a specific deployment and grant permission to read schema and data.

### Deploy Key Format

```
prod:happy-animal-123|convex_deploy_abc123xyz
```

- `prod:` or `dev:` prefix indicates deployment type
- `happy-animal-123` is the deployment name
- Everything after `|` is the admin key

### Key Types

| Type                  | Format                      | Use Case                                  |
| --------------------- | --------------------------- | ----------------------------------------- |
| Production deploy key | `prod:name\|key`            | CI/CD deployments, production MCP servers |
| Dev deploy key        | `dev:name\|key`             | Development MCP servers, local testing    |
| Preview deploy key    | `preview:team:project\|key` | Preview deployments                       |

See [Convex Deploy Keys Documentation](https://docs.convex.dev/cli/deploy-key-types) for full details.

### Getting a Deploy Key

1. Go to [dashboard.convex.dev](https://dashboard.convex.dev)
2. Select your project
3. Navigate to Settings > Deploy Keys
4. Click Generate Deploy Key
5. Copy the full key including the prefix

### Convex User Token

If you have logged in with `npx convex login`, your user token is stored at `~/.convex/config.json`. This token grants access to all your deployments but is not recommended for MCP servers since it requires specifying which deployment to connect to.

For MCP servers, deploy keys are preferred because:

- They specify the exact deployment
- They can be scoped to production or development
- They are easier to manage in CI/CD and MCP configs

## Troubleshooting Authentication

### Wrong deployment showing

Run `npx convex-mcp-visual --config` to see all detected config sources. The first source with a valid key wins.

### Cannot connect after setup

1. Check if `CONVEX_DEPLOY_KEY` is set in your shell: `echo $CONVEX_DEPLOY_KEY`
2. Check MCP client config for hardcoded keys
3. Run `npx convex-mcp-visual --test` to verify connection

### Multiple keys causing conflicts

Clear all sources and start fresh:

```bash
rm -f ~/.convex-mcp-visual.json
unset CONVEX_DEPLOY_KEY
npx convex-mcp-visual --setup
```

For more help, see [Troubleshooting](./troubleshooting.md).

## MCP Client Configuration

### CLI Install (Recommended)

The fastest way to configure any MCP client:

```bash
# Install to all detected MCP clients (Cursor, OpenCode, Claude Desktop, Codex)
npx convex-mcp-visual --install

# Or target specific clients
npx convex-mcp-visual --install-cursor
npx convex-mcp-visual --install-opencode
npx convex-mcp-visual --install-claude
npx convex-mcp-visual --install-codex
```

This automatically updates the config files:

| Client         | Config Path                                                       |
| -------------- | ----------------------------------------------------------------- |
| Cursor         | `~/.cursor/mcp.json`                                              |
| OpenCode       | `~/.config/opencode/opencode.json`                                |
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Codex CLI      | `~/.codex/config.toml`                                            |

### Uninstall from MCP Clients

```bash
# Remove from all clients
npx convex-mcp-visual --uninstall

# Or remove from specific clients
npx convex-mcp-visual --uninstall-cursor
npx convex-mcp-visual --uninstall-opencode
npx convex-mcp-visual --uninstall-claude
npx convex-mcp-visual --uninstall-codex
```

### Claude Code (CLI)

```bash
claude mcp add convex-visual -- npx convex-mcp-visual --stdio
```

Verify installation:

```bash
claude mcp list
```

### Codex CLI

Add the server using the Codex CLI:

```bash
codex mcp add convex-visual -- npx convex-mcp-visual --stdio
```

Verify installation:

```bash
codex mcp list
```

Or add manually to `~/.codex/config.toml`:

```toml
[mcp_servers.convex-visual]
command = "npx"
args = ["-y", "convex-mcp-visual", "--stdio"]
```

For project-scoped config, create `.codex/config.toml` in your project root.

See [Codex MCP docs](https://developers.openai.com/codex/mcp/) for more details.

### Claude Desktop (Manual)

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

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

Restart Claude Desktop after saving.

### Cursor (Manual)

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "convex-visual": {
      "command": "npx",
      "args": ["convex-mcp-visual", "--stdio"]
    }
  }
}
```

### OpenCode (Manual)

Add to `~/.config/opencode/opencode.json`:

```json
{
  "mcp": {
    "convex-visual": {
      "type": "local",
      "command": ["npx", "-y", "convex-mcp-visual", "--stdio"],
      "enabled": true
    }
  }
}
```

Note: OpenCode uses a different MCP config schema than Claude Desktop and Cursor. It requires `type: "local"`, `command` as an array (not separate command/args), and `enabled: true`.

### VS Code (Manual)

Add to settings or `.vscode/mcp.json`:

```json
{
  "mcpServers": {
    "convex-visual": {
      "command": "npx",
      "args": ["convex-mcp-visual", "--stdio"]
    }
  }
}
```

## Advanced Deployment

### HTTP Transport

For team deployments or remote access:

```bash
npx convex-mcp-visual --http --port 3001
```

Configure clients to use HTTP:

```bash
claude mcp add --transport http convex-visual http://localhost:3001/mcp
```

### Docker

```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
EXPOSE 3001
CMD ["node", "dist/index.js", "--http", "--port", "3001"]
```

Build and run:

```bash
docker build -t convex-mcp-visual .
docker run -p 3001:3001 -e CONVEX_DEPLOY_KEY="prod:your-key" convex-mcp-visual
```

### systemd Service (Linux)

Create `/etc/systemd/system/convex-mcp-visual.service`:

```ini
[Unit]
Description=Convex MCP Visual Server
After=network.target

[Service]
Type=simple
User=youruser
Environment=CONVEX_DEPLOY_KEY=prod:your-key
ExecStart=/usr/bin/npx convex-mcp-visual --http --port 3001
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable convex-mcp-visual
sudo systemctl start convex-mcp-visual
```

## Building from Source

For development or customization:

```bash
git clone https://github.com/waynesutton/convex-mcp-visual.git
cd convex-mcp-visual
npm install
npm run build
```

Test the build:

```bash
node dist/index.js --test
```
