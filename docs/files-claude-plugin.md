# Claude Code Plugin Structure

This document explains the Claude Code plugin and marketplace files in this repository.

## Overview

Claude Code has two distribution concepts:

| Concept         | File                              | Purpose                                                 |
| --------------- | --------------------------------- | ------------------------------------------------------- |
| **Plugin**      | `.claude-plugin/plugin.json`      | Defines a single plugin with skills, MCP servers, hooks |
| **Marketplace** | `.claude-plugin/marketplace.json` | Catalog of plugins for distribution                     |

This repo functions as **both** a plugin and a marketplace, allowing users to add it with `/plugin marketplace add` and install the plugin from it.

## Required Files

### Plugin Manifest

**Path:** `.claude-plugin/plugin.json`

Defines the plugin metadata and components.

```json
{
  "name": "convex-visual",
  "description": "Visual schema browser, dashboard, and ER diagrams for Convex databases",
  "version": "1.0.0",
  "author": {
    "name": "Wayne Sutton",
    "email": "wayne@convex.dev"
  },
  "homepage": "https://www.npmjs.com/package/convex-mcp-visual",
  "repository": "https://github.com/waynesutton/convex-mcp-visual",
  "license": "MIT",
  "keywords": ["convex", "database", "schema", "visualization"],
  "skills": "./skills/",
  "mcpServers": "./.mcp.json"
}
```

**Required fields:**

- `name` - Plugin identifier (kebab-case, no spaces)
- `description` - Brief description shown in plugin manager
- `version` - Semantic version

**Optional fields:**

- `author` - Object with `name` and optional `email`
- `homepage` - Documentation or project URL
- `repository` - Source code URL
- `license` - SPDX license identifier (MIT, Apache-2.0, etc.)
- `keywords` - Tags for discovery
- `skills` - Path to skills directory
- `mcpServers` - Path to MCP configuration file

### Marketplace Catalog

**Path:** `.claude-plugin/marketplace.json`

Makes this repo installable as a marketplace.

```json
{
  "name": "convex-visual-marketplace",
  "owner": {
    "name": "Wayne Sutton",
    "email": "wayne@convex.dev"
  },
  "metadata": {
    "description": "Visual tools for exploring Convex databases",
    "version": "1.0.0",
    "pluginRoot": "./"
  },
  "plugins": [
    {
      "name": "convex-visual",
      "source": "./",
      "description": "Schema browser, dashboard, and ER diagrams"
    }
  ]
}
```

**Required fields:**

- `name` - Marketplace identifier (kebab-case)
- `owner` - Object with `name` (required) and `email` (optional)
- `plugins` - Array of plugin entries

**Plugin entry required fields:**

- `name` - Plugin identifier
- `source` - Where to find the plugin (relative path, GitHub repo, or git URL)

**Reserved marketplace names** (cannot use):

- claude-code-marketplace, claude-code-plugins, claude-plugins-official
- anthropic-marketplace, anthropic-plugins, agent-skills, life-sciences

### MCP Server Configuration

**Path:** `.mcp.json`

Defines MCP servers the plugin provides.

```json
{
  "convex-visual": {
    "command": "npx",
    "args": ["convex-mcp-visual", "--stdio"],
    "env": {}
  }
}
```

### Skills Directory

**Path:** `skills/convex-schema/SKILL.md`

Agent skills that Claude can invoke. Each skill folder contains a `SKILL.md` with:

```markdown
---
name: convex-schema
description: Browse and visualize Convex database schemas.
---

# Skill instructions here
```

**Frontmatter fields:**

- `name` - Skill identifier
- `description` - When Claude should use this skill

## Installation Flow

Users install this plugin in two steps:

```bash
# Step 1: Add the marketplace
/plugin marketplace add waynesutton/convex-mcp-visual

# Step 2: Install the plugin from the marketplace
/plugin install convex-visual@convex-visual-marketplace
```

The marketplace name in the install command comes from `marketplace.json` (`convex-visual-marketplace`), not the GitHub repo name.

## Plugin Sources

The `source` field in marketplace entries supports:

| Type          | Example                                                          |
| ------------- | ---------------------------------------------------------------- |
| Relative path | `"./plugins/my-plugin"` or `"./"` for same repo                  |
| GitHub        | `{"source": "github", "repo": "owner/repo"}`                     |
| Git URL       | `{"source": "url", "url": "https://gitlab.com/team/plugin.git"}` |

## Validation

Test your plugin structure locally:

```bash
# Validate plugin files
claude plugin validate .

# Or from Claude Code
/plugin validate .
```

## Publishing to Official Marketplace

To have your plugin included in the official Anthropic marketplace (`claude-plugins-official`):

| Requirement                | Details                                        |
| -------------------------- | ---------------------------------------------- |
| Open source license        | MIT or Apache-2.0 required                     |
| Working `plugin.json`      | Valid manifest with name, description, version |
| Working `marketplace.json` | Valid catalog with owner and plugins array     |
| MCP server configuration   | `.mcp.json` with server definitions            |
| Skills defined             | At least one skill in `skills/` directory      |
| Clear documentation        | README with install steps and usage examples   |
| Security review            | Required by Anthropic before inclusion         |

**Submission process:**

1. Your repo must be public on GitHub
2. Submit via GitHub issue or PR to Anthropic's official marketplace repo
3. Plugin must pass Anthropic's security review
4. Provide working examples and clear documentation

The official marketplace includes plugins like `typescript-lsp`, `github`, `linear`, `slack`, and other first-party integrations. Third-party plugins are distributed through self-hosted marketplaces like this one.

## File Locations Summary

| File                              | Purpose                  |
| --------------------------------- | ------------------------ |
| `.claude-plugin/plugin.json`      | Plugin manifest          |
| `.claude-plugin/marketplace.json` | Marketplace catalog      |
| `.mcp.json`                       | MCP server configuration |
| `skills/*/SKILL.md`               | Agent skills             |

## References

- [Create plugins](https://code.claude.com/docs/en/plugins)
- [Plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)
- [Discover plugins](https://code.claude.com/docs/en/discover-plugins)
- [Plugin reference](https://code.claude.com/docs/en/plugins-reference)
