/**
 * Kanban Board App
 *
 * Interactive browser UI for visualizing Convex scheduled functions,
 * cron jobs, and AI agent threads in a kanban board format.
 *
 * NOTE ON AGENTS:
 * The agents view requires the @convex-dev/agent component to be installed.
 * See: https://www.convex.dev/components/agent
 */

interface ScheduledFunction {
  _id: string;
  _creationTime: number;
  name: string;
  scheduledTime: number;
  completedTime?: number;
  state: "pending" | "inProgress" | "success" | "failed" | "canceled";
  args?: unknown;
}

interface CronJob {
  _id: string;
  _creationTime: number;
  name: string;
  cronSpec?: string;
  functionPath: string;
  lastRun?: number;
  nextRun?: number;
}

interface AgentThread {
  _id: string;
  _creationTime: number;
  title: string;
  status: "idle" | "processing" | "waiting" | "completed" | "error";
  agentId?: string;
  userId?: string;
  messageCount: number;
  lastMessageAt: number;
}

interface AgentComponentInfo {
  installed: boolean;
  tables: string[];
  isOfficialComponent?: boolean;
}

interface KanbanColumn<T> {
  id: string;
  title: string;
  items: T[];
  color: string;
}

interface KanbanData {
  jobs: {
    columns: KanbanColumn<ScheduledFunction | CronJob>[];
    totalCount: number;
  };
  agents: {
    columns: KanbanColumn<AgentThread>[];
    totalCount: number;
    componentInfo: AgentComponentInfo;
  };
}

interface AppConfig {
  deploymentUrl: string | null;
  mode: string;
  theme: string;
  data: KanbanData;
  timestamp: number;
}

// Get config injected by server
declare global {
  interface Window {
    __CONVEX_CONFIG__?: AppConfig;
  }
}

class KanbanBoardApp {
  private config: AppConfig;
  private currentMode: "jobs" | "agents" = "jobs";

  constructor() {
    this.config = window.__CONVEX_CONFIG__ || this.getDefaultConfig();
    this.currentMode = this.config.mode === "agents" ? "agents" : "jobs";
    this.init();
  }

  private getDefaultConfig(): AppConfig {
    return {
      deploymentUrl: null,
      mode: "auto",
      theme: "github-dark",
      data: {
        jobs: { columns: [], totalCount: 0 },
        agents: {
          columns: [],
          totalCount: 0,
          componentInfo: { installed: false, tables: [] },
        },
      },
      timestamp: Date.now(),
    };
  }

  private init() {
    // Set initial theme
    document.documentElement.setAttribute(
      "data-theme",
      this.config.theme.includes("light") ? "github-light" : "github-dark",
    );

    this.render();
    this.bindEvents();
  }

  private render() {
    const app = document.getElementById("app");
    if (!app) return;

    app.innerHTML = `
      <header class="header">
        <h1>Kanban Board</h1>
        <div class="header-meta">
          <span class="deployment">${this.config.deploymentUrl || "Not connected"}</span>
          <button id="theme-toggle" class="theme-toggle" title="Toggle dark/light mode">
            <svg class="moon-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
            <svg class="sun-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="5"/>
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
          </button>
        </div>
      </header>
      
      <div class="mode-tabs">
        <button class="mode-tab ${this.currentMode === "jobs" ? "active" : ""}" data-mode="jobs">
          Scheduled Jobs
        </button>
        <button class="mode-tab ${this.currentMode === "agents" ? "active" : ""}" data-mode="agents">
          AI Agents
        </button>
      </div>
      
      <div id="jobs-section" class="section" style="display: ${this.currentMode === "jobs" ? "block" : "none"}">
        ${this.renderJobsSection()}
      </div>
      
      <div id="agents-section" class="section" style="display: ${this.currentMode === "agents" ? "block" : "none"}">
        ${this.renderAgentsSection()}
      </div>
    `;
  }

  private renderJobsSection(): string {
    const { jobs } = this.config.data;

    if (jobs.totalCount === 0) {
      return `
        <div class="section-header">
          <h2 class="section-title">Scheduled Functions & Cron Jobs</h2>
        </div>
        <div class="empty-state">
          <p>No scheduled functions or cron jobs found.</p>
          <p>Schedule functions using <code>ctx.scheduler.runAfter()</code> or define cron jobs in <code>convex/crons.ts</code></p>
        </div>
      `;
    }

    return `
      <div class="section-header">
        <h2 class="section-title">Scheduled Functions & Cron Jobs</h2>
        <p class="section-subtitle">${jobs.totalCount} total items</p>
      </div>
      <div class="kanban-container">
        ${jobs.columns.map((col) => this.renderColumn(col, "job")).join("")}
      </div>
    `;
  }

