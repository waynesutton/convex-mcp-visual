/**
 * Schema Browser Tool
 *
 * MCP tool that displays database schema in terminal AND
 * opens an interactive schema browser UI in the browser.
 */
import { launchUIApp } from "../ui-server.js";
export const schemaBrowserTool = {
    name: "schema_browser",
    description: `Opens an interactive Schema Browser for exploring your Convex database.

Features:
- Browse all tables with document counts
- View declared vs inferred schemas side-by-side
- Paginate through documents
- Build and run read-only queries

The Schema Browser renders as an interactive UI panel where you can click through tables,
inspect field types, and explore your data visually.`,
    inputSchema: {
        type: "object",
        properties: {
            deployment: {
                type: "string",
                description: "Deployment selector (from status tool). If not provided, uses the default deployment.",
            },
            table: {
                type: "string",
                description: "Pre-select a specific table to view",
            },
            showInferred: {
                type: "boolean",
                description: "Show inferred schemas alongside declared schemas (default: true)",
                default: true,
            },
            pageSize: {
                type: "number",
                description: "Number of documents per page (default: 50)",
                default: 50,
            },
        },
        required: [],
    },
};
export async function handleSchemaBrowser(client, args = {}) {
    const { table, showInferred = true, pageSize = 50, } = args;
    // Check if client is connected
    if (!client.isConnected()) {
        return {
            content: [
                {
                    type: "text",
                    text: `## Schema Browser

**Connection Error**: No Convex deployment configured.

To connect:
1. Run \`npx convex login\` to authenticate
2. Or set \`CONVEX_URL\` and \`CONVEX_DEPLOY_KEY\` environment variables

Once connected, the Schema Browser will display your tables and schemas.`,
                },
            ],
            isError: true,
        };
    }
    try {
        // Get table list with document counts
        const tables = await client.listTables();
        // Check if we have admin access for document fetching
        const hasAdminAccess = client.hasAdminAccess();
        // Get sample documents if admin access is available
        const allDocuments = hasAdminAccess ? await client.getAllDocuments() : {};
        // Build table info with schema data
        const tableInfos = await Promise.all(tables.map(async (t) => {
            const docs = allDocuments[t.name] || [];
            // Get declared schema from Convex
            const tableSchema = await client.getTableSchema(t.name);
            return {
                name: t.name,
                documentCount: t.documentCount,
                hasIndexes: t.indexes.length > 0,
                indexes: t.indexes,
                documents: docs.slice(0, pageSize),
                inferredFields: tableSchema.inferredFields,
                declaredFields: tableSchema.declaredFields,
            };
        }));
        // Get schema for selected table if specified
        let selectedTableInfo = null;
        if (table) {
            selectedTableInfo = tableInfos.find((t) => t.name === table);
        }
        // Build config for UI app
        const config = {
            deploymentUrl: client.getDeploymentUrl(),
            selectedTable: table || null,
            showInferred,
            pageSize,
            tables: tableInfos,
            hasAdminAccess,
            selectedSchema: selectedTableInfo
                ? {
                    tableName: selectedTableInfo.name,
                    declaredFields: selectedTableInfo.declaredFields,
                    inferredFields: selectedTableInfo.inferredFields,
                    indexes: selectedTableInfo.indexes,
                }
                : null,
            allDocuments,
        };
        // Launch the interactive UI in browser
        let uiUrl = "";
        try {
            const uiServer = await launchUIApp({
                appName: "schema-browser",
                config,
                port: 3456,
                autoClose: 30 * 60 * 1000, // Auto-close after 30 minutes
            });
            uiUrl = uiServer.url;
        }
        catch (error) {
            console.error("Failed to launch UI:", error);
        }
        // Build terminal output (markdown tables)
        const terminalOutput = buildTerminalOutput(tableInfos, table, client.getDeploymentUrl(), uiUrl, hasAdminAccess);
        return {
            content: [
                {
                    type: "text",
                    text: terminalOutput,
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `## Schema Browser

**Error**: ${error instanceof Error ? error.message : String(error)}

Please check:
1. Your Convex credentials are valid
2. You have access to this deployment
3. The deployment URL is correct`,
                },
            ],
            isError: true,
        };
    }
}
/**
 * Infer schema from document samples
 */
