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
export interface TableInfo {
    name: string;
    documentCount: number;
    indexes: string[];
}
export interface SchemaField {
    name: string;
    type: string;
    optional: boolean;
}
export interface TableSchema {
    tableName: string;
    declaredFields: SchemaField[];
    inferredFields: SchemaField[];
}
export interface Document {
    _id: string;
    _creationTime: number;
    [key: string]: unknown;
}
export interface ConnectionTestResult {
    success: boolean;
    deploymentUrl?: string;
    tableCount?: number;
    tables?: string[];
    error?: string;
}
export interface PaginatedResult<T> {
    documents: T[];
    continueCursor?: string;
    isDone: boolean;
}
export interface ConfigSource {
    source: string;
    path: string;
    hasUrl: boolean;
    hasKey: boolean;
    deployment?: string;
}
export declare class ConvexClient {
    private deploymentUrl;
    private adminKey;
    private urlSource;
    private keySource;
    constructor();
    /**
     * Get all detected config sources for debugging
     */
    static getConfigSources(): ConfigSource[];
    /**
     * Get which source provided the current URL
     */
    getUrlSource(): string;
    /**
     * Get which source provided the current key
     */
    getKeySource(): string;
    private initialize;
    /**
     * Check if admin key is available for system queries
     */
    hasAdminAccess(): boolean;
    isConnected(): boolean;
    getDeploymentUrl(): string | null;
    private fetchConvex;
    testConnection(): Promise<ConnectionTestResult>;
    listTables(): Promise<TableInfo[]>;
    /**
     * Get document count for a table using system query
     */
    getTableCount(tableName: string): Promise<number>;
    getTableSchema(tableName: string): Promise<TableSchema>;
    private parseShapeToFields;
    private shapeToTypeString;
    private parseDocumentTypeToFields;
    private docTypeToString;
    /**
     * Query documents from a table using system query
     * Requires admin access for document retrieval
     */
    queryDocuments(tableName: string, options?: {
        limit?: number;
        cursor?: string;
        order?: "asc" | "desc";
    }): Promise<PaginatedResult<Document>>;
    /**
     * Get sample documents from all tables
     * Fetches up to DEFAULT_DOC_SAMPLE_LIMIT documents per table
     */
    getAllDocuments(): Promise<Record<string, Document[]>>;
    /**
     * Run a custom query function by path
     * Requires admin access
     */
    runQuery(queryPath: string, args?: Record<string, unknown>): Promise<unknown>;
}
//# sourceMappingURL=convex-client.d.ts.map