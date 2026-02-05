/**
 * Kanban Board Resource Handler
 *
 * Serves the bundled Kanban Board HTML UI.
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function getKanbanResourceContent(): Promise<string> {
  // Try to load the bundled HTML file
  const bundledPath = join(__dirname, "..", "apps", "kanban-board.html");

  if (existsSync(bundledPath)) {
    return readFileSync(bundledPath, "utf-8");
  }

  // Fallback: return inline HTML for development/testing
  return getInlineKanbanUI();
}

function getInlineKanbanUI(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kanban Board - Convex MCP Apps</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    :root {
      --bg-primary: #faf8f5;
      --bg-secondary: #f5f3f0;
      --bg-tertiary: #ebe9e6;
      --text-primary: #1a1a1a;
      --text-secondary: #6b6b6b;
      --accent: #eb5601;
      --border: #e6e4e1;
      --success: #4a8c5c;
      --warning: #c4842d;
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
    }

    .board {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      min-height: 400px;
    }

    .column {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px;
    }

    .column-header {
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .column-count {
      background: var(--bg-tertiary);
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 12px;
      color: var(--text-secondary);
    }

    .card {
      background: var(--bg-primary);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 8px;
      font-size: 13px;
    }

    .card-title {
      font-weight: 500;
      margin-bottom: 4px;
    }

    .card-meta {
      font-size: 11px;
      color: var(--text-secondary);
    }

    .empty-column {
      color: var(--text-secondary);
      text-align: center;
      padding: 20px;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>
      <span class="status-dot"></span>
      Kanban Board
    </h1>
    <span style="color: var(--text-secondary); font-size: 12px;">Scheduled Functions</span>
  </div>

  <div class="board" id="board">
    <div class="column">
      <div class="column-header">
        <span>Pending</span>
        <span class="column-count">0</span>
      </div>
      <div class="empty-column">No pending jobs</div>
    </div>
    <div class="column">
      <div class="column-header">
        <span>Running</span>
        <span class="column-count">0</span>
      </div>
      <div class="empty-column">No running jobs</div>
    </div>
    <div class="column">
      <div class="column-header">
        <span>Completed</span>
        <span class="column-count">0</span>
      </div>
      <div class="empty-column">No completed jobs</div>
    </div>
    <div class="column">
      <div class="column-header">
        <span>Failed</span>
        <span class="column-count">0</span>
      </div>
      <div class="empty-column">No failed jobs</div>
    </div>
  </div>

  <script>
    const app = {
      config: null,

      init() {
        const params = new URLSearchParams(window.location.search);
        const configParam = params.get('config');
        if (configParam) {
          try {
            this.config = JSON.parse(decodeURIComponent(configParam));
            this.render();
          } catch (e) {
            console.error('Failed to parse config:', e);
          }
        }
      },

      render() {
        // Render jobs/agents based on config
        console.log('Config:', this.config);
      }
    };

    document.addEventListener('DOMContentLoaded', () => app.init());
  </script>
</body>
</html>`;
}
