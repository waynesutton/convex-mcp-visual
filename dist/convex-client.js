/**
 * Convex Client Wrapper
 *
 * Handles authentication and communication with Convex Cloud.
 * Uses Convex system APIs to fetch schema and document information.
 *
 * System queries used:
 * - /api/shapes2 for inferred schema
 * - _system/frontend/getSchemas for declared schema
 * - _system/cli/tables for table list
 * - _system/cli/tableSize:default for document counts
 * - _system/cli/tableData for paginated document retrieval
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
// Max documents to sample per table (env-configurable)
const DEFAULT_DOC_SAMPLE_LIMIT = parseInt(process.env.CONVEX_DOC_SAMPLE_LIMIT || "100", 10);
export class ConvexClient {
    deploymentUrl = null;
    adminKey = null;
    constructor() {
        this.initialize();
    }
    initialize() {
        // Try environment variables first
        const deployKey = process.env.CONVEX_DEPLOY_KEY;
        const explicitUrl = process.env.CONVEX_URL;
        if (deployKey) {
            // Deploy key format: "prod:deploymentName|adminKey"
            // Example: "prod:happy-animal-123|convex_admin_abc123xyz"
            if (deployKey.includes("|")) {
                const pipeIndex = deployKey.indexOf("|");
                const prefix = deployKey.substring(0, pipeIndex);
                this.adminKey = deployKey.substring(pipeIndex + 1);
                // Extract deployment name from prefix (e.g., "prod:happy-animal-123")
                if (prefix.includes(":")) {
                    const colonIndex = prefix.indexOf(":");
                    const deploymentName = prefix.substring(colonIndex + 1);
                    if (!explicitUrl && deploymentName) {
                        this.deploymentUrl = `https://${deploymentName}.convex.cloud`;
                    }
                }
            }
            else {
                // Just an admin key without prefix
                this.adminKey = deployKey;
            }
        }
        if (explicitUrl) {
            this.deploymentUrl = explicitUrl;
        }
        // Try to read from local project .env.local
        if (!this.deploymentUrl) {
            const envLocalPath = join(process.cwd(), ".env.local");
            if (existsSync(envLocalPath)) {
                try {
                    const envContent = readFileSync(envLocalPath, "utf-8");
                    const urlMatch = envContent.match(/CONVEX_URL=(.+)/);
                    if (urlMatch) {
                        this.deploymentUrl = urlMatch[1].trim().replace(/["']/g, "");
                    }
                }
                catch {
                    // Ignore errors
                }
            }
        }
        // Try to read from project's .convex deployment state
        if (!this.deploymentUrl || !this.adminKey) {
            const convexJsonPath = join(process.cwd(), ".convex", "deployment.json");
            if (existsSync(convexJsonPath)) {
                try {
                    const config = JSON.parse(readFileSync(convexJsonPath, "utf-8"));
                    if (config.url && !this.deploymentUrl) {
                        this.deploymentUrl = config.url;
                    }
                    if (config.adminKey && !this.adminKey) {
                        this.adminKey = config.adminKey;
                    }
                }
                catch {
                    // Ignore errors
                }
            }
        }
        // Try to read from global Convex config (~/.convex/config.json)
        if (!this.adminKey) {
            const globalConfigPath = join(homedir(), ".convex", "config.json");
            if (existsSync(globalConfigPath)) {
                try {
                    const globalConfig = JSON.parse(readFileSync(globalConfigPath, "utf-8"));
                    // Global config may have an accessToken for CLI auth
                    if (globalConfig.accessToken && !this.adminKey) {
                        this.adminKey = globalConfig.accessToken;
                    }
                }
                catch {
                    // Ignore errors
                }
            }
        }
        // Try to read from local convex-mcp config file
        if (!this.deploymentUrl || !this.adminKey) {
            const mcpConfigPath = join(homedir(), ".convex-mcp-visual.json");
            if (existsSync(mcpConfigPath)) {
                try {
                    const mcpConfig = JSON.parse(readFileSync(mcpConfigPath, "utf-8"));
                    if (mcpConfig.deploymentUrl && !this.deploymentUrl) {
                        this.deploymentUrl = mcpConfig.deploymentUrl;
                    }
                    if (mcpConfig.adminKey && !this.adminKey) {
                        this.adminKey = mcpConfig.adminKey;
                    }
                }
                catch {
                    // Ignore errors
                }
            }
        }
    }
    /**
     * Check if admin key is available for system queries
     */
    hasAdminAccess() {
        return this.adminKey !== null;
    }
    isConnected() {
        return this.deploymentUrl !== null;
    }
    getDeploymentUrl() {
        return this.deploymentUrl;
    }
    async fetchConvex(path, body) {
        if (!this.deploymentUrl) {
            throw new Error("No deployment URL configured");
        }
        const url = `${this.deploymentUrl}${path}`;
        const headers = {
            "Content-Type": "application/json",
        };
        if (this.adminKey) {
            headers["Authorization"] = `Convex ${this.adminKey}`;
        }
        const response = await fetch(url, {
            method: body ? "POST" : "GET",
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });
        if (!response.ok) {
            throw new Error(`Convex API error: ${response.status} ${response.statusText}`);
        }
        return response.json();
    }
    async testConnection() {
        if (!this.deploymentUrl) {
            return {
                success: false,
                error: 'No Convex deployment configured. Set CONVEX_URL or run "npx convex login".',
            };
        }
        try {
            // Try to get shapes (inferred schema) - this works without admin key for some deployments
            const shapes = await this.fetchConvex("/api/shapes2");
            const tables = Object.keys(shapes).filter((t) => !t.startsWith("_"));
            return {
                success: true,
                deploymentUrl: this.deploymentUrl,
                tableCount: tables.length,
                tables,
            };
        }
        catch (error) {
            return {
                success: false,
                deploymentUrl: this.deploymentUrl,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    async listTables() {
        if (!this.deploymentUrl) {
            throw new Error("Convex client not initialized");
        }
        try {
            // Get inferred schemas from shapes API
            const shapes = await this.fetchConvex("/api/shapes2");
            const tables = [];
            for (const [tableName] of Object.entries(shapes)) {
                // Skip system tables
                if (tableName.startsWith("_"))
                    continue;
                tables.push({
                    name: tableName,
                    documentCount: 0,
                    indexes: [],
                });
            }
            // Try to get declared schema info if we have admin access
            if (this.adminKey) {
                try {
                    const schemaResponse = await this.fetchConvex("/api/query", {
                        path: "_system/frontend/getSchemas",
                        args: {},
                        format: "json",
                    });
                    if (schemaResponse?.value?.active) {
                        const activeSchema = JSON.parse(schemaResponse.value.active);
                        if (activeSchema.tables) {
                            for (const tableSchema of activeSchema.tables) {
                                const existing = tables.find((t) => t.name === tableSchema.tableName);
                                if (existing) {
                                    existing.indexes =
                                        tableSchema.indexes?.map((i) => i.indexDescriptor) || [];
                                }
                                else if (!tableSchema.tableName.startsWith("_")) {
                                    tables.push({
                                        name: tableSchema.tableName,
                                        documentCount: 0,
                                        indexes: tableSchema.indexes?.map((i) => i.indexDescriptor) || [],
                                    });
                                }
                            }
                        }
                    }
                }
                catch {
                    // Admin query failed, continue with shapes data only
                }
                // Fetch document counts for each table using system query
                await Promise.all(tables.map(async (table) => {
                    try {
                        const count = await this.getTableCount(table.name);
                        table.documentCount = count;
                    }
                    catch {
                        // Count unavailable, keep as 0
                    }
                }));
            }
            return tables.sort((a, b) => a.name.localeCompare(b.name));
        }
        catch (error) {
            console.error("Failed to list tables:", error);
            return [];
        }
    }
    /**
     * Get document count for a table using system query
     */
    async getTableCount(tableName) {
        if (!this.deploymentUrl || !this.adminKey) {
            return 0;
        }
        try {
            const response = await this.fetchConvex("/api/query", {
                path: "_system/cli/tableSize:default",
                args: { tableName },
                format: "json",
            });
            return typeof response?.value === "number" ? response.value : 0;
        }
        catch {
            return 0;
        }
    }
    async getTableSchema(tableName) {
        if (!this.deploymentUrl) {
            throw new Error("Convex client not initialized");
        }
        const result = {
            tableName,
            declaredFields: [],
            inferredFields: [],
        };
        try {
            // Get inferred schema from shapes API
            const shapes = await this.fetchConvex("/api/shapes2");
            const tableShape = shapes[tableName];
            // Debug: log the raw shape to understand the format
            if (process.env.DEBUG) {
                console.error(`[DEBUG] Shape for ${tableName}:`, JSON.stringify(tableShape, null, 2));
            }
            if (tableShape) {
                result.inferredFields = this.parseShapeToFields(tableShape);
            }
            // Try to get declared schema if we have admin access
            if (this.adminKey) {
                try {
                    const schemaResponse = await this.fetchConvex("/api/query", {
                        path: "_system/frontend/getSchemas",
                        args: {},
                        format: "json",
                    });
                    if (schemaResponse?.value?.active) {
                        const activeSchema = JSON.parse(schemaResponse.value.active);
                        const tableSchema = activeSchema.tables?.find((t) => t.tableName === tableName);
                        if (tableSchema?.documentType) {
                            result.declaredFields = this.parseDocumentTypeToFields(tableSchema.documentType);
                        }
                    }
                }
                catch {
                    // Admin query failed, continue with inferred schema only
                }
            }
        }
        catch (error) {
            console.error("Failed to get table schema:", error);
        }
        return result;
    }
    parseShapeToFields(shape) {
        const fields = [];
        if (shape && typeof shape === "object") {
            // Handle Object type with fields array
            if (shape.type === "Object" && Array.isArray(shape.fields)) {
                for (const field of shape.fields) {
                    // Skip internal fields
                    if (field.fieldName.startsWith("_"))
                        continue;
                    fields.push({
                        name: field.fieldName,
                        type: this.shapeToTypeString(field.shape),
                        optional: field.optional || false,
                    });
                }
            }
            else if (Array.isArray(shape)) {
                // Union of shapes
                for (const s of shape) {
                    if (s.type === "Object" && Array.isArray(s.fields)) {
                        for (const field of s.fields) {
                            if (field.fieldName.startsWith("_"))
                                continue;
                            if (!fields.find((f) => f.name === field.fieldName)) {
                                fields.push({
                                    name: field.fieldName,
                                    type: this.shapeToTypeString(field.shape),
                                    optional: true, // Might not exist in all variants
                                });
                            }
                        }
                    }
                }
            }
        }
        return fields;
    }
    shapeToTypeString(shape) {
        if (!shape)
            return "unknown";
        if (typeof shape === "string")
            return shape;
        if (shape.type) {
            switch (shape.type) {
                case "String":
                    return "string";
                case "Int64":
                case "Float64":
                    return "number";
                case "Boolean":
                    return "boolean";
                case "Id":
                    return `Id<"${shape.tableName || "unknown"}">`;
                case "Array":
                    return `Array<${this.shapeToTypeString(shape.shape)}>`;
                case "Set":
                    return `Set<${this.shapeToTypeString(shape.shape)}>`;
                case "Map":
                    return `Map<string, ${this.shapeToTypeString(shape.shape)}>`;
                case "Object":
                    if (Array.isArray(shape.fields) && shape.fields.length > 0) {
                        return "object";
                    }
                    return "object";
                case "Union":
                    if (Array.isArray(shape.shapes)) {
                        return shape.shapes
                            .map((v) => this.shapeToTypeString(v))
                            .join(" | ");
                    }
                    return "union";
                case "Null":
                    return "null";
                case "Bytes":
                    return "bytes";
                default:
                    return shape.type.toLowerCase();
            }
        }
        return "unknown";
    }
    parseDocumentTypeToFields(docType) {
        const fields = [];
        if (docType && docType.type === "object" && docType.value) {
            for (const [name, fieldType] of Object.entries(docType.value)) {
                fields.push({
                    name,
                    type: this.docTypeToString(fieldType),
                    optional: fieldType?.fieldType?.type === "optional",
                });
            }
        }
        return fields;
    }
    docTypeToString(fieldType) {
        if (!fieldType)
            return "unknown";
        const ft = fieldType.fieldType || fieldType;
        if (ft.type === "optional" && ft.inner) {
            return this.docTypeToString(ft.inner) + "?";
        }
        switch (ft.type) {
            case "string":
                return "string";
            case "number":
                return "number";
            case "boolean":
                return "boolean";
            case "id":
                return `Id<"${ft.tableName || "unknown"}">`;
            case "array":
                return `Array<${this.docTypeToString(ft.value)}>`;
            case "object":
                return "object";
            default:
                return ft.type || "unknown";
        }
    }
    /**
     * Query documents from a table using system query
     * Requires admin access for document retrieval
     */
    async queryDocuments(tableName, options = {}) {
        if (!this.deploymentUrl) {
            throw new Error("Convex client not initialized");
        }
        if (!this.adminKey) {
            // No admin access, return empty but inform caller
            return {
                documents: [],
                isDone: true,
            };
        }
        const limit = Math.min(options.limit || 50, 100);
        try {
            // Convex system query format for tableData
            const response = await this.fetchConvex("/api/query", {
                path: "_system/cli/tableData",
                args: {
                    table: tableName,
                    order: options.order || "asc",
                    paginationOpts: {
                        cursor: options.cursor || null,
                        numItems: limit,
                    },
                },
                format: "json",
            });
            // Response format: { value: { page: Document[], continueCursor: string | null, isDone: boolean } }
            const result = response?.value;
            if (!result) {
                return { documents: [], isDone: true };
            }
            const documents = (result.page || []);
            return {
                documents,
                continueCursor: result.continueCursor || undefined,
                isDone: result.isDone ?? true,
            };
        }
        catch {
            return { documents: [], isDone: true };
        }
    }
    /**
     * Get sample documents from all tables
     * Fetches up to DEFAULT_DOC_SAMPLE_LIMIT documents per table
     */
    async getAllDocuments() {
        if (!this.deploymentUrl) {
            throw new Error("Convex client not initialized");
        }
        if (!this.adminKey) {
            // No admin access, return empty
            return {};
        }
        const tables = await this.listTables();
        const allDocs = {};
        // Fetch documents from each table in parallel
        await Promise.all(tables.map(async (table) => {
            try {
                const result = await this.queryDocuments(table.name, {
                    limit: DEFAULT_DOC_SAMPLE_LIMIT,
                    order: "desc", // Most recent first
                });
                allDocs[table.name] = result.documents;
            }
            catch {
                allDocs[table.name] = [];
            }
        }));
        return allDocs;
    }
    /**
     * Run a custom query function by path
     * Requires admin access
     */
    async runQuery(queryPath, args = {}) {
        if (!this.deploymentUrl) {
            throw new Error("Convex client not initialized");
        }
        if (!this.adminKey) {
            throw new Error("Admin access required to run queries. Please set CONVEX_DEPLOY_KEY.");
        }
        const response = await this.fetchConvex("/api/query", {
            path: queryPath,
            args,
            format: "json",
        });
        return response?.value;
    }
}
//# sourceMappingURL=convex-client.js.map