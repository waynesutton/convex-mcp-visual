# Tools Reference

## schema_browser

Interactive schema explorer with two view modes. Opens in graph view by default.

### Usage

In Claude, ask:

- "Show me my Convex schema" (opens graph view)
- "What tables do I have?" (opens graph view)
- "Show me the users table"

### CLI Flags

```bash
convex-mcp-visual schema          # Graph view (default)
convex-mcp-visual schema --graph  # Explicitly graph view
convex-mcp-visual schema --list   # List view (table-based)
```

### Parameters

| Parameter      | Type    | Default | Description                                      |
| -------------- | ------- | ------- | ------------------------------------------------ |
| `table`        | string  | none    | Pre-select a specific table                      |
| `showInferred` | boolean | true    | Show inferred schemas from documents             |
| `pageSize`     | number  | 50      | Documents per page in list view                  |
| `viewMode`     | string  | "graph" | Initial view: "graph" (visual) or "list" (table) |

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

## component_browser

Browse installed Convex components and their schemas. Components are detected by namespaced tables (e.g., `agent:threads`).

### Usage

In Claude, ask:

- "Show installed components"
- "What components are installed?"
- "Show the agent component"

### CLI Flags

```bash
convex-mcp-visual components                    # List all components
convex-mcp-visual components --component agent  # Focus on specific component
convex-mcp-visual components --no-tables        # Hide table details
convex-mcp-visual components --no-fields        # Hide field schemas
```

### Parameters

| Parameter    | Type    | Default | Description                             |
| ------------ | ------- | ------- | --------------------------------------- |
| `component`  | string  | none    | Filter to a specific component by name  |
| `showTables` | boolean | true    | Include table details in output         |
| `showFields` | boolean | true    | Include field schemas in output         |

### Known Component Types

The tool automatically detects these Convex components:

- `@convex-dev/agent` - AI agent threads and messages
- `@convex-dev/auth` - Authentication sessions and tokens
- `@convex-dev/ratelimiter` - Rate limiting state
- `@convex-dev/migrations` - Schema migration tracking
- `@convex-dev/crons` - Cron job scheduling
- `@convex-dev/aggregate` - Aggregation state
- `@convex-dev/workflow` - Workflow execution
- `@convex-dev/shardedCounter` - Distributed counters

### Views

**Overview** - Summary of all installed components with stats

- Component cards showing table count and document count
- App tables (non-component) summary
- Quick navigation to component details

**Component Detail** - Detailed view of a specific component

- Table schemas with field types
- Document counts per table
- Index information

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

---

## schema_diagram

Generates Mermaid ER diagrams from your Convex schema.

### Usage

In Claude, ask:

- "Generate a diagram of my schema"
- "Show me a Mermaid ER diagram"
- "Visualize my database relationships"

### Parameters

| Parameter          | Type    | Default       | Description                              |
| ------------------ | ------- | ------------- | ---------------------------------------- |
| `theme`            | string  | "github-dark" | Color theme for SVG output               |
| `ascii`            | boolean | false         | Use ASCII instead of Unicode box drawing |
| `tables`           | array   | all           | Specific tables to include               |
| `groupByComponent` | boolean | false         | Group tables by component namespace      |
| `component`        | string  | none          | Show only tables from a specific component |

### CLI Flags

```bash
convex-mcp-visual diagram                          # All tables
convex-mcp-visual diagram --groupByComponent       # Group by component
convex-mcp-visual diagram --component agent        # Only agent tables
```

### Available Themes

- `github-dark` - Dark mode GitHub style (default)
- `github-light` - Light mode GitHub style
- `tokyo-night` - Tokyo Night color scheme
- `dracula` - Dracula theme
- `nord` - Nord color palette
- `zinc-dark` - Neutral dark
- `zinc-light` - Neutral light

### Output

**Terminal** - ASCII/Unicode box drawing diagram

```
erDiagram
    users {
        id _id
        string name
        string email
    }
    posts {
        id _id
        id userId
        string content
    }
    users ||--o{ posts : "userId"
```

**Browser** - Interactive SVG with:

- Themed visual diagram
- Copy Mermaid code button
- Responsive layout

### Relationship Detection

The tool auto detects relationships from field patterns:

- Fields ending in `Id` (e.g., `userId`, `postId`)
- Fields ending in `_id` (e.g., `user_id`)
- Fields with `v.id("tableName")` type

Relationships are shown as one to many (`||--o{`) by default.

---

## codebase_subway_map

Generates a subway map style diagram for your codebase.

### Usage

In Claude, ask:

- "Show me a codebase subway map"
- "Map my codebase as a subway"

### CLI Flags

```bash
convex-mcp-visual subway              # Codebase subway map
convex-mcp-visual subway --root ./apps
convex-mcp-visual subway --max-nodes 80
```

### Parameters

| Parameter   | Type    | Default       | Description                        |
| ----------- | ------- | ------------- | ---------------------------------- |
| `root`      | string  | current dir   | Root folder to scan                |
| `maxDepth`  | number  | 6             | Max folder depth to scan           |
| `maxNodes`  | number  | 120           | Max nodes to render                |
| `theme`     | string  | "github-dark" | Color theme for SVG output         |
| `ascii`     | boolean | false         | Use ASCII instead of Unicode boxes |
| `noBrowser` | boolean | false         | Skip browser UI output             |

---

## table_heatmap

Shows a heatmap of recent writes per table.

### Usage

In Claude, ask:

- "Show table write heatmap"
- "Which tables are hottest"

### CLI Flags

```bash
convex-mcp-visual table-heatmap
convex-mcp-visual table-heatmap --window-minutes 5
```

### Parameters

| Parameter         | Type    | Default       | Description                |
| ----------------- | ------- | ------------- | -------------------------- |
| `windowMinutes`   | number  | 1             | Lookback window in minutes |
| `maxDocsPerTable` | number  | 1500          | Max docs to scan per table |
| `maxTables`       | number  | 60            | Max tables to scan         |
| `theme`           | string  | "github-dark" | Color theme for UI output  |
| `noBrowser`       | boolean | false         | Skip browser UI output     |

---

## schema_drift

Compares declared and inferred fields to detect schema drift.

### Usage

In Claude, ask:

- "Show schema drift"
- "Compare declared vs inferred schema"

### CLI Flags

```bash
convex-mcp-visual schema-drift
convex-mcp-visual schema-drift --max-tables 40
```

### Parameters

| Parameter   | Type    | Default       | Description               |
| ----------- | ------- | ------------- | ------------------------- |
| `maxTables` | number  | 80            | Max tables to scan        |
| `theme`     | string  | "github-dark" | Color theme for UI output |
| `noBrowser` | boolean | false         | Skip browser UI output    |

---

## write_conflict_report

Summarizes write conflicts from Convex logs.

### Usage

In Claude, ask:

- "Show write conflicts"
- "Summarize write conflicts from logs"

### CLI Flags

```bash
npx convex logs --limit 1000 > logs.txt
convex-mcp-visual write-conflicts --log-file logs.txt
```

### Parameters

| Parameter      | Type    | Default       | Description                       |
| -------------- | ------- | ------------- | --------------------------------- |
| `logFile`      | string  | none          | Path to log file                  |
| `sinceMinutes` | number  | 60            | Window size for rate calculations |
| `maxLines`     | number  | 5000          | Max log lines to scan             |
| `theme`        | string  | "github-dark" | Color theme for UI output         |
| `noBrowser`    | boolean | false         | Skip browser UI output            |
