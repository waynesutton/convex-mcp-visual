var h=Object.defineProperty;var m=(c,e,t)=>e in c?h(c,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):c[e]=t;var l=(c,e,t)=>m(c,typeof e!="symbol"?e+"":e,t);import"./modulepreload-polyfill-B5Qt9EMX.js";class u{constructor(){l(this,"config",null);l(this,"refreshTimer",null);l(this,"isConnected",!0);l(this,"currentTheme","light");this.init()}init(){var t;this.initTheme();const e=window;if(e.__CONVEX_CONFIG__)this.config=e.__CONVEX_CONFIG__;else{const r=new URLSearchParams(window.location.search).get("config");if(r)try{this.config=JSON.parse(decodeURIComponent(r))}catch(s){console.error("Failed to parse config:",s)}}this.isConnected=!!((t=this.config)!=null&&t.deploymentUrl),this.render(),this.startAutoRefresh()}initTheme(){const e=localStorage.getItem("convex-dashboard-theme");e?this.currentTheme=e:window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches&&(this.currentTheme="light"),this.applyTheme()}applyTheme(){document.documentElement.setAttribute("data-theme",this.currentTheme),localStorage.setItem("convex-dashboard-theme",this.currentTheme)}toggleTheme(){this.currentTheme=this.currentTheme==="light"?"dark":"light",this.applyTheme();const e=document.getElementById("themeIcon");e&&(e.innerHTML=this.currentTheme==="light"?'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>':'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>')}render(){var r;const e=document.getElementById("app");if(!e)return;const t=((r=this.config)==null?void 0:r.deploymentUrl)||"Not connected";e.innerHTML=`
      <div class="header">
        <h1>
          <span class="status-dot ${this.isConnected?"":"disconnected"}" id="statusDot" title="${this.isConnected?"Connected to Convex":"Not connected - check deploy key"}"></span>
          Realtime Dashboard
        </h1>
        <div class="header-right">
          <span class="deployment-url" title="Your Convex deployment URL">${t}</span>
          <span class="last-update" id="lastUpdate" title="Time since last data refresh"></span>
          <button class="theme-toggle-btn" id="themeToggle" title="Toggle dark/light mode">
            <span id="themeIcon">${this.currentTheme==="light"?'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>':'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'}</span>
          </button>
        </div>
      </div>

      <div class="metrics-grid" id="metricsGrid"></div>
      <div class="charts-grid" id="chartsGrid"></div>
    `;const i=document.getElementById("themeToggle");i&&i.addEventListener("click",()=>this.toggleTheme()),this.renderMetrics(),this.renderCharts(),this.updateTimestamp()}renderMetrics(){var i;const e=document.getElementById("metricsGrid");if(!e)return;const t=((i=this.config)==null?void 0:i.metrics)||[];if(t.length===0){e.innerHTML=`
        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-label">No Metrics Configured</span>
          </div>
          <div class="metric-value">--</div>
          <div class="metric-change neutral">Add metrics via MCP tool parameters</div>
        </div>
      `;return}e.innerHTML=t.map(r=>`
      <div class="metric-card" title="${this.getMetricTooltip(r)}">
        <div class="metric-header">
          <span class="metric-label">${r.name}</span>
          <span class="metric-icon" title="${this.getAggregationTooltip(r.aggregation)}">${this.getMetricIcon(r.aggregation)}</span>
        </div>
        <div class="metric-value" title="Exact value: ${(r.value||0).toLocaleString()}">${this.formatNumber(r.value||0)}</div>
        <div class="metric-change neutral">
          ${r.documentCount!==void 0?`${r.documentCount.toLocaleString()} documents`:""}
        </div>
        <div class="metric-source" title="Data source: ${r.table} table">${r.table} / ${r.aggregation}${r.field?`(${r.field})`:""}</div>
      </div>
    `).join("")}getMetricIcon(e){return{count:"#",sum:"Σ",avg:"x̄",min:"↓",max:"↑"}[e]||"#"}getMetricTooltip(e){const t=this.getAggregationTooltip(e.aggregation);return`${e.name}: ${t} from ${e.table}${e.field?` on field "${e.field}"`:""}`}getAggregationTooltip(e){return{count:"Count - Total number of documents",sum:"Sum - Total of all values",avg:"Average - Mean of all values",min:"Minimum - Smallest value",max:"Maximum - Largest value"}[e]||e}formatNumber(e){return e>=1e6?(e/1e6).toFixed(1)+"M":e>=1e3?(e/1e3).toFixed(1)+"k":Number.isInteger(e)?e.toLocaleString():e.toFixed(2)}renderCharts(){var s,a;const e=document.getElementById("chartsGrid");if(!e)return;const t=((s=this.config)==null?void 0:s.charts)||[],i=((a=this.config)==null?void 0:a.allDocuments)||{},r=this.renderActivityTable(i);if(t.length===0){e.innerHTML=`
        ${this.renderTablesOverview()}
        ${r}
      `;return}e.innerHTML=t.map((n,o)=>{const d=i[n.table]||[];return`
        <div class="chart-card">
          <div class="chart-header">
            <span class="chart-title">${n.title}</span>
            <span class="chart-subtitle">${d.length} documents</span>
          </div>
          <div class="chart-container" id="chart-${o}">
            ${this.renderChartContent(n,d)}
          </div>
        </div>
      `}).join("")+r}renderTablesOverview(){var i;const e=((i=this.config)==null?void 0:i.tables)||[];if(e.length===0)return"";const t=Math.max(...e.map(r=>r.documentCount),1);return`
      <div class="chart-card">
        <div class="chart-header">
          <span class="chart-title" title="Document count per table in your Convex database">Tables Overview</span>
        </div>
        <div class="chart-container">
          <div class="bar-chart">
            ${e.map(r=>`
              <div class="bar" style="height: ${r.documentCount/t*100}%" data-value="${r.documentCount}" title="${r.name}: ${r.documentCount.toLocaleString()} documents">
                <span class="bar-label">${r.name}</span>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    `}renderChartContent(e,t){switch(e.type){case"bar":return this.renderBarChart(t,e);case"line":return this.renderLineChart(t,e);case"pie":return this.renderPieChart(t,e);case"table":return this.renderDataTable(t);default:return`<div class="empty-state">Unknown chart type: ${e.type}</div>`}}renderBarChart(e,t){if(e.length===0)return'<div class="empty-state">No data available</div>';let i=[];if(t.groupBy){const s=new Map;for(const a of e){const n=String(a[t.groupBy]||"Unknown");s.set(n,(s.get(n)||0)+1)}i=Array.from(s.entries()).map(([a,n])=>({label:a,value:n})).sort((a,n)=>n.value-a.value).slice(0,7)}else{const s=new Map;for(const a of e){const n=new Date(a._creationTime).toLocaleDateString();s.set(n,(s.get(n)||0)+1)}i=Array.from(s.entries()).map(([a,n])=>({label:a,value:n})).slice(-7)}const r=Math.max(...i.map(s=>s.value),1);return`
      <div class="bar-chart">
        ${i.map(s=>`
          <div class="bar" style="height: ${s.value/r*100}%" data-value="${s.value}">
            <span class="bar-label">${s.label.slice(0,8)}</span>
          </div>
        `).join("")}
      </div>
    `}renderLineChart(e,t){return e.length===0?'<div class="empty-state">No data available</div>':this.renderBarChart(e,t)}renderPieChart(e,t){if(e.length===0||!t.groupBy)return'<div class="empty-state">No data or groupBy field specified</div>';const i=new Map;for(const n of e){const o=String(n[t.groupBy]||"Unknown");i.set(o,(i.get(o)||0)+1)}const r=e.length,s=Array.from(i.entries()).map(([n,o])=>({label:n,count:o,percent:(o/r*100).toFixed(1)})).sort((n,o)=>o.count-n.count).slice(0,5),a=["#e94560","#0f3460","#16213e","#1a1a2e","#4caf50"];return`
      <div class="pie-legend">
        ${s.map((n,o)=>`
          <div class="pie-item">
            <span class="pie-color" style="background: ${a[o%a.length]}"></span>
            <span class="pie-label">${n.label}</span>
            <span class="pie-value">${n.percent}%</span>
          </div>
        `).join("")}
      </div>
    `}renderDataTable(e){const t=e.slice(0,5);if(t.length===0)return'<div class="empty-state">No documents</div>';const i=Object.keys(t[0]).slice(0,4);return`
      <div class="table-chart">
        <table>
          <thead>
            <tr>
              ${i.map(r=>`<th>${r}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${t.map(r=>`
              <tr>
                ${i.map(s=>`<td>${this.formatValue(r[s])}</td>`).join("")}
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `}renderActivityTable(e){const t=Object.entries(e).flatMap(([i,r])=>r.map(s=>({table:i,...s}))).sort((i,r)=>{const s=i._creationTime||0;return(r._creationTime||0)-s}).slice(0,10);return t.length===0?`
        <div class="chart-card">
          <div class="chart-header">
            <span class="chart-title">Recent Activity</span>
          </div>
          <div class="chart-container">
            <div class="empty-state">No documents found</div>
          </div>
        </div>
      `:`
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
                ${t.map(i=>`
                  <tr>
                    <td>${i.table}</td>
                    <td style="font-family: var(--font-mono); color: var(--accent);">
                      ${String(i._id||"").slice(0,12)}...
                    </td>
                    <td>${this.formatTimeAgo(i._creationTime)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `}formatValue(e){if(e==null)return'<span style="color: var(--text-secondary)">null</span>';if(typeof e=="object"){const t=JSON.stringify(e);return t.length>30?t.slice(0,30)+"...":t}return typeof e=="string"&&e.length>30?e.slice(0,30)+"...":String(e)}formatTimeAgo(e){if(!e)return"Unknown";const i=Date.now()-e,r=Math.floor(i/6e4),s=Math.floor(i/36e5),a=Math.floor(i/864e5);return r<1?"Just now":r<60?`${r}m ago`:s<24?`${s}h ago`:`${a}d ago`}updateTimestamp(){const e=document.getElementById("lastUpdate");e&&(e.textContent="Updated: "+new Date().toLocaleTimeString())}startAutoRefresh(){var t;const e=(((t=this.config)==null?void 0:t.refreshInterval)||5)*1e3;this.refreshTimer=window.setInterval(()=>{this.updateTimestamp()},e)}stopAutoRefresh(){this.refreshTimer&&(clearInterval(this.refreshTimer),this.refreshTimer=null)}destroy(){this.stopAutoRefresh()}}const g=new u;window.addEventListener("beforeunload",()=>{g.destroy()});
