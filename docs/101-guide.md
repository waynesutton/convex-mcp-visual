# Guide for Convex MCP schema visualizer

This guide explains what the tool does, how data flows, and why it stays read only.

## How it works

1. Your MCP client starts the server in stdio or http mode.
2. The server receives a tool call like `schema_browser` or `dashboard_view`.
3. The server reads your deploy key or local Convex config.
4. It calls Convex system query endpoints to fetch schema and documents.
5. It opens a local UI on `http://localhost:3456` for the schema visualizer and `http://localhost:3457` for the dashboard view.
6. It returns markdown to the client for the terminal output.

## Goal for Claude web

The goal is to run the same MCP tools from Claude web at `claude.ai` once that client supports MCP connections. The server already uses the MCP SDK and returns markdown plus a local UI. That keeps the flow consistent across clients.

This is a forward goal and depends on MCP support in Claude web.

## Stack

- Node.js 18
- TypeScript
- MCP SDK from Model Context Protocol
- Vite for bundling the UI
- HTML, CSS, and Canvas for the browser apps

## Security and read only access

- All data access uses HTTPS calls to your Convex deployment.
- The code only calls system query endpoints and never calls mutation endpoints.
- The admin key is used for schema and document access. The code still only reads.
- The UI runs on localhost. It is not exposed by default.
- Keys live in env vars or local config files. They are not stored in git.

## Where to look in the code

- `src/server.ts` wires the MCP tools and resources.
- `src/convex-client.ts` handles auth and calls Convex system queries.
- `src/tools/schema-browser.ts` builds schema data and opens the schema UI.
- `src/tools/dashboard.ts` builds metrics and opens the dashboard UI.
- `apps/schema-browser/src/app.ts` renders the schema visualizer UI.
- `apps/realtime-dashboard/src/app.ts` renders the dashboard view UI.
