/**
 * Schema Browser Resource Handler
 *
 * Serves the bundled Schema Browser HTML UI.
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function getSchemaResourceContent(): Promise<string> {
  // Try to load the bundled HTML file
  const bundledPath = join(__dirname, "..", "apps", "schema-browser.html");

  if (existsSync(bundledPath)) {
    return readFileSync(bundledPath, "utf-8");
  }

  // Fallback: return inline HTML for development/testing
  return getInlineSchemaUI();
}

function getInlineSchemaUI(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Schema Browser - Convex MCP Apps</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    :root {
      --bg-primary: #1a1a2e;
      --bg-secondary: #16213e;
      --bg-tertiary: #0f3460;
      --text-primary: #eee;
      --text-secondary: #aaa;
      --accent: #e94560;
      --accent-hover: #ff6b6b;
      --border: #333;
      --success: #4caf50;
      --warning: #ff9800;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .header {
      background: var(--bg-secondary);
      padding: 12px 20px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header h1 {
      font-size: 18px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .header-actions {
      display: flex;
      gap: 8px;
    }

    .btn {
      background: var(--bg-tertiary);
      color: var(--text-primary);
      border: 1px solid var(--border);
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.2s;
    }

    .btn:hover {
      background: var(--accent);
      border-color: var(--accent);
    }

    .main {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    .sidebar {
      width: 240px;
      background: var(--bg-secondary);
      border-right: 1px solid var(--border);
      overflow-y: auto;
      flex-shrink: 0;
    }

    .sidebar-header {
      padding: 12px 16px;
      font-size: 12px;
      text-transform: uppercase;
      color: var(--text-secondary);
      border-bottom: 1px solid var(--border);
    }

    .table-list {
      list-style: none;
    }

    .table-item {
      padding: 10px 16px;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border);
      transition: background 0.2s;
    }

    .table-item:hover {
      background: var(--bg-tertiary);
    }

    .table-item.active {
      background: var(--accent);
    }

    .table-name {
      font-size: 14px;
      font-weight: 500;
    }

    .table-count {
      font-size: 12px;
      color: var(--text-secondary);
      background: var(--bg-primary);
      padding: 2px 8px;
      border-radius: 10px;
    }

    .content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .schema-panel {
      padding: 20px;
      flex: 1;
      overflow-y: auto;
    }

    .schema-title {
      font-size: 20px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .schema-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }

    .schema-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
    }

    .schema-card-header {
      background: var(--bg-tertiary);
      padding: 10px 16px;
      font-weight: 600;
      font-size: 14px;
      border-bottom: 1px solid var(--border);
    }

    .schema-card-body {
      padding: 12px;
    }

    .field-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 8px;
      border-radius: 4px;
      font-size: 13px;
      font-family: 'SF Mono', Monaco, 'Courier New', monospace;
    }

    .field-row:hover {
      background: var(--bg-tertiary);
    }

    .field-name {
      color: var(--accent-hover);
    }

    .field-type {
      color: var(--text-secondary);
    }

    .field-optional {
      color: var(--warning);
      font-size: 11px;
    }

    .documents-panel {
      background: var(--bg-secondary);
      border-top: 1px solid var(--border);
      max-height: 300px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .documents-header {
      padding: 10px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border);
      background: var(--bg-tertiary);
    }

    .documents-title {
      font-weight: 600;
      font-size: 14px;
    }

    .pagination {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .pagination button {
      background: var(--bg-primary);
      color: var(--text-primary);
      border: 1px solid var(--border);
      width: 28px;
      height: 28px;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .pagination button:hover:not(:disabled) {
      background: var(--accent);
      border-color: var(--accent);
    }

    .pagination button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .documents-table {
      overflow-x: auto;
      flex: 1;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    th, td {
      padding: 8px 12px;
      text-align: left;
      border-bottom: 1px solid var(--border);
      white-space: nowrap;
    }

    th {
      background: var(--bg-primary);
      font-weight: 600;
      position: sticky;
      top: 0;
    }

    td {
      font-family: 'SF Mono', Monaco, 'Courier New', monospace;
      font-size: 12px;
    }

    tr:hover td {
      background: var(--bg-tertiary);
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: var(--text-secondary);
    }

    .empty-state h2 {
      margin-bottom: 8px;
      color: var(--text-primary);
    }

    .warning-badge {
      background: var(--warning);
      color: #000;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      margin-top: 12px;
      display: inline-block;
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
    }

    .spinner {
      width: 30px;
      height: 30px;
      border: 3px solid var(--border);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--success);
    }

    .status-dot.error {
      background: var(--accent);
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>
      <span class="status-dot" id="statusDot"></span>
      Schema Browser
    </h1>
    <div class="header-actions">
      <button class="btn" id="refreshBtn">Refresh</button>
      <button class="btn" id="queryBtn">Query</button>
    </div>
  </div>

  <div class="main">
    <div class="sidebar">
      <div class="sidebar-header">Tables</div>
      <ul class="table-list" id="tableList">
        <li class="loading"><div class="spinner"></div></li>
      </ul>
    </div>

    <div class="content">
      <div class="schema-panel" id="schemaPanel">
        <div class="empty-state">
          <h2>Select a Table</h2>
          <p>Choose a table from the sidebar to view its schema and documents.</p>
        </div>
      </div>

      <div class="documents-panel" id="documentsPanel" style="display: none;">
        <div class="documents-header">
          <span class="documents-title">Documents</span>
          <div class="pagination">
            <button id="prevPage" disabled>&lt;</button>
            <span id="pageInfo">Page 1</span>
            <button id="nextPage">&gt;</button>
          </div>
        </div>
        <div class="documents-table">
          <table>
            <thead id="docTableHead"></thead>
            <tbody id="docTableBody"></tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <script>
    // Schema Browser Application
    const app = {
      config: null,
      selectedTable: null,
      currentPage: 1,
      pageSize: 50,

      init() {
        // Parse config from URL
        const params = new URLSearchParams(window.location.search);
        const configParam = params.get('config');
        if (configParam) {
          try {
            this.config = JSON.parse(decodeURIComponent(configParam));
            this.pageSize = this.config.pageSize || 50;
          } catch (e) {
            console.error('Failed to parse config:', e);
          }
        }

        // Set up event listeners
        document.getElementById('refreshBtn').addEventListener('click', () => this.refresh());
        document.getElementById('queryBtn').addEventListener('click', () => this.openQueryBuilder());
        document.getElementById('prevPage').addEventListener('click', () => this.changePage(-1));
        document.getElementById('nextPage').addEventListener('click', () => this.changePage(1));

        // Initialize communication with host
        this.setupHostCommunication();

        // Load initial data
        this.loadTables();

        // Select initial table if specified
        if (this.config?.selectedTable) {
          this.selectTable(this.config.selectedTable);
        }
      },

      setupHostCommunication() {
        // Listen for messages from MCP host
        window.addEventListener('message', (event) => {
          if (event.data.type === 'mcp-response') {
            this.handleMcpResponse(event.data);
          }
        });
      },

      sendToHost(method, params) {
        // Send JSON-RPC request to MCP host
        const message = {
          jsonrpc: '2.0',
          id: Date.now(),
          method,
          params
        };
        window.parent.postMessage({ type: 'mcp-request', ...message }, '*');
        return message.id;
      },

      handleMcpResponse(response) {
        // Handle responses from MCP server via host
        console.log('MCP Response:', response);
      },

      loadTables() {
        const tableList = document.getElementById('tableList');

        // Use config data if available
        if (this.config?.tables && this.config.tables.length > 0) {
          tableList.innerHTML = this.config.tables.map(t => \`
            <li class="table-item" data-table="\${t.name}">
              <span class="table-name">\${t.name}</span>
              <span class="table-count">\${this.formatCount(t.documentCount)}</span>
            </li>
          \`).join('');

          // Add click handlers
          tableList.querySelectorAll('.table-item').forEach(item => {
            item.addEventListener('click', () => {
              this.selectTable(item.dataset.table);
            });
          });
        } else {
          tableList.innerHTML = \`
            <li class="empty-state" style="padding: 20px;">
              <p>No tables found</p>
            </li>
          \`;
        }
      },

      formatCount(count) {
        if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
        if (count >= 1000) return (count / 1000).toFixed(1) + 'k';
        return count?.toString() || '0';
      },

      selectTable(tableName) {
        this.selectedTable = tableName;
        this.currentPage = 1;

        // Update active state in sidebar
        document.querySelectorAll('.table-item').forEach(item => {
          item.classList.toggle('active', item.dataset.table === tableName);
        });

        // Load schema
        this.loadSchema(tableName);

        // Load documents
        this.loadDocuments(tableName);
      },

      loadSchema(tableName) {
        const panel = document.getElementById('schemaPanel');
        const schema = this.config?.selectedSchema;

        // Show schema UI
        panel.innerHTML = \`
          <div class="schema-title">
            <span>\${tableName}</span>
          </div>
          <div class="schema-grid">
            <div class="schema-card">
              <div class="schema-card-header">Declared Schema</div>
              <div class="schema-card-body" id="declaredSchema">
                \${this.renderFields(schema?.declaredFields || [])}
              </div>
            </div>
            <div class="schema-card">
              <div class="schema-card-header">Inferred Schema</div>
              <div class="schema-card-body" id="inferredSchema">
                \${this.renderFields(schema?.inferredFields || [])}
              </div>
            </div>
          </div>
          \${this.checkSchemaMismatches(schema)}
        \`;
      },

      renderFields(fields) {
        if (!fields || fields.length === 0) {
          return '<p style="color: var(--text-secondary); padding: 8px;">No schema defined</p>';
        }

        return fields.map(f => \`
          <div class="field-row">
            <span>
              <span class="field-name">\${f.name}</span>
              \${f.optional ? '<span class="field-optional">?</span>' : ''}
            </span>
            <span class="field-type">\${f.type}</span>
          </div>
        \`).join('');
      },

      checkSchemaMismatches(schema) {
        if (!schema) return '';

        const declared = new Set(schema.declaredFields?.map(f => f.name) || []);
        const inferred = new Set(schema.inferredFields?.map(f => f.name) || []);

        const missingInSchema = [...inferred].filter(f => !declared.has(f) && !f.startsWith('_'));

        if (missingInSchema.length > 0) {
          return \`
            <div class="warning-badge">
              Fields in data but not in schema: \${missingInSchema.join(', ')}
            </div>
          \`;
        }

        return '';
      },

      loadDocuments(tableName) {
        const panel = document.getElementById('documentsPanel');
        panel.style.display = 'flex';

        // Placeholder documents for demo
        const docs = [
          { _id: 'abc123...', _creationTime: Date.now(), status: 'active' },
          { _id: 'def456...', _creationTime: Date.now() - 86400000, status: 'pending' },
        ];

        this.renderDocuments(docs);
      },

      renderDocuments(docs) {
        const thead = document.getElementById('docTableHead');
        const tbody = document.getElementById('docTableBody');

        if (!docs || docs.length === 0) {
          thead.innerHTML = '';
          tbody.innerHTML = '<tr><td colspan="100" style="text-align: center;">No documents</td></tr>';
          return;
        }

        // Get all unique keys
        const keys = [...new Set(docs.flatMap(d => Object.keys(d)))];

        thead.innerHTML = \`<tr>\${keys.map(k => \`<th>\${k}</th>\`).join('')}</tr>\`;
        tbody.innerHTML = docs.map(doc => \`
          <tr>
            \${keys.map(k => \`<td>\${this.formatValue(doc[k])}</td>\`).join('')}
          </tr>
        \`).join('');
      },

      formatValue(value) {
        if (value === null || value === undefined) return '<span style="opacity:0.5">null</span>';
        if (typeof value === 'object') return JSON.stringify(value);
        if (typeof value === 'string' && value.length > 50) return value.slice(0, 50) + '...';
        return String(value);
      },

      changePage(delta) {
        this.currentPage += delta;
        document.getElementById('pageInfo').textContent = \`Page \${this.currentPage}\`;
        document.getElementById('prevPage').disabled = this.currentPage <= 1;

        if (this.selectedTable) {
          this.loadDocuments(this.selectedTable);
        }
      },

      refresh() {
        if (this.selectedTable) {
          this.loadSchema(this.selectedTable);
          this.loadDocuments(this.selectedTable);
        }
      },

      openQueryBuilder() {
        // Query builder not yet implemented
        console.log('Query builder coming soon');
      }
    };

    // Initialize app when DOM is ready
    document.addEventListener('DOMContentLoaded', () => app.init());
  </script>
</body>
</html>`;
}
