# Limitations and Known Issues

## Not Supported

| Feature                 | Status          | Notes                           |
| ----------------------- | --------------- | ------------------------------- |
| Write operations        | Not planned     | Read-only by design for safety  |
| Custom queries          | Not implemented | Would require query builder UI  |
| Real-time subscriptions | Partial         | Dashboard refreshes on interval |
| Schema editing          | Not planned     | Use Convex dashboard            |
| Function introspection  | Not implemented | Would show Convex functions     |

## Known Issues

### Large Schemas

Performance may degrade with 50+ tables. The graph view works best with up to 30 tables.

### Complex Relationships

Only detects `Id<"table">` type patterns. Does not detect:

- Array references
- Nested object IDs
- Custom naming conventions

### Browser Popup Blockers

May need to allow popups for localhost:3456.

### Document Sampling

Only fetches up to 100 documents per table by default. Configure with:

```bash
CONVEX_DOC_SAMPLE_LIMIT=200 npx convex-mcp-visual --stdio
```

## Platform Compatibility

| Platform                | Status        | Notes                       |
| ----------------------- | ------------- | --------------------------- |
| Claude Code (CLI)       | Full support  | stdio transport             |
| Claude Desktop          | Full support  | MCP configuration           |
| Cursor                  | Full support  | MCP settings                |
| VS Code + MCP Extension | Full support  | Standard MCP                |
| Claude.ai (web)         | Not supported | Browser sandbox limitations |

### Why Claude.ai Web Doesn't Work

MCP servers run as local processes. The Claude.ai web interface cannot:

1. Spawn local processes
2. Access localhost servers
3. Read local files

This may change as the MCP ecosystem evolves.
