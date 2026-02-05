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
const DEFAULT_DOC_SAMPLE_LIMIT = parseInt(
  process.env.CONVEX_DOC_SAMPLE_LIMIT || "100",
  10,
);

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

// Tracks where each config value was found
export interface ConfigSource {
  source: string;
  path: string;
  hasUrl: boolean;
  hasKey: boolean;
  deployment?: string;
}

export class ConvexClient {
  private deploymentUrl: string | null = null;
  private adminKey: string | null = null;
  private urlSource: string = "none";
  private keySource: string = "none";

  constructor() {
    this.initialize();
  }

  /**
   * Get all detected config sources for debugging
   */
  static getConfigSources(): ConfigSource[] {
    const sources: ConfigSource[] = [];

    // Check CONVEX_DEPLOY_KEY env var
    const deployKey = process.env.CONVEX_DEPLOY_KEY;
    if (deployKey) {
      let deployment: string | undefined;
      if (deployKey.includes("|") && deployKey.includes(":")) {
        const pipeIndex = deployKey.indexOf("|");
        const prefix = deployKey.substring(0, pipeIndex);
        const colonIndex = prefix.indexOf(":");
        deployment = prefix.substring(colonIndex + 1);
      }
      sources.push({
        source: "CONVEX_DEPLOY_KEY env",
        path: "environment variable",
        hasUrl: !!deployment,
        hasKey: true,
        deployment: deployment
          ? `https://${deployment}.convex.cloud`
          : undefined,
      });
    }

    // Check CONVEX_URL env var
    const convexUrl = process.env.CONVEX_URL;
    if (convexUrl) {
      sources.push({
        source: "CONVEX_URL env",
        path: "environment variable",
        hasUrl: true,
        hasKey: false,
        deployment: convexUrl,
      });
    }

    // Check .env.local for CONVEX_DEPLOY_KEY and CONVEX_URL
    const envLocalPath = join(process.cwd(), ".env.local");
    if (existsSync(envLocalPath)) {
      try {
        const envContent = readFileSync(envLocalPath, "utf-8");
        const keyMatch = envContent.match(
          /CONVEX_DEPLOY_KEY=["']?([^"'\n]+)["']?/,
        );
        const urlMatch = envContent.match(/CONVEX_URL=["']?([^"'\n]+)["']?/);

        if (keyMatch || urlMatch) {
          let deployment: string | undefined;
          if (keyMatch) {
            const key = keyMatch[1];
            // Parse deployment from key format: prod:deployment-name|adminkey
            if (key.includes("|") && key.includes(":")) {
              const prefix = key.substring(0, key.indexOf("|"));
              const colonIndex = prefix.indexOf(":");
              deployment = prefix.substring(colonIndex + 1);
            }
          }
          sources.push({
            source: ".env.local",
            path: envLocalPath,
            hasUrl: !!urlMatch || !!deployment,
            hasKey: !!keyMatch,
            deployment:
              deployment || (urlMatch ? urlMatch[1].trim() : undefined),
          });
        }
      } catch {
        // Ignore
      }
    }

    // Check .convex/deployment.json
    const convexJsonPath = join(process.cwd(), ".convex", "deployment.json");
    if (existsSync(convexJsonPath)) {
      try {
        const config = JSON.parse(readFileSync(convexJsonPath, "utf-8"));
        sources.push({
          source: ".convex/deployment.json",
          path: convexJsonPath,
          hasUrl: !!config.url,
          hasKey: !!config.adminKey,
          deployment: config.url,
        });
      } catch {
        // Ignore
      }
    }

    // Check ~/.convex/config.json
    const globalConfigPath = join(homedir(), ".convex", "config.json");
    if (existsSync(globalConfigPath)) {
      try {
        const globalConfig = JSON.parse(
          readFileSync(globalConfigPath, "utf-8"),
        );
        if (globalConfig.accessToken) {
          sources.push({
            source: "~/.convex/config.json",
            path: globalConfigPath,
            hasUrl: false,
            hasKey: true,
          });
        }
      } catch {
        // Ignore
      }
    }

    // Check ~/.convex-mcp-visual.json
    const mcpConfigPath = join(homedir(), ".convex-mcp-visual.json");
    if (existsSync(mcpConfigPath)) {
      try {
        const mcpConfig = JSON.parse(readFileSync(mcpConfigPath, "utf-8"));
        sources.push({
          source: "~/.convex-mcp-visual.json",
          path: mcpConfigPath,
          hasUrl: !!mcpConfig.deploymentUrl,
          hasKey: !!mcpConfig.adminKey,
          deployment: mcpConfig.deploymentUrl,
        });
      } catch {
        // Ignore
      }
    }

    return sources;
  }

