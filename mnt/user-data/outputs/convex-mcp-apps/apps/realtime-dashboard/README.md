# Realtime Dashboard

Live-updating charts and metrics for Convex deployments. Query your data and watch it update in real-time inside Claude.

## What it does

The Realtime Dashboard renders interactive visualizations that update as your Convex data changes:

- **Live metrics** - Counters, gauges, and stats that update instantly
- **Time-series charts** - Line and bar charts with real-time data streams
- **Custom queries** - Write queries and see results visualized
- **Multi-panel layouts** - Combine multiple visualizations in one view

## Usage

Ask Claude:

```
"Show me a dashboard of active users"
"Create a real-time chart of messages per hour"
"Build a dashboard showing signup trends"
"Visualize my order data over time"
```

The dashboard renders inline. Data updates automatically as your Convex database changes.

## Features

### Real-time subscriptions

Unlike static queries, the dashboard subscribes to your data. When documents are created, updated, or deleted, the visualization updates immediately.

```
Database change → Convex subscription → Dashboard update
     (ms latency)
```

### Chart types

**Line chart** - Time-series data, trends over time
**Bar chart** - Categorical comparisons, aggregations
**Metric card** - Single values with change indicators
**Table** - Sortable, filterable data grids
**Pie/Donut** - Distribution and proportions

### Query builder

Build visualizations from natural language or code:

```javascript
// Count users by signup date
db.query("users")
  .collect()
  .then(users => {
    const byDate = {};
    users.forEach(u => {
      const date = new Date(u.createdAt).toDateString();
      byDate[date] = (byDate[date] || 0) + 1;
    });
    return Object.entries(byDate).map(([date, count]) => ({ date, count }));
  })
```

### Dashboard layouts

Combine multiple panels:

```
┌──────────────────────────────────────────────────────────────┐
│  My App Dashboard                              [Edit] [Share]│
├────────────────────────────┬─────────────────────────────────┤
│                            │                                 │
│   Active Users             │   Messages Today                │
│   ┌────────────────────┐   │   ┌─────────────────────────┐   │
│   │                    │   │   │         ▄▄              │   │
│   │       1,247        │   │   │       ▄▄██              │   │
│   │       ↑ 12%        │   │   │     ▄▄████▄▄            │   │
│   │                    │   │   │   ▄▄████████▄▄          │   │
│   └────────────────────┘   │   └─────────────────────────┘   │
│                            │                                 │
├────────────────────────────┴─────────────────────────────────┤
│                                                              │
│   Signups This Week                                          │
│   ┌──────────────────────────────────────────────────────┐   │
│   │                                              •        │   │
│   │                                    •        •         │   │
│   │                           •       •                   │   │
│   │                  •       •                            │   │
│   │         •       •                                     │   │
│   │────────────────────────────────────────────────────── │   │
│   │  Mon    Tue    Wed    Thu    Fri    Sat    Sun       │   │
│   └──────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Interface

### Metric cards

Display single values with optional comparison:

```
┌─────────────────────┐
│  Total Users        │
│                     │
│      12,847         │
│      ↑ 156 (1.2%)   │
│      vs last week   │
└─────────────────────┘
```

### Time-series charts

Visualize data over time with configurable intervals:

- **1 hour** - Per-minute granularity
- **24 hours** - Per-hour granularity
- **7 days** - Per-day granularity
- **30 days** - Per-day granularity
- **Custom** - Define your own range and bucket size

### Data tables

Sortable, filterable views of query results:

```
┌──────────────────────────────────────────────────────────────┐
│  Recent Orders                              Filter: [      ] │
├──────────┬────────────────┬────────────┬─────────┬──────────┤
│  ID      │  Customer      │  Amount    │  Status │  Date    │
├──────────┼────────────────┼────────────┼─────────┼──────────┤
│  ord_123 │  Alice Chen    │  $149.00   │  ✓ Paid │  2 min   │
│  ord_122 │  Bob Smith     │  $89.50    │  ⏳ Pend │  5 min   │
│  ord_121 │  Carol Wu      │  $234.00   │  ✓ Paid │  12 min  │
└──────────┴────────────────┴────────────┴─────────┴──────────┘
```

## Configuration

The dashboard accepts configuration via tool arguments:

| Parameter | Type | Description |
|-----------|------|-------------|
| `deployment` | string | Deployment selector from `status` tool |
| `query` | string | JavaScript query to visualize |
| `chartType` | string | line, bar, metric, table, pie |
| `title` | string | Dashboard or panel title |
| `refreshInterval` | number | Manual refresh interval in ms (real-time is default) |
| `timeRange` | string | 1h, 24h, 7d, 30d, or custom |

## Examples

### Active users metric

```
User: "Show me how many users are currently active"

