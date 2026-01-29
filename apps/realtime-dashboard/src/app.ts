/**
 * Realtime Dashboard Application
 *
 * Live data visualizations for Convex databases.
 * Receives data from the MCP server via injected config.
 */

interface MetricConfig {
  name: string;
  table: string;
  aggregation: 'count' | 'sum' | 'avg' | 'min' | 'max';
  field?: string;
  filter?: string;
  value?: number;
  documentCount?: number;
}

interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'table';
  title: string;
  table: string;
  xField?: string;
  yField?: string;
  groupBy?: string;
}

interface Document {
  _id: string;
  _creationTime: number;
  [key: string]: unknown;
}

interface TableInfo {
  name: string;
  documentCount: number;
}

interface AppConfig {
  deploymentUrl: string | null;
  metrics: MetricConfig[];
  charts: ChartConfig[];
  refreshInterval: number;
  allDocuments?: Record<string, Document[]>;
  tables?: TableInfo[];
}

// Extend window for config injection
declare global {
  interface Window {
    __CONVEX_CONFIG__?: AppConfig;
  }
}

class RealtimeDashboardApp {
  private config: AppConfig | null = null;
  private refreshTimer: number | null = null;
  private isConnected = true;
  private currentTheme: 'light' | 'dark' = 'light';

  constructor() {
    this.init();
  }

  private init(): void {
    // Initialize theme first
    this.initTheme();

    // Get config from window (injected by server) or URL params
    if (window.__CONVEX_CONFIG__) {
      this.config = window.__CONVEX_CONFIG__;
    } else {
      const params = new URLSearchParams(window.location.search);
      const configParam = params.get('config');
      if (configParam) {
        try {
          this.config = JSON.parse(decodeURIComponent(configParam));
        } catch (e) {
          console.error('Failed to parse config:', e);
        }
      }
    }

    this.isConnected = !!this.config?.deploymentUrl;
    this.render();
    this.startAutoRefresh();
  }

