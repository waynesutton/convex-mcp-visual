# Claude Code Plugin Distribution

This guide explains how to distribute convex-mcp-visual as a Claude Code plugin through the plugin marketplace.

## Plugin structure

The plugin is defined by these files:

```
convex-mcp-visual/
├── .claude-plugin/
│   └── plugin.json       # Plugin manifest
├── .mcp.json             # MCP server configuration
└── skills/
    └── convex-schema/
        └── SKILL.md      # Skill for schema browsing
```

## Install from GitHub (direct)

Users can install the plugin directly from this repository:

```shell
/plugin marketplace add waynesutton/convex-mcp-visual
/plugin install convex-visual@waynesutton-convex-mcp-visual
```

## Create your own marketplace

To distribute the plugin through a custom marketplace:

### 1. Create a marketplace repository

Create a new GitHub repository for your marketplace.

### 2. Create the marketplace file

Create `.claude-plugin/marketplace.json`:

```json
{
  "name": "convex-tools",
  "owner": {
    "name": "Your Name",
    "email": "you@example.com"
  },
  "metadata": {
    "description": "Convex database tools for Claude Code"
  },
  "plugins": [
    {
      "name": "convex-visual",
      "source": {
        "source": "github",
        "repo": "waynesutton/convex-mcp-visual"
      },
      "description": "Visual schema browser, dashboard, and ER diagrams for Convex databases",
      "version": "1.0.0",
      "keywords": ["convex", "database", "schema", "visualization"]
    }
  ]
}
```

### 3. Host the marketplace

Push to GitHub, GitLab, or any git host.

### 4. Share with users

Users add your marketplace and install:

```shell
/plugin marketplace add your-org/convex-marketplace
/plugin install convex-visual@convex-tools
```

## Plugin configuration

### Environment variables

The plugin needs a Convex deploy key. Users can:

1. Set `CONVEX_DEPLOY_KEY` in their environment
2. Run `npx convex-mcp-visual --setup` before installing

### MCP server config

The `.mcp.json` file defines how Claude Code starts the MCP server:

```json
{
  "convex-visual": {
    "command": "npx",
    "args": ["convex-mcp-visual", "--stdio"],
    "env": {}
  }
}
```

For users who want to pass a deploy key through the plugin:

```json
{
  "convex-visual": {
    "command": "npx",
    "args": ["convex-mcp-visual", "--stdio"],
    "env": {
      "CONVEX_DEPLOY_KEY": "${CONVEX_DEPLOY_KEY}"
    }
  }
}
```

## Skills

The plugin includes a skill that helps Claude understand when to use the Convex tools:

**skills/convex-schema/SKILL.md**

This skill activates when users ask about:

- Convex schemas
- Database tables
- Document structure
- Table relationships

## Testing the plugin locally

Test before publishing:

```bash
claude --plugin-dir ./convex-mcp-visual
```

Then try:

```shell
/convex-visual:convex-schema
```

Or just ask Claude:

```
Show me my Convex schema
```

## Publishing to official marketplace

To submit to the official Anthropic marketplace:

1. Fork the official plugins repository
2. Add your plugin to the marketplace.json
3. Submit a pull request
4. Wait for review and approval

The official marketplace is at `claude-plugins-official`.

## Troubleshooting

### Plugin not loading

1. Check plugin.json is valid JSON
2. Ensure .mcp.json paths are correct
3. Restart Claude Code after changes

### MCP server not connecting

1. Run `npx convex-mcp-visual --test` to verify Convex connection
2. Check CONVEX_DEPLOY_KEY is set
3. View logs with `claude --debug`

### Skills not appearing

1. Verify skills directory structure
2. Check SKILL.md frontmatter format
3. Clear plugin cache: `rm -rf ~/.claude/plugins/cache`

## Version management

Update version in both files when releasing:

1. `package.json` - npm package version
2. `.claude-plugin/plugin.json` - plugin version

Keep them in sync for clarity.

## References

- [Claude Code Plugins](https://code.claude.com/docs/en/plugins)
- [Plugin Marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)
- [Plugins Reference](https://code.claude.com/docs/en/plugins-reference)
- [Discover Plugins](https://code.claude.com/docs/en/discover-plugins)
