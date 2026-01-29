/**
 * Convex Client Wrapper
 *
 * Handles authentication and communication with Convex Cloud.
 * Reads credentials from ~/.convex/ or CONVEX_DEPLOY_KEY.
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
export declare class ConvexClient {
    private client;
    private deploymentUrl;
    constructor();
    private initialize;
    isConnected(): boolean;
    getDeploymentUrl(): string | null;
    testConnection(): Promise<ConnectionTestResult>;
    listTables(): Promise<TableInfo[]>;
    getTableSchema(tableName: string): Promise<TableSchema>;
    queryDocuments(tableName: string, options?: {
        limit?: number;
        cursor?: string;
        orderBy?: string;
        order?: 'asc' | 'desc';
    }): Promise<{
        documents: Document[];
        nextCursor?: string;
    }>;
    getAllDocuments(): Promise<Record<string, Document[]>>;
    runQuery(queryString: string): Promise<unknown>;
}
//# sourceMappingURL=convex-client.d.ts.map