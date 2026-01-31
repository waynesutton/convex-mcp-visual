---
name: convex-schema
description: Browse and visualize Convex database schemas. Use when exploring Convex tables, viewing document structure, or understanding database relationships.
---

# Convex Schema Browser

Use the `schema_browser` MCP tool to explore Convex database schemas interactively.

## When to use

- User asks to see their Convex schema
- User wants to browse tables or documents
- User needs to understand database structure
- User asks about table relationships

## Available tools

This skill provides access to these MCP tools:

1. **schema_browser** - Interactive schema explorer with graph and list views
2. **dashboard_view** - Real-time metrics and document counts
3. **schema_diagram** - Mermaid ER diagrams of table relationships

## Example prompts

- "Show me my Convex schema"
- "What tables do I have?"
- "Browse my database"
- "Show schema for the users table"
- "Generate a diagram of my schema"
- "Create a dashboard for my data"

## Requirements

- Convex project with `CONVEX_DEPLOY_KEY` configured
- Or run `npx convex-mcp-visual --setup` first
