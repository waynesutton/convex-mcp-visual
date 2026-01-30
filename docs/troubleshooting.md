# Troubleshooting

## Common Issues

### Server not showing in Claude Code

```bash
# Verify the MCP server is registered
claude mcp list

# If not listed, re-add
claude mcp add convex-visual -- npx convex-mcp-visual --stdio

# Restart Claude Code
```

### "No Convex deployment configured"

You need to set up your deploy key:

```bash
# Run the setup wizard
npx convex-mcp-visual --setup

# Or set the environment variable
export CONVEX_DEPLOY_KEY="prod:your-deployment|your-key"
```

### "403 Forbidden" or "Connection failed"

Authentication failed. Common causes:

1. Missing or invalid deploy key
2. Wrong key format (should be `prod:deployment-name|convex_deploy_xxx...`)
3. Expired key

```bash
# Test your connection
npx convex-mcp-visual --test
```

### Browser doesn't open

- Check if port 3456 is available: `lsof -i :3456`
- Terminal output works even if browser fails
- Try opening manually: `http://localhost:3456`

### Windows users

Use cmd wrapper in configuration:

```json
{
  "command": "cmd",
  "args": ["/c", "npx", "convex-mcp-visual", "--stdio"]
}
```

### "Connection closed" errors

Check:

1. Node.js version (requires 18+)
2. Run `npx convex-mcp-visual --test` to verify credentials
3. Check Claude Code logs for errors

### Canvas appears blurry

The graph view scales for retina displays. Try:

- Refreshing the browser
- Zooming to 100% with the zoom controls

### No documents showing

If tables show 0 documents:

1. Verify you have admin access: `npx convex-mcp-visual --test` should show "Admin access: Yes"
2. Check your deploy key has read access
3. Verify your deployment actually has data

## Debug Mode

Enable debug logging:

```bash
DEBUG=true npx convex-mcp-visual --test
```

## Getting Help

1. Check the [GitHub Issues](https://github.com/waynesutton/convex-mcp-visual/issues)
2. Join the [Convex Discord](https://convex.dev/community)
3. Open a new issue with:
   - Your Node.js version (`node --version`)
   - Output of `npx convex-mcp-visual --test`
   - Steps to reproduce the problem