  /**
   * Get which source provided the current URL
   */
  getUrlSource(): string {
    return this.urlSource;
  }

  /**
   * Get which source provided the current key
   */
  getKeySource(): string {
    return this.keySource;
  }

  private initialize() {
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
        this.keySource = "CONVEX_DEPLOY_KEY env";

        // Extract deployment name from prefix (e.g., "prod:happy-animal-123")
        if (prefix.includes(":")) {
          const colonIndex = prefix.indexOf(":");
          const deploymentName = prefix.substring(colonIndex + 1);
          if (!explicitUrl && deploymentName) {
            this.deploymentUrl = `https://${deploymentName}.convex.cloud`;
            this.urlSource = "CONVEX_DEPLOY_KEY env";
          }
        }
      } else {
        // Just an admin key without prefix
        this.adminKey = deployKey;
        this.keySource = "CONVEX_DEPLOY_KEY env";
      }
    }

    if (explicitUrl) {
      this.deploymentUrl = explicitUrl;
      this.urlSource = "CONVEX_URL env";
    }

    // Try to read from local project .env.local (CONVEX_DEPLOY_KEY and CONVEX_URL)
    if (!this.adminKey || !this.deploymentUrl) {
      const envLocalPath = join(process.cwd(), ".env.local");
      if (existsSync(envLocalPath)) {
        try {
          const envContent = readFileSync(envLocalPath, "utf-8");

          // Check for CONVEX_DEPLOY_KEY first
          const keyMatch = envContent.match(
            /CONVEX_DEPLOY_KEY=["']?([^"'\n]+)["']?/,
          );
          if (keyMatch && !this.adminKey) {
            const fileDeployKey = keyMatch[1];
            if (fileDeployKey.includes("|")) {
              const pipeIndex = fileDeployKey.indexOf("|");
              const prefix = fileDeployKey.substring(0, pipeIndex);
              this.adminKey = fileDeployKey.substring(pipeIndex + 1);
              this.keySource = ".env.local";

              // Extract deployment URL from prefix
              if (prefix.includes(":") && !this.deploymentUrl) {
                const colonIndex = prefix.indexOf(":");
                const deploymentName = prefix.substring(colonIndex + 1);
                if (deploymentName) {
                  this.deploymentUrl = `https://${deploymentName}.convex.cloud`;
                  this.urlSource = ".env.local";
                }
              }
            } else {
              this.adminKey = fileDeployKey;
              this.keySource = ".env.local";
            }
          }

          // Check for CONVEX_URL
          const urlMatch = envContent.match(/CONVEX_URL=["']?([^"'\n]+)["']?/);
          if (urlMatch && !this.deploymentUrl) {
            this.deploymentUrl = urlMatch[1].trim();
            this.urlSource = ".env.local";
          }
        } catch {
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
            this.urlSource = ".convex/deployment.json";
          }
          if (config.adminKey && !this.adminKey) {
            this.adminKey = config.adminKey;
            this.keySource = ".convex/deployment.json";
          }
        } catch {
          // Ignore errors
        }
      }
    }

    // Try to read from global Convex config (~/.convex/config.json)
    if (!this.adminKey) {
      const globalConfigPath = join(homedir(), ".convex", "config.json");
      if (existsSync(globalConfigPath)) {
        try {
          const globalConfig = JSON.parse(
            readFileSync(globalConfigPath, "utf-8"),
          );
          // Global config may have an accessToken for CLI auth
          if (globalConfig.accessToken && !this.adminKey) {
            this.adminKey = globalConfig.accessToken;
            this.keySource = "~/.convex/config.json";
          }
        } catch {
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
            this.urlSource = "~/.convex-mcp-visual.json";
          }
          if (mcpConfig.adminKey && !this.adminKey) {
            this.adminKey = mcpConfig.adminKey;
            this.keySource = "~/.convex-mcp-visual.json";
          }
        } catch {
          // Ignore errors
        }
      }
    }
  }

  /**
   * Check if admin key is available for system queries
   */
  hasAdminAccess(): boolean {
    return this.adminKey !== null;
  }

  isConnected(): boolean {
    return this.deploymentUrl !== null;
  }

  getDeploymentUrl(): string | null {
    return this.deploymentUrl;
  }

  private async fetchConvex(path: string, body?: object): Promise<any> {
    if (!this.deploymentUrl) {
      throw new Error("No deployment URL configured");
    }

    const url = `${this.deploymentUrl}${path}`;
    const headers: Record<string, string> = {
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
      throw new Error(
        `Convex API error: ${response.status} ${response.statusText}`,
      );
    }

    return response.json();
  }

  async testConnection(): Promise<ConnectionTestResult> {
    if (!this.deploymentUrl) {
      return {
        success: false,
        error:
          'No Convex deployment configured. Set CONVEX_URL or run "npx convex login".',
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
      throw new Error("Convex client not initialized");
    }

    try {
      // Get inferred schemas from shapes API
      const shapes = await this.fetchConvex("/api/shapes2");

      const tables: TableInfo[] = [];
      for (const [tableName] of Object.entries(shapes)) {
        // Skip system tables
        if (tableName.startsWith("_")) continue;

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
                const existing = tables.find(
                  (t) => t.name === tableSchema.tableName,
                );
                if (existing) {
                  existing.indexes =
                    tableSchema.indexes?.map(
                      (i: { indexDescriptor: string }) => i.indexDescriptor,
                    ) || [];
                } else if (!tableSchema.tableName.startsWith("_")) {
                  tables.push({
                    name: tableSchema.tableName,
                    documentCount: 0,
                    indexes:
                      tableSchema.indexes?.map(
                        (i: { indexDescriptor: string }) => i.indexDescriptor,
                      ) || [],
                  });
                }
              }
            }
          }
        } catch {
          // Admin query failed, continue with shapes data only
        }

        // Fetch document counts for each table using system query
        await Promise.all(
          tables.map(async (table) => {
            try {
              const count = await this.getTableCount(table.name);
              table.documentCount = count;
            } catch {
              // Count unavailable, keep as 0
            }
          }),
        );
      }

      return tables.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error("Failed to list tables:", error);
      return [];
    }
  }

  /**
   * Get document count for a table using system query
   */
  async getTableCount(tableName: string): Promise<number> {
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
    } catch {
      return 0;
    }
  }

  async getTableSchema(tableName: string): Promise<TableSchema> {
    if (!this.deploymentUrl) {
      throw new Error("Convex client not initialized");
    }

    const result: TableSchema = {
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
        console.error(
          `[DEBUG] Shape for ${tableName}:`,
          JSON.stringify(tableShape, null, 2),
        );
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
            const tableSchema = activeSchema.tables?.find(
              (t: any) => t.tableName === tableName,
            );
            if (tableSchema?.documentType) {
              result.declaredFields = this.parseDocumentTypeToFields(
                tableSchema.documentType,
              );
            }
          }
        } catch {
          // Admin query failed, continue with inferred schema only
        }
      }
    } catch (error) {
      console.error("Failed to get table schema:", error);
    }

    return result;
  }

  private parseShapeToFields(shape: any): SchemaField[] {
    const fields: SchemaField[] = [];

    if (shape && typeof shape === "object") {
      // Handle Object type with fields array
      if (shape.type === "Object" && Array.isArray(shape.fields)) {
        for (const field of shape.fields) {
          // Skip internal fields
          if (field.fieldName.startsWith("_")) continue;

          fields.push({
            name: field.fieldName,
            type: this.shapeToTypeString(field.shape),
            optional: field.optional || false,
          });
        }
      } else if (Array.isArray(shape)) {
        // Union of shapes
        for (const s of shape) {
          if (s.type === "Object" && Array.isArray(s.fields)) {
            for (const field of s.fields) {
              if (field.fieldName.startsWith("_")) continue;
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

  private shapeToTypeString(shape: any): string {
    if (!shape) return "unknown";

    if (typeof shape === "string") return shape;

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
              .map((v: any) => this.shapeToTypeString(v))
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

  private parseDocumentTypeToFields(docType: any): SchemaField[] {
    const fields: SchemaField[] = [];

    if (docType && docType.type === "object" && docType.value) {
      for (const [name, fieldType] of Object.entries(
        docType.value as Record<string, any>,
      )) {
        fields.push({
          name,
          type: this.docTypeToString(fieldType),
          optional: (fieldType as any)?.fieldType?.type === "optional",
        });
      }
    }

    return fields;
  }

  private docTypeToString(fieldType: any): string {
    if (!fieldType) return "unknown";

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
  async queryDocuments(
    tableName: string,
    options: {
      limit?: number;
      cursor?: string;
      order?: "asc" | "desc";
    } = {},
  ): Promise<PaginatedResult<Document>> {
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

      const documents = (result.page || []) as Document[];

      return {
        documents,
        continueCursor: result.continueCursor || undefined,
        isDone: result.isDone ?? true,
      };
    } catch {
      return { documents: [], isDone: true };
    }
  }

  /**
   * Get sample documents from all tables
   * Fetches up to DEFAULT_DOC_SAMPLE_LIMIT documents per table
   */
  async getAllDocuments(): Promise<Record<string, Document[]>> {
    if (!this.deploymentUrl) {
      throw new Error("Convex client not initialized");
    }

    if (!this.adminKey) {
      // No admin access, return empty
      return {};
    }

    const tables = await this.listTables();
    const allDocs: Record<string, Document[]> = {};

    // Fetch documents from each table in parallel
    await Promise.all(
      tables.map(async (table) => {
        try {
          const result = await this.queryDocuments(table.name, {
            limit: DEFAULT_DOC_SAMPLE_LIMIT,
            order: "desc", // Most recent first
          });
          allDocs[table.name] = result.documents;
        } catch {
          allDocs[table.name] = [];
        }
      }),
    );

    return allDocs;
  }

  /**
   * Run a custom query function by path
   * Requires admin access
   */
  async runQuery(
    queryPath: string,
    args: Record<string, unknown> = {},
  ): Promise<unknown> {
    if (!this.deploymentUrl) {
      throw new Error("Convex client not initialized");
    }

    if (!this.adminKey) {
      throw new Error(
        "Admin access required to run queries. Please set CONVEX_DEPLOY_KEY.",
      );
    }

    const response = await this.fetchConvex("/api/query", {
      path: queryPath,
      args,
      format: "json",
    });

    return response?.value;
  }

  /**
   * Get scheduled functions from the _scheduled_functions system table
   * Returns pending, running, completed, and failed scheduled functions
   * Requires admin access
   */
  async getScheduledFunctions(): Promise<ScheduledFunction[]> {
    if (!this.deploymentUrl || !this.adminKey) {
      return [];
    }

    try {
      // Query the _scheduled_functions system table
      const response = await this.fetchConvex("/api/query", {
        path: "_system/cli/tableData",
        args: {
          table: "_scheduled_functions",
          order: "desc",
          paginationOpts: {
            cursor: null,
            numItems: 100,
          },
        },
        format: "json",
      });

      const result = response?.value;
      if (!result || !result.page) {
        return [];
      }

      return (result.page || []).map((doc: any) => ({
        _id: doc._id,
        _creationTime: doc._creationTime,
        name: doc.name || doc.udfPath || "unknown",
        scheduledTime: doc.scheduledTime,
        completedTime: doc.completedTime,
        state: this.parseScheduledState(doc.state),
        args: doc.args,
      }));
    } catch (error) {
      console.error("Failed to get scheduled functions:", error);
      return [];
    }
  }

  /**
   * Parse the state object from scheduled functions
   */
  private parseScheduledState(
    state: any,
  ): "pending" | "inProgress" | "success" | "failed" | "canceled" {
    if (!state) return "pending";

    // State can be an object with a kind property or a string
    if (typeof state === "string") {
      return state as any;
    }

    if (state.kind) {
      return state.kind;
    }

    // Check for specific state indicators
    if (state.inProgress) return "inProgress";
    if (state.success) return "success";
    if (state.failed) return "failed";
    if (state.canceled) return "canceled";

    return "pending";
  }

  /**
   * Get cron jobs configuration
   * Parses cron jobs from the deployment's cron configuration
   * Requires admin access
   */
  async getCronJobs(): Promise<CronJob[]> {
    if (!this.deploymentUrl || !this.adminKey) {
      return [];
    }

    try {
      // Try to get cron jobs from the _cron_jobs system table
      const response = await this.fetchConvex("/api/query", {
        path: "_system/cli/tableData",
        args: {
          table: "_cron_jobs",
          order: "desc",
          paginationOpts: {
            cursor: null,
            numItems: 50,
          },
        },
        format: "json",
      });

      const result = response?.value;
      if (!result || !result.page) {
        return [];
      }

      return (result.page || []).map((doc: any) => ({
        _id: doc._id,
        _creationTime: doc._creationTime,
        name: doc.name || "unnamed",
        cronSpec: doc.cronSpec,
        functionPath: doc.args?.name || doc.functionPath || "unknown",
        lastRun: doc.lastRun,
        nextRun: doc.nextRun,
      }));
    } catch {
      // Cron jobs table might not exist or be accessible
      return [];
    }
  }

  /**
   * Detect if the @convex-dev/agent component is installed
   * Checks for agent-specific tables in the schema
   *
   * NOTE: The agent component uses namespaced tables. Common patterns include:
   * - agent:threads, agent:messages, agent:steps (component namespace)
   * - Custom tables if user defined their own agent storage
   *
   * This detection is best-effort and may not work for all agent configurations.
   */
  async detectAgentComponent(): Promise<AgentComponentInfo> {
    if (!this.deploymentUrl) {
      return { installed: false, tables: [] };
    }

    try {
      const shapes = await this.fetchConvex("/api/shapes2");
      const allTables = Object.keys(shapes);

      // Look for agent-related table patterns
      // The @convex-dev/agent component typically creates tables like:
      // - threads (or agent:threads)
      // - messages (or agent:messages)
      // - steps (or agent:steps)
      const agentPatterns = [
        /^agent:/i, // Component namespace
        /threads?$/i, // Thread tables
        /messages?$/i, // Message tables
        /^ai_/i, // AI-prefixed tables
        /agent/i, // Tables with "agent" in name
      ];

      const agentTables = allTables.filter((table) =>
        agentPatterns.some((pattern) => pattern.test(table)),
      );

      // Check for specific @convex-dev/agent component tables
      const hasAgentComponent =
        agentTables.some((t) => t.startsWith("agent:")) ||
        (agentTables.includes("threads") && agentTables.includes("messages"));

      return {
        installed: hasAgentComponent || agentTables.length > 0,
        tables: agentTables,
        isOfficialComponent: agentTables.some((t) => t.startsWith("agent:")),
      };
    } catch {
      return { installed: false, tables: [] };
    }
  }

  /**
   * Get agent threads from the agent component
   * Works with @convex-dev/agent or custom agent implementations
   *
   * NOTE: This requires the agent component to be installed.
   * If using a custom agent implementation, specify the table name.
   */
  async getAgentThreads(tableName?: string): Promise<AgentThread[]> {
    if (!this.deploymentUrl || !this.adminKey) {
      return [];
    }

    // Default to agent:threads (official component) or threads
    const table = tableName || "agent:threads";

    try {
      const response = await this.fetchConvex("/api/query", {
        path: "_system/cli/tableData",
        args: {
          table,
          order: "desc",
          paginationOpts: {
            cursor: null,
            numItems: 50,
          },
        },
        format: "json",
      });

      const result = response?.value;
      if (!result || !result.page) {
        // Try fallback table name "threads"
        if (table === "agent:threads") {
          return this.getAgentThreads("threads");
        }
        return [];
      }

      return (result.page || []).map((doc: any) => ({
        _id: doc._id,
        _creationTime: doc._creationTime,
        title: doc.title || doc.name || "Untitled Thread",
        status: doc.status || this.inferThreadStatus(doc),
        agentId: doc.agentId || doc.agent,
        userId: doc.userId || doc.user,
        messageCount: doc.messageCount || 0,
        lastMessageAt: doc.lastMessageAt || doc.updatedAt || doc._creationTime,
      }));
    } catch {
      // Table might not exist
      if (table === "agent:threads") {
        return this.getAgentThreads("threads");
      }
      return [];
    }
  }

  /**
   * Infer thread status from document fields
   */
  private inferThreadStatus(
    doc: any,
  ): "idle" | "processing" | "waiting" | "completed" | "error" {
    if (doc.error) return "error";
    if (doc.completed || doc.done) return "completed";
    if (doc.waiting || doc.pendingTool) return "waiting";
    if (doc.processing || doc.streaming) return "processing";
    return "idle";
  }

  /**
   * Get agent messages for a specific thread or all recent messages
   */
  async getAgentMessages(
    threadId?: string,
    tableName?: string,
  ): Promise<AgentMessage[]> {
    if (!this.deploymentUrl || !this.adminKey) {
      return [];
    }

    const table = tableName || "agent:messages";

    try {
      const response = await this.fetchConvex("/api/query", {
        path: "_system/cli/tableData",
        args: {
          table,
          order: "desc",
          paginationOpts: {
            cursor: null,
            numItems: 100,
          },
        },
        format: "json",
      });

      const result = response?.value;
      if (!result || !result.page) {
        if (table === "agent:messages") {
          return this.getAgentMessages(threadId, "messages");
        }
        return [];
      }

      let messages = (result.page || []).map((doc: any) => ({
        _id: doc._id,
        _creationTime: doc._creationTime,
        threadId: doc.threadId || doc.thread,
        role: doc.role || "user",
        content:
          typeof doc.content === "string"
            ? doc.content.slice(0, 100)
            : "[complex content]",
        status: doc.status || "completed",
        agentId: doc.agentId || doc.agent,
      }));

      // Filter by threadId if provided
      if (threadId) {
        messages = messages.filter(
          (m: AgentMessage) => m.threadId === threadId,
        );
      }

      return messages;
    } catch {
      if (table === "agent:messages") {
        return this.getAgentMessages(threadId, "messages");
      }
      return [];
    }
  }
}

/**
 * Scheduled function from _scheduled_functions system table
 */
export interface ScheduledFunction {
  _id: string;
  _creationTime: number;
  name: string;
  scheduledTime: number;
  completedTime?: number;
  state: "pending" | "inProgress" | "success" | "failed" | "canceled";
  args?: unknown;
}

/**
 * Cron job configuration
 */
export interface CronJob {
  _id: string;
  _creationTime: number;
  name: string;
  cronSpec?: string;
  functionPath: string;
  lastRun?: number;
  nextRun?: number;
}

/**
 * Agent component detection result
 *
 * NOTE: The @convex-dev/agent component must be installed for agent features.
 * See: https://www.convex.dev/components/agent
 */
export interface AgentComponentInfo {
  installed: boolean;
  tables: string[];
  isOfficialComponent?: boolean;
}

/**
 * Agent thread from agent component
 *
 * NOTE: Requires @convex-dev/agent component or compatible agent implementation.
 * The agent component manages threads where conversations happen between
 * users and AI agents.
 */
export interface AgentThread {
  _id: string;
  _creationTime: number;
  title: string;
  status: "idle" | "processing" | "waiting" | "completed" | "error";
  agentId?: string;
  userId?: string;
  messageCount: number;
  lastMessageAt: number;
}

/**
 * Agent message from agent component
 */
export interface AgentMessage {
  _id: string;
  _creationTime: number;
  threadId: string;
  role: string;
  content: string;
  status: string;
  agentId?: string;
}
