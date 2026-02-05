/**
 * Schema Browser Application
 *
 * Interactive UI for browsing Convex database schemas and documents.
 * Supports two views: List View (table-based) and Graph View (visual diagram).
 */

// Make this file a module for proper global augmentation
export {};

interface TableInfo {
  name: string;
  documentCount: number;
  hasIndexes: boolean;
  indexes?: string[];
  documents?: Document[];
  inferredFields?: SchemaField[];
  declaredFields?: SchemaField[];
}

interface SchemaField {
  name: string;
  type: string;
  optional: boolean;
}

interface TableSchema {
  tableName: string;
  declaredFields: SchemaField[];
  inferredFields: SchemaField[];
  indexes?: Array<{ name: string; fields: string[] }>;
}

interface Document {
  _id: string;
  _creationTime: number;
  [key: string]: unknown;
}

interface AppConfig {
  deploymentUrl: string | null;
  selectedTable: string | null;
  showInferred: boolean;
  pageSize: number;
  viewMode?: "list" | "graph";
  tables: TableInfo[];
  selectedSchema: TableSchema | null;
  allDocuments?: Record<string, Document[]>;
  hasAdminAccess?: boolean;
}

interface GraphNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  table: TableInfo;
  visible?: boolean;
}

interface GraphEdge {
  from: string;
  to: string;
  fromField: string;
  toField: string;
  inferred?: boolean;
}

interface PositionState {
  nodes: Array<{ id: string; x: number; y: number }>;
  panX: number;
  panY: number;
  zoom: number;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  title: string;
  content: string;
  type: "field" | "system" | "relationship" | "shortcut";
}

interface FilterState {
  tableName: string;
  fieldName: string;
  fieldType: string;
  showEmpty: boolean;
}

interface SidebarSections {
  tables: { collapsed: boolean };
  convex: { collapsed: boolean };
}

// Type for window config injection
type WindowWithConfig = Window & {
  __CONVEX_CONFIG__?: AppConfig;
};

type ViewMode = "list" | "graph";

class SchemaBrowserApp {
  private config: AppConfig | null = null;
  private selectedTable: string | null = null;
  private currentPage = 1;
  private pageSize = 50;
  private searchQuery = "";
  private queryModalOpen = false;
  private viewMode: ViewMode = "graph";

  // Sidebar state
  private sidebarWidth = 260;
  private codePanelWidth = 360;
  private sidebarCollapsed = false;
  private graphSidebarCollapsed = false; // Left sidebar in graph view
  private isResizingSidebar = false;

  // Graph view state
  private graphNodes: GraphNode[] = [];
  private graphEdges: GraphEdge[] = [];
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private panX = 0;
  private panY = 0;
  private zoom = 1;
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private selectedNode: GraphNode | null = null;
  private hoveredNode: GraphNode | null = null;
  private dpr = 1; // Device pixel ratio for retina displays

  // Toolbar state
  private showCodePanel = true;
  private positionHistory: PositionState[] = [];
  private historyIndex = -1;
  private maxHistorySize = 20;
  private showExportMenu = false;
  private showFilterDropdown = false;

  // Sidebar sections
  private sidebarSections: SidebarSections = {
    tables: { collapsed: false },
    convex: { collapsed: true },
  };
  private tableSortBy: "name" | "count" | "fields" = "name";
  private tableSortOrder: "asc" | "desc" = "asc";

  // Filtering
  private filterState: FilterState = {
    tableName: "",
    fieldName: "",
    fieldType: "",
    showEmpty: true,
  };

  // Tooltips
  private tooltip: TooltipState | null = null;
  private tooltipTimeout: number | null = null;

  // Theme
  private currentTheme: "light" | "dark" = "light";

  constructor() {
    this.initTheme();
    this.init();
  }

