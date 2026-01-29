/**
 * Convex Client Wrapper
 *
 * Handles authentication and communication with Convex Cloud.
 * Reads credentials from ~/.convex/ or CONVEX_DEPLOY_KEY.
 */

import { ConvexHttpClient } from 'convex/browser';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

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

export class ConvexClient {
  private client: ConvexHttpClient | null = null;
  private deploymentUrl: string | null = null;

  constructor() {
    this.initialize();
  }

  private initialize() {
    // Try environment variables first
    const deployKey = process.env.CONVEX_DEPLOY_KEY;
    const explicitUrl = process.env.CONVEX_URL;

    if (explicitUrl) {
      this.deploymentUrl = explicitUrl;
    } else {
      // Try to read from local Convex config
      const convexConfigPath = join(homedir(), '.convex', 'config.json');
      if (existsSync(convexConfigPath)) {
        try {
          const config = JSON.parse(readFileSync(convexConfigPath, 'utf-8'));
          if (config.deploymentUrl) {
            this.deploymentUrl = config.deploymentUrl;
          }
        } catch {
          // Ignore config read errors
        }
      }
    }

    if (this.deploymentUrl) {
      this.client = new ConvexHttpClient(this.deploymentUrl);

      // Set auth token if deploy key is provided
      if (deployKey) {
        this.client.setAuth(deployKey);
      }
    }
  }

  isConnected(): boolean {
    return this.client !== null;
  }

  getDeploymentUrl(): string | null {
    return this.deploymentUrl;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    if (!this.client || !this.deploymentUrl) {
      return {
        success: false,
        error: 'No Convex deployment configured. Set CONVEX_URL or run "npx convex login".',
      };
    }

    try {
      // Try to list tables to verify connection
      const tables = await this.listTables();
      return {
        success: true,
        deploymentUrl: this.deploymentUrl,
        tableCount: tables.length,
        tables: tables.map((t) => t.name),
      };
    } catch (error) {
      return {
        success: false,
        deploymentUrl: this.deploymentUrl,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async listTables(): Promise<TableInfo[]> {
    if (!this.client) {
      throw new Error('Convex client not initialized');
    }

    try {
      // Call the schema_info:listTables function in the Convex deployment
      const result = await this.client.query('schema_info:listTables' as any);

      if (Array.isArray(result)) {
        return result.map((table: any) => ({
          name: table.name,
          documentCount: table.documentCount || 0,
          indexes: table.indexes || [],
        }));
      }

      return [];
    } catch (error) {
      // If the query function doesn't exist, return empty array
      console.error('Failed to list tables:', error);
      return [];
    }
  }

  async getTableSchema(tableName: string): Promise<TableSchema> {
    if (!this.client) {
      throw new Error('Convex client not initialized');
    }

    try {
      // Call the schema_info:listTables function and find the specific table
      const result = await this.client.query('schema_info:listTables' as any);

      if (Array.isArray(result)) {
        const table = result.find((t: any) => t.name === tableName);
        if (table && table.fields) {
          return {
            tableName,
            declaredFields: table.fields.map((f: any) => ({
              name: f.name,
              type: f.type,
              optional: f.optional || false,
            })),
            inferredFields: [],
          };
        }
      }

      return {
        tableName,
        declaredFields: [],
        inferredFields: [],
      };
    } catch (error) {
      console.error('Failed to get table schema:', error);
      return {
        tableName,
        declaredFields: [],
        inferredFields: [],
      };
    }
  }

  async queryDocuments(
    tableName: string,
    options: {
      limit?: number;
      cursor?: string;
      orderBy?: string;
      order?: 'asc' | 'desc';
    } = {}
  ): Promise<{ documents: Document[]; nextCursor?: string }> {
    if (!this.client) {
      throw new Error('Convex client not initialized');
    }

    try {
      // Call the schema_info:getDocuments function to get sample data
      const result = await this.client.query('schema_info:getDocuments' as any);

      if (result && typeof result === 'object') {
        const tableData = (result as Record<string, any>)[tableName];
        if (Array.isArray(tableData)) {
          const documents = tableData.map((doc: any) => ({
            _id: doc._id,
            _creationTime: doc._creationTime,
            ...doc,
          }));
          return {
            documents: documents.slice(0, options.limit || 50),
            nextCursor: undefined,
          };
        }
      }

      return {
        documents: [],
        nextCursor: undefined,
      };
    } catch (error) {
      console.error('Failed to query documents:', error);
      return {
        documents: [],
        nextCursor: undefined,
      };
    }
  }

  async getAllDocuments(): Promise<Record<string, Document[]>> {
    if (!this.client) {
      throw new Error('Convex client not initialized');
    }

    try {
      // Call the schema_info:getDocuments function to get all documents
      const result = await this.client.query('schema_info:getDocuments' as any);

      if (result && typeof result === 'object') {
        const allDocs: Record<string, Document[]> = {};
        for (const [tableName, docs] of Object.entries(result as Record<string, any>)) {
          if (Array.isArray(docs)) {
            allDocs[tableName] = docs.map((doc: any) => ({
              _id: doc._id,
              _creationTime: doc._creationTime,
              ...doc,
            }));
          }
        }
        return allDocs;
      }

      return {};
    } catch (error) {
      console.error('Failed to get all documents:', error);
      return {};
    }
  }

  async runQuery(queryString: string): Promise<unknown> {
    if (!this.client) {
      throw new Error('Convex client not initialized');
    }

    // Execute a custom query
    // Real implementation would use Convex's query API
    throw new Error('Custom queries not yet implemented');
  }
}
