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
# Run the setup wizard from your project folder
cd my-convex-app/
npx convex-mcp-visual --setup

# Or create a .env.local in your project folder
echo 'CONVEX_DEPLOY_KEY="prod:your-deployment|your-key"' > .env.local
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

### Wrong deployment or stuck deploy key

If the tool connects to the wrong Convex deployment regardless of which project folder you are in, a global config is overriding your local settings.

**Step 1: See which config source is active**

```bash
npx convex-mcp-visual --config
```

**Step 2: Clear the global environment variable**

```bash
unset CONVEX_DEPLOY_KEY
echo $CONVEX_DEPLOY_KEY
```

If the variable reappears after opening a new terminal, it was added to a shell profile. Open the file in your editor, find the `export CONVEX_DEPLOY_KEY=...` line, and delete it.

**Where to look by OS:**

| OS | Shell | File to check |
| --- | --- | --- |
| macOS | zsh (default since Catalina) | `~/.zshrc` or `~/.zprofile` |
| macOS | bash | `~/.bash_profile` or `~/.bashrc` |
| Linux | bash | `~/.bashrc` or `~/.profile` |
| Linux | zsh | `~/.zshrc` |
| Windows | PowerShell | Run `[Environment]::SetEnvironmentVariable("CONVEX_DEPLOY_KEY", $null, "User")` |
| Windows | System env | Settings > System > Advanced > Environment Variables, remove `CONVEX_DEPLOY_KEY` |

After removing the line, open a new terminal and verify:

```bash
echo $CONVEX_DEPLOY_KEY
# Should print nothing
```

**Step 3: Remove the legacy global config file**

```bash
rm ~/.convex-mcp-visual.json
```

This file was created by older versions of `--setup`. Current versions save to `.env.local` in the project directory instead. Removing the global file lets per-project configs take priority.

**Step 4: Set up per-project config**

In each Convex project folder, run:

```bash
cd my-convex-app/
npx convex-mcp-visual --setup
```

Or create a `.env.local` file manually:

```
CONVEX_DEPLOY_KEY="prod:your-deployment-name|your-admin-key"
```

**Step 5: Verify**

```bash
npx convex-mcp-visual --test
```

### Multiple Convex projects

If you work with multiple Convex apps, do not set `CONVEX_DEPLOY_KEY` as a global environment variable. Use per-project `.env.local` files instead.

Config priority (first source found wins):

1. `CONVEX_DEPLOY_KEY` environment variable (highest, overrides everything)
2. `CONVEX_URL` environment variable
3. `.env.local` in the current directory
4. `.convex/deployment.json` in the current directory
5. `~/.convex/config.json` (Convex CLI login session)
6. `~/.convex-mcp-visual.json` (legacy global fallback)

Switching between projects is as simple as changing directories. Each folder reads its own `.env.local`.

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
