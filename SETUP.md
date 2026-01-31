# Setup Guide

Complete installation and configuration for Convex MCP Visual.

## Convex References

- [Deploy Keys](https://docs.convex.dev/cli/deploy-key-types) - Types of deploy keys and when to use them
- [Management API](https://docs.convex.dev/management-api) - Programmatic project and deployment management
- [Platform APIs](https://docs.convex.dev/platform-apis) - Building integrations on Convex
- [CLI Documentation](https://docs.convex.dev/cli) - Convex command line interface

## Prerequisites

Before you begin

- **Node.js 18+** - Check with `node --version`
- **A Convex deployment** - Create one at [convex.dev](https://convex.dev) or use an existing project
- **An MCP compatible host** - Claude Code, Claude Desktop, Cursor, or VS Code with MCP support

## Installation

### Step 1: Clone and install

```bash
git clone https://github.com/your-org/convex-mcp-visual.git
cd convex-mcp-visual
npm install
```

### Step 2: Build the project

```bash
npm run build
```

This compiles the TypeScript server and bundles all UI apps into `dist/`.

### Step 3: Verify the build

```bash
ls dist/
# Should show: index.js, schema-browser.html, realtime-dashboard.html
```

## Configuration

### Claude Code

Add the MCP server to Claude Code:

```bash
claude mcp add-json convex-apps '{"type":"stdio","command":"node","args":["'$(pwd)'/dist/index.js","--stdio"]}'
```

Verify it's connected:

```bash
claude mcp get convex-apps
```

### Claude Desktop

Edit your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add to the `mcpServers` section:

```json
{
  "mcpServers": {
    "convex-apps": {
      "command": "node",
      "args": ["/absolute/path/to/convex-mcp-visual/dist/index.js", "--stdio"]
    }
  }
}
```

Restart Claude Desktop after saving.

### VS Code (GitHub Copilot)

Add to your VS Code settings or `.vscode/mcp.json`:

```json
{
  "mcpServers": {
    "convex-apps": {
      "command": "node",
      "args": ["/absolute/path/to/convex-mcp-visual/dist/index.js", "--stdio"]
    }
  }
}
```

### Cursor

Add to `~/.cursor/mcp.json` or your project's `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "convex-apps": {
      "command": "node",
      "args": ["/absolute/path/to/convex-mcp-visual/dist/index.js", "--stdio"]
    }
  }
}
```

## Authentication

The MCP server needs access to your Convex deployment. There are three ways to authenticate, depending on your use case.

### Option 1: Local Convex credentials (recommended for development)

If you've used Convex before, you're probably already set up. The MCP server reads the same credentials that `npx convex dev` uses.

**How it works:**

1. When you run `npx convex login`, your auth token is stored in `~/.convex/`
2. The MCP server automatically reads these credentials
3. No additional configuration needed

**First-time setup:**

```bash
npx convex login
```

This opens a browser for authentication. Once complete, the MCP server can access any deployment your account has permissions for.

**What gets stored:**

- Auth token in `~/.convex/`
- Project-to-deployment mappings
- No passwords stored locally

### Option 2: Deploy key (recommended for CI/CD and teams)

For automated environments or shared team setups, use a deploy key instead of personal credentials.

**How it works:**

1. Generate a deploy key in the Convex dashboard
2. Pass it via environment variable
3. Server uses the key for all requests

**Setup:**

```bash
# Get deploy key from: dashboard.convex.dev → Your Project → Settings → Deploy Keys
export CONVEX_DEPLOY_KEY=prod:your-key-here

# Run the MCP server
node dist/index.js --stdio
```

Or in your MCP config:

```json
{
  "mcpServers": {
    "convex-apps": {
      "command": "node",
      "args": ["/path/to/dist/index.js", "--stdio"],
      "env": {
        "CONVEX_DEPLOY_KEY": "prod:your-key-here"
      }
    }
  }
}
```

**Deploy key permissions:**

- Read access to tables and schemas
- Execute queries and functions
- Scoped to a single deployment
- Can be revoked anytime from dashboard

### Switching deploy keys

#### Using --setup wizard

The `--setup` wizard only writes `~/.convex-mcp-visual.json`. It does not update `CONVEX_DEPLOY_KEY` in your shell profile or MCP client config. If the server still uses the old key, update the source that takes priority, then restart your MCP client.

#### Deploy key priority order

1. `CONVEX_DEPLOY_KEY` environment variable
2. `CONVEX_URL` environment variable for the url
3. `.env.local` for `CONVEX_URL`
4. `.convex/deployment.json` for `url` and `adminKey`
5. `~/.convex/config.json` for `accessToken`
6. `~/.convex-mcp-visual.json` for `deploymentUrl` and `adminKey`

If you want the setup wizard value to win, remove any higher priority source or set `CONVEX_DEPLOY_KEY` directly in your MCP client config.

#### Debug config sources

See all detected config sources and which one is being used:

```bash
npx convex-mcp-visual --config
```

### Option 3: Deployment URL (for specific deployments)

Point directly at a deployment URL when you know exactly which one to use.

```bash
export CONVEX_URL=https://your-deployment-123.convex.cloud
node dist/index.js --stdio
```

This still requires either local credentials or a deploy key for authentication.

### Multiple deployments

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

#### Alternative: Shell Environment Variable

If you work on one project at a time, set the deploy key in your current terminal:

```bash
cd my-convex-app/
export CONVEX_DEPLOY_KEY="prod:happy-animal-123|your-key"
npx convex-mcp-visual --test
```

When switching projects, export a different key for that project.

### Security model

**Where credentials live:**

```
┌─────────────────────────────────────────────────────────┐
│                    Your Machine                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │              MCP Server (Node.js)                │    │
│  │  - Reads ~/.convex/ credentials                  │    │
│  │  - Or uses CONVEX_DEPLOY_KEY                     │    │
│  │  - Makes authenticated requests to Convex        │    │
│  └─────────────────────────────────────────────────┘    │
│                         │                                │
│                         ▼                                │
│  ┌─────────────────────────────────────────────────┐    │
│  │           UI Iframe (sandboxed)                  │    │
│  │  - NO access to credentials                      │    │
│  │  - Communicates only via JSON-RPC postMessage    │    │
│  │  - Requests data through MCP server              │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                         │
                         │ HTTPS (authenticated)
                         ▼
┌─────────────────────────────────────────────────────────┐
│                 Convex Cloud                             │
│  - Validates credentials                                 │
│  - Enforces access control                               │
│  - Returns only permitted data                           │
└─────────────────────────────────────────────────────────┘
```

**Key security points:**

- Credentials stay on your machine, never sent to Claude or the host
- UI iframe is sandboxed with restricted permissions
- All data requests route through the MCP server
- Convex enforces your deployment's access rules
- Queries run in Convex's sandbox (read-only, can't modify data)

### Re-authenticating

If you see authentication errors:

```bash
# Clear and re-login
npx convex logout
npx convex login
```

For deploy key issues, generate a new key in the Convex dashboard.

## Environment variables

Optional configuration via environment variables:

| Variable                | Description                 | Default           |
| ----------------------- | --------------------------- | ----------------- |
| `CONVEX_URL`            | Override deployment URL     | From local config |
| `CONVEX_DEPLOY_KEY`     | Deploy key for CI/CD        | None              |
| `MCP_TIMEOUT`           | Server startup timeout (ms) | 10000             |
| `MAX_MCP_OUTPUT_TOKENS` | Max output size             | 25000             |

Example:

```bash
CONVEX_URL=https://your-deployment.convex.cloud node dist/index.js --stdio
```

## Verification

Test that everything works:

1. Open Claude (Code, Desktop, or web)
2. Type: "Show me my Convex schema"
3. The Schema Browser should render inline

If it doesn't work:

```bash
# Check MCP server status
claude mcp list

# View server logs
claude mcp get convex-apps
```

## Advanced deployment

### Running as a background service

For always-on availability, run the server as a systemd service (Linux) or launchd daemon (macOS).

**systemd example** (`/etc/systemd/system/convex-mcp-visual.service`):

```ini
[Unit]
Description=Convex MCP Apps Server
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/convex-mcp-visual
ExecStart=/usr/bin/node dist/index.js --http --port 3001
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

### HTTP transport (for remote access)

The server supports HTTP transport for team deployments:

```bash
node dist/index.js --http --port 3001
```

Then configure clients to use HTTP:

```bash
claude mcp add --transport http convex-apps http://localhost:3001/mcp
```

### Docker deployment

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
docker run -p 3001:3001 convex-mcp-visual
```

## Troubleshooting

### "Connection closed" error

On Windows, wrap the command:

```json
{
  "command": "cmd",
  "args": ["/c", "node", "C:\\path\\to\\dist\\index.js", "--stdio"]
}
```

### Server not appearing in Claude

1. Check the path is absolute, not relative
2. Verify Node.js is in your PATH
3. Restart Claude after config changes

### Authentication errors

```bash
# Re-authenticate with Convex
npx convex logout
npx convex login
```

### UI not rendering

Some hosts require explicit MCP Apps support. Check your host's documentation for compatibility. The server falls back to text-only output for hosts that don't support MCP Apps.

## How Deploy Keys Work

Deploy keys are the recommended authentication method for MCP servers. They identify a specific deployment and grant permission to read schema and data.

### Deploy Key Format

```
prod:happy-animal-123|convex_deploy_abc123xyz
```

- `prod:` or `dev:` prefix indicates deployment type
- `happy-animal-123` is the deployment name
- Everything after `|` is the admin key

### Key Types

| Type                  | Format                      | Use Case                               |
| --------------------- | --------------------------- | -------------------------------------- |
| Production deploy key | `prod:name\|key`            | Production MCP servers, CI/CD          |
| Dev deploy key        | `dev:name\|key`             | Development MCP servers, local testing |
| Preview deploy key    | `preview:team:project\|key` | Preview deployments                    |

See [Convex Deploy Keys Documentation](https://docs.convex.dev/cli/deploy-key-types) for full details.

### Getting a Deploy Key

1. Go to [dashboard.convex.dev](https://dashboard.convex.dev)
2. Select your project
3. Navigate to Settings > Deploy Keys
4. Click Generate Deploy Key
5. Copy the full key including the prefix

## Next steps

- [Schema Browser documentation](../apps/schema-browser/README.md)
- [Realtime Dashboard documentation](../apps/realtime-dashboard/README.md)
- [Convex Documentation](https://docs.convex.dev)
