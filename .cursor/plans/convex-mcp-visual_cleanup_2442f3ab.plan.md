---
name: convex-mcp-visual cleanup
overview: Make Convex data fetching real, tighten type safety, add a guided CLI setup flow, and slim the README by moving deep docs into a new docs folder.
todos:
  - id: data-access
    content: Implement system-query-based data fetching in server
    status: completed
  - id: ui-tools
    content: Wire real data into tools and UI without placeholders
    status: completed
  - id: docs-split
    content: Shorten README and move deep docs to docs/
    status: completed
isProject: false
---

## Convex MCP Visual cleanup plan

### Key findings to address

- Data access is stubbed, so schema and dashboard views never load real documents.
- Docs overpromise features not implemented and the README is too long.
- Naming is inconsistent (convex-mcp-apps vs convex-mcp-visual).
- There is no guided flow for selecting a deployment and setting a deploy key.

### 1) Fix data access and type safety in the server

- Update `[src/convex-client.ts](src/convex-client.ts)` to use Convex system queries for tables, counts, and documents so any deployment works without custom functions.
- Implement a typed wrapper for system queries:
  - `_system/cli/tables` for table list
  - `_system/cli/tableSize:default` for counts
  - `_system/cli/tableData` with pagination for document pages
  - `_system/frontend/getSchemas` and `/api/shapes2` for declared and inferred schemas
- Replace the current stubbed document access:

```
// src/convex-client.ts
async queryDocuments(...) {
  // ... returns empty
}

async getAllDocuments() {
  // ... returns {}
}
```

- Add clear limits and types for document sampling (env-configurable), and return useful errors when no admin key is available.

### 2) Wire real data into tool handlers

- Update `[src/tools/schema-browser.ts](src/tools/schema-browser.ts)` to:
  - Use system query data for table counts and inferred schema
  - Fetch declared schema for the selected table
  - Populate actual documents instead of empty arrays
- Update `[src/tools/dashboard.ts](src/tools/dashboard.ts)` to:
  - Use table counts for count metrics
  - Use real document pages for recent activity and sample-based charts
  - Avoid empty outputs when data exists

### 3) Clean up UI apps and remove emoji or placeholders

- Update `[apps/schema-browser/src/app.ts](apps/schema-browser/src/app.ts)` and `[apps/realtime-dashboard/src/app.ts](apps/realtime-dashboard/src/app.ts)`:
  - Remove emoji from empty states and icons
  - Make empty states reflect real data availability
  - Ensure document rendering uses real injected data only
- Update fallback HTML in `[src/resources/schema-browser.ts](src/resources/schema-browser.ts)` and `[src/resources/dashboard.ts](src/resources/dashboard.ts)` to avoid alert or demo data when bundled apps are missing.

### 4) Add a guided CLI setup flow

- Add a setup command in `[src/index.ts](src/index.ts)`:
  - `--setup` opens the Convex dashboard deploy key page and prompts for paste
  - Save the deploy key to a local config file and read it in `ConvexClient` when env vars are missing
- Add an optional management API flow (if token available):
  - Use `CONVEX_MANAGEMENT_TOKEN` and `CONVEX_TEAM_ID` to list deployments and create a deploy key via the Management API
  - Fall back to manual paste if token is not provided
- Introduce a small config helper (new file) for reading and writing a local config file.

### 5) Shorten README and move deep docs into a docs folder

- Rewrite `[README.md](README.md)` to:
  - Keep a short product intro
  - Provide 1 to 2 install options (npx and global)
  - Provide a minimal setup and verification section
  - Link to new docs instead of embedding long content
- Create a `docs/` folder and move or rewrite content into:
  - `docs/setup.md`
  - `docs/cli-auth.md`
  - `docs/schema-browser.md`
  - `docs/dashboard.md`
  - `docs/troubleshooting.md`
  - `docs/architecture.md`
  - `docs/stack.md`
  - `docs/limitations.md`
  - `docs/wishlist.md`
- Update `[SETUP.md](SETUP.md)`, `[USER_GUIDE_SCHEMA_BROWSER.md](USER_GUIDE_SCHEMA_BROWSER.md)`, `[USER_GUIDE_DASHBOARD.md](USER_GUIDE_DASHBOARD.md)`, and `[OVERVIEW.md](OVERVIEW.md)` to either move into `docs/` or become short pointers.

### 6) Normalize naming and metadata

- Update server name strings and CLI help text in `[src/server.ts](src/server.ts)` and `[src/index.ts](src/index.ts)` to use `convex-mcp-visual`.
- Confirm `package.json` version matches npm latest and note this in changelog.

### 7) Project hygiene files required by repo rules

- Create or update:
  - `files.md` with a short inventory of key files
  - `changelog.md` with Keep a Changelog structure and an Unreleased section
  - `TASK.md` with the current work plan and relevant files

### 8) Verify

- Run `npm test` to confirm Convex connectivity and `npm run build` to ensure types and bundling pass.

### Notes on compatibility

- This tool is not Claude-only. It should work with any MCP client that supports stdio or HTTP tools, and the local UI is opened in the system browser.
- Claude web remains unsupported due to browser sandbox limits.

Sources

- [https://registry.npmjs.org/convex-mcp-visual](https://registry.npmjs.org/convex-mcp-visual)
- [https://docs.convex.dev/management-api](https://docs.convex.dev/management-api)
- [https://docs.convex.dev/llms.txt](https://docs.convex.dev/llms.txt)