  private initTheme(): void {
    // Check for saved theme preference or system preference
    const savedTheme = localStorage.getItem("convex-mcp-theme");
    if (savedTheme === "dark" || savedTheme === "light") {
      this.currentTheme = savedTheme;
    } else if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      // Don't auto-switch to dark, keep tan as default
      this.currentTheme = "light";
    }
    this.applyTheme();
  }

  private applyTheme(): void {
    document.documentElement.setAttribute("data-theme", this.currentTheme);
  }

  private showShortcutsModal(): void {
    const modal = document.getElementById("shortcutsModal");
    if (modal) {
      modal.style.display = "flex";
    }
  }

  private hideShortcutsModal(): void {
    const modal = document.getElementById("shortcutsModal");
    if (modal) {
      modal.style.display = "none";
    }
  }

  private toggleTheme(): void {
    this.currentTheme = this.currentTheme === "light" ? "dark" : "light";
    localStorage.setItem("convex-mcp-theme", this.currentTheme);
    this.applyTheme();
    // Redraw graph if in graph view
    if (this.viewMode === "graph") {
      this.drawGraph();
    }
  }

  private getThemeColor(varName: string): string {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(varName)
      .trim();
  }

  private getThemeColors() {
    return {
      bgPrimary: this.getThemeColor("--bg-primary") || "#faf8f5",
      bgSecondary: this.getThemeColor("--bg-secondary") || "#f5f3f0",
      bgHover: this.getThemeColor("--bg-hover") || "#ebe9e6",
      textPrimary: this.getThemeColor("--text-primary") || "#1a1a1a",
      textSecondary: this.getThemeColor("--text-secondary") || "#6b6b6b",
      textMuted: this.getThemeColor("--text-muted") || "#999999",
      border: this.getThemeColor("--border") || "#e6e4e1",
      accent: this.getThemeColor("--accent") || "#8b7355",
      accentInteractive:
        this.getThemeColor("--accent-interactive") || "#EB5601",
      accentHover: this.getThemeColor("--accent-hover") || "#d14a01",
      warning: this.getThemeColor("--warning") || "#c4842d",
      nodeBg: this.getThemeColor("--node-bg") || "#ffffff",
      nodeHeader: this.getThemeColor("--node-header") || "#f8f7f5",
      nodeHeaderSelected:
        this.getThemeColor("--node-header-selected") || "#EB5601",
      nodeBorder: this.getThemeColor("--node-border") || "#e6e4e1",
      gridLine: this.getThemeColor("--grid-line") || "#e6e4e1",
    };
  }

  private init(): void {
    const win = window as WindowWithConfig;
    if (win.__CONVEX_CONFIG__) {
      this.config = win.__CONVEX_CONFIG__;
    } else {
      const params = new URLSearchParams(window.location.search);
      const configParam = params.get("config");
      if (configParam) {
        try {
          this.config = JSON.parse(decodeURIComponent(configParam));
        } catch (e) {
          console.error("Failed to parse config:", e);
        }
      }
    }

    this.pageSize = this.config?.pageSize || 50;

    // Set view mode from config (defaults to list)
    if (this.config?.viewMode === "graph" || this.config?.viewMode === "list") {
      this.viewMode = this.config.viewMode;
    }

    this.render();
    this.setupKeyboardShortcuts();

    if (this.config?.selectedTable) {
      this.selectedTable = this.config.selectedTable;
    } else if (this.config?.tables && this.config.tables.length > 0) {
      this.selectedTable = this.config.tables[0].name;
    }

    if (this.viewMode === "graph") {
      this.initGraphView();
    }
  }

  private render(): void {
    const app = document.getElementById("app");
    if (!app) return;

    const deploymentUrl = this.config?.deploymentUrl || "Not connected";
    const isConnected = !!this.config?.deploymentUrl;

    app.innerHTML = `
      <div class="app-container ${this.viewMode === "graph" ? "graph-mode" : "list-mode"}">
        <div class="header">
          <h1>
            <span class="status-dot ${isConnected ? "" : "error"}" title="${isConnected ? "Connected to Convex" : "Not connected"}"></span>
            Schema Browser
          </h1>
          <div class="header-info">
            <span class="deployment-url" title="Your Convex deployment URL">${deploymentUrl}</span>
          </div>
          <div class="view-toggle">
            <button class="view-btn ${this.viewMode === "list" ? "active" : ""}" data-view="list" title="List View - Browse tables and documents in a table format (G to toggle)">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2 3h12v2H2V3zm0 4h12v2H2V7zm0 4h12v2H2v-2z"/>
              </svg>
            </button>
            <button class="view-btn ${this.viewMode === "graph" ? "active" : ""}" data-view="graph" title="Graph View - Visualize table relationships as a diagram (G to toggle)">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="4" cy="4" r="2"/>
                <circle cx="12" cy="4" r="2"/>
                <circle cx="8" cy="12" r="2"/>
                <path d="M4 6v4l4 2M12 6v4l-4 2" stroke="currentColor" stroke-width="1.5" fill="none"/>
              </svg>
            </button>
          </div>
          <div class="header-actions">
            <button class="btn" id="shortcutsBtn" title="Keyboard shortcuts">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="6" width="20" height="12" rx="2"/>
                <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8"/>
              </svg>
            </button>
            <button class="theme-toggle" id="themeToggle" title="Toggle dark/light mode">
              <svg class="moon-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
              <svg class="sun-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="5"/>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
            </button>
            <button class="btn" id="refreshBtn" title="Refresh data (R)">↻</button>
          </div>
        </div>

        ${this.viewMode === "graph" ? this.renderGraphView() : this.renderListView()}
        
        <!-- Keyboard shortcuts modal -->
        <div class="shortcuts-modal" id="shortcutsModal" style="display: none;">
          <div class="shortcuts-modal-content">
            <div class="shortcuts-modal-header">
              <h3>Keyboard Shortcuts</h3>
              <button class="shortcuts-close" id="shortcutsClose">&times;</button>
            </div>
            <div class="shortcuts-modal-body">
              <div class="shortcuts-section">
                <h4>Navigation</h4>
                <div class="shortcut-item"><kbd>G</kbd> Toggle Graph/List view</div>
                <div class="shortcut-item"><kbd>R</kbd> Refresh data</div>
                <div class="shortcut-item"><kbd>/</kbd> Focus search</div>
                <div class="shortcut-item"><kbd>↑</kbd><kbd>↓</kbd> Navigate tables</div>
              </div>
              <div class="shortcuts-section">
                <h4>Graph View</h4>
                <div class="shortcut-item"><kbd>C</kbd> Toggle code panel</div>
                <div class="shortcut-item"><kbd>A</kbd> Auto-arrange nodes</div>
                <div class="shortcut-item"><kbd>F</kbd> Fit to view</div>
                <div class="shortcut-item"><kbd>+</kbd><kbd>-</kbd> Zoom in/out</div>
                <div class="shortcut-item"><kbd>Cmd/Ctrl</kbd>+<kbd>Z</kbd> Undo</div>
              </div>
              <div class="shortcuts-section">
                <h4>List View</h4>
                <div class="shortcut-item"><kbd>←</kbd><kbd>→</kbd> Previous/Next page</div>
                <div class="shortcut-item"><kbd>B</kbd> Toggle sidebar</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.setupEventListeners();

    if (this.viewMode === "list") {
      this.renderTableList();
      if (this.selectedTable) {
        this.selectTable(this.selectedTable);
      }
      this.setupListViewEventListeners();
    } else {
      this.initGraphView();
    }
  }

  private renderListView(): string {
    const collapsedClass = this.sidebarCollapsed ? "collapsed" : "";
    return `
      <div class="main list-view">
        <div class="sidebar-container ${collapsedClass}" id="sidebarContainer">
          <div class="sidebar" style="width: ${this.sidebarWidth}px">
            <div class="sidebar-header">
              <span>TABLES</span>
              <span id="tableCount">${this.config?.tables?.length || 0}</span>
              <button class="sidebar-collapse-btn" id="sidebarToggle" title="${this.sidebarCollapsed ? "Expand" : "Collapse"}">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M8 2L4 6L8 10"/>
                </svg>
              </button>
            </div>
            <div class="sidebar-search">
              <input type="text" id="searchInput" placeholder="Search tables... (/)" autocomplete="off" />
            </div>
            <ul class="table-list" id="tableList"></ul>
          </div>
          <div class="resize-handle" id="resizeHandle"></div>
        </div>

        <div class="content">
          <div id="listViewContent">
            ${this.renderListViewContent()}
          </div>
        </div>
      </div>
    `;
  }

  private renderListViewContent(): string {
    if (!this.selectedTable) {
      return `
        <div class="empty-state" style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <div class="empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M3 9h18M9 3v18"/>
            </svg>
          </div>
          <h2>Select a Table</h2>
          <p>Choose a table from the sidebar to view its schema and documents.</p>
        </div>
      `;
    }

    const tableInfo = this.config?.tables?.find(
      (t) => t.name === this.selectedTable,
    );
    const documents =
      this.config?.allDocuments?.[this.selectedTable] ||
      tableInfo?.documents ||
      [];
    // Use declared fields if available, otherwise fall back to inferred
    const declaredFields = tableInfo?.declaredFields || [];
    const inferredFields = tableInfo?.inferredFields || [];
    const fields = declaredFields.length > 0 ? declaredFields : inferredFields;
    const schemaSource = declaredFields.length > 0 ? "declared" : "inferred";
    const docCount = tableInfo?.documentCount || 0;
    const hasAdminAccess = this.config?.hasAdminAccess ?? true;

    return `
      <div class="table-header">
        <div class="table-header-title">${this.selectedTable}</div>
        <div class="table-header-meta">
          <span title="Total documents stored in this table">${this.formatCount(docCount)} documents total</span>
          ${tableInfo?.hasIndexes ? '<span class="badge" title="This table has database indexes for faster queries">Indexed</span>' : ""}
          <span class="badge" title="Number of fields in this table schema">${fields.length} fields</span>
        </div>
      </div>
      <div class="content-split">
        <div class="schema-sidebar">
          <div class="schema-sidebar-header">
            <span>Schema</span>
            <span class="field-count-badge" title="${schemaSource === "declared" ? "Schema defined in convex/schema.ts" : "Schema inferred from existing documents"}">${schemaSource}</span>
          </div>
          <div class="schema-fields-list">
            ${this.renderSchemaFieldsList(fields)}
          </div>
          ${tableInfo?.hasIndexes ? this.renderIndexesSection(tableInfo) : ""}
        </div>
        <div class="documents-main">
          <div class="documents-toolbar">
            <div class="documents-toolbar-title">
              Documents
              <span class="doc-count" title="Sample documents loaded from the database">${documents.length > 0 ? `(${this.formatCount(documents.length)} loaded of ${this.formatCount(docCount)})` : "(none loaded)"}</span>
            </div>
            ${!hasAdminAccess ? '<span class="badge" style="background: var(--warning-bg); color: var(--warning-text);" title="A deploy key is required to fetch document data from Convex">Deploy key required for documents</span>' : ""}
          </div>
          <div class="documents-table-wrapper" id="documentsTableWrapper">
            ${this.renderDocumentsTable(documents, hasAdminAccess)}
          </div>
          ${this.renderPaginationBar(documents)}
        </div>
      </div>
    `;
  }

  private renderSchemaFieldsList(fields: SchemaField[]): string {
    if (!fields || fields.length === 0) {
      return '<div style="padding: 16px; color: var(--text-secondary);">No schema data available</div>';
    }

    const systemFields = ["_id", "_creationTime"];
    const sortedFields = [...fields].sort((a, b) => {
      const aIsSystem = systemFields.includes(a.name);
      const bIsSystem = systemFields.includes(b.name);
      if (aIsSystem && !bIsSystem) return -1;
      if (!aIsSystem && bIsSystem) return 1;
      return a.name.localeCompare(b.name);
    });

    return sortedFields
      .map((f) => {
        const isSystem = systemFields.includes(f.name);
        const tooltip = this.getFieldTooltipText(f, isSystem);
        return `
        <div class="schema-field-item" title="${tooltip}">
          <span class="schema-field-name ${isSystem ? "system-field" : ""}">
            ${f.name}
            ${f.optional ? '<span class="schema-field-optional" title="This field is optional">?</span>' : ""}
          </span>
          <span class="schema-field-type" title="Field type: ${f.type}">${f.type}</span>
        </div>
      `;
      })
      .join("");
  }

  private getFieldTooltipText(field: SchemaField, isSystem: boolean): string {
    if (field.name === "_id") {
      return "Document ID: Unique identifier auto-generated by Convex";
    }
    if (field.name === "_creationTime") {
      return "Creation timestamp: Unix time (ms) when this document was created";
    }
    if (field.type.includes("Id<")) {
      const match = field.type.match(/Id<["'](\w+)["']>/);
      const targetTable = match ? match[1] : "another table";
      return `Reference to ${targetTable} table`;
    }
    let tip = `${field.name}: ${field.type}`;
    if (field.optional) {
      tip += " (optional)";
    }
    return tip;
  }

  private renderIndexesSection(tableInfo: TableInfo): string {
    if (!tableInfo.indexes || tableInfo.indexes.length === 0) {
      return "";
    }
    return `
      <div class="schema-indexes">
        <div class="schema-indexes-title" title="Database indexes speed up queries on these fields">Indexes</div>
        ${tableInfo.indexes
          .map(
            (idx) => `
          <div class="schema-index-item" title="Index: ${idx} - Use withIndex('${idx}', ...) in queries for faster lookups">${idx}</div>
        `,
          )
          .join("")}
      </div>
    `;
  }

  private renderDocumentsTable(
    docs: Document[],
    hasAdminAccess: boolean = true,
  ): string {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    const paginatedDocs = docs.slice(start, end);

    if (paginatedDocs.length === 0) {
      // Show different message based on admin access
      if (!hasAdminAccess) {
        return `
          <div class="documents-empty">
            <div class="documents-empty-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
            </div>
            <h3>Deploy Key Required</h3>
            <p>Set CONVEX_DEPLOY_KEY to view documents.</p>
            <p style="font-size: 12px; color: var(--text-tertiary); margin-top: 8px;">
              Get your key from Settings &gt; Deploy Keys in the Convex dashboard.
            </p>
          </div>
        `;
      }
      return `
        <div class="documents-empty">
          <div class="documents-empty-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
            </svg>
          </div>
          <h3>No Documents</h3>
          <p>This table is empty.</p>
        </div>
      `;
    }

    const keys = [...new Set(paginatedDocs.flatMap((d) => Object.keys(d)))];
    keys.sort((a, b) => {
      const aIsSystem = a.startsWith("_");
      const bIsSystem = b.startsWith("_");
      if (aIsSystem && !bIsSystem) return -1;
      if (!aIsSystem && bIsSystem) return 1;
      return a.localeCompare(b);
    });

    return `
      <table>
        <thead>
          <tr>${keys.map((k) => `<th>${k}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${paginatedDocs
            .map(
              (doc) => `
            <tr>
              ${keys
                .map((k) => {
                  const value = doc[k];
                  const isId = k === "_id";
                  const isNull = value === null || value === undefined;
                  const classes = [
                    isId ? "id-cell" : "",
                    isNull ? "null-value" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");
                  return `<td class="${classes}">${this.formatValue(value)}</td>`;
                })
                .join("")}
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    `;
  }

  private renderPaginationBar(docs: Document[]): string {
    const totalPages = Math.ceil(docs.length / this.pageSize) || 1;
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, docs.length);

    return `
      <div class="pagination-bar">
        <div class="pagination-info">
          ${docs.length > 0 ? `Showing ${start}-${end} of ${docs.length}` : "No documents"}
        </div>
        <div class="pagination-controls">
          <button id="prevPage" ${this.currentPage <= 1 ? "disabled" : ""}>‹</button>
          <span class="page-indicator">Page ${this.currentPage} of ${totalPages}</span>
          <button id="nextPage" ${this.currentPage >= totalPages ? "disabled" : ""}>›</button>
        </div>
      </div>
    `;
  }

  private renderGraphView(): string {
    const sidebarCollapsed = this.sidebarCollapsed ? "collapsed" : "";
    const codePanelHidden = !this.showCodePanel ? "hidden" : "";
    const deploymentUrl = this.config?.deploymentUrl || "Not connected";

    return `
      <div class="main graph-view">
        ${this.renderToolbar()}
        <div class="graph-content">
          ${this.renderEnhancedSidebar()}
          <div class="graph-panel" id="graphPanel">
            <canvas id="graphCanvas"></canvas>
            ${this.renderZoomControls()}
            <div class="graph-legend">
              <div class="legend-item">
                <span class="legend-dot table"></span>
                <span>Table</span>
              </div>
              <div class="legend-item">
                <span class="legend-line"></span>
                <span>Reference</span>
              </div>
              <div class="legend-item">
                <span class="legend-line dashed"></span>
                <span>Inferred</span>
              </div>
            </div>
          </div>
          <div class="sidebar-container ${sidebarCollapsed} ${codePanelHidden}" id="sidebarContainer">
            <div class="resize-handle resize-handle-left" id="resizeHandle"></div>
            <div class="code-panel" id="codePanel" style="width: ${this.codePanelWidth}px">
              <div class="code-header">
                <span>Schema</span>
                <span class="code-filename">${this.selectedTable || "schema"}.json</span>
              </div>
              <div class="code-content" id="codeContent">
                <pre><code id="codeBlock">${this.generateSchemaCode()}</code></pre>
              </div>
            </div>
            <button class="sidebar-toggle sidebar-toggle-right" id="sidebarToggle" title="${this.sidebarCollapsed ? "Show panel" : "Hide panel"}">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 2L10 7L5 12"/>
              </svg>
            </button>
          </div>
        </div>
        ${this.renderExportMenu()}
        ${this.renderFilterDropdown()}
      </div>
    `;
  }

  private renderEnhancedSidebar(): string {
    const deploymentUrl = this.config?.deploymentUrl || "Not connected";
    const isConnected = !!this.config?.deploymentUrl;
    const tables = this.getSortedTables();
    const filteredTables = this.getFilteredTablesForSidebar(tables);
    const collapsedClass = this.graphSidebarCollapsed ? "collapsed" : "";

    return `
      <div class="enhanced-sidebar ${collapsedClass}" id="enhancedSidebar">
        <button class="graph-sidebar-toggle" id="graphSidebarToggle" title="${this.graphSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2">
            <path d="${this.graphSidebarCollapsed ? "M5 2L10 7L5 12" : "M9 2L4 7L9 12"}"/>
          </svg>
        </button>
        <div class="sidebar-deployment">
          <div class="deployment-status">
            <span class="status-indicator ${isConnected ? "connected" : "error"}"></span>
            <span class="deployment-label">Convex</span>
          </div>
          <div class="deployment-url-small">${this.truncateUrl(deploymentUrl)}</div>
        </div>

        <div class="sidebar-section ${this.sidebarSections.tables.collapsed ? "collapsed" : ""}" data-section="tables">
          <div class="section-header" id="sectionHeaderTables">
            <svg class="section-chevron" width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M4 2L8 6L4 10"/>
            </svg>
            <span class="section-title">TABLES</span>
            <span class="section-count">${tables.length}</span>
          </div>
          <div class="section-content">
            <div class="sidebar-toolbar">
              <input type="text" class="sidebar-filter" id="graphSidebarSearch" placeholder="Filter tables..." value="${this.searchQuery}">
              <button class="sort-btn" id="sortBtn" title="Sort">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M4 5L7 2L10 5M4 9L7 12L10 9"/>
                </svg>
              </button>
            </div>
            <ul class="sidebar-table-list" id="graphTableList">
              ${filteredTables.map((t) => this.renderSidebarTableItem(t)).join("")}
            </ul>
          </div>
        </div>

        <div class="sidebar-section ${this.sidebarSections.convex.collapsed ? "collapsed" : ""}" data-section="convex">
          <div class="section-header" id="sectionHeaderConvex">
            <svg class="section-chevron" width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M4 2L8 6L4 10"/>
            </svg>
            <span class="section-title">SCHEMA INFO</span>
          </div>
          <div class="section-content">
            <div class="convex-info-list">
              <div class="convex-info-item">
                <span class="info-label">Total Tables</span>
                <span class="info-value">${tables.length}</span>
              </div>
              <div class="convex-info-item">
                <span class="info-label">Total Documents</span>
                <span class="info-value">${this.formatCount(tables.reduce((sum, t) => sum + t.documentCount, 0))}</span>
              </div>
              <div class="convex-info-item">
                <span class="info-label">Relationships</span>
                <span class="info-value">${this.graphEdges.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderSidebarTableItem(table: TableInfo): string {
    const isSelected = table.name === this.selectedTable;
    const node = this.graphNodes.find((n) => n.id === table.name);
    const isVisible = node?.visible !== false;
    const fieldCount = table.inferredFields?.length || 0;

    return `
      <li class="sidebar-table-item ${isSelected ? "active" : ""} ${!isVisible ? "filtered-out" : ""}" data-table="${table.name}">
        <div class="table-item-main">
          <svg class="table-icon" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="1" y="1" width="12" height="12" rx="2"/>
            <path d="M1 5H13M5 5V13"/>
          </svg>
          <span class="table-name">${table.name}</span>
        </div>
        <div class="table-item-meta">
          <span class="field-count" title="${fieldCount} fields">${fieldCount}</span>
          <span class="doc-count" title="${table.documentCount} documents">${this.formatCount(table.documentCount)}</span>
        </div>
      </li>
    `;
  }

  private getSortedTables(): TableInfo[] {
    const tables = [...(this.config?.tables || [])];

    tables.sort((a, b) => {
      let comparison = 0;

      switch (this.tableSortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "count":
          comparison = a.documentCount - b.documentCount;
          break;
        case "fields":
          comparison =
            (a.inferredFields?.length || 0) - (b.inferredFields?.length || 0);
          break;
      }

      return this.tableSortOrder === "asc" ? comparison : -comparison;
    });

    return tables;
  }

  private getFilteredTablesForSidebar(tables: TableInfo[]): TableInfo[] {
    if (!this.searchQuery) return tables;

    return tables.filter((t) =>
      t.name.toLowerCase().includes(this.searchQuery.toLowerCase()),
    );
  }

  private truncateUrl(url: string): string {
    if (url.length <= 35) return url;
    // Extract the meaningful part of the URL
    const match = url.match(/https?:\/\/([^\/]+)/);
    if (match) {
      const domain = match[1];
      if (domain.length > 35) {
        return domain.slice(0, 32) + "...";
      }
      return domain;
    }
    return url.slice(0, 32) + "...";
  }

  private toggleSidebarSection(sectionId: "tables" | "convex"): void {
    this.sidebarSections[sectionId].collapsed =
      !this.sidebarSections[sectionId].collapsed;
    const section = document.querySelector(`[data-section="${sectionId}"]`);
    if (section) {
      section.classList.toggle(
        "collapsed",
        this.sidebarSections[sectionId].collapsed,
      );
    }
  }

  private cycleSortOrder(): void {
    const sortOptions: Array<{
      by: "name" | "count" | "fields";
      order: "asc" | "desc";
    }> = [
      { by: "name", order: "asc" },
      { by: "name", order: "desc" },
      { by: "count", order: "desc" },
      { by: "count", order: "asc" },
      { by: "fields", order: "desc" },
      { by: "fields", order: "asc" },
    ];

    const currentIndex = sortOptions.findIndex(
      (o) => o.by === this.tableSortBy && o.order === this.tableSortOrder,
    );
    const nextIndex = (currentIndex + 1) % sortOptions.length;
    this.tableSortBy = sortOptions[nextIndex].by;
    this.tableSortOrder = sortOptions[nextIndex].order;

    // Re-render sidebar table list
    this.updateSidebarTableList();
  }

  private updateSidebarTableList(): void {
    const tableList = document.getElementById("graphTableList");
    if (tableList) {
      const tables = this.getSortedTables();
      const filtered = this.getFilteredTablesForSidebar(tables);
      tableList.innerHTML = filtered
        .map((t) => this.renderSidebarTableItem(t))
        .join("");
      this.setupSidebarTableEvents();
    }
  }

  private setupSidebarTableEvents(): void {
    document.querySelectorAll(".sidebar-table-item").forEach((item) => {
      item.addEventListener("click", () => {
        const tableName = (item as HTMLElement).dataset.table;
        if (tableName) {
          this.selectTable(tableName);
          // Center on the node
          const node = this.graphNodes.find((n) => n.id === tableName);
          if (node) {
            this.centerOnNode(node);
          }
        }
      });
    });
  }

  private centerOnNode(node: GraphNode): void {
    if (!this.canvas) return;

    const canvasWidth = this.canvas.width / this.dpr;
    const canvasHeight = this.canvas.height / this.dpr;

    const nodeCenterX = node.x + node.width / 2;
    const nodeCenterY = node.y + node.height / 2;

    this.panX = canvasWidth / 2 - nodeCenterX * this.zoom;
    this.panY = canvasHeight / 2 - nodeCenterY * this.zoom;

    this.drawGraph();
  }

  // ===== Tooltip Methods =====

  private showTooltip(
    x: number,
    y: number,
    title: string,
    content: string,
    type: TooltipState["type"],
  ): void {
    if (this.tooltipTimeout) {
      clearTimeout(this.tooltipTimeout);
    }

    this.tooltipTimeout = window.setTimeout(() => {
      this.tooltip = { visible: true, x, y, title, content, type };
      this.renderTooltip();
    }, 400) as unknown as number; // 400ms delay
  }

  private hideTooltip(): void {
    if (this.tooltipTimeout) {
      clearTimeout(this.tooltipTimeout);
      this.tooltipTimeout = null;
    }
    this.tooltip = null;
    document.getElementById("tooltip")?.remove();
  }

  private renderTooltip(): void {
    if (!this.tooltip) return;

    // Remove existing tooltip
    document.getElementById("tooltip")?.remove();

    const tooltipEl = document.createElement("div");
    tooltipEl.id = "tooltip";
    tooltipEl.className = `tooltip tooltip-${this.tooltip.type}`;
    tooltipEl.innerHTML = `
      <div class="tooltip-title">${this.tooltip.title}</div>
      <div class="tooltip-content">${this.tooltip.content}</div>
    `;

    // Position tooltip, ensuring it stays in viewport
    let left = this.tooltip.x + 12;
    let top = this.tooltip.y + 12;

    document.body.appendChild(tooltipEl);

    const rect = tooltipEl.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (left + rect.width > viewportWidth - 10) {
      left = this.tooltip.x - rect.width - 12;
    }
    if (top + rect.height > viewportHeight - 10) {
      top = this.tooltip.y - rect.height - 12;
    }

    tooltipEl.style.left = `${left}px`;
    tooltipEl.style.top = `${top}px`;
  }

  private getFieldTooltipContent(
    field: SchemaField,
    tableName: string,
  ): { title: string; content: string } {
    // System field tooltips
    const systemTooltips: Record<string, { title: string; content: string }> = {
      _id: {
        title: "Document ID",
        content: `Unique identifier auto-generated by Convex.<br><code>Id&lt;"${tableName}"&gt;</code>`,
      },
      _creationTime: {
        title: "Creation Timestamp",
        content:
          "Unix timestamp (ms) when this document was created.<br>Auto-set by Convex on insert.",
      },
    };

    if (systemTooltips[field.name]) {
      return systemTooltips[field.name];
    }

    // Reference field tooltip
    if (field.type.includes("Id<")) {
      const match = field.type.match(/Id<["'](\w+)["']>/);
      const targetTable = match ? match[1] : "unknown";
      return {
        title: "Reference Field",
        content: `Links to the <strong>${targetTable}</strong> table.<br>Type: <code>${field.type}</code>`,
      };
    }

    // Regular field tooltip
    return {
      title: field.name,
      content: `Type: <code>${field.type}</code>${field.optional ? "<br><em>Optional field</em>" : ""}`,
    };
  }

  private getFieldAtPosition(
    node: GraphNode,
    canvasY: number,
  ): SchemaField | null {
    const fields = this.getSortedFields(node.table.inferredFields || []);
    const headerHeight = 44;
    const fieldRowHeight = 24;

    // Calculate which field row we're hovering over
    const relativeY = canvasY - node.y - headerHeight;
    if (relativeY < 0) return null;

    const fieldIndex = Math.floor(relativeY / fieldRowHeight);
    const maxVisibleFields = 12;

    if (
      fieldIndex >= 0 &&
      fieldIndex < Math.min(fields.length, maxVisibleFields)
    ) {
      return fields[fieldIndex];
    }

    return null;
  }

  private renderToolbar(): string {
    const canUndo = this.historyIndex > 0;
    const canRedo = this.historyIndex < this.positionHistory.length - 1;

    return `
      <div class="toolbar">
        <div class="toolbar-group">
          <button class="toolbar-btn ${this.showCodePanel ? "active" : ""}" id="viewCodeBtn" title="Toggle Code Panel (C)">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M5 4L1 8L5 12M11 4L15 8L11 12"/>
            </svg>
            <span>View Code</span>
          </button>
        </div>

        <div class="toolbar-separator"></div>

        <div class="toolbar-group">
          <button class="toolbar-btn" id="exportBtn" title="Export Schema">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M8 2V10M8 10L5 7M8 10L11 7M2 12V13C2 13.5523 2.44772 14 3 14H13C13.5523 14 14 13.5523 14 13V12"/>
            </svg>
            <span>Export</span>
            <svg class="dropdown-arrow" width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <path d="M2 4L5 7L8 4"/>
            </svg>
          </button>
        </div>

        <div class="toolbar-separator"></div>

        <div class="toolbar-group">
          <button class="toolbar-btn" id="autoArrangeBtn" title="Auto Arrange Layout (A)">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="1" y="1" width="5" height="5" rx="1"/>
              <rect x="10" y="1" width="5" height="5" rx="1"/>
              <rect x="1" y="10" width="5" height="5" rx="1"/>
              <rect x="10" y="10" width="5" height="5" rx="1"/>
            </svg>
            <span>Auto Arrange</span>
          </button>
        </div>

        <div class="toolbar-separator"></div>

        <div class="toolbar-group">
          <button class="toolbar-btn icon-only" id="undoBtn" title="Undo (Cmd+Z)" ${canUndo ? "" : "disabled"}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M4 6H11C12.6569 6 14 7.34315 14 9V9C14 10.6569 12.6569 12 11 12H8M4 6L7 3M4 6L7 9"/>
            </svg>
          </button>
          <button class="toolbar-btn icon-only" id="redoBtn" title="Redo (Cmd+Shift+Z)" ${canRedo ? "" : "disabled"}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M12 6H5C3.34315 6 2 7.34315 2 9V9C2 10.6569 3.34315 12 5 12H8M12 6L9 3M12 6L9 9"/>
            </svg>
          </button>
        </div>

        <div class="toolbar-separator"></div>

        <div class="toolbar-group">
          <button class="toolbar-btn" id="filterBtn" title="Filter Tables">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M2 3H14M4 8H12M6 13H10"/>
            </svg>
            <span>Filter</span>
          </button>
        </div>

        <div class="toolbar-spacer"></div>

        <div class="toolbar-group zoom-group">
          <button class="toolbar-btn icon-only" id="zoomOutToolbar" title="Zoom Out (-)">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 8H12"/>
            </svg>
          </button>
          <span class="zoom-display" id="zoomDisplay">${Math.round(this.zoom * 100)}%</span>
          <button class="toolbar-btn icon-only" id="zoomInToolbar" title="Zoom In (+)">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M8 4V12M4 8H12"/>
            </svg>
          </button>
          <button class="toolbar-btn icon-only" id="fitViewBtn" title="Fit to View (F)">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="2" y="2" width="12" height="12" rx="2"/>
              <path d="M5 5L7 7M11 5L9 7M5 11L7 9M11 11L9 9"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  private renderZoomControls(): string {
    return `
      <div class="zoom-panel" id="zoomPanel">
        <button class="zoom-btn" id="zoomIn" title="Zoom In (+)">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M8 4V12M4 8H12"/>
          </svg>
        </button>
        <div class="zoom-level" id="zoomLevel">${Math.round(this.zoom * 100)}%</div>
        <button class="zoom-btn" id="zoomOut" title="Zoom Out (-)">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 8H12"/>
          </svg>
        </button>
        <div class="zoom-separator"></div>
        <button class="zoom-btn" id="fitView" title="Fit All Tables (F)">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="2" y="2" width="12" height="12" rx="2"/>
            <path d="M5 5h2M9 5h2M5 11h2M9 11h2"/>
          </svg>
        </button>
        <button class="zoom-btn" id="resetView" title="Reset View (R)">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M2 8a6 6 0 1 1 11.5 2.5"/>
            <path d="M12 7v4h-4"/>
          </svg>
        </button>
      </div>
    `;
  }

  private renderExportMenu(): string {
    if (!this.showExportMenu) return "";

    return `
      <div class="dropdown-menu export-menu" id="exportMenu">
        <button class="dropdown-item" id="exportJson">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M4 2H10L14 6V14H4V2Z"/>
            <path d="M10 2V6H14"/>
          </svg>
          <span>Export as JSON</span>
        </button>
        <button class="dropdown-item" id="exportTs">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M4 2H10L14 6V14H4V2Z"/>
            <path d="M10 2V6H14"/>
          </svg>
          <span>Export as TypeScript</span>
        </button>
        <button class="dropdown-item" id="exportPng">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="2" y="2" width="12" height="12" rx="2"/>
            <circle cx="6" cy="6" r="1.5"/>
            <path d="M14 10L11 7L6 12"/>
          </svg>
          <span>Export as PNG</span>
        </button>
      </div>
    `;
  }

  private renderFilterDropdown(): string {
    if (!this.showFilterDropdown) return "";

    return `
      <div class="dropdown-menu filter-menu" id="filterMenu">
        <div class="filter-header">
          <span>Filter Tables</span>
          <button class="filter-close" id="filterClose">&times;</button>
        </div>
        <div class="filter-body">
          <div class="filter-group">
            <label for="filterTableName">Table Name</label>
            <input type="text" id="filterTableName" placeholder="Contains..." value="${this.filterState.tableName}">
          </div>
          <div class="filter-group">
            <label for="filterFieldName">Field Name</label>
            <input type="text" id="filterFieldName" placeholder="Contains..." value="${this.filterState.fieldName}">
          </div>
          <div class="filter-group">
            <label for="filterFieldType">Field Type</label>
            <select id="filterFieldType">
              <option value="" ${this.filterState.fieldType === "" ? "selected" : ""}>All types</option>
              <option value="string" ${this.filterState.fieldType === "string" ? "selected" : ""}>string</option>
              <option value="number" ${this.filterState.fieldType === "number" ? "selected" : ""}>number</option>
              <option value="boolean" ${this.filterState.fieldType === "boolean" ? "selected" : ""}>boolean</option>
              <option value="Id" ${this.filterState.fieldType === "Id" ? "selected" : ""}>Id (reference)</option>
              <option value="object" ${this.filterState.fieldType === "object" ? "selected" : ""}>object</option>
              <option value="array" ${this.filterState.fieldType === "array" ? "selected" : ""}>array</option>
            </select>
          </div>
          <div class="filter-group checkbox">
            <label>
              <input type="checkbox" id="filterShowEmpty" ${this.filterState.showEmpty ? "checked" : ""}>
              Show empty tables
            </label>
          </div>
        </div>
        <div class="filter-footer">
          <button class="btn btn-secondary" id="filterClear">Clear</button>
          <button class="btn btn-primary" id="filterApply">Apply</button>
        </div>
      </div>
    `;
  }

  private generateSchemaCode(): string {
    const tables = this.config?.tables || [];
    const allDocs = this.config?.allDocuments || {};

    const schema: Record<string, any> = {};

    for (const table of tables) {
      const fields: Record<string, string> = {};
      if (table.inferredFields) {
        for (const field of table.inferredFields) {
          fields[field.name] = field.type + (field.optional ? "?" : "");
        }
      }

      schema[table.name] = {
        fields,
        documentCount: table.documentCount,
        sample: allDocs[table.name]?.[0] || null,
      };
    }

    return this.syntaxHighlight(JSON.stringify(schema, null, 2));
  }

  private syntaxHighlight(json: string): string {
    return json
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?)/g, (match) => {
        let cls = "json-string";
        if (/:$/.test(match)) {
          cls = "json-key";
        }
        return `<span class="${cls}">${match}</span>`;
      })
      .replace(/\b(true|false)\b/g, '<span class="json-boolean">$1</span>')
      .replace(/\b(null)\b/g, '<span class="json-null">$1</span>')
      .replace(/\b(-?\d+\.?\d*)\b/g, '<span class="json-number">$1</span>');
  }

  private initGraphView(): void {
    this.canvas = document.getElementById("graphCanvas") as HTMLCanvasElement;
    if (!this.canvas) return;

    // Get device pixel ratio for retina display support
    this.dpr = window.devicePixelRatio || 1;

    const container = this.canvas.parentElement;
    if (container) {
      // Set canvas dimensions accounting for device pixel ratio
      const width = container.clientWidth;
      const height = container.clientHeight;
      this.canvas.width = width * this.dpr;
      this.canvas.height = height * this.dpr;
      // Set display size via CSS
      this.canvas.style.width = width + "px";
      this.canvas.style.height = height + "px";
    }

    this.ctx = this.canvas.getContext("2d");
    if (!this.ctx) return;

    // Scale context for retina
    this.ctx.scale(this.dpr, this.dpr);

    this.calculateGraphLayout();
    this.setupGraphEvents();
    this.drawGraph();

    // Save initial position state
    this.savePositionState();

    // Handle resize
    window.addEventListener("resize", () => {
      if (this.canvas && this.canvas.parentElement && this.ctx) {
        const width = this.canvas.parentElement.clientWidth;
        const height = this.canvas.parentElement.clientHeight;
        this.dpr = window.devicePixelRatio || 1;
        this.canvas.width = width * this.dpr;
        this.canvas.height = height * this.dpr;
        this.canvas.style.width = width + "px";
        this.canvas.style.height = height + "px";
        this.ctx.scale(this.dpr, this.dpr);
        this.drawGraph();
      }
    });
  }

  private calculateGraphLayout(): void {
    const tables = this.config?.tables || [];
    const allDocs = this.config?.allDocuments || {};

    this.graphNodes = [];
    this.graphEdges = [];

    // Calculate node positions in a grid with some spacing
    const nodeWidth = 220;
    const nodeHeight = 160;
    const horizontalSpacing = 80;
    const verticalSpacing = 60;
    const cols = Math.ceil(Math.sqrt(tables.length));

    tables.forEach((table, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);

      this.graphNodes.push({
        id: table.name,
        x: 100 + col * (nodeWidth + horizontalSpacing),
        y: 100 + row * (nodeHeight + verticalSpacing),
        width: nodeWidth,
        height: nodeHeight,
        table,
      });
    });

    // Detect relationships based on field types and naming patterns
    for (const node of this.graphNodes) {
      const fields = node.table.inferredFields || [];
      for (const field of fields) {
        // Check for explicit Id<"tableName"> type references
        const idMatch = field.type.match(/Id<["'](\w+)["']>/);
        if (idMatch) {
          const targetTable = idMatch[1];
          const targetNode = this.graphNodes.find((n) => n.id === targetTable);
          if (targetNode && targetNode.id !== node.id) {
            this.graphEdges.push({
              from: node.id,
              to: targetNode.id,
              fromField: field.name,
              toField: "_id",
              inferred: false,
            });
            continue;
          }
        }

        // Infer relationships from field naming patterns
        const fieldLower = field.name.toLowerCase();
        for (const otherNode of this.graphNodes) {
          if (otherNode.id === node.id) continue;

          const tableLower = otherNode.id.toLowerCase();
          const singularTable = tableLower.endsWith("s")
            ? tableLower.slice(0, -1)
            : tableLower;

          // Match patterns like "userId" -> "users", "postId" -> "posts"
          if (
            fieldLower === tableLower + "id" ||
            fieldLower === singularTable + "id" ||
            fieldLower === singularTable + "_id" ||
            fieldLower === tableLower + "_id"
          ) {
            // Check if we already have this edge
            const exists = this.graphEdges.some(
              (e) =>
                e.from === node.id &&
                e.to === otherNode.id &&
                e.fromField === field.name,
            );
            if (!exists) {
              this.graphEdges.push({
                from: node.id,
                to: otherNode.id,
                fromField: field.name,
                toField: "_id",
                inferred: true,
              });
            }
          }
        }
      }
    }

    // Center the graph using logical (CSS) dimensions
    if (this.canvas && this.graphNodes.length > 0) {
      const minX = Math.min(...this.graphNodes.map((n) => n.x));
      const maxX = Math.max(...this.graphNodes.map((n) => n.x + n.width));
      const minY = Math.min(...this.graphNodes.map((n) => n.y));
      const maxY = Math.max(...this.graphNodes.map((n) => n.y + n.height));

      const graphWidth = maxX - minX;
      const graphHeight = maxY - minY;

      // Use logical dimensions (canvas physical size / dpr)
      const logicalWidth = this.canvas.width / this.dpr;
      const logicalHeight = this.canvas.height / this.dpr;

      this.panX = (logicalWidth - graphWidth) / 2 - minX;
      this.panY = (logicalHeight - graphHeight) / 2 - minY;
    }
  }

  private setupGraphEvents(): void {
    if (!this.canvas) return;

    let lastX = 0;
    let lastY = 0;

    this.canvas.addEventListener("mousedown", (e) => {
      const rect = this.canvas!.getBoundingClientRect();
      const x = (e.clientX - rect.left - this.panX) / this.zoom;
      const y = (e.clientY - rect.top - this.panY) / this.zoom;

      // Check if clicking on a node
      this.selectedNode =
        this.graphNodes.find(
          (node) =>
            x >= node.x &&
            x <= node.x + node.width &&
            y >= node.y &&
            y <= node.y + node.height,
        ) || null;

      if (this.selectedNode) {
        this.selectTable(this.selectedNode.id);
        this.updateCodePanel();
      }

      this.isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
    });

    this.canvas.addEventListener("mousemove", (e) => {
      const rect = this.canvas!.getBoundingClientRect();
      const x = (e.clientX - rect.left - this.panX) / this.zoom;
      const y = (e.clientY - rect.top - this.panY) / this.zoom;

      // Check hover - only consider visible nodes
      const hovered =
        this.graphNodes.find(
          (node) =>
            node.visible !== false &&
            x >= node.x &&
            x <= node.x + node.width &&
            y >= node.y &&
            y <= node.y + node.height,
        ) || null;

      if (hovered !== this.hoveredNode) {
        this.hoveredNode = hovered;
        this.canvas!.style.cursor = hovered ? "pointer" : "grab";
        this.hideTooltip();
        this.drawGraph();
      }

      // Show tooltip for hovered node fields
      if (hovered && !this.isDragging) {
        const field = this.getFieldAtPosition(hovered, y);
        if (field) {
          const tooltipContent = this.getFieldTooltipContent(
            field,
            hovered.table.name,
          );
          this.showTooltip(
            e.clientX,
            e.clientY,
            tooltipContent.title,
            tooltipContent.content,
            "field",
          );
        } else {
          this.hideTooltip();
        }
      } else if (!hovered) {
        this.hideTooltip();
      }

      if (this.isDragging) {
        this.hideTooltip();
        if (this.selectedNode) {
          // Drag node
          const dx = (e.clientX - lastX) / this.zoom;
          const dy = (e.clientY - lastY) / this.zoom;
          this.selectedNode.x += dx;
          this.selectedNode.y += dy;
        } else {
          // Pan canvas
          this.panX += e.clientX - lastX;
          this.panY += e.clientY - lastY;
        }
        lastX = e.clientX;
        lastY = e.clientY;
        this.drawGraph();
      }
    });

    this.canvas.addEventListener("mouseup", (e) => {
      if (
        this.isDragging &&
        (this.selectedNode ||
          Math.abs(e.clientX - this.dragStartX) > 5 ||
          Math.abs(e.clientY - this.dragStartY) > 5)
      ) {
        // Save position if we actually dragged something
        this.savePositionState();
      }
      this.isDragging = false;
      this.selectedNode = null;
    });

    this.canvas.addEventListener("mouseleave", () => {
      this.isDragging = false;
      this.selectedNode = null;
      this.hoveredNode = null;
      this.hideTooltip();
      this.drawGraph();
    });

    this.canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      const rect = this.canvas!.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const oldZoom = this.zoom;
      const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
      this.zoom = Math.max(0.25, Math.min(2, this.zoom * zoomDelta));

      // Zoom towards mouse position
      this.panX = mouseX - (mouseX - this.panX) * (this.zoom / oldZoom);
      this.panY = mouseY - (mouseY - this.panY) * (this.zoom / oldZoom);

      this.drawGraph();
    });

    // Graph control buttons (floating zoom panel)
    document.getElementById("zoomIn")?.addEventListener("click", () => {
      this.zoom = Math.min(2, this.zoom * 1.2);
      this.updateZoomDisplay();
      this.drawGraph();
    });

    document.getElementById("zoomOut")?.addEventListener("click", () => {
      this.zoom = Math.max(0.25, this.zoom / 1.2);
      this.updateZoomDisplay();
      this.drawGraph();
    });

    document.getElementById("fitView")?.addEventListener("click", () => {
      this.fitToView();
    });

    document.getElementById("resetView")?.addEventListener("click", () => {
      this.zoom = 1;
      this.calculateGraphLayout();
      this.updateZoomDisplay();
      this.drawGraph();
    });
  }

  private drawGraph(): void {
    if (!this.ctx || !this.canvas) return;

    const ctx = this.ctx;
    const colors = this.getThemeColors();
    // Use logical (CSS) dimensions, not physical canvas dimensions
    const width = this.canvas.width / this.dpr;
    const height = this.canvas.height / this.dpr;

    // Clear canvas (need to reset transform first, then clear at physical size)
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = colors.bgPrimary;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.restore();

    // Draw grid
    ctx.save();
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.zoom, this.zoom);

    this.drawGridPattern(ctx);

    // Draw edges first (behind nodes) - only for visible nodes
    for (const edge of this.graphEdges) {
      const fromNode = this.graphNodes.find((n) => n.id === edge.from);
      const toNode = this.graphNodes.find((n) => n.id === edge.to);
      if (
        fromNode &&
        toNode &&
        fromNode.visible !== false &&
        toNode.visible !== false
      ) {
        this.drawEdge(ctx, fromNode, toNode, edge);
      }
    }

    // Draw nodes - only visible ones
    for (const node of this.graphNodes) {
      if (node.visible !== false) {
        this.drawNode(ctx, node);
      }
    }

    ctx.restore();
  }

  private drawGridPattern(ctx: CanvasRenderingContext2D): void {
    const colors = this.getThemeColors();
    const gridSize = 40;
    const startX = -this.panX / this.zoom - 1000;
    const startY = -this.panY / this.zoom - 1000;
    const endX = startX + 3000;
    const endY = startY + 3000;

    ctx.strokeStyle = colors.gridLine;
    ctx.lineWidth = 0.5;

    for (
      let x = Math.floor(startX / gridSize) * gridSize;
      x < endX;
      x += gridSize
    ) {
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
      ctx.stroke();
    }

    for (
      let y = Math.floor(startY / gridSize) * gridSize;
      y < endY;
      y += gridSize
    ) {
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
    }
  }

  private drawNode(ctx: CanvasRenderingContext2D, node: GraphNode): void {
    const colors = this.getThemeColors();
    const isDark = this.currentTheme === "dark";
    const isHovered = this.hoveredNode === node;
    const isSelected = this.selectedTable === node.id;
    const x = node.x;
    const y = node.y;
    const w = node.width;
    const radius = 10;

    // Get sorted fields (system fields first, then alphabetically)
    const fields = this.getSortedFields(node.table.inferredFields || []);
    const maxVisibleFields = 12;
    const visibleFields = fields.slice(0, maxVisibleFields);
    const hasMoreFields = fields.length > maxVisibleFields;

    // Calculate dynamic height
    const headerHeight = 44;
    const fieldRowHeight = 24;
    const padding = 12;
    const moreIndicatorHeight = hasMoreFields ? 28 : 0;
    const dynamicHeight =
      headerHeight +
      visibleFields.length * fieldRowHeight +
      padding +
      moreIndicatorHeight;

    // Update node height for hit detection
    node.height = dynamicHeight;

    // Shadow
    const shadowAlpha = isDark ? 0.4 : 0.08;
    const hoverShadowAlpha = isDark ? 0.5 : 0.15;
    ctx.shadowColor =
      isHovered || isSelected
        ? `rgba(235, 86, 1, ${hoverShadowAlpha})`
        : `rgba(0, 0, 0, ${shadowAlpha})`;
    ctx.shadowBlur = isHovered ? 16 : 8;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = isHovered ? 6 : 3;

    // Card background
    ctx.fillStyle = colors.nodeBg;
    ctx.beginPath();
    ctx.roundRect(x, y, w, dynamicHeight, radius);
    ctx.fill();

    // Border
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = isSelected
      ? colors.accentInteractive
      : isHovered
        ? colors.accent
        : colors.nodeBorder;
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.stroke();

    // Header background (flat color, no gradient)
    ctx.fillStyle = isSelected ? colors.accentInteractive : colors.nodeHeader;
    ctx.beginPath();
    ctx.roundRect(x, y, w, headerHeight, [radius, radius, 0, 0]);
    ctx.fill();

    // Header border
    ctx.strokeStyle = isSelected ? "rgba(255,255,255,0.1)" : colors.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + headerHeight);
    ctx.lineTo(x + w, y + headerHeight);
    ctx.stroke();

    // Table name
    ctx.fillStyle = isSelected ? "#ffffff" : colors.textPrimary;
    ctx.font =
      'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textBaseline = "middle";

    const tableName = node.table.name;
    const maxNameWidth = w - 100; // Leave room for field count
    let displayName = tableName;
    if (ctx.measureText(tableName).width > maxNameWidth) {
      while (
        ctx.measureText(displayName + "...").width > maxNameWidth &&
        displayName.length > 0
      ) {
        displayName = displayName.slice(0, -1);
      }
      displayName += "...";
    }
    ctx.fillText(displayName, x + 14, y + headerHeight / 2);

    // Field count badge
    const fieldCountText = `${fields.length} fields`;
    ctx.font = "11px -apple-system, BlinkMacSystemFont, sans-serif";
    const countWidth = ctx.measureText(fieldCountText).width + 14;
    ctx.fillStyle = isSelected
      ? "rgba(255,255,255,0.25)"
      : isDark
        ? "rgba(255,255,255,0.1)"
        : "rgba(0,0,0,0.06)";
    ctx.beginPath();
    ctx.roundRect(
      x + w - countWidth - 10,
      y + (headerHeight - 20) / 2,
      countWidth,
      20,
      10,
    );
    ctx.fill();
    ctx.fillStyle = isSelected ? "rgba(255,255,255,0.9)" : colors.textSecondary;
    ctx.textAlign = "center";
    ctx.fillText(
      fieldCountText,
      x + w - countWidth / 2 - 10,
      y + headerHeight / 2,
    );
    ctx.textAlign = "left";

    // Draw fields
    let fieldY = y + headerHeight + 8;

    for (const field of visibleFields) {
      const isSystemField = field.name.startsWith("_");
      const isPrimaryKey = field.name === "_id";
      const isReference = field.type.includes("Id<");

      // Field row background on hover
      if (isHovered) {
        ctx.fillStyle = isDark
          ? "rgba(255, 255, 255, 0.03)"
          : "rgba(0, 0, 0, 0.02)";
        ctx.fillRect(x + 4, fieldY - 6, w - 8, fieldRowHeight);
      }

      // Primary key icon
      if (isPrimaryKey) {
        this.drawKeyIcon(ctx, x + 12, fieldY + 2, isSelected, colors);
      }

      // Field name
      const nameX = isPrimaryKey ? x + 28 : x + 14;
      ctx.font = '12px "SF Mono", Monaco, "Cascadia Code", monospace';

      if (isSystemField) {
        ctx.fillStyle = colors.textMuted;
      } else if (isReference) {
        ctx.fillStyle = colors.accent;
      } else {
        ctx.fillStyle = colors.accentInteractive;
      }
      ctx.fillText(field.name, nameX, fieldY + 4);

      // Optional indicator
      if (field.optional) {
        const nameWidth = ctx.measureText(field.name).width;
        ctx.fillStyle = colors.warning;
        ctx.font = "10px -apple-system, sans-serif";
        ctx.fillText("?", nameX + nameWidth + 2, fieldY + 3);
      }

      // Field type (right-aligned)
      ctx.font = '11px "SF Mono", Monaco, "Cascadia Code", monospace';
      ctx.fillStyle = isSystemField ? colors.textMuted : colors.textSecondary;
      ctx.textAlign = "right";

      let typeText = field.type;
      // Truncate long types
      const maxTypeWidth = 80;
      if (ctx.measureText(typeText).width > maxTypeWidth) {
        while (
          ctx.measureText(typeText + "...").width > maxTypeWidth &&
          typeText.length > 0
        ) {
          typeText = typeText.slice(0, -1);
        }
        typeText += "...";
      }
      ctx.fillText(typeText, x + w - 12, fieldY + 4);
      ctx.textAlign = "left";

      fieldY += fieldRowHeight;
    }

    // "+N more fields" indicator
    if (hasMoreFields) {
      const moreCount = fields.length - maxVisibleFields;
      ctx.fillStyle = colors.bgSecondary;
      ctx.beginPath();
      ctx.roundRect(x + 4, fieldY, w - 8, 24, [0, 0, radius - 4, radius - 4]);
      ctx.fill();

      ctx.fillStyle = colors.textSecondary;
      ctx.font = "11px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        `+ ${moreCount} more field${moreCount > 1 ? "s" : ""}`,
        x + w / 2,
        fieldY + 14,
      );
      ctx.textAlign = "left";
    }
  }

  private getSortedFields(fields: SchemaField[]): SchemaField[] {
    const systemFields = ["_id", "_creationTime"];
    return [...fields].sort((a, b) => {
      const aIsSystem = systemFields.includes(a.name);
      const bIsSystem = systemFields.includes(b.name);
      if (aIsSystem && !bIsSystem) return -1;
      if (!aIsSystem && bIsSystem) return 1;
      if (aIsSystem && bIsSystem) {
        return systemFields.indexOf(a.name) - systemFields.indexOf(b.name);
      }
      return a.name.localeCompare(b.name);
    });
  }

  private drawKeyIcon(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    isSelected: boolean,
    colors: ReturnType<typeof this.getThemeColors>,
  ): void {
    ctx.save();
    ctx.fillStyle = isSelected ? colors.accentInteractive : colors.warning;

    // Draw a simple key shape
    ctx.beginPath();
    // Key head (circle)
    ctx.arc(x + 4, y, 4, 0, Math.PI * 2);
    ctx.fill();

    // Key stem
    ctx.fillRect(x + 7, y - 1, 6, 2);

    // Key teeth
    ctx.fillRect(x + 10, y - 1, 1, 3);
    ctx.fillRect(x + 12, y - 1, 1, 2);

    ctx.restore();
  }

  private drawEdge(
    ctx: CanvasRenderingContext2D,
    from: GraphNode,
    to: GraphNode,
    edge: GraphEdge,
  ): void {
    // Check if this edge is connected to the hovered node
    const isHighlighted: boolean =
      this.hoveredNode !== null &&
      (this.hoveredNode.id === edge.from || this.hoveredNode.id === edge.to);

    // Calculate smart attachment points based on relative positions
    const attachment = this.calculateAttachmentPoints(from, to);

    // Calculate bezier control points
    const distance = Math.sqrt(
      Math.pow(attachment.toX - attachment.fromX, 2) +
        Math.pow(attachment.toY - attachment.fromY, 2),
    );
    const curvature = Math.min(distance * 0.4, 100);

    let cp1x, cp1y, cp2x, cp2y;

    // Determine curve direction based on attachment side
    if (attachment.fromSide === "right") {
      cp1x = attachment.fromX + curvature;
      cp1y = attachment.fromY;
    } else if (attachment.fromSide === "left") {
      cp1x = attachment.fromX - curvature;
      cp1y = attachment.fromY;
    } else if (attachment.fromSide === "bottom") {
      cp1x = attachment.fromX;
      cp1y = attachment.fromY + curvature;
    } else {
      cp1x = attachment.fromX;
      cp1y = attachment.fromY - curvature;
    }

    if (attachment.toSide === "left") {
      cp2x = attachment.toX - curvature;
      cp2y = attachment.toY;
    } else if (attachment.toSide === "right") {
      cp2x = attachment.toX + curvature;
      cp2y = attachment.toY;
    } else if (attachment.toSide === "top") {
      cp2x = attachment.toX;
      cp2y = attachment.toY - curvature;
    } else {
      cp2x = attachment.toX;
      cp2y = attachment.toY + curvature;
    }

    // Draw shadow for highlighted edges
    if (isHighlighted) {
      ctx.save();
      ctx.shadowColor = "rgba(235, 86, 1, 0.3)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    // Draw the curve
    ctx.strokeStyle = isHighlighted ? "#EB5601" : "#8b7355";
    ctx.lineWidth = isHighlighted ? 2.5 : 1.5;

    // Use dashed line for inferred relationships
    if (edge.inferred) {
      ctx.setLineDash([6, 4]);
    } else {
      ctx.setLineDash([]);
    }

    ctx.beginPath();
    ctx.moveTo(attachment.fromX, attachment.fromY);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, attachment.toX, attachment.toY);
    ctx.stroke();

    ctx.setLineDash([]);

    if (isHighlighted) {
      ctx.restore();
    }

    // Draw arrow head
    this.drawArrowHead(
      ctx,
      cp2x,
      cp2y,
      attachment.toX,
      attachment.toY,
      isHighlighted,
    );

    // Draw edge label with background
    const midT = 0.5;
    const midX = this.bezierPoint(
      attachment.fromX,
      cp1x,
      cp2x,
      attachment.toX,
      midT,
    );
    const midY =
      this.bezierPoint(attachment.fromY, cp1y, cp2y, attachment.toY, midT) - 12;

    // Label background
    ctx.font = "10px -apple-system, BlinkMacSystemFont, sans-serif";
    const labelText = edge.fromField;
    const labelWidth = ctx.measureText(labelText).width + 10;
    const labelHeight = 16;

    ctx.fillStyle = isHighlighted
      ? "rgba(235, 86, 1, 0.1)"
      : "rgba(255, 255, 255, 0.95)";
    ctx.beginPath();
    ctx.roundRect(
      midX - labelWidth / 2,
      midY - labelHeight / 2,
      labelWidth,
      labelHeight,
      4,
    );
    ctx.fill();

    ctx.strokeStyle = isHighlighted ? "rgba(235, 86, 1, 0.3)" : "#e6e4e1";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Label text
    ctx.fillStyle = isHighlighted ? "#EB5601" : "#6b6b6b";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(labelText, midX, midY);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }

  private calculateAttachmentPoints(
    from: GraphNode,
    to: GraphNode,
  ): {
    fromX: number;
    fromY: number;
    fromSide: "left" | "right" | "top" | "bottom";
    toX: number;
    toY: number;
    toSide: "left" | "right" | "top" | "bottom";
  } {
    const fromCenterX = from.x + from.width / 2;
    const fromCenterY = from.y + from.height / 2;
    const toCenterX = to.x + to.width / 2;
    const toCenterY = to.y + to.height / 2;

    const dx = toCenterX - fromCenterX;
    const dy = toCenterY - fromCenterY;

    let fromSide: "left" | "right" | "top" | "bottom";
    let toSide: "left" | "right" | "top" | "bottom";
    let fromX: number, fromY: number, toX: number, toY: number;

    // Determine best sides based on relative positions
    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal connection
      if (dx > 0) {
        // To is to the right
        fromSide = "right";
        toSide = "left";
        fromX = from.x + from.width;
        fromY = fromCenterY;
        toX = to.x;
        toY = toCenterY;
      } else {
        // To is to the left
        fromSide = "left";
        toSide = "right";
        fromX = from.x;
        fromY = fromCenterY;
        toX = to.x + to.width;
        toY = toCenterY;
      }
    } else {
      // Vertical connection
      if (dy > 0) {
        // To is below
        fromSide = "bottom";
        toSide = "top";
        fromX = fromCenterX;
        fromY = from.y + from.height;
        toX = toCenterX;
        toY = to.y;
      } else {
        // To is above
        fromSide = "top";
        toSide = "bottom";
        fromX = fromCenterX;
        fromY = from.y;
        toX = toCenterX;
        toY = to.y + to.height;
      }
    }

    return { fromX, fromY, fromSide, toX, toY, toSide };
  }

  private drawArrowHead(
    ctx: CanvasRenderingContext2D,
    cpX: number,
    cpY: number,
    toX: number,
    toY: number,
    isHighlighted: boolean,
  ): void {
    // Calculate angle from control point to end point
    const angle = Math.atan2(toY - cpY, toX - cpX);
    const arrowSize = isHighlighted ? 10 : 8;

    ctx.fillStyle = isHighlighted ? "#EB5601" : "#8b7355";
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - arrowSize * Math.cos(angle - Math.PI / 6),
      toY - arrowSize * Math.sin(angle - Math.PI / 6),
    );
    ctx.lineTo(
      toX - arrowSize * Math.cos(angle + Math.PI / 6),
      toY - arrowSize * Math.sin(angle + Math.PI / 6),
    );
    ctx.closePath();
    ctx.fill();
  }

  private bezierPoint(
    p0: number,
    p1: number,
    p2: number,
    p3: number,
    t: number,
  ): number {
    const mt = 1 - t;
    return (
      mt * mt * mt * p0 +
      3 * mt * mt * t * p1 +
      3 * mt * t * t * p2 +
      t * t * t * p3
    );
  }

  private updateCodePanel(): void {
    const codeBlock = document.getElementById("codeBlock");
    const codeFilename = document.querySelector(".code-filename");

    if (codeBlock && this.selectedTable) {
      const table = this.config?.tables?.find(
        (t) => t.name === this.selectedTable,
      );
      const docs = this.config?.allDocuments?.[this.selectedTable] || [];

      if (table) {
        const schema: any = {
          table: this.selectedTable,
          documentCount: table.documentCount,
          fields: {},
        };

        if (table.inferredFields) {
          for (const field of table.inferredFields) {
            schema.fields[field.name] = {
              type: field.type,
              required: !field.optional,
            };
          }
        }

        if (docs.length > 0) {
          schema.sample = docs[0];
        }

        codeBlock.innerHTML = this.syntaxHighlight(
          JSON.stringify(schema, null, 2),
        );
      }
    }

    if (codeFilename && this.selectedTable) {
      codeFilename.textContent = `${this.selectedTable}.json`;
    }
  }

  // ===== Toolbar Actions =====

  private savePositionState(): void {
    // Don't save if positions haven't changed
    const state: PositionState = {
      nodes: this.graphNodes.map((n) => ({ id: n.id, x: n.x, y: n.y })),
      panX: this.panX,
      panY: this.panY,
      zoom: this.zoom,
    };

    // Remove any redo history
    if (this.historyIndex < this.positionHistory.length - 1) {
      this.positionHistory = this.positionHistory.slice(
        0,
        this.historyIndex + 1,
      );
    }

    // Add new state
    this.positionHistory.push(state);

    // Limit history size
    if (this.positionHistory.length > this.maxHistorySize) {
      this.positionHistory.shift();
    } else {
      this.historyIndex++;
    }

    this.updateUndoRedoButtons();
  }

  private undo(): void {
    if (this.historyIndex <= 0) return;

    this.historyIndex--;
    this.restorePositionState(this.positionHistory[this.historyIndex]);
    this.updateUndoRedoButtons();
  }

  private redo(): void {
    if (this.historyIndex >= this.positionHistory.length - 1) return;

    this.historyIndex++;
    this.restorePositionState(this.positionHistory[this.historyIndex]);
    this.updateUndoRedoButtons();
  }

  private restorePositionState(state: PositionState): void {
    for (const nodePos of state.nodes) {
      const node = this.graphNodes.find((n) => n.id === nodePos.id);
      if (node) {
        node.x = nodePos.x;
        node.y = nodePos.y;
      }
    }
    this.panX = state.panX;
    this.panY = state.panY;
    this.zoom = state.zoom;
    this.updateZoomDisplay();
    this.drawGraph();
  }

  private updateUndoRedoButtons(): void {
    const undoBtn = document.getElementById("undoBtn") as HTMLButtonElement;
    const redoBtn = document.getElementById("redoBtn") as HTMLButtonElement;

    if (undoBtn) undoBtn.disabled = this.historyIndex <= 0;
    if (redoBtn)
      redoBtn.disabled = this.historyIndex >= this.positionHistory.length - 1;
  }

  private fitToView(): void {
    if (this.graphNodes.length === 0) return;

    // Calculate bounding box of visible nodes
    const visibleNodes = this.graphNodes.filter((n) => n.visible !== false);
    if (visibleNodes.length === 0) return;

    const padding = 60;
    const minX = Math.min(...visibleNodes.map((n) => n.x)) - padding;
    const maxX = Math.max(...visibleNodes.map((n) => n.x + n.width)) + padding;
    const minY = Math.min(...visibleNodes.map((n) => n.y)) - padding;
    const maxY = Math.max(...visibleNodes.map((n) => n.y + n.height)) + padding;

    const graphWidth = maxX - minX;
    const graphHeight = maxY - minY;

    if (!this.canvas) return;
    const canvasWidth = this.canvas.width / this.dpr;
    const canvasHeight = this.canvas.height / this.dpr;

    // Calculate zoom to fit
    const scaleX = canvasWidth / graphWidth;
    const scaleY = canvasHeight / graphHeight;
    this.zoom = Math.min(scaleX, scaleY, 1.5); // Max 150%
    this.zoom = Math.max(this.zoom, 0.25); // Min 25%

    // Center the graph
    this.panX = (canvasWidth - graphWidth * this.zoom) / 2 - minX * this.zoom;
    this.panY = (canvasHeight - graphHeight * this.zoom) / 2 - minY * this.zoom;

    this.updateZoomDisplay();
    this.drawGraph();
  }

  private autoArrange(): void {
    // Recalculate graph layout
    this.calculateGraphLayout();
    // Fit to view after arranging so all tables are visible
    this.fitToView();
    this.savePositionState();
  }

  private updateZoomDisplay(): void {
    const zoomLevel = document.getElementById("zoomLevel");
    const zoomDisplay = document.getElementById("zoomDisplay");
    const percentage = `${Math.round(this.zoom * 100)}%`;

    if (zoomLevel) zoomLevel.textContent = percentage;
    if (zoomDisplay) zoomDisplay.textContent = percentage;
  }

  private toggleCodePanel(): void {
    this.showCodePanel = !this.showCodePanel;
    const container = document.getElementById("sidebarContainer");
    const btn = document.getElementById("viewCodeBtn");

    if (container) {
      container.classList.toggle("hidden", !this.showCodePanel);
    }
    if (btn) {
      btn.classList.toggle("active", this.showCodePanel);
    }

    // Resize canvas after panel toggle
    setTimeout(() => this.resizeCanvas(), 50);
  }

  private toggleExportMenu(): void {
    this.showExportMenu = !this.showExportMenu;
    this.showFilterDropdown = false;
    this.renderDropdowns();
  }

  private toggleFilterDropdown(): void {
    this.showFilterDropdown = !this.showFilterDropdown;
    this.showExportMenu = false;
    this.renderDropdowns();
  }

  private renderDropdowns(): void {
    // Remove existing dropdowns
    document.getElementById("exportMenu")?.remove();
    document.getElementById("filterMenu")?.remove();

    // Add new dropdowns
    const app = document.querySelector(".graph-view");
    if (app) {
      if (this.showExportMenu) {
        app.insertAdjacentHTML("beforeend", this.renderExportMenu());
        this.setupExportMenuEvents();
      }
      if (this.showFilterDropdown) {
        app.insertAdjacentHTML("beforeend", this.renderFilterDropdown());
        this.setupFilterMenuEvents();
      }
    }
  }

  private setupExportMenuEvents(): void {
    document.getElementById("exportJson")?.addEventListener("click", () => {
      this.exportSchema("json");
      this.showExportMenu = false;
      this.renderDropdowns();
    });

    document.getElementById("exportTs")?.addEventListener("click", () => {
      this.exportSchema("typescript");
      this.showExportMenu = false;
      this.renderDropdowns();
    });

    document.getElementById("exportPng")?.addEventListener("click", () => {
      this.exportAsPng();
      this.showExportMenu = false;
      this.renderDropdowns();
    });

    // Close on outside click
    setTimeout(() => {
      document.addEventListener("click", this.handleOutsideClick.bind(this), {
        once: true,
      });
    }, 0);
  }

  private setupFilterMenuEvents(): void {
    document.getElementById("filterClose")?.addEventListener("click", () => {
      this.showFilterDropdown = false;
      this.renderDropdowns();
    });

    document.getElementById("filterApply")?.addEventListener("click", () => {
      this.applyFilters();
    });

    document.getElementById("filterClear")?.addEventListener("click", () => {
      this.clearFilters();
    });
  }

  private handleOutsideClick(e: MouseEvent): void {
    const exportMenu = document.getElementById("exportMenu");
    const exportBtn = document.getElementById("exportBtn");
    const filterMenu = document.getElementById("filterMenu");
    const filterBtn = document.getElementById("filterBtn");

    if (
      exportMenu &&
      !exportMenu.contains(e.target as Node) &&
      !exportBtn?.contains(e.target as Node)
    ) {
      this.showExportMenu = false;
      this.renderDropdowns();
    }

    if (
      filterMenu &&
      !filterMenu.contains(e.target as Node) &&
      !filterBtn?.contains(e.target as Node)
    ) {
      this.showFilterDropdown = false;
      this.renderDropdowns();
    }
  }

  private exportSchema(format: "json" | "typescript"): void {
    const tables = this.config?.tables || [];
    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === "json") {
      const schema: Record<string, any> = {};
      for (const table of tables) {
        schema[table.name] = {
          documentCount: table.documentCount,
          fields: (table.inferredFields || []).reduce(
            (acc, f) => {
              acc[f.name] = { type: f.type, required: !f.optional };
              return acc;
            },
            {} as Record<string, any>,
          ),
        };
      }
      content = JSON.stringify(schema, null, 2);
      filename = "convex-schema.json";
      mimeType = "application/json";
    } else {
      // TypeScript Convex schema format
      const lines = [
        'import { defineSchema, defineTable } from "convex/server";',
        'import { v } from "convex/values";',
        "",
        "export default defineSchema({",
      ];

      for (const table of tables) {
        const fields = (table.inferredFields || [])
          .filter((f) => !f.name.startsWith("_"))
          .map(
            (f) =>
              `    ${f.name}: ${this.toConvexValidator(f.type)}${f.optional ? ".optional()" : ""},`,
          )
          .join("\n");

        lines.push(`  ${table.name}: defineTable({`);
        if (fields) lines.push(fields);
        lines.push("  }),");
      }

      lines.push("});");
      content = lines.join("\n");
      filename = "schema.ts";
      mimeType = "text/typescript";
    }

    this.downloadFile(content, filename, mimeType);
  }

  private toConvexValidator(type: string): string {
    // Convert inferred types to Convex validators
    if (type.startsWith("Id<")) return `v.id(${type.slice(3, -1)})`;
    if (type === "string") return "v.string()";
    if (type === "number") return "v.number()";
    if (type === "boolean") return "v.boolean()";
    if (type === "null") return "v.null()";
    if (type.startsWith("array")) return "v.array(v.any())";
    if (type === "object") return "v.object({})";
    return "v.any()";
  }

  private exportAsPng(): void {
    if (!this.canvas) return;

    const link = document.createElement("a");
    link.download = "convex-schema-graph.png";
    link.href = this.canvas.toDataURL("image/png");
    link.click();
  }

  private downloadFile(
    content: string,
    filename: string,
    mimeType: string,
  ): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  private applyFilters(): void {
    const tableName =
      (document.getElementById("filterTableName") as HTMLInputElement)?.value ||
      "";
    const fieldName =
      (document.getElementById("filterFieldName") as HTMLInputElement)?.value ||
      "";
    const fieldType =
      (document.getElementById("filterFieldType") as HTMLSelectElement)
        ?.value || "";
    const showEmpty =
      (document.getElementById("filterShowEmpty") as HTMLInputElement)
        ?.checked ?? true;

    this.filterState = { tableName, fieldName, fieldType, showEmpty };

    // Apply filter to graph nodes
    for (const node of this.graphNodes) {
      let visible = true;

      // Table name filter
      if (
        tableName &&
        !node.table.name.toLowerCase().includes(tableName.toLowerCase())
      ) {
        visible = false;
      }

      // Empty tables filter
      if (!showEmpty && node.table.documentCount === 0) {
        visible = false;
      }

      // Field filters
      if (visible && (fieldName || fieldType)) {
        const fields = node.table.inferredFields || [];
        const hasMatch = fields.some((f) => {
          const nameMatch =
            !fieldName ||
            f.name.toLowerCase().includes(fieldName.toLowerCase());
          const typeMatch =
            !fieldType ||
            f.type.toLowerCase().includes(fieldType.toLowerCase());
          return nameMatch && typeMatch;
        });
        if (!hasMatch) visible = false;
      }

      node.visible = visible;
    }

    this.drawGraph();
    this.showFilterDropdown = false;
    this.renderDropdowns();
  }

  private clearFilters(): void {
    this.filterState = {
      tableName: "",
      fieldName: "",
      fieldType: "",
      showEmpty: true,
    };

    // Reset filter inputs
    const tableNameInput = document.getElementById(
      "filterTableName",
    ) as HTMLInputElement;
    const fieldNameInput = document.getElementById(
      "filterFieldName",
    ) as HTMLInputElement;
    const fieldTypeSelect = document.getElementById(
      "filterFieldType",
    ) as HTMLSelectElement;
    const showEmptyCheckbox = document.getElementById(
      "filterShowEmpty",
    ) as HTMLInputElement;

    if (tableNameInput) tableNameInput.value = "";
    if (fieldNameInput) fieldNameInput.value = "";
    if (fieldTypeSelect) fieldTypeSelect.value = "";
    if (showEmptyCheckbox) showEmptyCheckbox.checked = true;

    // Show all nodes
    for (const node of this.graphNodes) {
      node.visible = true;
    }

    this.drawGraph();
  }

  private setupEventListeners(): void {
    // View toggle
    document.querySelectorAll(".view-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const view = (e.currentTarget as HTMLElement).dataset.view as ViewMode;
        if (view && view !== this.viewMode) {
          this.viewMode = view;
          this.render();
        }
      });
    });

    document
      .getElementById("refreshBtn")
      ?.addEventListener("click", () => this.refresh());
    document
      .getElementById("themeToggle")
      ?.addEventListener("click", () => this.toggleTheme());

    // Shortcuts modal
    document
      .getElementById("shortcutsBtn")
      ?.addEventListener("click", () => this.showShortcutsModal());
    document
      .getElementById("shortcutsClose")
      ?.addEventListener("click", () => this.hideShortcutsModal());
    document
      .getElementById("shortcutsModal")
      ?.addEventListener("click", (e) => {
        if ((e.target as HTMLElement).id === "shortcutsModal") {
          this.hideShortcutsModal();
        }
      });

    // Toolbar buttons (graph view)
    if (this.viewMode === "graph") {
      document
        .getElementById("viewCodeBtn")
        ?.addEventListener("click", () => this.toggleCodePanel());
      document.getElementById("exportBtn")?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleExportMenu();
      });
      document
        .getElementById("autoArrangeBtn")
        ?.addEventListener("click", () => this.autoArrange());
      document
        .getElementById("undoBtn")
        ?.addEventListener("click", () => this.undo());
      document
        .getElementById("redoBtn")
        ?.addEventListener("click", () => this.redo());
      document.getElementById("filterBtn")?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleFilterDropdown();
      });

      // Toolbar zoom controls
      document
        .getElementById("zoomInToolbar")
        ?.addEventListener("click", () => {
          this.zoom = Math.min(2, this.zoom * 1.2);
          this.updateZoomDisplay();
          this.drawGraph();
        });
      document
        .getElementById("zoomOutToolbar")
        ?.addEventListener("click", () => {
          this.zoom = Math.max(0.25, this.zoom / 1.2);
          this.updateZoomDisplay();
          this.drawGraph();
        });
      document
        .getElementById("fitViewBtn")
        ?.addEventListener("click", () => this.fitToView());

      // Enhanced sidebar events
      document
        .getElementById("sectionHeaderTables")
        ?.addEventListener("click", () => {
          this.toggleSidebarSection("tables");
        });
      document
        .getElementById("sectionHeaderConvex")
        ?.addEventListener("click", () => {
          this.toggleSidebarSection("convex");
        });
      document.getElementById("sortBtn")?.addEventListener("click", () => {
        this.cycleSortOrder();
      });

      const graphSearchInput = document.getElementById(
        "graphSidebarSearch",
      ) as HTMLInputElement;
      graphSearchInput?.addEventListener("input", (e) => {
        this.searchQuery = (e.target as HTMLInputElement).value.toLowerCase();
        this.updateSidebarTableList();
      });

      // Graph sidebar toggle (left sidebar)
      document
        .getElementById("graphSidebarToggle")
        ?.addEventListener("click", () => {
          this.graphSidebarCollapsed = !this.graphSidebarCollapsed;
          const sidebar = document.getElementById("enhancedSidebar");
          const toggle = document.getElementById("graphSidebarToggle");
          if (sidebar) {
            sidebar.classList.toggle("collapsed", this.graphSidebarCollapsed);
          }
          if (toggle) {
            toggle.title = this.graphSidebarCollapsed
              ? "Expand sidebar"
              : "Collapse sidebar";
            // Update the arrow direction
            const svg = toggle.querySelector("svg path");
            if (svg) {
              svg.setAttribute(
                "d",
                this.graphSidebarCollapsed ? "M5 2L10 7L5 12" : "M9 2L4 7L9 12",
              );
            }
          }
          // Redraw graph (canvas size changed)
          setTimeout(() => this.resizeCanvas(), 50);
        });

      // Setup sidebar table click events
      this.setupSidebarTableEvents();
    }

    // Sidebar toggle
    document.getElementById("sidebarToggle")?.addEventListener("click", () => {
      this.sidebarCollapsed = !this.sidebarCollapsed;
      const container = document.getElementById("sidebarContainer");
      const toggle = document.getElementById("sidebarToggle");
      if (container) {
        container.classList.toggle("collapsed", this.sidebarCollapsed);
      }
      if (toggle) {
        toggle.title = this.sidebarCollapsed ? "Show panel" : "Hide panel";
      }
      // Redraw graph if in graph mode (canvas size changed)
      if (this.viewMode === "graph") {
        setTimeout(() => this.resizeCanvas(), 50);
      }
    });

    // Sidebar resize
    this.setupSidebarResize();

    if (this.viewMode === "list") {
      document
        .getElementById("prevPage")
        ?.addEventListener("click", () => this.changePage(-1));
      document
        .getElementById("nextPage")
        ?.addEventListener("click", () => this.changePage(1));

      const searchInput = document.getElementById(
        "searchInput",
      ) as HTMLInputElement;
      searchInput?.addEventListener("input", (e) => {
        this.searchQuery = (e.target as HTMLInputElement).value.toLowerCase();
        this.renderTableList();
      });
    }
  }

  private setupSidebarResize(): void {
    const resizeHandle = document.getElementById("resizeHandle");
    if (!resizeHandle) return;

    let startX = 0;
    let startWidth = 0;

    const onMouseMove = (e: MouseEvent) => {
      if (!this.isResizingSidebar) return;

      const delta = e.clientX - startX;
      const newWidth = Math.max(180, Math.min(600, startWidth + delta));

      if (this.viewMode === "list") {
        this.sidebarWidth = newWidth;
        const sidebar = document.querySelector(".sidebar") as HTMLElement;
        if (sidebar) sidebar.style.width = newWidth + "px";
      } else {
        this.codePanelWidth = newWidth;
        const codePanel = document.getElementById("codePanel");
        if (codePanel) codePanel.style.width = newWidth + "px";
      }
    };

    const onMouseUp = () => {
      this.isResizingSidebar = false;
      resizeHandle.classList.remove("dragging");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);

      // Redraw graph if in graph mode (canvas size changed)
      if (this.viewMode === "graph") {
        this.resizeCanvas();
      }
    };

    resizeHandle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      this.isResizingSidebar = true;
      startX = e.clientX;
      startWidth =
        this.viewMode === "list" ? this.sidebarWidth : this.codePanelWidth;
      resizeHandle.classList.add("dragging");
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });
  }

  private resizeCanvas(): void {
    if (!this.canvas || !this.canvas.parentElement || !this.ctx) return;

    const width = this.canvas.parentElement.clientWidth;
    const height = this.canvas.parentElement.clientHeight;
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.width = width + "px";
    this.canvas.style.height = height + "px";
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(this.dpr, this.dpr);
    this.drawGraph();
  }

  private setupKeyboardShortcuts(): void {
    document.addEventListener("keydown", (e) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        if (e.key === "Escape") {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      switch (e.key) {
        case "r":
          this.refresh();
          break;
        case "g":
          this.viewMode = this.viewMode === "graph" ? "list" : "graph";
          this.render();
          break;
        case "b":
          // Toggle sidebar
          document.getElementById("sidebarToggle")?.click();
          break;
        case "c":
          // Toggle code panel (graph view only)
          if (this.viewMode === "graph") {
            this.toggleCodePanel();
          }
          break;
        case "a":
          // Auto arrange (graph view only)
          if (this.viewMode === "graph") {
            this.autoArrange();
          }
          break;
        case "f":
          // Fit to view (graph view only)
          if (this.viewMode === "graph") {
            this.fitToView();
          }
          break;
        case "z":
          if ((e.metaKey || e.ctrlKey) && this.viewMode === "graph") {
            e.preventDefault();
            if (e.shiftKey) {
              this.redo();
            } else {
              this.undo();
            }
          }
          break;
        case "+":
        case "=":
          if (this.viewMode === "graph") {
            this.zoom = Math.min(2, this.zoom * 1.2);
            this.updateZoomDisplay();
            this.drawGraph();
          }
          break;
        case "-":
          if (this.viewMode === "graph") {
            this.zoom = Math.max(0.25, this.zoom / 1.2);
            this.updateZoomDisplay();
            this.drawGraph();
          }
          break;
        case "ArrowLeft":
          if (this.viewMode === "list") this.changePage(-1);
          break;
        case "ArrowRight":
          if (this.viewMode === "list") this.changePage(1);
          break;
        case "ArrowUp":
          e.preventDefault();
          if (this.viewMode === "list") this.navigateTable(-1);
          break;
        case "ArrowDown":
          e.preventDefault();
          if (this.viewMode === "list") this.navigateTable(1);
          break;
        case "/":
          e.preventDefault();
          document.getElementById("searchInput")?.focus();
          break;
      }
    });
  }

  // List view methods
  private renderTableList(): void {
    const tableList = document.getElementById("tableList");
    if (!tableList) return;

    const tables = this.config?.tables || [];
    const filtered = tables.filter((t) =>
      t.name.toLowerCase().includes(this.searchQuery),
    );

    if (filtered.length === 0) {
      tableList.innerHTML = `
        <li class="empty-state" style="padding: 30px 20px;">
          <p>${tables.length === 0 ? "No tables found" : "No matching tables"}</p>
        </li>
      `;
      return;
    }

    tableList.innerHTML = filtered
      .map(
        (t) => `
      <li class="table-item ${t.name === this.selectedTable ? "active" : ""}" 
          data-table="${t.name}"
          title="Click to view ${t.name} schema and documents${t.hasIndexes ? " (indexed)" : ""}">
        <span class="table-name">
          <svg class="table-icon" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="1" y="1" width="12" height="12" rx="2"/>
            <path d="M1 5H13M5 5V13"/>
          </svg>
          ${t.name}
        </span>
        <span class="table-count" title="${t.documentCount.toLocaleString()} documents">${this.formatCount(t.documentCount)}</span>
      </li>
    `,
      )
      .join("");

    tableList.querySelectorAll(".table-item").forEach((item) => {
      item.addEventListener("click", () => {
        const tableName = (item as HTMLElement).dataset.table;
        if (tableName) this.selectTable(tableName);
      });
    });
  }

  private formatCount(count: number | undefined): string {
    if (!count) return "0";
    if (count >= 1000000) return (count / 1000000).toFixed(1) + "M";
    if (count >= 1000) return (count / 1000).toFixed(1) + "k";
    return count.toString();
  }

  private navigateTable(direction: number): void {
    const tables = this.config?.tables || [];
    if (tables.length === 0) return;

    const currentIndex = tables.findIndex((t) => t.name === this.selectedTable);
    let newIndex = currentIndex + direction;

    if (newIndex < 0) newIndex = tables.length - 1;
    if (newIndex >= tables.length) newIndex = 0;

    this.selectTable(tables[newIndex].name);
  }

  private selectTable(tableName: string): void {
    this.selectedTable = tableName;
    this.currentPage = 1;

    if (this.viewMode === "list") {
      this.renderTableList();
      // Re-render the list view content with the new table
      const listViewContent = document.getElementById("listViewContent");
      if (listViewContent) {
        listViewContent.innerHTML = this.renderListViewContent();
        this.setupListViewEventListeners();
      }
    } else {
      this.drawGraph();
      this.updateCodePanel();
    }
  }

  private setupListViewEventListeners(): void {
    // Pagination buttons
    const prevBtn = document.getElementById("prevPage");
    const nextBtn = document.getElementById("nextPage");
    if (prevBtn) {
      prevBtn.addEventListener("click", () => this.changePage(-1));
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", () => this.changePage(1));
    }
  }

  private renderSchema(tableName: string, tableInfo?: TableInfo): void {
    const panel = document.getElementById("schemaPanel");
    if (!panel) return;

    const fields = tableInfo?.inferredFields || [];
    const docCount = tableInfo?.documentCount || 0;

    panel.innerHTML = `
      <div class="schema-title">${tableName}</div>
      <div class="schema-subtitle">
        ${this.formatCount(docCount)} documents
        ${tableInfo?.hasIndexes ? " • Has indexes" : ""}
      </div>

      <div class="schema-grid">
        <div class="schema-card">
          <div class="schema-card-header">
            <span>Inferred Schema</span>
            <span class="count">${fields.length} fields</span>
          </div>
          <div class="schema-card-body">
            ${this.renderFields(fields)}
          </div>
        </div>
      </div>
    `;
  }

  private renderFields(fields: SchemaField[]): string {
    if (!fields || fields.length === 0) {
      return '<p style="color: var(--text-secondary); padding: 12px;">No schema data available</p>';
    }

    const systemFields = ["_id", "_creationTime"];
    const sortedFields = [...fields].sort((a, b) => {
      const aIsSystem = systemFields.includes(a.name);
      const bIsSystem = systemFields.includes(b.name);
      if (aIsSystem && !bIsSystem) return -1;
      if (!aIsSystem && bIsSystem) return 1;
      return a.name.localeCompare(b.name);
    });

    return sortedFields
      .map(
        (f) => `
      <div class="field-row ${systemFields.includes(f.name) ? "field-system" : ""}">
        <span>
          <span class="field-name">${f.name}</span>
          ${f.optional ? '<span class="field-optional">?</span>' : ""}
        </span>
        <span class="field-type">${f.type}</span>
      </div>
    `,
      )
      .join("");
  }

  private renderDocuments(docs: Document[]): void {
    const thead = document.getElementById("docTableHead");
    const tbody = document.getElementById("docTableBody");
    if (!thead || !tbody) return;

    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    const paginatedDocs = docs.slice(start, end);
    const totalPages = Math.ceil(docs.length / this.pageSize);

    if (paginatedDocs.length === 0) {
      thead.innerHTML = "";
      tbody.innerHTML =
        '<tr><td colspan="100" class="empty-state">No documents found</td></tr>';
      return;
    }

    const keys = [...new Set(paginatedDocs.flatMap((d) => Object.keys(d)))];
    keys.sort((a, b) => {
      const aIsSystem = a.startsWith("_");
      const bIsSystem = b.startsWith("_");
      if (aIsSystem && !bIsSystem) return -1;
      if (!aIsSystem && bIsSystem) return 1;
      return a.localeCompare(b);
    });

    thead.innerHTML = `<tr>${keys.map((k) => `<th>${k}</th>`).join("")}</tr>`;
    tbody.innerHTML = paginatedDocs
      .map(
        (doc) => `
      <tr>
        ${keys
          .map((k) => {
            const value = doc[k];
            const isId = k === "_id";
            const isNull = value === null || value === undefined;
            const classes = [isId ? "id-cell" : "", isNull ? "null-value" : ""]
              .filter(Boolean)
              .join(" ");
            return `<td class="${classes}">${this.formatValue(value)}</td>`;
          })
          .join("")}
      </tr>
    `,
      )
      .join("");

    const pageInfo = document.getElementById("pageInfo");
    if (pageInfo) {
      pageInfo.textContent = `Page ${this.currentPage} of ${totalPages || 1}`;
    }
    (document.getElementById("prevPage") as HTMLButtonElement).disabled =
      this.currentPage <= 1;
    (document.getElementById("nextPage") as HTMLButtonElement).disabled =
      this.currentPage >= totalPages;
  }

  private formatValue(value: unknown): string {
    if (value === null || value === undefined)
      return '<span class="null-value">null</span>';
    if (typeof value === "object") {
      const str = JSON.stringify(value);
      return str.length > 50 ? str.slice(0, 50) + "..." : str;
    }
    if (typeof value === "string" && value.length > 50) {
      return value.slice(0, 50) + "...";
    }
    return String(value);
  }

  private changePage(delta: number): void {
    const tableInfo = this.config?.tables?.find(
      (t) => t.name === this.selectedTable,
    );
    const docs =
      this.config?.allDocuments?.[this.selectedTable || ""] ||
      tableInfo?.documents ||
      [];
    const totalPages = Math.ceil(docs.length / this.pageSize);

    const newPage = this.currentPage + delta;
    if (newPage < 1 || newPage > totalPages) return;

    this.currentPage = newPage;

    // Update just the documents table and pagination
    const tableWrapper = document.getElementById("documentsTableWrapper");
    if (tableWrapper) {
      tableWrapper.innerHTML = this.renderDocumentsTable(docs);
    }

    // Update pagination bar
    const paginationBar = document.querySelector(".pagination-bar");
    if (paginationBar) {
      paginationBar.outerHTML = this.renderPaginationBar(docs);
      this.setupListViewEventListeners();
    }
  }

  private refresh(): void {
    if (this.viewMode === "graph") {
      this.calculateGraphLayout();
      this.drawGraph();
    } else if (this.selectedTable) {
      // Re-render the list view content
      const listViewContent = document.getElementById("listViewContent");
      if (listViewContent) {
        listViewContent.innerHTML = this.renderListViewContent();
        this.setupListViewEventListeners();
      }
    }
  }
}

// Initialize app
new SchemaBrowserApp();