Claude: [Calls dashboard_view tool with:
         query: count users where lastSeen > 5 minutes ago
         chartType: metric]

        [Dashboard renders metric card showing "Active Users: 1,247"]
```

### Signup trends

```
User: "Create a chart of signups over the last week"

Claude: [Calls dashboard_view tool with:
         query: aggregate users by createdAt, group by day
         chartType: line
         timeRange: 7d]

        [Dashboard renders line chart with daily signup counts]
```

### Multi-panel dashboard

```
User: "Build a dashboard showing orders, revenue, and top products"

Claude: [Calls dashboard_view tool with layout config]

        [Dashboard renders 3-panel layout:
         - Orders today (metric)
         - Revenue trend (line chart)
         - Top products (table)]
```

### Custom query visualization

```
User: "Show me message volume by channel as a bar chart"

Claude: [Calls dashboard_view tool with:
         query: `db.query("messages").collect().then(msgs => {
           const byChannel = {};
           msgs.forEach(m => {
             byChannel[m.channel] = (byChannel[m.channel] || 0) + 1;
           });
           return Object.entries(byChannel)
             .map(([channel, count]) => ({ channel, count }))
             .sort((a, b) => b.count - a.count);
         })`
         chartType: bar]

        [Dashboard renders bar chart with channels on x-axis]
```

## Real-time behavior

### Subscription lifecycle

1. Dashboard mounts and establishes Convex subscription
2. Initial data loads and renders
3. Database changes trigger subscription updates
4. UI re-renders with new data (typically <100ms)

### Connection handling

The dashboard handles disconnections gracefully:

- **Reconnecting** - Shows indicator, buffers updates
- **Reconnected** - Syncs missed changes, removes indicator
- **Failed** - Shows error state with retry button

### Performance

For high-volume data (>1000 updates/second), the dashboard batches renders:

- Updates collected over 100ms window
- Single render pass for all changes
- Smooth 60fps even with rapid updates

## Security and authentication

The dashboard doesn't handle authentication directly. Instead:

1. **MCP server authenticates** - Uses your local Convex credentials or deploy key
2. **Dashboard requests data via MCP** - All queries route through the server
3. **Convex enforces access** - You only see data you have permission to access

**Real-time subscriptions and security:**
- Subscriptions are established by the MCP server, not the iframe
- The iframe receives data updates via postMessage
- No direct WebSocket connection from iframe to Convex

**The iframe is sandboxed:**
- No access to your credentials
- No direct network requests
- Communicates only via JSON-RPC postMessage to the host

**Query safety:**
- Custom queries run in Convex's sandbox
- Read-only (can't modify data)
- Subject to your deployment's access rules

If you see "unauthorized" errors, check that you're logged into Convex (`npx convex login`) or that your deploy key is valid.

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `r` | Refresh all panels |
| `f` | Toggle fullscreen |
| `e` | Edit mode |
| `1-9` | Focus panel by number |
| `Esc` | Exit fullscreen/edit mode |

## Technical details

### Convex subscriptions

The dashboard uses Convex's real-time subscription system:

```javascript
// Internal subscription setup
const unsubscribe = convex.onUpdate(query, (results) => {
  updateChart(results);
});
```

### Chart rendering

Built with lightweight charting (no D3 dependency):

- SVG-based for crisp rendering
- CSS animations for smooth transitions
- Canvas fallback for large datasets (>10k points)

### Memory management

Subscriptions are cleaned up when:

- Dashboard is closed
- User navigates away
- Host iframe is destroyed

## Troubleshooting

### Data not updating

Check that:
1. Real-time subscriptions are enabled (not using `refreshInterval`)
2. Your query matches documents that are changing
3. WebSocket connection is active (check browser devtools)

### Chart rendering issues

- Large datasets may need aggregation before visualization
- Complex queries might exceed response time limits
- Try reducing the time range or adding filters

### Performance problems

For slow dashboards:
1. Add indexes for filtered queries
2. Use aggregations instead of full scans
3. Reduce time range to limit data volume
4. Consider server-side aggregation in Convex functions
