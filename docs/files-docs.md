# Documentation Files Guide

Overview of all documentation files in this project and their purpose.

## Root Directory Files

| File           | Purpose                                           | Audience                |
| -------------- | ------------------------------------------------- | ----------------------- |
| `README.md`    | Project overview, quick start, and usage examples | All users               |
| `CLAUDE.md`    | Development guidance for Claude Code              | Developers using Claude |
| `changelog.md` | Version history and release notes                 | All users               |
| `files.md`     | Codebase file descriptions                        | Developers              |

## docs/ Directory

### Setup and Configuration

| File                 | Purpose                                                                         |
| -------------------- | ------------------------------------------------------------------------------- |
| `setup.md`           | Complete installation, deploy key setup, MCP client config, Docker, and systemd |
| `troubleshooting.md` | Common issues and solutions                                                     |

### Reference

| File              | Purpose                                                        |
| ----------------- | -------------------------------------------------------------- |
| `tools.md`        | Tool parameters, keyboard shortcuts, and configuration options |
| `architecture.md` | Technical deep-dive: MCP flow, file structure, tech stack      |
| `limitations.md`  | Known limitations and platform compatibility                   |

### User Guides

| File                           | Purpose                          |
| ------------------------------ | -------------------------------- |
| `user-guide-schema-browser.md` | How to use the schema browser UI |
| `user-guide-dashboard.md`      | How to use the dashboard UI      |

### Publishing

| File              | Purpose                                                    |
| ----------------- | ---------------------------------------------------------- |
| `OVERVIEW.md`     | Project summary for plugin marketplace and GitHub          |
| `deployplugin.md` | Claude Code plugin marketplace distribution guide          |
| `PUBLISHING.md`   | npm publishing checklist and security guidelines           |
| `101-guide.md`    | Internal guide explaining how the tool works and data flow |

## Plugin Files

| File                            | Purpose                                                         |
| ------------------------------- | --------------------------------------------------------------- |
| `.claude-plugin/plugin.json`    | Plugin manifest for Claude Code marketplace                     |
| `.mcp.json`                     | MCP server configuration                                        |
| `skills/convex-schema/SKILL.md` | Skill definition for Claude to understand when to use the tools |

## Which Files Are Needed Where

### For npm Package

Only `dist/` folder is published. No docs needed.

### For Claude Code Plugin Marketplace

Required:

- `.claude-plugin/plugin.json`
- `.mcp.json`
- `skills/` directory
- `README.md`

### For GitHub Repository

All files. The `docs/` folder provides comprehensive documentation.

## File Naming Conventions

- `UPPERCASE.md` - Top-level project files (README, CLAUDE, etc.)
- `lowercase.md` - Documentation files in docs/
- `lowercase-with-dashes.md` - Multi-word documentation files
