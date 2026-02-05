/**
 * Shared UI Styles
 *
 * Consistent styling for all tool browser UIs with tan/dark mode support.
 */

/**
 * CSS variables and base styles matching schema-browser design
 */
export function getSharedStyles(): string {
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      /* Light Mode (Tan) - Default */
      --bg-primary: #faf8f5;
      --bg-secondary: #f5f3f0;
      --bg-tertiary: #ebe9e6;
      --bg-hover: #ebe9e6;
      --text-primary: #1a1a1a;
      --text-secondary: #6b6b6b;
      --text-muted: #999999;
      --border: #e6e4e1;
      --border-strong: #d4d2cf;
      --accent: #8b7355;
      --accent-interactive: #eb5601;
      --accent-hover: #d14a01;
      --success: #4a8c5c;
      --warning: #c4842d;
      --warning-bg: #fef3e2;
      --warning-text: #8a5a00;
      --error: #dc3545;
      --info: #4a7c9b;
      --font-mono: "SF Mono", Monaco, "Cascadia Code", "Courier New", monospace;
      --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
      --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
      --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
      --card-bg: #ffffff;
    }

    [data-theme="dark"] {
      --bg-primary: #1e1e1e;
      --bg-secondary: #252526;
      --bg-tertiary: #2d2d2d;
      --bg-hover: #37373d;
      --text-primary: #cccccc;
      --text-secondary: #8b8b8b;
      --text-muted: #6b6b6b;
      --border: #3c3c3c;
      --border-strong: #4a4a4a;
      --accent: #c9a87c;
      --accent-interactive: #ff6b35;
      --accent-hover: #ff8555;
      --success: #4ec9b0;
      --warning: #dcdcaa;
      --warning-bg: #3d3520;
      --warning-text: #dcdcaa;
      --error: #f14c4c;
      --info: #4fc1ff;
      --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
      --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
      --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5);
      --card-bg: #2d2d2d;
    }

    html, body {
      width: 100%;
      height: 100%;
      overflow-x: hidden;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      min-height: 100vh;
      line-height: 1.5;
    }

    /* Header */
    .header {
      background: var(--bg-secondary);
      padding: 12px 20px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header h1 {
      font-size: 18px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--text-primary);
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--success);
      flex-shrink: 0;
    }

    .status-dot.warning {
      background: var(--warning);
    }

    .status-dot.error {
      background: var(--error);
    }

    .header-info {
      font-size: 12px;
      color: var(--text-secondary);
      font-family: var(--font-mono);
    }

    .header-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    /* Theme Toggle */
    .theme-toggle {
      width: 36px;
      height: 36px;
      background: var(--bg-hover);
      border: 1px solid var(--border);
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary);
      transition: all 0.2s ease;
    }

    .theme-toggle:hover {
      background: var(--accent-interactive);
      border-color: var(--accent-interactive);
      color: white;
    }

    .theme-toggle svg {
      width: 18px;
      height: 18px;
    }

    .theme-toggle .sun-icon { display: none; }
    .theme-toggle .moon-icon { display: block; }

    [data-theme="dark"] .theme-toggle .sun-icon { display: block; }
    [data-theme="dark"] .theme-toggle .moon-icon { display: none; }

    /* Main Content */
    .main-content {
      padding: 20px;
      max-width: 1400px;
      margin: 0 auto;
    }

    /* Cards */
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: var(--shadow-sm);
      transition: box-shadow 0.2s ease;
    }

    .card:hover {
      box-shadow: var(--shadow-md);
    }

    .card-header {
      padding: 14px 18px;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .card-title {
      font-weight: 600;
      font-size: 15px;
      color: var(--text-primary);
    }

    .card-body {
      padding: 16px 18px;
    }

    /* Badges */
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 500;
      padding: 4px 10px;
      border-radius: 20px;
      border: 1px solid transparent;
    }

    .badge-success {
      background: rgba(74, 140, 92, 0.12);
      color: var(--success);
      border-color: rgba(74, 140, 92, 0.3);
    }

    .badge-warning {
      background: var(--warning-bg);
      color: var(--warning-text);
      border-color: rgba(196, 132, 45, 0.3);
    }

    .badge-error {
      background: rgba(220, 53, 69, 0.12);
      color: var(--error);
      border-color: rgba(220, 53, 69, 0.3);
    }

    .badge-info {
      background: rgba(74, 124, 155, 0.12);
      color: var(--info);
      border-color: rgba(74, 124, 155, 0.3);
    }

    .badge-neutral {
      background: var(--bg-tertiary);
      color: var(--text-secondary);
      border-color: var(--border);
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    th, td {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }

    th {
      font-weight: 600;
      background: var(--bg-secondary);
      color: var(--text-primary);
      position: sticky;
      top: 0;
      z-index: 1;
    }

    td {
      color: var(--text-primary);
    }

    tr:hover td {
      background: var(--bg-hover);
    }

    td.mono {
      font-family: var(--font-mono);
      font-size: 12px;
    }

    /* Grid layouts */
    .grid {
      display: grid;
      gap: 16px;
    }

    .grid-2 { grid-template-columns: repeat(2, 1fr); }
    .grid-3 { grid-template-columns: repeat(3, 1fr); }
    .grid-4 { grid-template-columns: repeat(4, 1fr); }
    .grid-auto { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }

    @media (max-width: 900px) {
      .grid-2, .grid-3, .grid-4 { grid-template-columns: 1fr; }
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 500;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 1px solid var(--border);
      background: var(--bg-primary);
      color: var(--text-primary);
    }

    .btn:hover {
      background: var(--bg-hover);
      border-color: var(--accent);
    }

    .btn-primary {
      background: var(--accent-interactive);
      border-color: var(--accent-interactive);
      color: white;
    }

    .btn-primary:hover {
      background: var(--accent-hover);
      border-color: var(--accent-hover);
    }

    /* Code blocks */
    pre, code {
      font-family: var(--font-mono);
    }

    pre {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
      overflow-x: auto;
      font-size: 12px;
      line-height: 1.6;
    }

    code {
      background: var(--bg-tertiary);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 12px;
    }

    /* Lists */
    ul, ol {
      padding-left: 20px;
    }

    li {
      margin-bottom: 4px;
    }

    /* Section headers */
    .section-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
    }

    /* Empty state */
    .empty-state {
      text-align: center;
      padding: 48px 24px;
      color: var(--text-secondary);
    }

    .empty-state-icon {
      font-size: 40px;
      margin-bottom: 12px;
      opacity: 0.5;
    }

    .empty-state h3 {
      font-size: 16px;
      color: var(--text-primary);
      margin-bottom: 4px;
    }

    /* Stat cards for heatmaps */
    .stat-card {
      padding: 16px;
      border-radius: 12px;
      border: 1px solid var(--border);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }

    .stat-card-label {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 4px;
    }

    .stat-card-value {
      font-size: 24px;
      font-weight: 700;
      color: var(--text-primary);
    }

    .stat-card-sub {
      font-size: 12px;
      color: var(--text-secondary);
      margin-top: 4px;
    }

    /* Heatmap intensity colors */
    .heat-cold { background: var(--bg-tertiary); }
    .heat-warm { background: rgba(235, 86, 1, 0.15); }
    .heat-hot { background: rgba(235, 86, 1, 0.35); }
    .heat-fire { background: rgba(235, 86, 1, 0.55); }

    [data-theme="dark"] .heat-cold { background: var(--bg-tertiary); }
    [data-theme="dark"] .heat-warm { background: rgba(255, 107, 53, 0.2); }
    [data-theme="dark"] .heat-hot { background: rgba(255, 107, 53, 0.4); }
    [data-theme="dark"] .heat-fire { background: rgba(255, 107, 53, 0.6); }

    /* Legend */
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin: 16px 0;
      font-size: 12px;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--text-secondary);
    }

    .legend-dot {
      width: 12px;
      height: 12px;
      border-radius: 4px;
    }

    /* Diagram container */
    .diagram-container {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      overflow: auto;
      max-width: 100%;
    }

    .diagram-container svg {
      max-width: 100%;
      height: auto;
    }

    /* Scrollbar styling */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }

    ::-webkit-scrollbar-track {
      background: var(--bg-secondary);
    }

    ::-webkit-scrollbar-thumb {
      background: var(--border-strong);
      border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: var(--text-muted);
    }
  `;
}

/**
 * Theme toggle button HTML
 */
export function getThemeToggleHtml(): string {
  return `
    <button class="theme-toggle" onclick="toggleTheme()" title="Toggle theme">
      <svg class="moon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>
      <svg class="sun-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      </svg>
    </button>
  `;
}

/**
 * Theme toggle script
 */
export function getThemeToggleScript(): string {
  return `
    function toggleTheme() {
      const html = document.documentElement;
      const currentTheme = html.getAttribute('data-theme');
      // Toggle between dark and light (no persistence)
      if (currentTheme === 'dark') {
        html.removeAttribute('data-theme');
      } else {
        html.setAttribute('data-theme', 'dark');
      }
    }
    // Always start in tan (light) mode - no attribute needed
  `;
}

/**
 * Get heat intensity class based on value
 */
export function getHeatClass(intensity: number): string {
  if (intensity < 0.25) return "heat-cold";
  if (intensity < 0.5) return "heat-warm";
  if (intensity < 0.75) return "heat-hot";
  return "heat-fire";
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
