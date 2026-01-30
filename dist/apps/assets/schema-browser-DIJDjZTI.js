var V=Object.defineProperty;var X=(x,e,t)=>e in x?V(x,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):x[e]=t;var m=(x,e,t)=>X(x,typeof e!="symbol"?e+"":e,t);import"./modulepreload-polyfill-B5Qt9EMX.js";class Y{constructor(){m(this,"config",null);m(this,"selectedTable",null);m(this,"currentPage",1);m(this,"pageSize",50);m(this,"searchQuery","");m(this,"queryModalOpen",!1);m(this,"viewMode","graph");m(this,"sidebarWidth",260);m(this,"codePanelWidth",360);m(this,"sidebarCollapsed",!1);m(this,"graphSidebarCollapsed",!1);m(this,"isResizingSidebar",!1);m(this,"graphNodes",[]);m(this,"graphEdges",[]);m(this,"canvas",null);m(this,"ctx",null);m(this,"panX",0);m(this,"panY",0);m(this,"zoom",1);m(this,"isDragging",!1);m(this,"dragStartX",0);m(this,"dragStartY",0);m(this,"selectedNode",null);m(this,"hoveredNode",null);m(this,"dpr",1);m(this,"showCodePanel",!0);m(this,"positionHistory",[]);m(this,"historyIndex",-1);m(this,"maxHistorySize",20);m(this,"showExportMenu",!1);m(this,"showFilterDropdown",!1);m(this,"sidebarSections",{tables:{collapsed:!1},convex:{collapsed:!0}});m(this,"tableSortBy","name");m(this,"tableSortOrder","asc");m(this,"filterState",{tableName:"",fieldName:"",fieldType:"",showEmpty:!0});m(this,"tooltip",null);m(this,"tooltipTimeout",null);m(this,"currentTheme","light");this.initTheme(),this.init()}initTheme(){const e=localStorage.getItem("convex-schema-theme");e==="dark"||e==="light"?this.currentTheme=e:window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches&&(this.currentTheme="light"),this.applyTheme()}applyTheme(){document.documentElement.setAttribute("data-theme",this.currentTheme)}toggleTheme(){this.currentTheme=this.currentTheme==="light"?"dark":"light",localStorage.setItem("convex-schema-theme",this.currentTheme),this.applyTheme(),this.viewMode==="graph"&&this.drawGraph()}getThemeColor(e){return getComputedStyle(document.documentElement).getPropertyValue(e).trim()}getThemeColors(){return{bgPrimary:this.getThemeColor("--bg-primary")||"#faf8f5",bgSecondary:this.getThemeColor("--bg-secondary")||"#f5f3f0",bgHover:this.getThemeColor("--bg-hover")||"#ebe9e6",textPrimary:this.getThemeColor("--text-primary")||"#1a1a1a",textSecondary:this.getThemeColor("--text-secondary")||"#6b6b6b",textMuted:this.getThemeColor("--text-muted")||"#999999",border:this.getThemeColor("--border")||"#e6e4e1",accent:this.getThemeColor("--accent")||"#8b7355",accentInteractive:this.getThemeColor("--accent-interactive")||"#EB5601",accentHover:this.getThemeColor("--accent-hover")||"#d14a01",warning:this.getThemeColor("--warning")||"#c4842d",nodeBg:this.getThemeColor("--node-bg")||"#ffffff",nodeHeader:this.getThemeColor("--node-header")||"#f8f7f5",nodeHeaderSelected:this.getThemeColor("--node-header-selected")||"#EB5601",nodeBorder:this.getThemeColor("--node-border")||"#e6e4e1",gridLine:this.getThemeColor("--grid-line")||"#e6e4e1"}}init(){var e,t,i;if(window.__CONVEX_CONFIG__)this.config=window.__CONVEX_CONFIG__;else{const o=new URLSearchParams(window.location.search).get("config");if(o)try{this.config=JSON.parse(decodeURIComponent(o))}catch(s){console.error("Failed to parse config:",s)}}this.pageSize=((e=this.config)==null?void 0:e.pageSize)||50,this.render(),this.setupKeyboardShortcuts(),(t=this.config)!=null&&t.selectedTable?this.selectedTable=this.config.selectedTable:(i=this.config)!=null&&i.tables&&this.config.tables.length>0&&(this.selectedTable=this.config.tables[0].name),this.viewMode==="graph"&&this.initGraphView()}render(){var n,o;const e=document.getElementById("app");if(!e)return;const t=((n=this.config)==null?void 0:n.deploymentUrl)||"Not connected",i=!!((o=this.config)!=null&&o.deploymentUrl);e.innerHTML=`
      <div class="app-container ${this.viewMode==="graph"?"graph-mode":"list-mode"}">
        <div class="header">
          <h1>
            <span class="status-dot ${i?"":"error"}"></span>
            Schema Browser
          </h1>
          <div class="header-info">
            <span class="deployment-url">${t}</span>
          </div>
          <div class="view-toggle">
            <button class="view-btn ${this.viewMode==="list"?"active":""}" data-view="list" title="List View">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2 3h12v2H2V3zm0 4h12v2H2V7zm0 4h12v2H2v-2z"/>
              </svg>
            </button>
            <button class="view-btn ${this.viewMode==="graph"?"active":""}" data-view="graph" title="Graph View">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="4" cy="4" r="2"/>
                <circle cx="12" cy="4" r="2"/>
                <circle cx="8" cy="12" r="2"/>
                <path d="M4 6v4l4 2M12 6v4l-4 2" stroke="currentColor" stroke-width="1.5" fill="none"/>
              </svg>
            </button>
          </div>
          <div class="header-actions">
            <button class="theme-toggle" id="themeToggle" title="Toggle dark mode">
              <svg class="moon-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
              <svg class="sun-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="5"/>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
            </button>
            <button class="btn" id="refreshBtn" title="Refresh">↻</button>
          </div>
        </div>

        ${this.viewMode==="graph"?this.renderGraphView():this.renderListView()}
      </div>
    `,this.setupEventListeners(),this.viewMode==="list"?(this.renderTableList(),this.selectedTable&&this.selectTable(this.selectedTable),this.setupListViewEventListeners()):this.initGraphView()}renderListView(){var t,i;return`
      <div class="main list-view">
        <div class="sidebar-container ${this.sidebarCollapsed?"collapsed":""}" id="sidebarContainer">
          <div class="sidebar" style="width: ${this.sidebarWidth}px">
            <div class="sidebar-header">
              <span>TABLES</span>
              <span id="tableCount">${((i=(t=this.config)==null?void 0:t.tables)==null?void 0:i.length)||0}</span>
              <button class="sidebar-collapse-btn" id="sidebarToggle" title="${this.sidebarCollapsed?"Expand":"Collapse"}">
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
    `}renderListViewContent(){var o,s,a,r;if(!this.selectedTable)return`
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
      `;const e=(s=(o=this.config)==null?void 0:o.tables)==null?void 0:s.find(l=>l.name===this.selectedTable),t=((r=(a=this.config)==null?void 0:a.allDocuments)==null?void 0:r[this.selectedTable])||(e==null?void 0:e.documents)||[],i=(e==null?void 0:e.inferredFields)||[],n=(e==null?void 0:e.documentCount)||0;return`
      <div class="table-header">
        <div class="table-header-title">${this.selectedTable}</div>
        <div class="table-header-meta">
          <span>${this.formatCount(n)} documents</span>
          ${e!=null&&e.hasIndexes?'<span class="badge">Has indexes</span>':""}
          <span class="badge">${i.length} fields</span>
        </div>
      </div>
      <div class="content-split">
        <div class="schema-sidebar">
          <div class="schema-sidebar-header">
            <span>Schema</span>
            <span class="field-count-badge">${i.length}</span>
          </div>
          <div class="schema-fields-list">
            ${this.renderSchemaFieldsList(i)}
          </div>
          ${e!=null&&e.hasIndexes?this.renderIndexesSection(e):""}
        </div>
        <div class="documents-main">
          <div class="documents-toolbar">
            <div class="documents-toolbar-title">
              Documents
              <span class="doc-count">(${this.formatCount(t.length)} total)</span>
            </div>
          </div>
          <div class="documents-table-wrapper" id="documentsTableWrapper">
            ${this.renderDocumentsTable(t)}
          </div>
          ${this.renderPaginationBar(t)}
        </div>
      </div>
    `}renderSchemaFieldsList(e){if(!e||e.length===0)return'<div style="padding: 16px; color: var(--text-secondary);">No schema data available</div>';const t=["_id","_creationTime"];return[...e].sort((n,o)=>{const s=t.includes(n.name),a=t.includes(o.name);return s&&!a?-1:!s&&a?1:n.name.localeCompare(o.name)}).map(n=>`
        <div class="schema-field-item">
          <span class="schema-field-name ${t.includes(n.name)?"system-field":""}">
            ${n.name}
            ${n.optional?'<span class="schema-field-optional">?</span>':""}
          </span>
          <span class="schema-field-type">${n.type}</span>
        </div>
      `).join("")}renderIndexesSection(e){return!e.indexes||e.indexes.length===0?"":`
      <div class="schema-indexes">
        <div class="schema-indexes-title">Indexes</div>
        ${e.indexes.map(t=>`
          <div class="schema-index-item">${t}</div>
        `).join("")}
      </div>
    `}renderDocumentsTable(e){const t=(this.currentPage-1)*this.pageSize,i=t+this.pageSize,n=e.slice(t,i);if(n.length===0)return`
        <div class="documents-empty">
          <div class="documents-empty-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
            </svg>
          </div>
          <h3>No Documents</h3>
          <p>This table doesn't have any documents yet.</p>
        </div>
      `;const o=[...new Set(n.flatMap(s=>Object.keys(s)))];return o.sort((s,a)=>{const r=s.startsWith("_"),l=a.startsWith("_");return r&&!l?-1:!r&&l?1:s.localeCompare(a)}),`
      <table>
        <thead>
          <tr>${o.map(s=>`<th>${s}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${n.map(s=>`
            <tr>
              ${o.map(a=>{const r=s[a],l=a==="_id",d=r==null;return`<td class="${[l?"id-cell":"",d?"null-value":""].filter(Boolean).join(" ")}">${this.formatValue(r)}</td>`}).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    `}renderPaginationBar(e){const t=Math.ceil(e.length/this.pageSize)||1,i=(this.currentPage-1)*this.pageSize+1,n=Math.min(this.currentPage*this.pageSize,e.length);return`
      <div class="pagination-bar">
        <div class="pagination-info">
          ${e.length>0?`Showing ${i}-${n} of ${e.length}`:"No documents"}
        </div>
        <div class="pagination-controls">
          <button id="prevPage" ${this.currentPage<=1?"disabled":""}>‹</button>
          <span class="page-indicator">Page ${this.currentPage} of ${t}</span>
          <button id="nextPage" ${this.currentPage>=t?"disabled":""}>›</button>
        </div>
      </div>
    `}renderGraphView(){var i;const e=this.sidebarCollapsed?"collapsed":"",t=this.showCodePanel?"":"hidden";return(i=this.config)!=null&&i.deploymentUrl,`
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
          <div class="sidebar-container ${e} ${t}" id="sidebarContainer">
            <div class="resize-handle resize-handle-left" id="resizeHandle"></div>
            <div class="code-panel" id="codePanel" style="width: ${this.codePanelWidth}px">
              <div class="code-header">
                <span>Schema</span>
                <span class="code-filename">${this.selectedTable||"schema"}.json</span>
              </div>
              <div class="code-content" id="codeContent">
                <pre><code id="codeBlock">${this.generateSchemaCode()}</code></pre>
              </div>
            </div>
            <button class="sidebar-toggle sidebar-toggle-right" id="sidebarToggle" title="${this.sidebarCollapsed?"Show panel":"Hide panel"}">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 2L10 7L5 12"/>
              </svg>
            </button>
          </div>
        </div>
        ${this.renderExportMenu()}
        ${this.renderFilterDropdown()}
      </div>
    `}renderEnhancedSidebar(){var s,a;const e=((s=this.config)==null?void 0:s.deploymentUrl)||"Not connected",t=!!((a=this.config)!=null&&a.deploymentUrl),i=this.getSortedTables(),n=this.getFilteredTablesForSidebar(i);return`
      <div class="enhanced-sidebar ${this.graphSidebarCollapsed?"collapsed":""}" id="enhancedSidebar">
        <button class="graph-sidebar-toggle" id="graphSidebarToggle" title="${this.graphSidebarCollapsed?"Expand sidebar":"Collapse sidebar"}">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2">
            <path d="${this.graphSidebarCollapsed?"M5 2L10 7L5 12":"M9 2L4 7L9 12"}"/>
          </svg>
        </button>
        <div class="sidebar-deployment">
          <div class="deployment-status">
            <span class="status-indicator ${t?"connected":"error"}"></span>
            <span class="deployment-label">Convex</span>
          </div>
          <div class="deployment-url-small">${this.truncateUrl(e)}</div>
        </div>

        <div class="sidebar-section ${this.sidebarSections.tables.collapsed?"collapsed":""}" data-section="tables">
          <div class="section-header" id="sectionHeaderTables">
            <svg class="section-chevron" width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M4 2L8 6L4 10"/>
            </svg>
            <span class="section-title">TABLES</span>
            <span class="section-count">${i.length}</span>
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
              ${n.map(r=>this.renderSidebarTableItem(r)).join("")}
            </ul>
          </div>
        </div>

        <div class="sidebar-section ${this.sidebarSections.convex.collapsed?"collapsed":""}" data-section="convex">
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
                <span class="info-value">${i.length}</span>
              </div>
              <div class="convex-info-item">
                <span class="info-label">Total Documents</span>
                <span class="info-value">${this.formatCount(i.reduce((r,l)=>r+l.documentCount,0))}</span>
              </div>
              <div class="convex-info-item">
                <span class="info-label">Relationships</span>
                <span class="info-value">${this.graphEdges.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `}renderSidebarTableItem(e){var s;const t=e.name===this.selectedTable,i=this.graphNodes.find(a=>a.id===e.name),n=(i==null?void 0:i.visible)!==!1,o=((s=e.inferredFields)==null?void 0:s.length)||0;return`
      <li class="sidebar-table-item ${t?"active":""} ${n?"":"filtered-out"}" data-table="${e.name}">
        <div class="table-item-main">
          <svg class="table-icon" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="1" y="1" width="12" height="12" rx="2"/>
            <path d="M1 5H13M5 5V13"/>
          </svg>
          <span class="table-name">${e.name}</span>
        </div>
        <div class="table-item-meta">
          <span class="field-count" title="${o} fields">${o}</span>
          <span class="doc-count" title="${e.documentCount} documents">${this.formatCount(e.documentCount)}</span>
        </div>
      </li>
    `}getSortedTables(){var t;const e=[...((t=this.config)==null?void 0:t.tables)||[]];return e.sort((i,n)=>{var s,a;let o=0;switch(this.tableSortBy){case"name":o=i.name.localeCompare(n.name);break;case"count":o=i.documentCount-n.documentCount;break;case"fields":o=(((s=i.inferredFields)==null?void 0:s.length)||0)-(((a=n.inferredFields)==null?void 0:a.length)||0);break}return this.tableSortOrder==="asc"?o:-o}),e}getFilteredTablesForSidebar(e){return this.searchQuery?e.filter(t=>t.name.toLowerCase().includes(this.searchQuery.toLowerCase())):e}truncateUrl(e){if(e.length<=35)return e;const t=e.match(/https?:\/\/([^\/]+)/);if(t){const i=t[1];return i.length>35?i.slice(0,32)+"...":i}return e.slice(0,32)+"..."}toggleSidebarSection(e){this.sidebarSections[e].collapsed=!this.sidebarSections[e].collapsed;const t=document.querySelector(`[data-section="${e}"]`);t&&t.classList.toggle("collapsed",this.sidebarSections[e].collapsed)}cycleSortOrder(){const e=[{by:"name",order:"asc"},{by:"name",order:"desc"},{by:"count",order:"desc"},{by:"count",order:"asc"},{by:"fields",order:"desc"},{by:"fields",order:"asc"}],i=(e.findIndex(n=>n.by===this.tableSortBy&&n.order===this.tableSortOrder)+1)%e.length;this.tableSortBy=e[i].by,this.tableSortOrder=e[i].order,this.updateSidebarTableList()}updateSidebarTableList(){const e=document.getElementById("graphTableList");if(e){const t=this.getSortedTables(),i=this.getFilteredTablesForSidebar(t);e.innerHTML=i.map(n=>this.renderSidebarTableItem(n)).join(""),this.setupSidebarTableEvents()}}setupSidebarTableEvents(){document.querySelectorAll(".sidebar-table-item").forEach(e=>{e.addEventListener("click",()=>{const t=e.dataset.table;if(t){this.selectTable(t);const i=this.graphNodes.find(n=>n.id===t);i&&this.centerOnNode(i)}})})}centerOnNode(e){if(!this.canvas)return;const t=this.canvas.width/this.dpr,i=this.canvas.height/this.dpr,n=e.x+e.width/2,o=e.y+e.height/2;this.panX=t/2-n*this.zoom,this.panY=i/2-o*this.zoom,this.drawGraph()}showTooltip(e,t,i,n,o){this.tooltipTimeout&&clearTimeout(this.tooltipTimeout),this.tooltipTimeout=window.setTimeout(()=>{this.tooltip={visible:!0,x:e,y:t,title:i,content:n,type:o},this.renderTooltip()},400)}hideTooltip(){var e;this.tooltipTimeout&&(clearTimeout(this.tooltipTimeout),this.tooltipTimeout=null),this.tooltip=null,(e=document.getElementById("tooltip"))==null||e.remove()}renderTooltip(){var a;if(!this.tooltip)return;(a=document.getElementById("tooltip"))==null||a.remove();const e=document.createElement("div");e.id="tooltip",e.className=`tooltip tooltip-${this.tooltip.type}`,e.innerHTML=`
      <div class="tooltip-title">${this.tooltip.title}</div>
      <div class="tooltip-content">${this.tooltip.content}</div>
    `;let t=this.tooltip.x+12,i=this.tooltip.y+12;document.body.appendChild(e);const n=e.getBoundingClientRect(),o=window.innerWidth,s=window.innerHeight;t+n.width>o-10&&(t=this.tooltip.x-n.width-12),i+n.height>s-10&&(i=this.tooltip.y-n.height-12),e.style.left=`${t}px`,e.style.top=`${i}px`}getFieldTooltipContent(e,t){const i={_id:{title:"Document ID",content:`Unique identifier auto-generated by Convex.<br><code>Id&lt;"${t}"&gt;</code>`},_creationTime:{title:"Creation Timestamp",content:"Unix timestamp (ms) when this document was created.<br>Auto-set by Convex on insert."}};if(i[e.name])return i[e.name];if(e.type.includes("Id<")){const n=e.type.match(/Id<["'](\w+)["']>/);return{title:"Reference Field",content:`Links to the <strong>${n?n[1]:"unknown"}</strong> table.<br>Type: <code>${e.type}</code>`}}return{title:e.name,content:`Type: <code>${e.type}</code>${e.optional?"<br><em>Optional field</em>":""}`}}getFieldAtPosition(e,t){const i=this.getSortedFields(e.table.inferredFields||[]),n=44,o=24,s=t-e.y-n;if(s<0)return null;const a=Math.floor(s/o);return a>=0&&a<Math.min(i.length,12)?i[a]:null}renderToolbar(){const e=this.historyIndex>0,t=this.historyIndex<this.positionHistory.length-1;return`
      <div class="toolbar">
        <div class="toolbar-group">
          <button class="toolbar-btn ${this.showCodePanel?"active":""}" id="viewCodeBtn" title="Toggle Code Panel (C)">
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
          <button class="toolbar-btn icon-only" id="undoBtn" title="Undo (Cmd+Z)" ${e?"":"disabled"}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M4 6H11C12.6569 6 14 7.34315 14 9V9C14 10.6569 12.6569 12 11 12H8M4 6L7 3M4 6L7 9"/>
            </svg>
          </button>
          <button class="toolbar-btn icon-only" id="redoBtn" title="Redo (Cmd+Shift+Z)" ${t?"":"disabled"}>
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
          <span class="zoom-display" id="zoomDisplay">${Math.round(this.zoom*100)}%</span>
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
    `}renderZoomControls(){return`
      <div class="zoom-panel" id="zoomPanel">
        <button class="zoom-btn" id="zoomIn" title="Zoom In (+)">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M8 4V12M4 8H12"/>
          </svg>
        </button>
        <div class="zoom-level" id="zoomLevel">${Math.round(this.zoom*100)}%</div>
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
    `}renderExportMenu(){return this.showExportMenu?`
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
    `:""}renderFilterDropdown(){return this.showFilterDropdown?`
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
              <option value="" ${this.filterState.fieldType===""?"selected":""}>All types</option>
              <option value="string" ${this.filterState.fieldType==="string"?"selected":""}>string</option>
              <option value="number" ${this.filterState.fieldType==="number"?"selected":""}>number</option>
              <option value="boolean" ${this.filterState.fieldType==="boolean"?"selected":""}>boolean</option>
              <option value="Id" ${this.filterState.fieldType==="Id"?"selected":""}>Id (reference)</option>
              <option value="object" ${this.filterState.fieldType==="object"?"selected":""}>object</option>
              <option value="array" ${this.filterState.fieldType==="array"?"selected":""}>array</option>
            </select>
          </div>
          <div class="filter-group checkbox">
            <label>
              <input type="checkbox" id="filterShowEmpty" ${this.filterState.showEmpty?"checked":""}>
              Show empty tables
            </label>
          </div>
        </div>
        <div class="filter-footer">
          <button class="btn btn-secondary" id="filterClear">Clear</button>
          <button class="btn btn-primary" id="filterApply">Apply</button>
        </div>
      </div>
    `:""}generateSchemaCode(){var n,o,s;const e=((n=this.config)==null?void 0:n.tables)||[],t=((o=this.config)==null?void 0:o.allDocuments)||{},i={};for(const a of e){const r={};if(a.inferredFields)for(const l of a.inferredFields)r[l.name]=l.type+(l.optional?"?":"");i[a.name]={fields:r,documentCount:a.documentCount,sample:((s=t[a.name])==null?void 0:s[0])||null}}return this.syntaxHighlight(JSON.stringify(i,null,2))}syntaxHighlight(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?)/g,t=>{let i="json-string";return/:$/.test(t)&&(i="json-key"),`<span class="${i}">${t}</span>`}).replace(/\b(true|false)\b/g,'<span class="json-boolean">$1</span>').replace(/\b(null)\b/g,'<span class="json-null">$1</span>').replace(/\b(-?\d+\.?\d*)\b/g,'<span class="json-number">$1</span>')}initGraphView(){if(this.canvas=document.getElementById("graphCanvas"),!this.canvas)return;this.dpr=window.devicePixelRatio||1;const e=this.canvas.parentElement;if(e){const t=e.clientWidth,i=e.clientHeight;this.canvas.width=t*this.dpr,this.canvas.height=i*this.dpr,this.canvas.style.width=t+"px",this.canvas.style.height=i+"px"}this.ctx=this.canvas.getContext("2d"),this.ctx&&(this.ctx.scale(this.dpr,this.dpr),this.calculateGraphLayout(),this.setupGraphEvents(),this.drawGraph(),this.savePositionState(),window.addEventListener("resize",()=>{if(this.canvas&&this.canvas.parentElement&&this.ctx){const t=this.canvas.parentElement.clientWidth,i=this.canvas.parentElement.clientHeight;this.dpr=window.devicePixelRatio||1,this.canvas.width=t*this.dpr,this.canvas.height=i*this.dpr,this.canvas.style.width=t+"px",this.canvas.style.height=i+"px",this.ctx.scale(this.dpr,this.dpr),this.drawGraph()}}))}calculateGraphLayout(){var a,r;const e=((a=this.config)==null?void 0:a.tables)||[];(r=this.config)!=null&&r.allDocuments,this.graphNodes=[],this.graphEdges=[];const t=220,i=160,n=80,o=60,s=Math.ceil(Math.sqrt(e.length));e.forEach((l,d)=>{const h=d%s,c=Math.floor(d/s);this.graphNodes.push({id:l.name,x:100+h*(t+n),y:100+c*(i+o),width:t,height:i,table:l})});for(const l of this.graphNodes){const d=l.table.inferredFields||[];for(const h of d){const c=h.type.match(/Id<["'](\w+)["']>/);if(c){const u=c[1],g=this.graphNodes.find(b=>b.id===u);if(g&&g.id!==l.id){this.graphEdges.push({from:l.id,to:g.id,fromField:h.name,toField:"_id",inferred:!1});continue}}const p=h.name.toLowerCase();for(const u of this.graphNodes){if(u.id===l.id)continue;const g=u.id.toLowerCase(),b=g.endsWith("s")?g.slice(0,-1):g;(p===g+"id"||p===b+"id"||p===b+"_id"||p===g+"_id")&&(this.graphEdges.some(w=>w.from===l.id&&w.to===u.id&&w.fromField===h.name)||this.graphEdges.push({from:l.id,to:u.id,fromField:h.name,toField:"_id",inferred:!0}))}}}if(this.canvas&&this.graphNodes.length>0){const l=Math.min(...this.graphNodes.map(f=>f.x)),d=Math.max(...this.graphNodes.map(f=>f.x+f.width)),h=Math.min(...this.graphNodes.map(f=>f.y)),c=Math.max(...this.graphNodes.map(f=>f.y+f.height)),p=d-l,u=c-h,g=this.canvas.width/this.dpr,b=this.canvas.height/this.dpr;this.panX=(g-p)/2-l,this.panY=(b-u)/2-h}}setupGraphEvents(){var i,n,o,s;if(!this.canvas)return;let e=0,t=0;this.canvas.addEventListener("mousedown",a=>{const r=this.canvas.getBoundingClientRect(),l=(a.clientX-r.left-this.panX)/this.zoom,d=(a.clientY-r.top-this.panY)/this.zoom;this.selectedNode=this.graphNodes.find(h=>l>=h.x&&l<=h.x+h.width&&d>=h.y&&d<=h.y+h.height)||null,this.selectedNode&&(this.selectTable(this.selectedNode.id),this.updateCodePanel()),this.isDragging=!0,e=a.clientX,t=a.clientY,this.dragStartX=a.clientX,this.dragStartY=a.clientY}),this.canvas.addEventListener("mousemove",a=>{const r=this.canvas.getBoundingClientRect(),l=(a.clientX-r.left-this.panX)/this.zoom,d=(a.clientY-r.top-this.panY)/this.zoom,h=this.graphNodes.find(c=>c.visible!==!1&&l>=c.x&&l<=c.x+c.width&&d>=c.y&&d<=c.y+c.height)||null;if(h!==this.hoveredNode&&(this.hoveredNode=h,this.canvas.style.cursor=h?"pointer":"grab",this.hideTooltip(),this.drawGraph()),h&&!this.isDragging){const c=this.getFieldAtPosition(h,d);if(c){const p=this.getFieldTooltipContent(c,h.table.name);this.showTooltip(a.clientX,a.clientY,p.title,p.content,"field")}else this.hideTooltip()}else h||this.hideTooltip();if(this.isDragging){if(this.hideTooltip(),this.selectedNode){const c=(a.clientX-e)/this.zoom,p=(a.clientY-t)/this.zoom;this.selectedNode.x+=c,this.selectedNode.y+=p}else this.panX+=a.clientX-e,this.panY+=a.clientY-t;e=a.clientX,t=a.clientY,this.drawGraph()}}),this.canvas.addEventListener("mouseup",a=>{this.isDragging&&(this.selectedNode||Math.abs(a.clientX-this.dragStartX)>5||Math.abs(a.clientY-this.dragStartY)>5)&&this.savePositionState(),this.isDragging=!1,this.selectedNode=null}),this.canvas.addEventListener("mouseleave",()=>{this.isDragging=!1,this.selectedNode=null,this.hoveredNode=null,this.hideTooltip(),this.drawGraph()}),this.canvas.addEventListener("wheel",a=>{a.preventDefault();const r=this.canvas.getBoundingClientRect(),l=a.clientX-r.left,d=a.clientY-r.top,h=this.zoom,c=a.deltaY>0?.9:1.1;this.zoom=Math.max(.25,Math.min(2,this.zoom*c)),this.panX=l-(l-this.panX)*(this.zoom/h),this.panY=d-(d-this.panY)*(this.zoom/h),this.drawGraph()}),(i=document.getElementById("zoomIn"))==null||i.addEventListener("click",()=>{this.zoom=Math.min(2,this.zoom*1.2),this.updateZoomDisplay(),this.drawGraph()}),(n=document.getElementById("zoomOut"))==null||n.addEventListener("click",()=>{this.zoom=Math.max(.25,this.zoom/1.2),this.updateZoomDisplay(),this.drawGraph()}),(o=document.getElementById("fitView"))==null||o.addEventListener("click",()=>{this.fitToView()}),(s=document.getElementById("resetView"))==null||s.addEventListener("click",()=>{this.zoom=1,this.calculateGraphLayout(),this.updateZoomDisplay(),this.drawGraph()})}drawGraph(){if(!this.ctx||!this.canvas)return;const e=this.ctx,t=this.getThemeColors();this.canvas.width/this.dpr,this.canvas.height/this.dpr,e.save(),e.setTransform(1,0,0,1,0,0),e.fillStyle=t.bgPrimary,e.fillRect(0,0,this.canvas.width,this.canvas.height),e.restore(),e.save(),e.translate(this.panX,this.panY),e.scale(this.zoom,this.zoom),this.drawGridPattern(e);for(const i of this.graphEdges){const n=this.graphNodes.find(s=>s.id===i.from),o=this.graphNodes.find(s=>s.id===i.to);n&&o&&n.visible!==!1&&o.visible!==!1&&this.drawEdge(e,n,o,i)}for(const i of this.graphNodes)i.visible!==!1&&this.drawNode(e,i);e.restore()}drawGridPattern(e){const t=this.getThemeColors(),i=40,n=-this.panX/this.zoom-1e3,o=-this.panY/this.zoom-1e3,s=n+3e3,a=o+3e3;e.strokeStyle=t.gridLine,e.lineWidth=.5;for(let r=Math.floor(n/i)*i;r<s;r+=i)e.beginPath(),e.moveTo(r,o),e.lineTo(r,a),e.stroke();for(let r=Math.floor(o/i)*i;r<a;r+=i)e.beginPath(),e.moveTo(n,r),e.lineTo(s,r),e.stroke()}drawNode(e,t){const i=this.getThemeColors(),n=this.currentTheme==="dark",o=this.hoveredNode===t,s=this.selectedTable===t.id,a=t.x,r=t.y,l=t.width,d=10,h=this.getSortedFields(t.table.inferredFields||[]),c=12,p=h.slice(0,c),u=h.length>c,g=44,b=24,f=12,w=u?28:0,y=g+p.length*b+f+w;t.height=y;const v=n?.4:.08,C=n?.5:.15;e.shadowColor=o||s?`rgba(235, 86, 1, ${C})`:`rgba(0, 0, 0, ${v})`,e.shadowBlur=o?16:8,e.shadowOffsetX=0,e.shadowOffsetY=o?6:3,e.fillStyle=i.nodeBg,e.beginPath(),e.roundRect(a,r,l,y,d),e.fill(),e.shadowColor="transparent",e.strokeStyle=s?i.accentInteractive:o?i.accent:i.nodeBorder,e.lineWidth=s?2:1,e.stroke();const S=e.createLinearGradient(a,r,a,r+g);s?(S.addColorStop(0,i.accentInteractive),S.addColorStop(1,i.accentHover)):(S.addColorStop(0,i.nodeHeader),S.addColorStop(1,n?i.bgSecondary:i.bgHover)),e.fillStyle=S,e.beginPath(),e.roundRect(a,r,l,g,[d,d,0,0]),e.fill(),e.strokeStyle=s?"rgba(255,255,255,0.1)":i.border,e.lineWidth=1,e.beginPath(),e.moveTo(a,r+g),e.lineTo(a+l,r+g),e.stroke(),e.fillStyle=s?"#ffffff":i.textPrimary,e.font='bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',e.textBaseline="middle";const k=t.table.name,$=l-100;let L=k;if(e.measureText(k).width>$){for(;e.measureText(L+"...").width>$&&L.length>0;)L=L.slice(0,-1);L+="..."}e.fillText(L,a+14,r+g/2);const I=`${h.length} fields`;e.font="11px -apple-system, BlinkMacSystemFont, sans-serif";const B=e.measureText(I).width+14;e.fillStyle=s?"rgba(255,255,255,0.25)":n?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.06)",e.beginPath(),e.roundRect(a+l-B-10,r+(g-20)/2,B,20,10),e.fill(),e.fillStyle=s?"rgba(255,255,255,0.9)":i.textSecondary,e.textAlign="center",e.fillText(I,a+l-B/2-10,r+g/2),e.textAlign="left";let M=r+g+8;for(const T of p){const z=T.name.startsWith("_"),P=T.name==="_id",N=T.type.includes("Id<");o&&(e.fillStyle=n?"rgba(255, 255, 255, 0.03)":"rgba(0, 0, 0, 0.02)",e.fillRect(a+4,M-6,l-8,b)),P&&this.drawKeyIcon(e,a+12,M+2,s,i);const H=P?a+28:a+14;if(e.font='12px "SF Mono", Monaco, "Cascadia Code", monospace',z?e.fillStyle=i.textMuted:N?e.fillStyle=i.accent:e.fillStyle=i.accentInteractive,e.fillText(T.name,H,M+4),T.optional){const D=e.measureText(T.name).width;e.fillStyle=i.warning,e.font="10px -apple-system, sans-serif",e.fillText("?",H+D+2,M+3)}e.font='11px "SF Mono", Monaco, "Cascadia Code", monospace',e.fillStyle=z?i.textMuted:i.textSecondary,e.textAlign="right";let E=T.type;const F=80;if(e.measureText(E).width>F){for(;e.measureText(E+"...").width>F&&E.length>0;)E=E.slice(0,-1);E+="..."}e.fillText(E,a+l-12,M+4),e.textAlign="left",M+=b}if(u){const T=h.length-c;e.fillStyle=i.bgSecondary,e.beginPath(),e.roundRect(a+4,M,l-8,24,[0,0,d-4,d-4]),e.fill(),e.fillStyle=i.textSecondary,e.font="11px -apple-system, BlinkMacSystemFont, sans-serif",e.textAlign="center",e.fillText(`+ ${T} more field${T>1?"s":""}`,a+l/2,M+14),e.textAlign="left"}}getSortedFields(e){const t=["_id","_creationTime"];return[...e].sort((i,n)=>{const o=t.includes(i.name),s=t.includes(n.name);return o&&!s?-1:!o&&s?1:o&&s?t.indexOf(i.name)-t.indexOf(n.name):i.name.localeCompare(n.name)})}drawKeyIcon(e,t,i,n,o){e.save(),e.fillStyle=n?o.accentInteractive:o.warning,e.beginPath(),e.arc(t+4,i,4,0,Math.PI*2),e.fill(),e.fillRect(t+7,i-1,6,2),e.fillRect(t+10,i-1,1,3),e.fillRect(t+12,i-1,1,2),e.restore()}drawEdge(e,t,i,n){const o=this.hoveredNode&&(this.hoveredNode.id===n.from||this.hoveredNode.id===n.to),s=this.calculateAttachmentPoints(t,i),a=Math.sqrt(Math.pow(s.toX-s.fromX,2)+Math.pow(s.toY-s.fromY,2)),r=Math.min(a*.4,100);let l,d,h,c;s.fromSide==="right"?(l=s.fromX+r,d=s.fromY):s.fromSide==="left"?(l=s.fromX-r,d=s.fromY):s.fromSide==="bottom"?(l=s.fromX,d=s.fromY+r):(l=s.fromX,d=s.fromY-r),s.toSide==="left"?(h=s.toX-r,c=s.toY):s.toSide==="right"?(h=s.toX+r,c=s.toY):s.toSide==="top"?(h=s.toX,c=s.toY-r):(h=s.toX,c=s.toY+r),o&&(e.save(),e.shadowColor="rgba(235, 86, 1, 0.3)",e.shadowBlur=8,e.shadowOffsetX=0,e.shadowOffsetY=0),e.strokeStyle=o?"#EB5601":"#8b7355",e.lineWidth=o?2.5:1.5,n.inferred?e.setLineDash([6,4]):e.setLineDash([]),e.beginPath(),e.moveTo(s.fromX,s.fromY),e.bezierCurveTo(l,d,h,c,s.toX,s.toY),e.stroke(),e.setLineDash([]),o&&e.restore(),this.drawArrowHead(e,h,c,s.toX,s.toY,o);const p=.5,u=this.bezierPoint(s.fromX,l,h,s.toX,p),g=this.bezierPoint(s.fromY,d,c,s.toY,p)-12;e.font="10px -apple-system, BlinkMacSystemFont, sans-serif";const b=n.fromField,f=e.measureText(b).width+10,w=16;e.fillStyle=o?"rgba(235, 86, 1, 0.1)":"rgba(255, 255, 255, 0.95)",e.beginPath(),e.roundRect(u-f/2,g-w/2,f,w,4),e.fill(),e.strokeStyle=o?"rgba(235, 86, 1, 0.3)":"#e6e4e1",e.lineWidth=1,e.stroke(),e.fillStyle=o?"#EB5601":"#6b6b6b",e.textAlign="center",e.textBaseline="middle",e.fillText(b,u,g),e.textAlign="left",e.textBaseline="alphabetic"}calculateAttachmentPoints(e,t){const i=e.x+e.width/2,n=e.y+e.height/2,o=t.x+t.width/2,s=t.y+t.height/2,a=o-i,r=s-n;let l,d,h,c,p,u;return Math.abs(a)>Math.abs(r)?a>0?(l="right",d="left",h=e.x+e.width,c=n,p=t.x,u=s):(l="left",d="right",h=e.x,c=n,p=t.x+t.width,u=s):r>0?(l="bottom",d="top",h=i,c=e.y+e.height,p=o,u=t.y):(l="top",d="bottom",h=i,c=e.y,p=o,u=t.y+t.height),{fromX:h,fromY:c,fromSide:l,toX:p,toY:u,toSide:d}}drawArrowHead(e,t,i,n,o,s){const a=Math.atan2(o-i,n-t),r=s?10:8;e.fillStyle=s?"#EB5601":"#8b7355",e.beginPath(),e.moveTo(n,o),e.lineTo(n-r*Math.cos(a-Math.PI/6),o-r*Math.sin(a-Math.PI/6)),e.lineTo(n-r*Math.cos(a+Math.PI/6),o-r*Math.sin(a+Math.PI/6)),e.closePath(),e.fill()}bezierPoint(e,t,i,n,o){const s=1-o;return s*s*s*e+3*s*s*o*t+3*s*o*o*i+o*o*o*n}updateCodePanel(){var i,n,o,s;const e=document.getElementById("codeBlock"),t=document.querySelector(".code-filename");if(e&&this.selectedTable){const a=(n=(i=this.config)==null?void 0:i.tables)==null?void 0:n.find(l=>l.name===this.selectedTable),r=((s=(o=this.config)==null?void 0:o.allDocuments)==null?void 0:s[this.selectedTable])||[];if(a){const l={table:this.selectedTable,documentCount:a.documentCount,fields:{}};if(a.inferredFields)for(const d of a.inferredFields)l.fields[d.name]={type:d.type,required:!d.optional};r.length>0&&(l.sample=r[0]),e.innerHTML=this.syntaxHighlight(JSON.stringify(l,null,2))}}t&&this.selectedTable&&(t.textContent=`${this.selectedTable}.json`)}savePositionState(){const e={nodes:this.graphNodes.map(t=>({id:t.id,x:t.x,y:t.y})),panX:this.panX,panY:this.panY,zoom:this.zoom};this.historyIndex<this.positionHistory.length-1&&(this.positionHistory=this.positionHistory.slice(0,this.historyIndex+1)),this.positionHistory.push(e),this.positionHistory.length>this.maxHistorySize?this.positionHistory.shift():this.historyIndex++,this.updateUndoRedoButtons()}undo(){this.historyIndex<=0||(this.historyIndex--,this.restorePositionState(this.positionHistory[this.historyIndex]),this.updateUndoRedoButtons())}redo(){this.historyIndex>=this.positionHistory.length-1||(this.historyIndex++,this.restorePositionState(this.positionHistory[this.historyIndex]),this.updateUndoRedoButtons())}restorePositionState(e){for(const t of e.nodes){const i=this.graphNodes.find(n=>n.id===t.id);i&&(i.x=t.x,i.y=t.y)}this.panX=e.panX,this.panY=e.panY,this.zoom=e.zoom,this.updateZoomDisplay(),this.drawGraph()}updateUndoRedoButtons(){const e=document.getElementById("undoBtn"),t=document.getElementById("redoBtn");e&&(e.disabled=this.historyIndex<=0),t&&(t.disabled=this.historyIndex>=this.positionHistory.length-1)}fitToView(){if(this.graphNodes.length===0)return;const e=this.graphNodes.filter(p=>p.visible!==!1);if(e.length===0)return;const t=60,i=Math.min(...e.map(p=>p.x))-t,n=Math.max(...e.map(p=>p.x+p.width))+t,o=Math.min(...e.map(p=>p.y))-t,s=Math.max(...e.map(p=>p.y+p.height))+t,a=n-i,r=s-o;if(!this.canvas)return;const l=this.canvas.width/this.dpr,d=this.canvas.height/this.dpr,h=l/a,c=d/r;this.zoom=Math.min(h,c,1.5),this.zoom=Math.max(this.zoom,.25),this.panX=(l-a*this.zoom)/2-i*this.zoom,this.panY=(d-r*this.zoom)/2-o*this.zoom,this.updateZoomDisplay(),this.drawGraph()}autoArrange(){this.calculateGraphLayout(),this.drawGraph(),this.savePositionState()}updateZoomDisplay(){const e=document.getElementById("zoomLevel"),t=document.getElementById("zoomDisplay"),i=`${Math.round(this.zoom*100)}%`;e&&(e.textContent=i),t&&(t.textContent=i)}toggleCodePanel(){this.showCodePanel=!this.showCodePanel;const e=document.getElementById("sidebarContainer"),t=document.getElementById("viewCodeBtn");e&&e.classList.toggle("hidden",!this.showCodePanel),t&&t.classList.toggle("active",this.showCodePanel),setTimeout(()=>this.resizeCanvas(),50)}toggleExportMenu(){this.showExportMenu=!this.showExportMenu,this.showFilterDropdown=!1,this.renderDropdowns()}toggleFilterDropdown(){this.showFilterDropdown=!this.showFilterDropdown,this.showExportMenu=!1,this.renderDropdowns()}renderDropdowns(){var t,i;(t=document.getElementById("exportMenu"))==null||t.remove(),(i=document.getElementById("filterMenu"))==null||i.remove();const e=document.querySelector(".graph-view");e&&(this.showExportMenu&&(e.insertAdjacentHTML("beforeend",this.renderExportMenu()),this.setupExportMenuEvents()),this.showFilterDropdown&&(e.insertAdjacentHTML("beforeend",this.renderFilterDropdown()),this.setupFilterMenuEvents()))}setupExportMenuEvents(){var e,t,i;(e=document.getElementById("exportJson"))==null||e.addEventListener("click",()=>{this.exportSchema("json"),this.showExportMenu=!1,this.renderDropdowns()}),(t=document.getElementById("exportTs"))==null||t.addEventListener("click",()=>{this.exportSchema("typescript"),this.showExportMenu=!1,this.renderDropdowns()}),(i=document.getElementById("exportPng"))==null||i.addEventListener("click",()=>{this.exportAsPng(),this.showExportMenu=!1,this.renderDropdowns()}),setTimeout(()=>{document.addEventListener("click",this.handleOutsideClick.bind(this),{once:!0})},0)}setupFilterMenuEvents(){var e,t,i;(e=document.getElementById("filterClose"))==null||e.addEventListener("click",()=>{this.showFilterDropdown=!1,this.renderDropdowns()}),(t=document.getElementById("filterApply"))==null||t.addEventListener("click",()=>{this.applyFilters()}),(i=document.getElementById("filterClear"))==null||i.addEventListener("click",()=>{this.clearFilters()})}handleOutsideClick(e){const t=document.getElementById("exportMenu"),i=document.getElementById("exportBtn"),n=document.getElementById("filterMenu"),o=document.getElementById("filterBtn");t&&!t.contains(e.target)&&!(i!=null&&i.contains(e.target))&&(this.showExportMenu=!1,this.renderDropdowns()),n&&!n.contains(e.target)&&!(o!=null&&o.contains(e.target))&&(this.showFilterDropdown=!1,this.renderDropdowns())}exportSchema(e){var s;const t=((s=this.config)==null?void 0:s.tables)||[];let i,n,o;if(e==="json"){const a={};for(const r of t)a[r.name]={documentCount:r.documentCount,fields:(r.inferredFields||[]).reduce((l,d)=>(l[d.name]={type:d.type,required:!d.optional},l),{})};i=JSON.stringify(a,null,2),n="convex-schema.json",o="application/json"}else{const a=['import { defineSchema, defineTable } from "convex/server";','import { v } from "convex/values";',"","export default defineSchema({"];for(const r of t){const l=(r.inferredFields||[]).filter(d=>!d.name.startsWith("_")).map(d=>`    ${d.name}: ${this.toConvexValidator(d.type)}${d.optional?".optional()":""},`).join(`
`);a.push(`  ${r.name}: defineTable({`),l&&a.push(l),a.push("  }),")}a.push("});"),i=a.join(`
`),n="schema.ts",o="text/typescript"}this.downloadFile(i,n,o)}toConvexValidator(e){return e.startsWith("Id<")?`v.id(${e.slice(3,-1)})`:e==="string"?"v.string()":e==="number"?"v.number()":e==="boolean"?"v.boolean()":e==="null"?"v.null()":e.startsWith("array")?"v.array(v.any())":e==="object"?"v.object({})":"v.any()"}exportAsPng(){if(!this.canvas)return;const e=document.createElement("a");e.download="convex-schema-graph.png",e.href=this.canvas.toDataURL("image/png"),e.click()}downloadFile(e,t,i){const n=new Blob([e],{type:i}),o=URL.createObjectURL(n),s=document.createElement("a");s.href=o,s.download=t,s.click(),URL.revokeObjectURL(o)}applyFilters(){var o,s,a,r;const e=((o=document.getElementById("filterTableName"))==null?void 0:o.value)||"",t=((s=document.getElementById("filterFieldName"))==null?void 0:s.value)||"",i=((a=document.getElementById("filterFieldType"))==null?void 0:a.value)||"",n=((r=document.getElementById("filterShowEmpty"))==null?void 0:r.checked)??!0;this.filterState={tableName:e,fieldName:t,fieldType:i,showEmpty:n};for(const l of this.graphNodes){let d=!0;e&&!l.table.name.toLowerCase().includes(e.toLowerCase())&&(d=!1),!n&&l.table.documentCount===0&&(d=!1),d&&(t||i)&&((l.table.inferredFields||[]).some(p=>{const u=!t||p.name.toLowerCase().includes(t.toLowerCase()),g=!i||p.type.toLowerCase().includes(i.toLowerCase());return u&&g})||(d=!1)),l.visible=d}this.drawGraph(),this.showFilterDropdown=!1,this.renderDropdowns()}clearFilters(){this.filterState={tableName:"",fieldName:"",fieldType:"",showEmpty:!0};const e=document.getElementById("filterTableName"),t=document.getElementById("filterFieldName"),i=document.getElementById("filterFieldType"),n=document.getElementById("filterShowEmpty");e&&(e.value=""),t&&(t.value=""),i&&(i.value=""),n&&(n.checked=!0);for(const o of this.graphNodes)o.visible=!0;this.drawGraph()}setupEventListeners(){var e,t,i,n,o,s,a,r,l,d,h,c,p,u,g,b,f,w;if(document.querySelectorAll(".view-btn").forEach(y=>{y.addEventListener("click",v=>{const C=v.currentTarget.dataset.view;C&&C!==this.viewMode&&(this.viewMode=C,this.render())})}),(e=document.getElementById("refreshBtn"))==null||e.addEventListener("click",()=>this.refresh()),(t=document.getElementById("themeToggle"))==null||t.addEventListener("click",()=>this.toggleTheme()),this.viewMode==="graph"){(i=document.getElementById("viewCodeBtn"))==null||i.addEventListener("click",()=>this.toggleCodePanel()),(n=document.getElementById("exportBtn"))==null||n.addEventListener("click",v=>{v.stopPropagation(),this.toggleExportMenu()}),(o=document.getElementById("autoArrangeBtn"))==null||o.addEventListener("click",()=>this.autoArrange()),(s=document.getElementById("undoBtn"))==null||s.addEventListener("click",()=>this.undo()),(a=document.getElementById("redoBtn"))==null||a.addEventListener("click",()=>this.redo()),(r=document.getElementById("filterBtn"))==null||r.addEventListener("click",v=>{v.stopPropagation(),this.toggleFilterDropdown()}),(l=document.getElementById("zoomInToolbar"))==null||l.addEventListener("click",()=>{this.zoom=Math.min(2,this.zoom*1.2),this.updateZoomDisplay(),this.drawGraph()}),(d=document.getElementById("zoomOutToolbar"))==null||d.addEventListener("click",()=>{this.zoom=Math.max(.25,this.zoom/1.2),this.updateZoomDisplay(),this.drawGraph()}),(h=document.getElementById("fitViewBtn"))==null||h.addEventListener("click",()=>this.fitToView()),(c=document.getElementById("sectionHeaderTables"))==null||c.addEventListener("click",()=>{this.toggleSidebarSection("tables")}),(p=document.getElementById("sectionHeaderConvex"))==null||p.addEventListener("click",()=>{this.toggleSidebarSection("convex")}),(u=document.getElementById("sortBtn"))==null||u.addEventListener("click",()=>{this.cycleSortOrder()});const y=document.getElementById("graphSidebarSearch");y==null||y.addEventListener("input",v=>{this.searchQuery=v.target.value.toLowerCase(),this.updateSidebarTableList()}),(g=document.getElementById("graphSidebarToggle"))==null||g.addEventListener("click",()=>{this.graphSidebarCollapsed=!this.graphSidebarCollapsed;const v=document.getElementById("enhancedSidebar"),C=document.getElementById("graphSidebarToggle");if(v&&v.classList.toggle("collapsed",this.graphSidebarCollapsed),C){C.title=this.graphSidebarCollapsed?"Expand sidebar":"Collapse sidebar";const S=C.querySelector("svg path");S&&S.setAttribute("d",this.graphSidebarCollapsed?"M5 2L10 7L5 12":"M9 2L4 7L9 12")}setTimeout(()=>this.resizeCanvas(),50)}),this.setupSidebarTableEvents()}if((b=document.getElementById("sidebarToggle"))==null||b.addEventListener("click",()=>{this.sidebarCollapsed=!this.sidebarCollapsed;const y=document.getElementById("sidebarContainer"),v=document.getElementById("sidebarToggle");y&&y.classList.toggle("collapsed",this.sidebarCollapsed),v&&(v.title=this.sidebarCollapsed?"Show panel":"Hide panel"),this.viewMode==="graph"&&setTimeout(()=>this.resizeCanvas(),50)}),this.setupSidebarResize(),this.viewMode==="list"){(f=document.getElementById("prevPage"))==null||f.addEventListener("click",()=>this.changePage(-1)),(w=document.getElementById("nextPage"))==null||w.addEventListener("click",()=>this.changePage(1));const y=document.getElementById("searchInput");y==null||y.addEventListener("input",v=>{this.searchQuery=v.target.value.toLowerCase(),this.renderTableList()})}}setupSidebarResize(){const e=document.getElementById("resizeHandle");if(!e)return;let t=0,i=0;const n=s=>{if(!this.isResizingSidebar)return;const a=s.clientX-t,r=Math.max(180,Math.min(600,i+a));if(this.viewMode==="list"){this.sidebarWidth=r;const l=document.querySelector(".sidebar");l&&(l.style.width=r+"px")}else{this.codePanelWidth=r;const l=document.getElementById("codePanel");l&&(l.style.width=r+"px")}},o=()=>{this.isResizingSidebar=!1,e.classList.remove("dragging"),document.body.style.cursor="",document.body.style.userSelect="",document.removeEventListener("mousemove",n),document.removeEventListener("mouseup",o),this.viewMode==="graph"&&this.resizeCanvas()};e.addEventListener("mousedown",s=>{s.preventDefault(),this.isResizingSidebar=!0,t=s.clientX,i=this.viewMode==="list"?this.sidebarWidth:this.codePanelWidth,e.classList.add("dragging"),document.body.style.cursor="col-resize",document.body.style.userSelect="none",document.addEventListener("mousemove",n),document.addEventListener("mouseup",o)})}resizeCanvas(){if(!this.canvas||!this.canvas.parentElement||!this.ctx)return;const e=this.canvas.parentElement.clientWidth,t=this.canvas.parentElement.clientHeight;this.dpr=window.devicePixelRatio||1,this.canvas.width=e*this.dpr,this.canvas.height=t*this.dpr,this.canvas.style.width=e+"px",this.canvas.style.height=t+"px",this.ctx.setTransform(1,0,0,1,0,0),this.ctx.scale(this.dpr,this.dpr),this.drawGraph()}setupKeyboardShortcuts(){document.addEventListener("keydown",e=>{var t,i;if(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement){e.key==="Escape"&&e.target.blur();return}switch(e.key){case"r":this.refresh();break;case"g":this.viewMode=this.viewMode==="graph"?"list":"graph",this.render();break;case"b":(t=document.getElementById("sidebarToggle"))==null||t.click();break;case"c":this.viewMode==="graph"&&this.toggleCodePanel();break;case"a":this.viewMode==="graph"&&this.autoArrange();break;case"f":this.viewMode==="graph"&&this.fitToView();break;case"z":(e.metaKey||e.ctrlKey)&&this.viewMode==="graph"&&(e.preventDefault(),e.shiftKey?this.redo():this.undo());break;case"+":case"=":this.viewMode==="graph"&&(this.zoom=Math.min(2,this.zoom*1.2),this.updateZoomDisplay(),this.drawGraph());break;case"-":this.viewMode==="graph"&&(this.zoom=Math.max(.25,this.zoom/1.2),this.updateZoomDisplay(),this.drawGraph());break;case"ArrowLeft":this.viewMode==="list"&&this.changePage(-1);break;case"ArrowRight":this.viewMode==="list"&&this.changePage(1);break;case"ArrowUp":e.preventDefault(),this.viewMode==="list"&&this.navigateTable(-1);break;case"ArrowDown":e.preventDefault(),this.viewMode==="list"&&this.navigateTable(1);break;case"/":e.preventDefault(),(i=document.getElementById("searchInput"))==null||i.focus();break}})}renderTableList(){var n;const e=document.getElementById("tableList");if(!e)return;const t=((n=this.config)==null?void 0:n.tables)||[],i=t.filter(o=>o.name.toLowerCase().includes(this.searchQuery));if(i.length===0){e.innerHTML=`
        <li class="empty-state" style="padding: 30px 20px;">
          <p>${t.length===0?"No tables found":"No matching tables"}</p>
        </li>
      `;return}e.innerHTML=i.map(o=>`
      <li class="table-item ${o.name===this.selectedTable?"active":""}" data-table="${o.name}">
        <span class="table-name">
          <svg class="table-icon" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="1" y="1" width="12" height="12" rx="2"/>
            <path d="M1 5H13M5 5V13"/>
          </svg>
          ${o.name}
        </span>
        <span class="table-count">${this.formatCount(o.documentCount)}</span>
      </li>
    `).join(""),e.querySelectorAll(".table-item").forEach(o=>{o.addEventListener("click",()=>{const s=o.dataset.table;s&&this.selectTable(s)})})}formatCount(e){return e?e>=1e6?(e/1e6).toFixed(1)+"M":e>=1e3?(e/1e3).toFixed(1)+"k":e.toString():"0"}navigateTable(e){var o;const t=((o=this.config)==null?void 0:o.tables)||[];if(t.length===0)return;let n=t.findIndex(s=>s.name===this.selectedTable)+e;n<0&&(n=t.length-1),n>=t.length&&(n=0),this.selectTable(t[n].name)}selectTable(e){if(this.selectedTable=e,this.currentPage=1,this.viewMode==="list"){this.renderTableList();const t=document.getElementById("listViewContent");t&&(t.innerHTML=this.renderListViewContent(),this.setupListViewEventListeners())}else this.drawGraph(),this.updateCodePanel()}setupListViewEventListeners(){const e=document.getElementById("prevPage"),t=document.getElementById("nextPage");e&&e.addEventListener("click",()=>this.changePage(-1)),t&&t.addEventListener("click",()=>this.changePage(1))}renderSchema(e,t){const i=document.getElementById("schemaPanel");if(!i)return;const n=(t==null?void 0:t.inferredFields)||[],o=(t==null?void 0:t.documentCount)||0;i.innerHTML=`
      <div class="schema-title">${e}</div>
      <div class="schema-subtitle">
        ${this.formatCount(o)} documents
        ${t!=null&&t.hasIndexes?" • Has indexes":""}
      </div>

      <div class="schema-grid">
        <div class="schema-card">
          <div class="schema-card-header">
            <span>Inferred Schema</span>
            <span class="count">${n.length} fields</span>
          </div>
          <div class="schema-card-body">
            ${this.renderFields(n)}
          </div>
        </div>
      </div>
    `}renderFields(e){if(!e||e.length===0)return'<p style="color: var(--text-secondary); padding: 12px;">No schema data available</p>';const t=["_id","_creationTime"];return[...e].sort((n,o)=>{const s=t.includes(n.name),a=t.includes(o.name);return s&&!a?-1:!s&&a?1:n.name.localeCompare(o.name)}).map(n=>`
      <div class="field-row ${t.includes(n.name)?"field-system":""}">
        <span>
          <span class="field-name">${n.name}</span>
          ${n.optional?'<span class="field-optional">?</span>':""}
        </span>
        <span class="field-type">${n.type}</span>
      </div>
    `).join("")}renderDocuments(e){const t=document.getElementById("docTableHead"),i=document.getElementById("docTableBody");if(!t||!i)return;const n=(this.currentPage-1)*this.pageSize,o=n+this.pageSize,s=e.slice(n,o),a=Math.ceil(e.length/this.pageSize);if(s.length===0){t.innerHTML="",i.innerHTML='<tr><td colspan="100" class="empty-state">No documents found</td></tr>';return}const r=[...new Set(s.flatMap(d=>Object.keys(d)))];r.sort((d,h)=>{const c=d.startsWith("_"),p=h.startsWith("_");return c&&!p?-1:!c&&p?1:d.localeCompare(h)}),t.innerHTML=`<tr>${r.map(d=>`<th>${d}</th>`).join("")}</tr>`,i.innerHTML=s.map(d=>`
      <tr>
        ${r.map(h=>{const c=d[h],p=h==="_id",u=c==null;return`<td class="${[p?"id-cell":"",u?"null-value":""].filter(Boolean).join(" ")}">${this.formatValue(c)}</td>`}).join("")}
      </tr>
    `).join("");const l=document.getElementById("pageInfo");l&&(l.textContent=`Page ${this.currentPage} of ${a||1}`),document.getElementById("prevPage").disabled=this.currentPage<=1,document.getElementById("nextPage").disabled=this.currentPage>=a}formatValue(e){if(e==null)return'<span class="null-value">null</span>';if(typeof e=="object"){const t=JSON.stringify(e);return t.length>50?t.slice(0,50)+"...":t}return typeof e=="string"&&e.length>50?e.slice(0,50)+"...":String(e)}changePage(e){var r,l,d,h;const t=(l=(r=this.config)==null?void 0:r.tables)==null?void 0:l.find(c=>c.name===this.selectedTable),i=((h=(d=this.config)==null?void 0:d.allDocuments)==null?void 0:h[this.selectedTable||""])||(t==null?void 0:t.documents)||[],n=Math.ceil(i.length/this.pageSize),o=this.currentPage+e;if(o<1||o>n)return;this.currentPage=o;const s=document.getElementById("documentsTableWrapper");s&&(s.innerHTML=this.renderDocumentsTable(i));const a=document.querySelector(".pagination-bar");a&&(a.outerHTML=this.renderPaginationBar(i),this.setupListViewEventListeners())}refresh(){if(this.viewMode==="graph")this.calculateGraphLayout(),this.drawGraph();else if(this.selectedTable){const e=document.getElementById("listViewContent");e&&(e.innerHTML=this.renderListViewContent(),this.setupListViewEventListeners())}}}new Y;
