var h=Object.defineProperty;var m=(o,e,t)=>e in o?h(o,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):o[e]=t;var d=(o,e,t)=>m(o,typeof e!="symbol"?e+"":e,t);import"./modulepreload-polyfill-B5Qt9EMX.js";class v{constructor(){d(this,"config",null);d(this,"refreshTimer",null);d(this,"isConnected",!0);d(this,"currentTheme","light");this.init()}init(){var e;if(this.initTheme(),window.__CONVEX_CONFIG__)this.config=window.__CONVEX_CONFIG__;else{const s=new URLSearchParams(window.location.search).get("config");if(s)try{this.config=JSON.parse(decodeURIComponent(s))}catch(r){console.error("Failed to parse config:",r)}}this.isConnected=!!((e=this.config)!=null&&e.deploymentUrl),this.render(),this.startAutoRefresh()}initTheme(){const e=localStorage.getItem("convex-dashboard-theme");e?this.currentTheme=e:window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches&&(this.currentTheme="light"),this.applyTheme()}applyTheme(){document.documentElement.setAttribute("data-theme",this.currentTheme),localStorage.setItem("convex-dashboard-theme",this.currentTheme)}toggleTheme(){this.currentTheme=this.currentTheme==="light"?"dark":"light",this.applyTheme();const e=document.getElementById("themeIcon");e&&(e.innerHTML=this.currentTheme==="light"?'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>':'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>')}render(){var r;const e=document.getElementById("app");if(!e)return;const t=((r=this.config)==null?void 0:r.deploymentUrl)||"Not connected";e.innerHTML=`
      <div class="header">
        <h1>
          <span class="status-dot ${this.isConnected?"":"disconnected"}" id="statusDot"></span>
          Realtime Dashboard
        </h1>
        <div class="header-right">
          <span class="deployment-url">${t}</span>
          <span class="last-update" id="lastUpdate"></span>
          <button class="theme-toggle-btn" id="themeToggle" title="Toggle dark mode">
            <span id="themeIcon">${this.currentTheme==="light"?'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>':'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'}</span>
          </button>
        </div>
      </div>

      <div class="metrics-grid" id="metricsGrid"></div>
      <div class="charts-grid" id="chartsGrid"></div>
    `;const s=document.getElementById("themeToggle");s&&s.addEventListener("click",()=>this.toggleTheme()),this.renderMetrics(),this.renderCharts(),this.updateTimestamp()}renderMetrics(){var s;const e=document.getElementById("metricsGrid");if(!e)return;const t=((s=this.config)==null?void 0:s.metrics)||[];if(t.length===0){e.innerHTML=`
        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-label">No Metrics Configured</span>
          </div>
          <div class="metric-value">--</div>
          <div class="metric-change neutral">Add metrics via MCP tool parameters</div>
        </div>
      `;return}e.innerHTML=t.map(r=>`
      <div class="metric-card">
        <div class="metric-header">
          <span class="metric-label">${r.name}</span>
          <span class="metric-icon">${this.getMetricIcon(r.aggregation)}</span>
        </div>
        <div class="metric-value">${this.formatNumber(r.value||0)}</div>
        <div class="metric-change neutral">
          ${r.documentCount!==void 0?`${r.documentCount} documents`:""}
        </div>
        <div class="metric-source">${r.table} / ${r.aggregation}${r.field?`(${r.field})`:""}</div>
      </div>
    `).join("")}getMetricIcon(e){return{count:"#",sum:"Σ",avg:"x̄",min:"↓",max:"↑"}[e]||"#"}formatNumber(e){return e>=1e6?(e/1e6).toFixed(1)+"M":e>=1e3?(e/1e3).toFixed(1)+"k":Number.isInteger(e)?e.toLocaleString():e.toFixed(2)}renderCharts(){var i,a;const e=document.getElementById("chartsGrid");if(!e)return;const t=((i=this.config)==null?void 0:i.charts)||[],s=((a=this.config)==null?void 0:a.allDocuments)||{},r=this.renderActivityTable(s);if(t.length===0){e.innerHTML=`
        ${this.renderTablesOverview()}
        ${r}
      `;return}e.innerHTML=t.map((n,c)=>{const l=s[n.table]||[];return`
        <div class="chart-card">
          <div class="chart-header">
            <span class="chart-title">${n.title}</span>
            <span class="chart-subtitle">${l.length} documents</span>
          </div>
          <div class="chart-container" id="chart-${c}">
            ${this.renderChartContent(n,l)}
          </div>
        </div>
      `}).join("")+r}renderTablesOverview(){var s;const e=((s=this.config)==null?void 0:s.tables)||[];if(e.length===0)return"";const t=Math.max(...e.map(r=>r.documentCount),1);return`
      <div class="chart-card">
        <div class="chart-header">
          <span class="chart-title">Tables Overview</span>
        </div>
        <div class="chart-container">
          <div class="bar-chart">
            ${e.map(r=>`
              <div class="bar" style="height: ${r.documentCount/t*100}%" data-value="${r.documentCount}">
                <span class="bar-label">${r.name}</span>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    `}renderChartContent(e,t){switch(e.type){case"bar":return this.renderBarChart(t,e);case"line":return this.renderLineChart(t,e);case"pie":return this.renderPieChart(t,e);case"table":return this.renderDataTable(t);default:return`<div class="empty-state">Unknown chart type: ${e.type}</div>`}}renderBarChart(e,t){if(e.length===0)return'<div class="empty-state">No data available</div>';let s=[];if(t.groupBy){const i=new Map;for(const a of e){const n=String(a[t.groupBy]||"Unknown");i.set(n,(i.get(n)||0)+1)}s=Array.from(i.entries()).map(([a,n])=>({label:a,value:n})).sort((a,n)=>n.value-a.value).slice(0,7)}else{const i=new Map;for(const a of e){const n=new Date(a._creationTime).toLocaleDateString();i.set(n,(i.get(n)||0)+1)}s=Array.from(i.entries()).map(([a,n])=>({label:a,value:n})).slice(-7)}const r=Math.max(...s.map(i=>i.value),1);return`
      <div class="bar-chart">
        ${s.map(i=>`
          <div class="bar" style="height: ${i.value/r*100}%" data-value="${i.value}">
            <span class="bar-label">${i.label.slice(0,8)}</span>
          </div>
        `).join("")}
      </div>
    `}renderLineChart(e,t){return e.length===0?'<div class="empty-state">No data available</div>':this.renderBarChart(e,t)}renderPieChart(e,t){if(e.length===0||!t.groupBy)return'<div class="empty-state">No data or groupBy field specified</div>';const s=new Map;for(const n of e){const c=String(n[t.groupBy]||"Unknown");s.set(c,(s.get(c)||0)+1)}const r=e.length,i=Array.from(s.entries()).map(([n,c])=>({label:n,count:c,percent:(c/r*100).toFixed(1)})).sort((n,c)=>c.count-n.count).slice(0,5),a=["#e94560","#0f3460","#16213e","#1a1a2e","#4caf50"];return`
      <div class="pie-legend">
        ${i.map((n,c)=>`
          <div class="pie-item">
            <span class="pie-color" style="background: ${a[c%a.length]}"></span>
            <span class="pie-label">${n.label}</span>
            <span class="pie-value">${n.percent}%</span>
          </div>
        `).join("")}
      </div>
    `}renderDataTable(e){const t=e.slice(0,5);if(t.length===0)return'<div class="empty-state">No documents</div>';const s=Object.keys(t[0]).slice(0,4);return`
      <div class="table-chart">
        <table>
          <thead>
            <tr>
              ${s.map(r=>`<th>${r}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${t.map(r=>`
              <tr>
                ${s.map(i=>`<td>${this.formatValue(r[i])}</td>`).join("")}
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `}renderActivityTable(e){const t=Object.entries(e).flatMap(([s,r])=>r.map(i=>({table:s,...i}))).sort((s,r)=>{const i=s._creationTime||0;return(r._creationTime||0)-i}).slice(0,10);return t.length===0?`
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
                ${t.map(s=>`
                  <tr>
                    <td>${s.table}</td>
                    <td style="font-family: var(--font-mono); color: var(--accent);">
                      ${String(s._id||"").slice(0,12)}...
                    </td>
                    <td>${this.formatTimeAgo(s._creationTime)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `}formatValue(e){if(e==null)return'<span style="color: var(--text-secondary)">null</span>';if(typeof e=="object"){const t=JSON.stringify(e);return t.length>30?t.slice(0,30)+"...":t}return typeof e=="string"&&e.length>30?e.slice(0,30)+"...":String(e)}formatTimeAgo(e){if(!e)return"Unknown";const s=Date.now()-e,r=Math.floor(s/6e4),i=Math.floor(s/36e5),a=Math.floor(s/864e5);return r<1?"Just now":r<60?`${r}m ago`:i<24?`${i}h ago`:`${a}d ago`}updateTimestamp(){const e=document.getElementById("lastUpdate");e&&(e.textContent="Updated: "+new Date().toLocaleTimeString())}startAutoRefresh(){var t;const e=(((t=this.config)==null?void 0:t.refreshInterval)||5)*1e3;this.refreshTimer=window.setInterval(()=>{this.updateTimestamp()},e)}stopAutoRefresh(){this.refreshTimer&&(clearInterval(this.refreshTimer),this.refreshTimer=null)}destroy(){this.stopAutoRefresh()}}const p=new v;window.addEventListener("beforeunload",()=>{p.destroy()});
