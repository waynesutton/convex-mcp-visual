/**
 * Dashboard Tool
 *
 * MCP tool that creates real-time dashboard visualizations
 * for Convex data - both in terminal AND in browser.
 */
import { launchUIApp } from '../ui-server.js';
export const dashboardTool = {
    name: 'dashboard_view',
    description: `Creates a real-time dashboard for visualizing Convex data.

Features:
- Metric cards for single values
- Line and bar charts for time series
- Tables for detailed records
- Real-time updates via Convex subscriptions

The dashboard renders as an interactive UI panel with live data.`,
    inputSchema: {
        type: 'object',
        properties: {
            deployment: {
                type: 'string',
                description: 'Deployment selector (from status tool)',
            },
            metrics: {
                type: 'array',
                description: 'Metrics to display on the dashboard',
                items: {
                    type: 'object',
                    properties: {
                        name: { type: 'string', description: 'Display name for the metric' },
                        table: { type: 'string', description: 'Table to query' },
                        aggregation: {
                            type: 'string',
                            enum: ['count', 'sum', 'avg', 'min', 'max'],
                            description: 'Aggregation function',
                        },
                        field: { type: 'string', description: 'Field to aggregate (not needed for count)' },
                        filter: { type: 'string', description: 'Optional filter expression' },
                    },
                    required: ['name', 'table', 'aggregation'],
                },
            },
            charts: {
                type: 'array',
                description: 'Charts to display',
                items: {
                    type: 'object',
                    properties: {
                        type: { type: 'string', enum: ['line', 'bar', 'pie'], description: 'Chart type' },
                        title: { type: 'string', description: 'Chart title' },
                        table: { type: 'string', description: 'Table to query' },
                        xField: { type: 'string', description: 'Field for X axis' },
                        yField: { type: 'string', description: 'Field for Y axis' },
                        groupBy: { type: 'string', description: 'Field to group by' },
                    },
                    required: ['type', 'title', 'table'],
                },
            },
            refreshInterval: {
                type: 'number',
                description: 'Refresh interval in seconds (default: 5)',
                default: 5,
            },
        },
        required: [],
    },
};
export async function handleDashboard(client, args = {}) {
    const { metrics = [], charts = [], refreshInterval = 5 } = args;
    if (!client.isConnected()) {
        return {
            content: [
                {
                    type: 'text',
                    text: `## Realtime Dashboard

**Connection Error**: No Convex deployment configured.

To connect:
1. Run \`npx convex login\` to authenticate
2. Or set \`CONVEX_URL\` and \`CONVEX_DEPLOY_KEY\` environment variables`,
                },
            ],
            isError: true,
        };
    }
    try {
        // Get all documents for computing metrics
        const allDocuments = await client.getAllDocuments();
        const tables = await client.listTables();
        // Compute actual metric values
        const computedMetrics = metrics.map((m) => {
            const docs = allDocuments[m.table] || [];
            const value = computeAggregation(docs, m.aggregation, m.field);
            return {
                ...m,
                value,
                documentCount: docs.length,
            };
        });
        // If no metrics specified, auto-generate from tables
        const autoMetrics = metrics.length === 0
            ? tables.map((t) => ({
                name: `${t.name} count`,
                table: t.name,
                aggregation: 'count',
                value: (allDocuments[t.name] || []).length,
                documentCount: (allDocuments[t.name] || []).length,
            }))
            : [];
        // Build config for UI app
        const config = {
            deploymentUrl: client.getDeploymentUrl(),
            metrics: metrics.length > 0 ? computedMetrics : autoMetrics,
            charts,
            refreshInterval,
            allDocuments,
            tables: tables.map((t) => ({
                name: t.name,
                documentCount: (allDocuments[t.name] || []).length,
            })),
        };
        // Launch the interactive UI in browser
        let uiUrl = '';
        try {
            const uiServer = await launchUIApp({
                appName: 'realtime-dashboard',
                config,
                port: 3457,
                autoClose: 30 * 60 * 1000, // Auto-close after 30 minutes
            });
            uiUrl = uiServer.url;
        }
        catch (error) {
            console.error('Failed to launch UI:', error);
        }
        // Build terminal output
        const terminalOutput = buildTerminalOutput(metrics.length > 0 ? computedMetrics : autoMetrics, charts, allDocuments, client.getDeploymentUrl(), uiUrl, refreshInterval);
        return {
            content: [
                {
                    type: 'text',
                    text: terminalOutput,
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `## Realtime Dashboard

**Error**: ${error instanceof Error ? error.message : String(error)}

Please check your Convex credentials and deployment URL.`,
                },
            ],
            isError: true,
        };
    }
}
/**
 * Compute aggregation on documents
 */
