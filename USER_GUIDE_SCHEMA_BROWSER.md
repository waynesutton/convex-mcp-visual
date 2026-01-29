# Using the Schema Browser

A quick guide for exploring your Convex database inside Claude.

## Before you start

The Schema Browser needs access to your Convex deployment. If you've run `npx convex login` before, you're already set. If not:

```bash
npx convex login
```

This is a one-time setup. The MCP server reads your credentials automatically.

## Getting started

Once installed, just ask Claude about your database:

```
"Show me my schema"
"What tables do I have?"
"Browse my Convex database"
```

The Schema Browser opens inline. No need to switch to the Convex dashboard.

## Browsing tables

The left panel shows all your tables. Click any table to see:

- **Schema** - Field names, types, and validators
- **Documents** - Sample data from the table
- **Indexes** - Available query indexes

Tables with the most documents appear first. System tables (prefixed with `_`) appear at the bottom.

## Understanding schemas

Convex tracks two versions of your schema:

**Declared** - What you wrote in `schema.ts`
```typescript
users: defineTable({
  name: v.string(),
  email: v.string(),
  role: v.optional(v.string()),
})
```

**Inferred** - What Convex detected from actual data
```
name: string
email: string
role: string (optional, 80% populated)
avatar: string (optional, 12% populated)  // ← not in declared schema
```

The browser highlights differences. Use this to:
- Find fields you forgot to add to your schema
- Spot unused optional fields
- Identify type mismatches

## Viewing documents

The bottom panel shows documents from the selected table. Each page shows 50 documents.

**Navigate pages** - Use arrow buttons or keyboard `←` `→`
**Expand objects** - Click nested fields to see contents
**Copy IDs** - Click any `_id` to copy it

## Running queries

Click "Query" to open the query builder. Write JavaScript queries:

```javascript
// Find recent signups
db.query("users")
  .filter(q => q.gt(q.field("createdAt"), Date.now() - 86400000))
  .take(20)

// Search by field
db.query("posts")
  .filter(q => q.eq(q.field("author"), "user_123"))
  .collect()

// Use indexes
db.query("messages")
  .withIndex("by_channel", q => q.eq("channel", "general"))
  .take(50)
```

Queries are read-only. They can't modify your data.

## Common tasks

### "What's in my database?"

Ask: "Show me my Convex schema"

Browse the table list. Click each table to see what data it holds.

### "Is my schema complete?"

Ask: "Check my schema for missing fields"

Look for yellow warnings in the schema view. These show fields present in data but missing from your declared schema.

### "What does this table look like?"

Ask: "Show me the users table"

The browser pre-selects the table. Scroll through documents to see actual data.

### "Find specific documents"

Ask: "Show me users created today"

Use the Query button. Write a filter query. Results appear in the document panel.

## Tips

- **Refresh often** - Click Refresh after making changes to see updates
- **Use indexes** - Queries with `.withIndex()` are faster than filters
- **Check inferred types** - Convex's inferred schema shows actual data patterns
- **Copy queries** - Useful queries can be copied and saved for later

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `↑` `↓` | Navigate tables |
| `Enter` | Select table |
| `←` `→` | Previous/next document page |
| `q` | Open query builder |
| `r` | Refresh |
| `Esc` | Close panels |

## What you can't do

The Schema Browser is read-only. For mutations:
- Use the Convex dashboard
- Ask Claude to write and run a mutation
- Use the official Convex MCP server's `run` tool

## Troubleshooting

**"No tables found"**
- Check you're connected to the right deployment
- Verify you have data in your database
- Try refreshing the browser

**"Unauthorized" or "Authentication failed"**
- Run `npx convex login` to refresh credentials
- Check you have access to the deployment
- For team deployments, verify your permissions

**"Schema not loading"**
- Large schemas may take a moment
- Check your network connection
- Try selecting a specific table

**"Query failed"**
- Check syntax matches Convex query API
- Ensure field names are correct
- Verify index exists if using `.withIndex()`
