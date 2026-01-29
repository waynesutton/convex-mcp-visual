# Using the Realtime Dashboard

A quick guide for building live dashboards from your Convex data inside Claude.

## Before you start

The dashboard needs access to your Convex deployment. If you've run `npx convex login` before, you're already set. If not:

```bash
npx convex login
```

This is a one-time setup. The MCP server reads your credentials automatically.

## Getting started

Ask Claude to visualize your data:

```
"Show me active users"
"Create a chart of signups this week"
"Build a dashboard of my orders"
```

The dashboard renders inline. Data updates automatically as your database changes.

## Creating visualizations

### Metric cards

Best for single numbers you want to track.

```
"How many users do I have?"
"Show me total revenue today"
"Count active sessions"
```

The card displays the current value with optional comparison to previous period.

### Line charts

Best for trends over time.

```
"Show signups over the last week"
"Chart message volume by hour"
"Visualize daily active users"
```

Data points connect to show patterns. The chart updates as new data arrives.

### Bar charts

Best for comparing categories.

```
"Show orders by status"
"Compare messages per channel"
"Break down users by role"
```

Bars resize automatically to fit new values.

### Data tables

Best for detailed records.

```
"Show me recent orders"
"List active users"
"Display error logs"
```

Tables support sorting and filtering. Click column headers to sort.

## Real-time updates

The dashboard subscribes to your Convex data. Changes appear instantly:

1. Someone creates a new user → User count updates
2. Order status changes → Chart bar resizes
3. Message sent → Table adds new row

No refresh needed. No polling. True real-time.

## Time ranges

Charts support different time windows:

- **1 hour** - See minute-by-minute changes
- **24 hours** - Hourly aggregations
- **7 days** - Daily totals
- **30 days** - Monthly overview
- **Custom** - Pick your own range

Ask Claude to adjust:

```
"Change to last 24 hours"
"Show me the last 30 days"
"Zoom into the last hour"
```

## Building dashboards

Combine multiple visualizations:

```
"Create a dashboard with:
- Active users count
- Signups chart for the week
- Recent orders table"
```

Claude arranges panels in a grid. Each updates independently.

## Custom queries

For complex visualizations, describe what you want:

```
"Show message volume grouped by channel, 
only for channels with more than 100 messages"
```

Or write the query directly:

```
"Visualize this query as a bar chart:
db.query('messages').collect().then(msgs => {
  const counts = {};
  msgs.forEach(m => counts[m.channel] = (counts[m.channel] || 0) + 1);
  return Object.entries(counts)
    .filter(([_, count]) => count > 100)
    .map(([channel, count]) => ({ channel, count }));
})"
```

## Common tasks

### "How is my app doing?"

Ask: "Build me an overview dashboard"

Get key metrics at a glance: users, activity, growth trends.

### "What happened today?"

Ask: "Show me today's activity"

See time-series of events, transactions, or user actions.

### "Where are my users?"

Ask: "Break down users by country" (if you track location)

Pie chart or bar chart showing distribution.

### "What's trending?"

Ask: "Show me the most popular items this week"

Table sorted by count or engagement metric.

## Interacting with dashboards

**Hover** - See exact values at any point
**Click** - Drill down into specific data
**Drag** - Select time range (on charts)
**Scroll** - Navigate long tables

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `r` | Refresh all panels |
| `f` | Toggle fullscreen |
| `1-9` | Focus specific panel |
| `Esc` | Exit fullscreen |

## Tips

- **Start simple** - Begin with one metric, add complexity later
- **Use indexes** - Queries over indexed fields are faster
- **Watch the connection** - Real-time needs stable WebSocket
- **Aggregate server-side** - For large datasets, create Convex functions that pre-aggregate

## Limitations

**Query complexity** - Very complex queries may timeout
**Data volume** - Charts work best with <10,000 points
**Update frequency** - Extremely high-frequency updates may batch
**Historical data** - Shows live data, not analytics over time (use Convex's built-in analytics for that)

## Troubleshooting

**"Data not updating"**
- Check WebSocket connection (browser devtools)
- Verify the query matches changing data
- Try refreshing the dashboard

**"Unauthorized" or "Authentication failed"**
- Run `npx convex login` to refresh credentials
- Check you have access to the deployment
- For team deployments, verify your permissions

**"Chart is empty"**
- Query might return no results
- Check time range includes your data
- Verify field names in query

**"Dashboard is slow"**
- Reduce time range
- Add filters to limit data
- Use indexed queries
- Consider server-side aggregation

**"Connection lost"**
- Network interruption
- Dashboard will reconnect automatically
- Missed updates sync when reconnected