function computeAggregation(docs, aggregation, field) {
    if (docs.length === 0)
        return 0;
    switch (aggregation) {
        case 'count':
            return docs.length;
        case 'sum':
            if (!field)
                return 0;
            return docs.reduce((sum, doc) => {
                const val = doc[field];
                return sum + (typeof val === 'number' ? val : 0);
            }, 0);
        case 'avg':
            if (!field)
                return 0;
            const values = docs
                .map((doc) => doc[field])
                .filter((v) => typeof v === 'number');
            if (values.length === 0)
                return 0;
            return values.reduce((a, b) => a + b, 0) / values.length;
        case 'min':
            if (!field)
                return 0;
            const minValues = docs
                .map((doc) => doc[field])
                .filter((v) => typeof v === 'number');
            return minValues.length > 0 ? Math.min(...minValues) : 0;
        case 'max':
            if (!field)
                return 0;
            const maxValues = docs
                .map((doc) => doc[field])
                .filter((v) => typeof v === 'number');
            return maxValues.length > 0 ? Math.max(...maxValues) : 0;
        default:
            return 0;
    }
}
/**
 * Build terminal-friendly dashboard output
 */
function buildTerminalOutput(metrics, charts, allDocuments, deploymentUrl, uiUrl, refreshInterval) {
    const lines = [];
    lines.push('## Realtime Dashboard');
    lines.push('');
    if (uiUrl) {
        lines.push(`**Interactive UI**: ${uiUrl}`);
        lines.push('');
    }
    lines.push(`Connected to: \`${deploymentUrl}\``);
    lines.push(`Refresh interval: ${refreshInterval}s`);
    lines.push('');
    // Metrics section
    if (metrics.length > 0) {
        lines.push('### Metrics');
        lines.push('');
        lines.push('| Metric | Value | Source |');
        lines.push('|--------|-------|--------|');
        for (const m of metrics) {
            const formattedValue = formatNumber(m.value);
            const source = `${m.table} / ${m.aggregation}${m.field ? `(${m.field})` : ''}`;
            lines.push(`| ${m.name} | **${formattedValue}** | ${source} |`);
        }
        lines.push('');
    }
    // Charts section (show what charts would be rendered)
    if (charts.length > 0) {
        lines.push('### Charts');
        lines.push('');
        for (const c of charts) {
            lines.push(`- **${c.title}** (${c.type} chart from \`${c.table}\`)`);
        }
        lines.push('');
    }
    // Recent activity
    lines.push('### Recent Documents');
    lines.push('');
    const flatDocs = [];
    for (const [table, docs] of Object.entries(allDocuments)) {
        for (const d of docs) {
            flatDocs.push({
                ...d,
                table,
            });
        }
    }
    const allDocs = flatDocs
        .sort((a, b) => {
        const aTime = a._creationTime || 0;
        const bTime = b._creationTime || 0;
        return bTime - aTime;
    })
        .slice(0, 5);
    if (allDocs.length > 0) {
        lines.push('| Table | ID | Created |');
        lines.push('|-------|-----|---------|');
        for (const doc of allDocs) {
            const id = String(doc._id || '').slice(0, 10) + '...';
            const created = doc._creationTime
                ? formatTimeAgo(doc._creationTime)
                : 'Unknown';
            lines.push(`| ${doc.table} | \`${id}\` | ${created} |`);
        }
    }
    else {
        lines.push('*No documents found*');
    }
    return lines.join('\n');
}
/**
 * Format number for display
 */
function formatNumber(num) {
    if (num >= 1000000)
        return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000)
        return (num / 1000).toFixed(1) + 'k';
    if (Number.isInteger(num))
        return num.toString();
    return num.toFixed(2);
}
/**
 * Format timestamp as relative time
 */
function formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1)
        return 'Just now';
    if (minutes < 60)
        return `${minutes}m ago`;
    if (hours < 24)
        return `${hours}h ago`;
    return `${days}d ago`;
}
//# sourceMappingURL=dashboard.js.map