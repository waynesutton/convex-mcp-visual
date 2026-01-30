/**
 * Convex Client Wrapper
 *
 * Handles authentication and communication with Convex Cloud.
 * Uses Convex system APIs to fetch schema information.
 */

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
  private deploymentUrl: string | null = null;
  private adminKey: string | null = null;

  constructor() {
    this.initialize();
  }

  private initialize() {
    // Try environment variables first
    const deployKey = process.env.CONVEX_DEPLOY_KEY;
    const explicitUrl = process.env.CONVEX_URL;

    if (deployKey) {
      // Deploy key format: "prod:deploymentName|adminKey"
      // Example: "prod:happy-animal-123|convex_admin_abc123xyz"
      if (deployKey.includes('|')) {
        const pipeIndex = deployKey.indexOf('|');
        const prefix = deployKey.substring(0, pipeIndex);
        this.adminKey = deployKey.substring(pipeIndex + 1);

        // Extract deployment name from prefix (e.g., "prod:happy-animal-123")
        if (prefix.includes(':')) {
          const colonIndex = prefix.indexOf(':');
          const deploymentName = prefix.substring(colonIndex + 1);
          if (!explicitUrl && deploymentName) {
            this.deploymentUrl = `https://${deploymentName}.convex.cloud`;
          }
        }
      } else {
        // Just an admin key without prefix
        this.adminKey = deployKey;
      }
    }

    if (explicitUrl) {
      this.deploymentUrl = explicitUrl;
    }

    // Try to read from local project .env.local
    if (!this.deploymentUrl) {
      const envLocalPath = join(process.cwd(), '.env.local');
      if (existsSync(envLocalPath)) {
        try {
          const envContent = readFileSync(envLocalPath, 'utf-8');
          const urlMatch = envContent.match(/CONVEX_URL=(.+)/);
          if (urlMatch) {
            this.deploymentUrl = urlMatch[1].trim().replace(/["']/g, '');
          }
        } catch {
          // Ignore errors
        }
      }
    }

    // Try to read from project's .convex deployment state
    if (!this.deploymentUrl || !this.adminKey) {
      const convexJsonPath = join(process.cwd(), '.convex', 'deployment.json');
      if (existsSync(convexJsonPath)) {
        try {
          const config = JSON.parse(readFileSync(convexJsonPath, 'utf-8'));
          if (config.url && !this.deploymentUrl) {
            this.deploymentUrl = config.url;
          }
          if (config.adminKey && !this.adminKey) {
            this.adminKey = config.adminKey;
          }
        } catch {
          // Ignore errors
        }
      }
    }
  }

  isConnected(): boolean {
    return this.deploymentUrl !== null;
  }

  getDeploymentUrl(): string | null {
    return this.deploymentUrl;
  }

  private async fetchConvex(path: string, body?: object): Promise<any> {
    if (!this.deploymentUrl) {
      throw new Error('No deployment URL configured');
    }

    const url = `${this.deploymentUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.adminKey) {
      headers['Authorization'] = `Convex ${this.adminKey}`;
    }

    const response = await fetch(url, {
      method: body ? 'POST' : 'GET',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`Convex API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async testConnection(): Promise<ConnectionTestResult> {
    if (!this.deploymentUrl) {
      return {
        success: false,
        error: 'No Convex deployment configured. Set CONVEX_URL or run "npx convex login".',
      };
    }

    try {
      // Try to get shapes (inferred schema) - this works without admin key for some deployments
      const shapes = await this.fetchConvex('/api/shapes2');
      const tables = Object.keys(shapes).filter(t => !t.startsWith('_'));

      return {
        success: true,
        deploymentUrl: this.deploymentUrl,
        tableCount: tables.length,
        tables,
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
    if (!this.deploymentUrl) {
      throw new Error('Convex client not initialized');
    }

    try {
      // Get inferred schemas from shapes API
      const shapes = await this.fetchConvex('/api/shapes2');

      const tables: TableInfo[] = [];
      for (const [tableName, schema] of Object.entries(shapes)) {
        // Skip system tables
        if (tableName.startsWith('_')) continue;

        tables.push({
          name: tableName,
          documentCount: 0, // Not available from shapes API
          indexes: [],
        });
      }

      // Try to get declared schema info if we have admin access
      if (this.adminKey) {
        try {
          const schemaResponse = await this.fetchConvex('/api/query', {
            path: '_system/frontend/getSchemas',
            args: {},
            format: 'json',
          });

          if (schemaResponse?.value?.active) {
            const activeSchema = JSON.parse(schemaResponse.value.active);
            if (activeSchema.tables) {
              for (const tableSchema of activeSchema.tables) {
                const existing = tables.find(t => t.name === tableSchema.tableName);
                if (existing) {
                  existing.indexes = tableSchema.indexes?.map((i: any) => i.indexDescriptor) || [];
                } else if (!tableSchema.tableName.startsWith('_')) {
                  tables.push({
                    name: tableSchema.tableName,
                    documentCount: 0,
                    indexes: tableSchema.indexes?.map((i: any) => i.indexDescriptor) || [],
                  });
                }
              }
            }
          }
        } catch {
          // Admin query failed, continue with shapes data only
        }
      }

      return tables.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Failed to list tables:', error);
      return [];
    }
  }

  async getTableSchema(tableName: string): Promise<TableSchema> {
    if (!this.deploymentUrl) {
      throw new Error('Convex client not initialized');
    }

    const result: TableSchema = {
      tableName,
      declaredFields: [],
      inferredFields: [],
    };

    try {
      // Get inferred schema from shapes API
      const shapes = await this.fetchConvex('/api/shapes2');
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
          const schemaResponse = await this.fetchConvex('/api/query', {
            path: '_system/frontend/getSchemas',
            args: {},
            format: 'json',
          });

          if (schemaResponse?.value?.active) {
            const activeSchema = JSON.parse(schemaResponse.value.active);
            const tableSchema = activeSchema.tables?.find((t: any) => t.tableName === tableName);
            if (tableSchema?.documentType) {
              result.declaredFields = this.parseDocumentTypeToFields(tableSchema.documentType);
            }
          }
        } catch {
          // Admin query failed, continue with inferred schema only
        }
      }
    } catch (error) {
      console.error('Failed to get table schema:', error);
    }

    return result;
  }

  private parseShapeToFields(shape: any): SchemaField[] {
    const fields: SchemaField[] = [];

    if (shape && typeof shape === 'object') {
      // Handle Object type with fields array
      if (shape.type === 'Object' && Array.isArray(shape.fields)) {
        for (const field of shape.fields) {
          // Skip internal fields
          if (field.fieldName.startsWith('_')) continue;

          fields.push({
            name: field.fieldName,
            type: this.shapeToTypeString(field.shape),
            optional: field.optional || false,
          });
        }
      } else if (Array.isArray(shape)) {
        // Union of shapes
        for (const s of shape) {
          if (s.type === 'Object' && Array.isArray(s.fields)) {
            for (const field of s.fields) {
              if (field.fieldName.startsWith('_')) continue;
              if (!fields.find(f => f.name === field.fieldName)) {
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

  private shapeToTypeString(shape: any): string {
    if (!shape) return 'unknown';

    if (typeof shape === 'string') return shape;

    if (shape.type) {
      switch (shape.type) {
        case 'String': return 'string';
        case 'Int64':
        case 'Float64': return 'number';
        case 'Boolean': return 'boolean';
        case 'Id': return `Id<"${shape.tableName || 'unknown'}">`;
        case 'Array': return `Array<${this.shapeToTypeString(shape.shape)}>`;
        case 'Set': return `Set<${this.shapeToTypeString(shape.shape)}>`;
        case 'Map': return `Map<string, ${this.shapeToTypeString(shape.shape)}>`;
        case 'Object':
          if (Array.isArray(shape.fields) && shape.fields.length > 0) {
            return 'object';
          }
          return 'object';
        case 'Union':
          if (Array.isArray(shape.shapes)) {
            return shape.shapes.map((v: any) => this.shapeToTypeString(v)).join(' | ');
          }
          return 'union';
        case 'Null': return 'null';
        case 'Bytes': return 'bytes';
        default: return shape.type.toLowerCase();
      }
    }

    return 'unknown';
  }

  private parseDocumentTypeToFields(docType: any): SchemaField[] {
    const fields: SchemaField[] = [];

    if (docType && docType.type === 'object' && docType.value) {
      for (const [name, fieldType] of Object.entries(docType.value as Record<string, any>)) {
        fields.push({
          name,
          type: this.docTypeToString(fieldType),
          optional: (fieldType as any)?.fieldType?.type === 'optional',
        });
      }
    }

    return fields;
  }

  private docTypeToString(fieldType: any): string {
    if (!fieldType) return 'unknown';

    const ft = fieldType.fieldType || fieldType;

    if (ft.type === 'optional' && ft.inner) {
      return this.docTypeToString(ft.inner) + '?';
    }

    switch (ft.type) {
      case 'string': return 'string';
      case 'number': return 'number';
      case 'boolean': return 'boolean';
      case 'id': return `Id<"${ft.tableName || 'unknown'}">`;
      case 'array': return `Array<${this.docTypeToString(ft.value)}>`;
      case 'object': return 'object';
      default: return ft.type || 'unknown';
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
    if (!this.deploymentUrl) {
      throw new Error('Convex client not initialized');
    }

    // Note: Querying documents requires running a query function
    // This is a simplified implementation that returns empty for now
    // A full implementation would need a deployed query function

    return {
      documents: [],
      nextCursor: undefined,
    };
  }

  async getAllDocuments(): Promise<Record<string, Document[]>> {
    if (!this.deploymentUrl) {
      throw new Error('Convex client not initialized');
    }

    // Note: Getting all documents requires running query functions
    // This returns empty for now

    return {};
  }

  async runQuery(queryString: string): Promise<unknown> {
    if (!this.deploymentUrl) {
      throw new Error('Convex client not initialized');
    }

    throw new Error('Custom queries not yet implemented');
  }
}
