# Tools Reference

## schema_browser

Interactive schema explorer with two view modes.

### Usage

In Claude, ask:

- "Show me my Convex schema"
- "What tables do I have?"
- "Show me the users table"

### Parameters

| Parameter      | Type    | Default | Description                          |
| -------------- | ------- | ------- | ------------------------------------ |
| `table`        | string  | none    | Pre-select a specific table          |
| `showInferred` | boolean | true    | Show inferred schemas from documents |
| `pageSize`     | number  | 50      | Documents per page in list view      |

### Views

**Graph View** - Visual diagram showing tables as nodes with relationship lines

- Drag nodes to rearrange
- Pan and zoom to navigate
- Click nodes to select
- Toggle dark mode in header

**List View** - Traditional table list with schema details

- Paginated document browser
- Field types and optionality
- Search across tables

### Keyboard Shortcuts

| Key                          | Action                   |
| ---------------------------- | ------------------------ |
| `G`                          | Toggle Graph/List view   |
| `B`                          | Toggle sidebar panel     |
| `C`                          | Toggle code panel        |
| `A`                          | Auto arrange layout      |
| `F`                          | Fit to view              |
| `R`                          | Refresh data             |
| `Arrow Up/Down`              | Navigate tables          |
| `Arrow Left/Right`           | Change page (List view)  |
| `/`                          | Focus search             |
| `+/-`                        | Zoom in/out (Graph view) |
| `Cmd+Z / Ctrl+Z`             | Undo position            |
| `Cmd+Shift+Z / Ctrl+Shift+Z` | Redo position            |

---

## dashboard_view

Real-time dashboard with metrics and charts.

### Usage

In Claude, ask:

- "Create a dashboard for my data"
- "Show me metrics for my users table"
- "Dashboard with user counts by day"

### Parameters

| Parameter         | Type   | Default | Description                 |
| ----------------- | ------ | ------- | --------------------------- |
| `metrics`         | array  | []      | Metric definitions          |
| `charts`          | array  | []      | Chart configurations        |
| `refreshInterval` | number | 5       | Refresh interval in seconds |

### Metric Aggregations

- `count` - Number of documents
- `sum` - Sum of field values
- `avg` - Average of field values
- `min` - Minimum value
- `max` - Maximum value

### Chart Types

- `line` - Line chart over time
- `bar` - Bar chart for comparisons
- `pie` - Pie chart for distributions

### Example Configuration

```json
{
  "metrics": [
    { "name": "Total Users", "table": "users", "aggregation": "count" },
    {
      "name": "Avg Score",
      "table": "scores",
      "aggregation": "avg",
      "field": "value"
    }
  ],
  "charts": [
    {
      "type": "bar",
      "title": "Posts by Day",
      "table": "posts",
      "groupBy": "category"
    }
  ],
  "refreshInterval": 10
}
```
