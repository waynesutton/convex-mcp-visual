# Publishing to npm

This document contains instructions for publishing `convex-mcp-visual` to npm, including security considerations and cleanup steps.

---

## Pre-Publish Checklist

### 1. Files and Folders to REMOVE Before Publishing

These files/folders are NOT needed in the npm package and should be removed or excluded:

```
REMOVE BEFORE PUBLISHING:
├── .claude/                    # Claude Code session data
├── .DS_Store                   # macOS metadata files
├── mnt/                        # Mounted/temp directories
├── test-convex-project/        # Test project (if present)
├── node_modules/               # Dependencies (auto-excluded by npm)
├── *.log                       # Log files
├── .env                        # Environment files (NEVER publish)
├── .env.*                      # All env variants
├── CLAUDE.md                   # Development instructions for Claude
├── OVERVIEW.md                 # Development overview
├── SETUP.md                    # Redundant setup doc
├── USER_GUIDE_*.md             # User guides (consolidated in README)
└── PUBLISHING.md               # This file (internal use only)
```

### 2. Files INCLUDED in npm Package

The `package.json` `files` array specifies what gets published:

```json
{
  "files": [
    "dist"
  ]
}
```

Only the `dist/` folder is published. This includes:
- Compiled JavaScript server code
- Bundled UI applications (HTML/JS/CSS)

### 3. Verify Package Contents

Before publishing, check what will be included:

```bash
# See what files would be published
npm pack --dry-run

# Or create a tarball and inspect it
npm pack
tar -tf convex-mcp-visual-*.tgz
```

Expected contents:
```
package/package.json
package/README.md
package/dist/index.js
package/dist/server.js
package/dist/convex-client.js
package/dist/ui-server.js
package/dist/tools/
package/dist/resources/
package/dist/apps/
```

---

## Security Checklist

### Before Every Publish

1. **No credentials in code**
   ```bash
   # Search for potential secrets
   grep -r "CONVEX_DEPLOY_KEY" src/
   grep -r "sk_" src/
   grep -r "password" src/
   grep -r "secret" src/
   grep -r "token" src/ --include="*.ts"
   ```

2. **No hardcoded URLs**
   ```bash
   # Check for hardcoded Convex URLs
   grep -r "convex.cloud" src/ --include="*.ts"
   ```

3. **No personal data**
   - Check `~/.convex/` paths don't leak into build
   - Verify no test data with real user info

4. **Dependencies audit**
   ```bash
   npm audit
   npm audit fix
   ```

5. **No development files**
   ```bash
   # These should NOT exist in the npm package
   ls -la dist/ | grep -E "\.map$"  # Source maps (optional)
   ```

### Code Security Review

The server only performs READ operations:
- `listTables()` - Lists table names and counts
- `getTableSchema()` - Gets field definitions
- `queryDocuments()` - Reads documents (limited to 50)
- `getAllDocuments()` - Reads sample documents

**No write, update, or delete operations exist.**

### Network Security

- Local UI server binds to `127.0.0.1` only (not `0.0.0.0`)
- All Convex API calls use HTTPS
- No external analytics or telemetry

---

## Publishing Steps

### 1. Clean Build

```bash
# Remove old build artifacts
npm run clean

# Fresh install and build
rm -rf node_modules
npm install
npm run build
```

### 2. Update Version

```bash
# Patch version (1.0.0 -> 1.0.1)
npm version patch

# Minor version (1.0.0 -> 1.1.0)
npm version minor

# Major version (1.0.0 -> 2.0.0)
npm version major
```

### 3. Test the Package Locally

```bash
# Create a tarball
npm pack

# Install it globally from the tarball
npm install -g convex-mcp-visual-*.tgz

# Test it works
convex-mcp-visual --test

# Uninstall test
npm uninstall -g convex-mcp-visual
```

### 4. Publish to npm

```bash
# Login to npm (if not already)
npm login

# Publish (runs prepublishOnly script automatically)
npm publish

# For scoped packages (if using @your-org/convex-mcp-visual)
npm publish --access public
```

### 5. Verify Publication

```bash
# Check npm listing
npm view convex-mcp-visual

# Test installation
npx convex-mcp-visual --test
```

---

## npm Configuration

### package.json Settings

```json
{
  "name": "convex-mcp-visual",
  "version": "1.0.0",
  "description": "Visual MCP tools for exploring Convex databases",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "convex-mcp-visual": "dist/index.js"
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "prepublishOnly": "npm run build"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "keywords": [
    "convex",
    "mcp",
    "model-context-protocol",
    "schema-browser",
    "database",
    "visualization"
  ],
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/your-username/convex-mcp-visual"
  }
}
```

### .npmignore (Optional)

If you need more control, create `.npmignore`:

```
# Development files
src/
apps/
*.ts
tsconfig*.json
vite.config.ts

# Documentation (except README)
CLAUDE.md
OVERVIEW.md
SETUP.md
USER_GUIDE_*.md
PUBLISHING.md

# Test files
test-convex-project/
*.test.ts
*.spec.ts

# IDE/Editor
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Build artifacts not needed
*.map
*.tsbuildinfo

# Environment
.env*
*.log

# Other
.claude/
mnt/
```

---

## Versioning Guidelines

Follow semantic versioning (semver):

| Change Type | Version Bump | Example |
|-------------|--------------|---------|
| Bug fixes | patch | 1.0.0 → 1.0.1 |
| New features (backward compatible) | minor | 1.0.0 → 1.1.0 |
| Breaking changes | major | 1.0.0 → 2.0.0 |

### What Constitutes Breaking Changes

- Removing or renaming tools
- Changing tool parameter names/types
- Removing keyboard shortcuts
- Changing default behavior significantly
- Dropping Node.js version support

---

## Rollback Procedure

If you publish a broken version:

```bash
# Deprecate the bad version with a message
npm deprecate convex-mcp-visual@1.0.1 "Critical bug, use 1.0.2"

# Publish a fixed version immediately
npm version patch
npm publish

# Or unpublish (only within 72 hours, use sparingly)
npm unpublish convex-mcp-visual@1.0.1
```

---

## Automated Publishing (Optional)

For GitHub Actions:

```yaml
# .github/workflows/publish.yml
name: Publish to npm

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'

      - run: npm ci
      - run: npm run build
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Store your npm token in GitHub Secrets as `NPM_TOKEN`.

---

## Quick Reference Commands

```bash
# Check what will be published
npm pack --dry-run

# Build and publish
npm run clean && npm install && npm run build && npm publish

# Test the published package
npx convex-mcp-visual@latest --test

# View package info
npm view convex-mcp-visual

# View all published versions
npm view convex-mcp-visual versions

# Check for vulnerabilities
npm audit
```

---

## Contact

For publishing issues or questions, check:
- npm documentation: https://docs.npmjs.com/
- npm support: https://www.npmjs.com/support
