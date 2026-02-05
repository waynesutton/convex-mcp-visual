# MCP Apps Support

convex-mcp-visual supports MCP Apps (SEP-1865) for embedded UI rendering in compatible hosts like ChatGPT, Claude web, VS Code, Cursor, and other MCP Apps compatible clients.

## What are MCP Apps?

MCP Apps is an open standard that allows MCP servers to provide interactive UI widgets that render directly inside AI assistants and IDEs. Instead of just returning text, tools can display rich HTML interfaces.

## Supported clients

| Client | Status | Notes |
|--------|--------|-------|
| ChatGPT | Supported | Via MCP Apps SDK |
| Claude Code (web) | Supported | Native MCP Apps support |
| Claude Desktop | Supported | With MCP Apps extension |
| VS Code | Supported | With MCP extension |
| Cursor | Supported | Native MCP support |
| Codex CLI | Supported | Stdio mode |
| OpenCode | Supported | Stdio mode |

## Setup

### For ChatGPT

1. Install the MCP connector if needed
2. Add convex-mcp-visual as an MCP server
3. Use tools normally - UI will render embedded

### For Claude Code (web or desktop)

```bash
# Install to Claude
npx convex-mcp-visual --install-claude

# Or add manually via CLI
claude mcp add convex-visual -- npx convex-mcp-visual --stdio
```

### For Cursor

```bash
# Install automatically
npx convex-mcp-visual --install-cursor

# Or add to ~/.cursor/mcp.json manually
```

### For VS Code

Add to your VS Code settings or MCP configuration:

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

### For Codex CLI

```bash
# Install automatically
npx convex-mcp-visual --install-codex

# Or add manually
codex mcp add convex-visual -- npx convex-mcp-visual --stdio
```

### HTTP mode (for team deployments)

Run the server in HTTP mode for shared access:

```bash
npx convex-mcp-visual --http --port 3001
```

Then configure clients to connect via HTTP:

```json
{
  "convex-visual": {
    "url": "http://localhost:3001/mcp"
  }
}
```

## Available tools with embedded UI

All 8 tools support embedded UI rendering when the host supports MCP Apps:

| Tool | Description | Resource URI |
|------|-------------|--------------|
| `schema_browser` | Interactive schema explorer | `ui://convex-visual/schema-browser.html` |
| `dashboard_view` | Real-time metrics dashboard | `ui://convex-visual/dashboard.html` |
| `schema_diagram` | Mermaid ER diagram | `ui://convex-visual/schema-diagram.html` |
| `codebase_subway_map` | File dependency visualization | `ui://convex-visual/subway-map.html` |
| `table_heatmap` | Write activity heatmap | `ui://convex-visual/table-heatmap.html` |
| `schema_drift` | Declared vs inferred schema comparison | `ui://convex-visual/schema-drift.html` |
| `write_conflict_report` | Write conflict analysis | `ui://convex-visual/write-conflicts.html` |
| `kanban_board` | Scheduled functions kanban view | `ui://convex-visual/kanban-board.html` |

## How it works

1. Each tool definition includes a `_meta.ui.resourceUri` field pointing to its HTML resource
2. Resources are registered with MIME type `text/html;profile=mcp-app`
3. When a host supports MCP Apps, it fetches the resource URI and renders the HTML inline
4. The HTML communicates with the MCP server via the MCP Apps bridge (JSON-RPC over postMessage)

## Fallback behavior

If the host does not support MCP Apps:
- Tools still return text output
- The local browser UI can be launched for interactive visualization
- All existing functionality (CLI, stdio mode) continues to work unchanged

## CORS support

The HTTP mode includes CORS headers for cross-origin requests from web-based hosts:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

## Resource endpoints (HTTP mode)

When running in HTTP mode, UI resources are available at:

- `http://localhost:3001/ui/schema-browser.html`
- `http://localhost:3001/ui/dashboard.html`
- `http://localhost:3001/ui/kanban-board.html`
- etc.

## Troubleshooting

### UI not rendering in ChatGPT

1. Verify your MCP connector is properly configured
2. Check that the server is running and accessible
3. Ensure your ChatGPT account has MCP Apps access

### UI not rendering in Claude

1. Verify the MCP server is installed: `claude mcp list`
2. Check server logs for errors
3. Try reinstalling: `npx convex-mcp-visual --install-claude`

### Connection issues

1. Test the connection: `npx convex-mcp-visual --test`
2. Verify your `CONVEX_DEPLOY_KEY` is set
3. Check the deployment URL is correct

## Technical details

### MCP Apps specification

This implementation follows SEP-1865, the MCP Apps standard. Key aspects:

- Tools include `_meta.ui.resourceUri` pointing to their UI resource
- Resources use MIME type `text/html;profile=mcp-app` for identification
- HTML resources are self-contained single-page apps
- Communication happens via the MCP Apps bridge (JSON-RPC over postMessage)

### Resource URIs

The `ui://` scheme is used for MCP Apps resources:

```
ui://convex-visual/schema-browser.html
```

This URI is resolved by the MCP host to fetch the actual HTML content.

## Version compatibility

MCP Apps support was added in convex-mcp-visual v1.5.0. Earlier versions work with stdio mode but do not support embedded UI rendering in MCP Apps hosts.