  private initTheme(): void {
    // Check localStorage for saved theme preference
    const savedTheme = localStorage.getItem('convex-dashboard-theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      this.currentTheme = savedTheme;
    } else {
      // Check system preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        this.currentTheme = 'light'; // Keep light as default even if system prefers dark
      }
    }
    this.applyTheme();
  }

  private applyTheme(): void {
    document.documentElement.setAttribute('data-theme', this.currentTheme);
    localStorage.setItem('convex-dashboard-theme', this.currentTheme);
  }

  private toggleTheme(): void {
    this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.applyTheme();

    // Update toggle button icon
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
      themeIcon.textContent = this.currentTheme === 'light' ? '◐' : '◑';
    }
  }

  private render(): void {
    const app = document.getElementById('app');
    if (!app) return;

    const deploymentUrl = this.config?.deploymentUrl || 'Not connected';

    app.innerHTML = `
      <div class="header">
        <h1>
          <span class="status-dot ${this.isConnected ? '' : 'disconnected'}" id="statusDot"></span>
          Realtime Dashboard
        </h1>
        <div class="header-right">
          <span class="deployment-url">${deploymentUrl}</span>
          <span class="last-update" id="lastUpdate"></span>
          <button class="theme-toggle-btn" id="themeToggle" title="Toggle dark mode">
            <span id="themeIcon">${this.currentTheme === 'light' ? '◐' : '◑'}</span>
          </button>
        </div>
      </div>

      <div class="metrics-grid" id="metricsGrid"></div>
      <div class="charts-grid" id="chartsGrid"></div>
    `;

    // Set up theme toggle handler
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => this.toggleTheme());
    }

    this.renderMetrics();
    this.renderCharts();
    this.updateTimestamp();
  }

  private renderMetrics(): void {
    const grid = document.getElementById('metricsGrid');
    if (!grid) return;

    const metrics = this.config?.metrics || [];

    if (metrics.length === 0) {
      // Show message if no metrics
      grid.innerHTML = `
        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-label">No Metrics Configured</span>
          </div>
          <div class="metric-value">--</div>
          <div class="metric-change neutral">Add metrics via MCP tool parameters</div>
        </div>
      `;
      return;
    }

    grid.innerHTML = metrics
      .map(
        (m) => `
      <div class="metric-card">
        <div class="metric-header">
          <span class="metric-label">${m.name}</span>
          <span class="metric-icon">${this.getMetricIcon(m.aggregation)}</span>
        </div>
        <div class="metric-value">${this.formatNumber(m.value || 0)}</div>
        <div class="metric-change neutral">
          ${m.documentCount !== undefined ? `${m.documentCount} documents` : ''}
        </div>
        <div class="metric-source">${m.table} / ${m.aggregation}${m.field ? `(${m.field})` : ''}</div>
      </div>
    `
      )
      .join('');
  }

  private getMetricIcon(aggregation: string): string {
    const icons: Record<string, string> = {
      count: '#',
      sum: 'Σ',
      avg: 'x̄',
      min: '↓',
      max: '↑',
    };
    return icons[aggregation] || '#';
  }

  private formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    if (Number.isInteger(num)) return num.toLocaleString();
    return num.toFixed(2);
  }

  private renderCharts(): void {
    const grid = document.getElementById('chartsGrid');
    if (!grid) return;

    const charts = this.config?.charts || [];
    const allDocuments = this.config?.allDocuments || {};

    // Always show recent activity table
    const activityChart = this.renderActivityTable(allDocuments);

    if (charts.length === 0) {
      // Show tables overview and activity
      grid.innerHTML = `
        ${this.renderTablesOverview()}
        ${activityChart}
      `;
      return;
    }

    // Render configured charts plus activity
    grid.innerHTML =
      charts
        .map((c, i) => {
          const data = allDocuments[c.table] || [];
          return `
        <div class="chart-card">
          <div class="chart-header">
            <span class="chart-title">${c.title}</span>
            <span class="chart-subtitle">${data.length} documents</span>
          </div>
          <div class="chart-container" id="chart-${i}">
            ${this.renderChartContent(c, data)}
          </div>
        </div>
      `;
        })
        .join('') + activityChart;
  }

  private renderTablesOverview(): string {
    const tables = this.config?.tables || [];

    if (tables.length === 0) {
      return '';
    }

    const maxCount = Math.max(...tables.map((t) => t.documentCount), 1);

    return `
      <div class="chart-card">
        <div class="chart-header">
          <span class="chart-title">Tables Overview</span>
        </div>
        <div class="chart-container">
          <div class="bar-chart">
            ${tables
              .map(
                (t) => `
              <div class="bar" style="height: ${(t.documentCount / maxCount) * 100}%" data-value="${t.documentCount}">
                <span class="bar-label">${t.name}</span>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      </div>
    `;
  }

  private renderChartContent(chart: ChartConfig, data: Document[]): string {
    switch (chart.type) {
      case 'bar':
        return this.renderBarChart(data, chart);
      case 'line':
        return this.renderLineChart(data, chart);
      case 'pie':
        return this.renderPieChart(data, chart);
      case 'table':
        return this.renderDataTable(data);
      default:
        return `<div class="empty-state">Unknown chart type: ${chart.type}</div>`;
    }
  }

  private renderBarChart(data: Document[], chart: ChartConfig): string {
    if (data.length === 0) {
      return '<div class="empty-state">No data available</div>';
    }

    // Group by field if specified
    let values: { label: string; value: number }[] = [];

    if (chart.groupBy) {
      const groups = new Map<string, number>();
      for (const doc of data) {
        const key = String(doc[chart.groupBy] || 'Unknown');
        groups.set(key, (groups.get(key) || 0) + 1);
      }
      values = Array.from(groups.entries())
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 7);
    } else {
      // Show count over time (by day)
      const days = new Map<string, number>();
      for (const doc of data) {
        const date = new Date(doc._creationTime).toLocaleDateString();
        days.set(date, (days.get(date) || 0) + 1);
      }
      values = Array.from(days.entries())
        .map(([label, value]) => ({ label, value }))
        .slice(-7);
    }

    const max = Math.max(...values.map((v) => v.value), 1);

    return `
      <div class="bar-chart">
        ${values
          .map(
            (v) => `
          <div class="bar" style="height: ${(v.value / max) * 100}%" data-value="${v.value}">
            <span class="bar-label">${v.label.slice(0, 8)}</span>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  }

  private renderLineChart(data: Document[], chart: ChartConfig): string {
    if (data.length === 0) {
      return '<div class="empty-state">No data available</div>';
    }

    // For now, show as a simple bar chart
    return this.renderBarChart(data, chart);
  }

  private renderPieChart(data: Document[], chart: ChartConfig): string {
    if (data.length === 0 || !chart.groupBy) {
      return '<div class="empty-state">No data or groupBy field specified</div>';
    }

    // Group data
    const groups = new Map<string, number>();
    for (const doc of data) {
      const key = String(doc[chart.groupBy] || 'Unknown');
      groups.set(key, (groups.get(key) || 0) + 1);
    }

    const total = data.length;
    const items = Array.from(groups.entries())
      .map(([label, count]) => ({
        label,
        count,
        percent: ((count / total) * 100).toFixed(1),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const colors = ['#e94560', '#0f3460', '#16213e', '#1a1a2e', '#4caf50'];

    return `
      <div class="pie-legend">
        ${items
          .map(
            (item, i) => `
          <div class="pie-item">
            <span class="pie-color" style="background: ${colors[i % colors.length]}"></span>
            <span class="pie-label">${item.label}</span>
            <span class="pie-value">${item.percent}%</span>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  }

  private renderDataTable(data: Document[]): string {
    const docs = data.slice(0, 5);

    if (docs.length === 0) {
      return '<div class="empty-state">No documents</div>';
    }

    const keys = Object.keys(docs[0]).slice(0, 4);

    return `
      <div class="table-chart">
        <table>
          <thead>
            <tr>
              ${keys.map((k) => `<th>${k}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${docs
              .map(
                (doc) => `
              <tr>
                ${keys.map((k) => `<td>${this.formatValue(doc[k])}</td>`).join('')}
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  private renderActivityTable(allDocuments: Record<string, Document[]>): string {
    // Get recent documents across all tables
    const allDocs = Object.entries(allDocuments)
      .flatMap(([table, docs]) =>
        docs.map((d) => ({
          table,
          ...d,
        }))
      )
      .sort((a, b) => {
        const aTime = (a._creationTime as number) || 0;
        const bTime = (b._creationTime as number) || 0;
        return bTime - aTime;
      })
      .slice(0, 10);

    if (allDocs.length === 0) {
      return `
        <div class="chart-card">
          <div class="chart-header">
            <span class="chart-title">Recent Activity</span>
          </div>
          <div class="chart-container">
            <div class="empty-state">No documents found</div>
          </div>
        </div>
      `;
    }

    return `
      <div class="chart-card">
        <div class="chart-header">
          <span class="chart-title">Recent Activity</span>
        </div>
        <div class="chart-container">
          <div class="table-chart">
            <table>
              <thead>
                <tr>
                  <th>Table</th>
                  <th>ID</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                ${allDocs
                  .map(
                    (doc) => `
                  <tr>
                    <td>${doc.table}</td>
                    <td style="font-family: var(--font-mono); color: var(--accent);">
                      ${String(doc._id || '').slice(0, 12)}...
                    </td>
                    <td>${this.formatTimeAgo(doc._creationTime)}</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  private formatValue(value: unknown): string {
    if (value === null || value === undefined) return '<span style="color: var(--text-secondary)">null</span>';
    if (typeof value === 'object') {
      const str = JSON.stringify(value);
      return str.length > 30 ? str.slice(0, 30) + '...' : str;
    }
    if (typeof value === 'string' && value.length > 30) {
      return value.slice(0, 30) + '...';
    }
    return String(value);
  }

  private formatTimeAgo(timestamp: number): string {
    if (!timestamp) return 'Unknown';

    const now = Date.now();
    const diff = now - timestamp;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  private updateTimestamp(): void {
    const el = document.getElementById('lastUpdate');
    if (el) {
      el.textContent = 'Updated: ' + new Date().toLocaleTimeString();
    }
  }

  private startAutoRefresh(): void {
    const interval = (this.config?.refreshInterval || 5) * 1000;

    this.refreshTimer = window.setInterval(() => {
      this.updateTimestamp();
      // In a full implementation, this would re-fetch data
    }, interval);
  }

  private stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  // Cleanup
  destroy(): void {
    this.stopAutoRefresh();
  }
}

// Initialize app
const app = new RealtimeDashboardApp();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  app.destroy();
});