function inferSchemaFromDocuments(documents) {
    if (documents.length === 0)
        return [];
    const fieldStats = new Map();
    const totalDocs = documents.length;
    for (const doc of documents) {
        for (const [key, value] of Object.entries(doc)) {
            const stats = fieldStats.get(key) || { types: new Set(), count: 0 };
            stats.types.add(getValueType(value));
            stats.count++;
            fieldStats.set(key, stats);
        }
    }
    return Array.from(fieldStats.entries())
        .map(([name, stats]) => ({
        name,
        type: Array.from(stats.types).join(" | "),
        optional: stats.count < totalDocs,
    }))
        .sort((a, b) => {
        // Sort system fields first
        const aIsSystem = a.name.startsWith("_");
        const bIsSystem = b.name.startsWith("_");
        if (aIsSystem && !bIsSystem)
            return -1;
        if (!aIsSystem && bIsSystem)
            return 1;
        return a.name.localeCompare(b.name);
    });
}
/**
 * Get the type of a value for schema inference
 */
function getValueType(value) {
    if (value === null)
        return "null";
    if (value === undefined)
        return "undefined";
    if (Array.isArray(value))
        return "array";
    if (typeof value === "object")
        return "object";
    return typeof value;
}
/**
 * Build terminal-friendly markdown output
 */
function buildTerminalOutput(tables, selectedTable, deploymentUrl, uiUrl, hasAdminAccess) {
    const lines = [];
    lines.push("## Schema Browser");
    lines.push("");
    if (uiUrl) {
        lines.push(`**Interactive UI**: ${uiUrl}`);
        lines.push("");
    }
    lines.push(`Connected to: \`${deploymentUrl}\``);
    if (!hasAdminAccess) {
        lines.push("");
        lines.push("*Note: Document counts and samples require admin access. Set CONVEX_DEPLOY_KEY for full access.*");
    }
    lines.push("");
    if (tables.length === 0) {
        lines.push("*No tables found in this deployment.*");
        return lines.join("\n");
    }
    // If a specific table is selected, show detailed view
    if (selectedTable) {
        const tableInfo = tables.find((t) => t.name === selectedTable);
        if (tableInfo) {
            lines.push(`### ${selectedTable} (${tableInfo.documentCount} documents)`);
            lines.push("");
            lines.push("**Schema:**");
            lines.push("");
            lines.push("| Field | Type | Required |");
            lines.push("|-------|------|----------|");
            for (const field of tableInfo.inferredFields) {
                lines.push(`| ${field.name} | ${field.type} | ${field.optional ? "No" : "Yes"} |`);
            }
            lines.push("");
            if (tableInfo.documents.length > 0) {
                lines.push("**Sample Documents:**");
                lines.push("");
                lines.push("```json");
                lines.push(JSON.stringify(tableInfo.documents.slice(0, 3), null, 2));
                lines.push("```");
            }
            return lines.join("\n");
        }
    }
    // Show all tables overview
    lines.push(`Found ${tables.length} tables:`);
    lines.push("");
    for (const table of tables) {
        lines.push("---");
        lines.push(`### ${table.name}`);
        lines.push(`Documents: ${table.documentCount}`);
        lines.push("");
        // Show declared fields if available, otherwise inferred
        const fields = table.declaredFields.length > 0
            ? table.declaredFields
            : table.inferredFields;
        const schemaType = table.declaredFields.length > 0 ? "Declared" : "Inferred";
        lines.push(`**${schemaType} Schema:**`);
        lines.push("");
        lines.push("| Field | Type | Required |");
        lines.push("|-------|------|----------|");
        if (fields.length === 0) {
            lines.push("| *(no schema data)* | - | - |");
        }
        else {
            for (const field of fields) {
                lines.push(`| ${field.name} | \`${field.type}\` | ${field.optional ? "No" : "Yes"} |`);
            }
        }
        lines.push("");
        // Show sample documents if available
        if (table.documents.length > 0) {
            lines.push(`**Sample (${table.documents.length} of ${table.documentCount}):**`);
            lines.push("```json");
            lines.push(JSON.stringify(table.documents[0], null, 2));
            lines.push("```");
            lines.push("");
        }
    }
    return lines.join("\n");
}
//# sourceMappingURL=schema-browser.js.map