  private renderAgentsSection(): string {
    const { agents } = this.config.data;

    if (!agents.componentInfo.installed) {
      return `
        <div class="section-header">
          <h2 class="section-title">AI Agent Threads</h2>
        </div>
        <div class="empty-state">
          <p>No agent component detected.</p>
          <p style="margin-top: 12px">
            The agents view requires the <strong>@convex-dev/agent</strong> component.<br>
            <a href="https://www.convex.dev/components/agent" target="_blank">Learn more about the Agent component</a>
          </p>
        </div>
      `;
    }

    const componentNote = agents.componentInfo.isOfficialComponent
      ? "(using @convex-dev/agent)"
      : `(detected tables: ${agents.componentInfo.tables.join(", ")})`;

    if (agents.totalCount === 0) {
      return `
        <div class="section-header">
          <h2 class="section-title">AI Agent Threads</h2>
          <p class="section-subtitle">${componentNote}</p>
        </div>
        <div class="empty-state">
          <p>No agent threads found.</p>
          <p>Create threads using the agent component's thread API.</p>
        </div>
      `;
    }

    return `
      <div class="section-header">
        <h2 class="section-title">AI Agent Threads</h2>
        <p class="section-subtitle">${agents.totalCount} threads ${componentNote}</p>
      </div>
      <div class="kanban-container">
        ${agents.columns.map((col) => this.renderColumn(col, "agent")).join("")}
      </div>
    `;
  }

  private renderColumn(
    column: KanbanColumn<any>,
    type: "job" | "agent",
  ): string {
    return `
      <div class="kanban-column">
        <div class="column-header">
          <div class="column-dot" style="background: ${column.color}"></div>
          <span class="column-title">${column.title}</span>
          <span class="column-count">${column.items.length}</span>
        </div>
        <div class="column-items">
          ${column.items.map((item) => this.renderCard(item, type)).join("")}
        </div>
      </div>
    `;
  }

  private renderCard(item: any, type: "job" | "agent"): string {
    if (type === "job") {
      return this.renderJobCard(item);
    }
    return this.renderAgentCard(item);
  }

  private renderJobCard(item: ScheduledFunction | CronJob): string {
    const isScheduled = "scheduledTime" in item;
    const isCron = "cronSpec" in item;
    const name = item.name || (item as CronJob).functionPath || "Unknown";

    let meta = "";
    if (isCron && (item as CronJob).cronSpec) {
      meta = `Cron: ${(item as CronJob).cronSpec}`;
    } else if (isScheduled) {
      meta = this.formatTime((item as ScheduledFunction).scheduledTime);
    }

    const badge = isCron
      ? '<span class="card-badge badge-cron">CRON</span>'
      : '<span class="card-badge badge-scheduled">SCHEDULED</span>';

    return `
      <div class="kanban-card" data-id="${item._id}">
        <div class="card-title">${this.escapeHtml(name)}</div>
        <div class="card-meta">${meta}</div>
        <div class="card-footer">
          ${badge}
        </div>
      </div>
    `;
  }

  private renderAgentCard(thread: AgentThread): string {
    const statusClass = `status-${thread.status}`;

    return `
      <div class="kanban-card" data-id="${thread._id}">
        <div class="card-title">${this.escapeHtml(thread.title)}</div>
        <div class="card-meta">
          ${thread.messageCount} messages | ${this.formatTimeAgo(thread.lastMessageAt)}
        </div>
        <div class="card-footer">
          <span class="card-badge badge-agent ${statusClass}">${thread.status.toUpperCase()}</span>
        </div>
      </div>
    `;
  }

  private bindEvents() {
    // Theme toggle
    const themeToggle = document.getElementById("theme-toggle");
    themeToggle?.addEventListener("click", () => {
      const currentTheme = document.documentElement.getAttribute("data-theme");
      const newTheme =
        currentTheme === "github-dark" ? "github-light" : "github-dark";
      document.documentElement.setAttribute("data-theme", newTheme);
      localStorage.setItem("convex-kanban-theme", newTheme);
    });

    // Mode tabs
    document.querySelectorAll(".mode-tab").forEach((tab) => {
      tab.addEventListener("click", (e) => {
        const mode = (e.target as HTMLElement).dataset.mode as
          | "jobs"
          | "agents";
        this.switchMode(mode);
      });
    });

    // Card click (could open detail panel)
    document.querySelectorAll(".kanban-card").forEach((card) => {
      card.addEventListener("click", () => {
        const id = (card as HTMLElement).dataset.id;
        console.log("Card clicked:", id);
        // Future: Open detail panel
      });
    });

    // Restore saved theme
    const savedTheme = localStorage.getItem("convex-kanban-theme");
    if (savedTheme) {
      document.documentElement.setAttribute("data-theme", savedTheme);
    }
  }

  private switchMode(mode: "jobs" | "agents") {
    this.currentMode = mode;

    // Update tabs
    document.querySelectorAll(".mode-tab").forEach((tab) => {
      tab.classList.toggle(
        "active",
        (tab as HTMLElement).dataset.mode === mode,
      );
    });

    // Show/hide sections
    const jobsSection = document.getElementById("jobs-section");
    const agentsSection = document.getElementById("agents-section");

    if (jobsSection) {
      jobsSection.style.display = mode === "jobs" ? "block" : "none";
    }
    if (agentsSection) {
      agentsSection.style.display = mode === "agents" ? "block" : "none";
    }
  }

  private formatTime(timestamp: number | undefined): string {
    if (!timestamp) return "Unknown";
    const date = new Date(timestamp);
    return date.toLocaleString();
  }

  private formatTimeAgo(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize app
new KanbanBoardApp();
