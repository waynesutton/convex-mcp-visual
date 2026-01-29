/**
 * Dashboard Resource Handler
 *
 * Serves the bundled Realtime Dashboard HTML UI.
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
export async function getDashboardResourceContent() {
    // Try to load the bundled HTML file
    const bundledPath = join(__dirname, '..', 'apps', 'realtime-dashboard.html');
    if (existsSync(bundledPath)) {
        return readFileSync(bundledPath, 'utf-8');
    }
    // Fallback: return inline HTML for development/testing
    return getInlineDashboardUI();
}
function getInlineDashboardUI() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Realtime Dashboard - Convex MCP Apps</title>
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
      --border: #333;
      --success: #4caf50;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      min-height: 100vh;
      padding: 20px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .header h1 {
      font-size: 20px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--success);
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .metric-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 20px;
    }

    .metric-label {
      font-size: 12px;
      color: var(--text-secondary);
      text-transform: uppercase;
      margin-bottom: 8px;
    }

    .metric-value {
      font-size: 32px;
      font-weight: 700;
    }

    .metric-change {
      font-size: 12px;
      margin-top: 4px;
    }

    .metric-change.positive { color: var(--success); }
    .metric-change.negative { color: var(--accent); }

    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 16px;
    }

    .chart-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 20px;
    }

    .chart-title {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 16px;
    }

    .chart-placeholder {
      height: 200px;
      background: var(--bg-tertiary);
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary);
    }

    .empty-state {
      text-align: center;
      padding: 60px;
      color: var(--text-secondary);
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>
      <span class="status-dot"></span>
      Realtime Dashboard
    </h1>
    <span id="lastUpdate" style="color: var(--text-secondary); font-size: 12px;"></span>
  </div>

  <div class="metrics-grid" id="metricsGrid"></div>
  <div class="charts-grid" id="chartsGrid"></div>

  <script>
    const app = {
      config: null,

      init() {
        const params = new URLSearchParams(window.location.search);
        const configParam = params.get('config');
        if (configParam) {
          try {
            this.config = JSON.parse(decodeURIComponent(configParam));
          } catch (e) {
            console.error('Failed to parse config:', e);
          }
        }

        this.render();
        this.startAutoRefresh();
      },

      render() {
        this.renderMetrics();
        this.renderCharts();
        this.updateTimestamp();
      },

      renderMetrics() {
        const grid = document.getElementById('metricsGrid');
        const metrics = this.config?.metrics || [];

        if (metrics.length === 0) {
          grid.innerHTML = \`
            <div class="metric-card">
              <div class="metric-label">Total Documents</div>
              <div class="metric-value">--</div>
              <div class="metric-change">Configure metrics to display data</div>
            </div>
          \`;
          return;
        }

        grid.innerHTML = metrics.map(m => \`
          <div class="metric-card">
            <div class="metric-label">\${m.name}</div>
            <div class="metric-value">--</div>
            <div class="metric-change">\${m.table} / \${m.aggregation}</div>
          </div>
        \`).join('');
      },

      renderCharts() {
        const grid = document.getElementById('chartsGrid');
        const charts = this.config?.charts || [];

        if (charts.length === 0) {
          grid.innerHTML = \`
            <div class="chart-card">
              <div class="chart-title">Sample Chart</div>
              <div class="chart-placeholder">
                Configure charts to display visualizations
              </div>
            </div>
          \`;
          return;
        }

        grid.innerHTML = charts.map(c => \`
          <div class="chart-card">
            <div class="chart-title">\${c.title}</div>
            <div class="chart-placeholder">
              \${c.type} chart - \${c.table}
            </div>
          </div>
        \`).join('');
      },

      updateTimestamp() {
        document.getElementById('lastUpdate').textContent =
          'Last updated: ' + new Date().toLocaleTimeString();
      },

      startAutoRefresh() {
        const interval = (this.config?.refreshInterval || 5) * 1000;
        setInterval(() => {
          this.updateTimestamp();
          // In real implementation, fetch new data here
        }, interval);
      }
    };

    document.addEventListener('DOMContentLoaded', () => app.init());
  </script>
</body>
</html>`;
}
//# sourceMappingURL=dashboard.js.map