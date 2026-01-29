# Schema Browser

A visual table explorer for Convex deployments. Browse tables, inspect schemas, and query documents directly inside Claude.

## What it does

The Schema Browser renders an interactive interface for exploring your Convex database:

- **Table list** - All tables in your deployment with document counts
- **Schema view** - Declared and inferred schemas side-by-side
- **Document inspector** - Browse and paginate through table data
- **Click-to-query** - Select a table and run queries without typing

## Usage

Ask Claude:

```
"Show me my database schema"
"What tables do I have in Convex?"
"Browse the users table"
"Show me the schema for messages"
```

The Schema Browser renders inline. Click tables to explore, expand fields to see types.

## Features

### Table navigation

The left panel lists all tables. Each shows:

- Table name
- Document count
- Index indicators

Click a table to view its schema and sample documents.

### Schema comparison

For tables with declared schemas, the viewer shows both:

**Declared schema** - What you defined in `schema.ts`
**Inferred schema** - What Convex detected from actual data

This helps identify:

- Fields defined but never used
- Fields present in data but not in schema
- Type mismatches between declared and actual

### Document browser

The bottom panel shows documents from the selected table:

- Paginated view (50 documents per page)
- Expandable nested objects
- Click document ID to copy
- Sort by any indexed field

### Query builder

Click "Query" on any table to open the query builder:

```javascript
// Example: Find users created in the last 24 hours
db.query("users")
  .filter(q => q.gt(q.field("createdAt"), Date.now() - 86400000))
  .take(10)
```

Queries run in Convex's sandbox. They're read-only and can't modify data.

## Interface

```
┌─────────────────────────────────────────────────────────────────┐
│  Schema Browser                                    [Refresh] [?]│
├────────────────┬────────────────────────────────────────────────┤
│                │                                                │
│  Tables        │  users                                         │
│  ───────────── │  ────────────────────────────────────────────  │
│                │                                                │
│  ▸ users (1.2k)│  Declared Schema          Inferred Schema      │
│    posts (340) │  ┌─────────────────────┐  ┌─────────────────┐  │
│    comments    │  │ _id: Id<"users">    │  │ _id: Id<"users">│  │
│    sessions    │  │ name: v.string()    │  │ name: string    │  │
│    _storage    │  │ email: v.string()   │  │ email: string   │  │
│                │  │ role?: v.string()   │  │ role: string    │  │
│                │  │ createdAt: v.number │  │ createdAt: num  │  │
│                │  └─────────────────────┘  │ avatar?: string │  │
│                │                           └─────────────────┘  │
│                │                                                │
│                │  ⚠ "avatar" exists in data but not in schema   │
│                │                                                │
├────────────────┴────────────────────────────────────────────────┤
│  Documents (page 1 of 24)                      [◀] [▶] [Query]  │
│  ───────────────────────────────────────────────────────────────│
│  _id              name           email              createdAt   │
│  ────────────────────────────────────────────────────────────── │
│  j57a8x...        Alice Chen     alice@example.com  1706123456  │
│  k82b3y...        Bob Smith      bob@example.com    1706123789  │
│  m93c4z...        Carol Wu       carol@example.com  1706124012  │
└─────────────────────────────────────────────────────────────────┘
```

## Configuration

The Schema Browser accepts configuration via tool arguments:

| Parameter | Type | Description |
|-----------|------|-------------|
| `deployment` | string | Deployment selector from `status` tool |
| `table` | string | Pre-select a specific table |
| `showInferred` | boolean | Show inferred schemas (default: true) |
| `pageSize` | number | Documents per page (default: 50) |

## Examples

### Browse all tables

```
User: "Show me my Convex schema"

Claude: [Calls schema_browser tool]
        [Schema Browser UI renders with table list]
```

### Focus on specific table

```
User: "Show me the users table schema"

Claude: [Calls schema_browser tool with table="users"]
        [Schema Browser UI renders with users pre-selected]
```

### Compare declared vs inferred

```
User: "Are there any fields in my data that aren't in my schema?"

Claude: [Calls schema_browser tool]
        [Schema Browser highlights mismatches between declared and inferred]
```

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `↑` `↓` | Navigate tables |
| `Enter` | Select table |
| `←` `→` | Previous/next page |
| `q` | Open query builder |
| `r` | Refresh data |
| `Esc` | Close query builder |

## Technical details

### Data fetching

The browser uses the same tools as the official Convex MCP server:

- `tables` - List tables and schemas
- `data` - Paginate documents
- `runOneoffQuery` - Execute custom queries

### Real-time updates

Document counts and sample data update when you click "Refresh" or switch tables. For true real-time subscriptions, use the [Realtime Dashboard](../realtime-dashboard/README.md).

### Performance

Large tables (>100k documents) may take longer to load schemas. The browser shows a loading indicator and progressively renders as data arrives.

## Security and authentication

The Schema Browser doesn't handle authentication directly. Instead:

1. **MCP server authenticates** - Uses your local Convex credentials or deploy key
2. **Browser requests data via MCP** - Calls like `app.callServerTool()` route through the server
3. **Convex enforces access** - You only see deployments and tables you have permission to access

**The iframe is sandboxed:**
- No access to your credentials
- No direct network requests to Convex
- Communicates only via JSON-RPC postMessage to the host

**Queries are safe:**
- Run in Convex's sandbox
- Read-only (can't modify data)
- Subject to your deployment's access rules

If you see "unauthorized" errors, check that you're logged into Convex (`npx convex login`) or that your deploy key is valid.

## Troubleshooting

### Tables not loading

Check that:
1. You're authenticated with Convex (`npx convex login`)
2. The deployment selector is valid
3. You have read access to the deployment

### Schema mismatch warnings

The browser shows warnings when inferred schema differs from declared. This is informational, not an error. Common causes:

- Optional fields that are rarely set
- Legacy data from before schema changes
- Fields added via direct database access

### Query errors

Queries run in Convex's sandbox with the same restrictions as your deployed functions. If a query fails:

- Check syntax matches Convex query API
- Ensure referenced fields exist
- Verify index requirements for filtered queries
