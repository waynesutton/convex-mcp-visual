/**
 * Codebase Subway Map Tool
 *
 * Generates a subway/metro map style diagram of files and local imports.
 * Renders as actual transit-style routes with stations, not a tree diagram.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { launchUIApp } from "../ui-server.js";
import type { Dirent } from "fs";
import { readdir, readFile } from "fs/promises";
import { existsSync } from "fs";
import { basename, dirname, extname, join, relative, resolve, sep } from "path";
import {
  getSharedStyles,
  getThemeToggleHtml,
  getThemeToggleScript,
  escapeHtml,
} from "./shared-styles.js";

export const codebaseSubwayMapTool: Tool = {
  name: "codebase_subway_map",
  description: `Generate a subway-style map of your codebase file dependencies.

Use this when the user asks:
- "show my codebase as a subway map"
- "visualize file dependencies"
- "map my imports and file structure"

Shows local imports and file relationships as colored subway lines.
Does NOT show database relationships - use schema_diagram for that.`,
  inputSchema: {
    type: "object",
    properties: {
      root: {
        type: "string",
        description: "Root folder to scan (default: current directory)",
      },
      maxDepth: {
        type: "number",
        description: "Max folder depth to scan (default: 6)",
        default: 6,
      },
      maxNodes: {
        type: "number",
        description: "Max nodes to render (default: 120)",
        default: 120,
      },
      noBrowser: {
        type: "boolean",
        description: "Skip browser UI output (default: false)",
        default: false,
      },
    },
    required: [],
  },
};

interface ToolResponse {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

interface GraphNode {
  id: string;
  path: string;
  label: string;
  shortLabel: string;
  group: string;
  isAsset: boolean;
}

interface GraphEdge {
  from: string;
  to: string;
}

interface Station {
  id: string;
  label: string;
  shortLabel: string;
  x: number;
  y: number;
  line: string;
  isTransfer: boolean;
  connections: string[];
}

interface Line {
  id: string;
  name: string;
  color: string;
  stations: Station[];
}

const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

const ASSET_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".webp",
  ".mp4",
  ".mp3",
  ".wav",
  ".woff",
  ".woff2",
  ".ttf",
]);

const DEFAULT_IGNORE = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".next",
  ".turbo",
  ".vercel",
  ".convex",
  ".cursor",
  ".claude",
  "out",
]);

const ENTRY_FILES = new Set([
  "index.ts",
  "index.tsx",
  "index.js",
  "index.jsx",
  "app.tsx",
  "main.tsx",
  "main.ts",
  "server.ts",
  "cli.ts",
]);

// NYC Subway inspired colors
const LINE_COLORS = [
  "#ee352e", // Red (1/2/3)
  "#00933c", // Green (4/5/6)
  "#b933ad", // Purple (7)
  "#ff6319", // Orange (B/D/F/M)
  "#fccc0a", // Yellow (N/Q/R/W)
  "#0039a6", // Blue (A/C/E)
  "#6cbe45", // Light Green (G)
  "#a7a9ac", // Gray (L)
  "#996633", // Brown (J/Z)
  "#00add0", // Teal (SI)
];

export async function handleCodebaseSubwayMap(
  args: Record<string, unknown> = {},
): Promise<ToolResponse> {
  const {
    root: rawRoot,
    maxDepth = 6,
    maxNodes = 120,
    noBrowser = false,
  } = args as {
    root?: string;
    maxDepth?: number;
    maxNodes?: number;
    noBrowser?: boolean;
  };

  const root = rawRoot ? resolve(String(rawRoot)) : process.cwd();
  const depthLimit = toNumber(maxDepth, 6);
  const nodeLimit = toNumber(maxNodes, 120);

  try {
    const files = await collectCodeFiles(root, depthLimit);
    if (files.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `## Codebase Subway Map

No files found to map.

Root: \`${root}\``,
          },
        ],
        isError: true,
      };
    }

    const { nodes, edges } = await buildGraph(root, files);
    const pruned = pruneGraph(nodes, edges, nodeLimit);
    const { lines, transfers } = buildSubwayLayout(pruned.nodes, pruned.edges);
    const svgContent = buildSubwaySvg(lines, transfers);

    let uiUrl = "";
    if (!noBrowser) {
      try {
        const uiServer = await launchUIApp({
          appName: "codebase-subway-map",
          config: {
            root,
            nodeCount: pruned.nodes.length,
            edgeCount: pruned.edges.length,
            lineCount: lines.length,
          },
          port: 3459,
          autoClose: 30 * 60 * 1000,
          customHtml: buildMapHtml(
            svgContent,
            lines,
            root,
            pruned.nodes.length,
          ),
        });
        uiUrl = uiServer.url;
      } catch (err) {
        console.error("Failed to launch UI:", err);
      }
    }

    // Build ASCII representation for terminal
    const asciiMap = buildAsciiMap(lines);

    const textLines: string[] = [];
    textLines.push("## Codebase Subway Map");
    textLines.push("");
    if (uiUrl) {
      textLines.push(`**Interactive Map**: ${uiUrl}`);
      textLines.push("");
    }
    textLines.push(`Root: \`${root}\``);
    textLines.push(
      `Files: ${pruned.nodes.length} | Connections: ${pruned.edges.length} | Lines: ${lines.length}`,
    );
    textLines.push("");
    textLines.push("**Lines:**");
    for (const line of lines) {
      textLines.push(`- ${line.name}: ${line.stations.length} stations`);
    }
    textLines.push("");
    textLines.push("**ASCII Map:**");
    textLines.push("");
    textLines.push("```");
    textLines.push(asciiMap);
    textLines.push("```");

    return {
      content: [
        {
          type: "text",
          text: textLines.join("\n"),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `## Codebase Subway Map

**Error**: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

// Walk the file system and gather code files
async function collectCodeFiles(
  root: string,
  maxDepth: number,
): Promise<string[]> {
  const results: string[] = [];

  const walk = async (dir: string, depth: number) => {
    if (depth > maxDepth) return;
    let entries: Dirent[] = [];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const entryPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (DEFAULT_IGNORE.has(entry.name)) continue;
        await walk(entryPath, depth + 1);
        continue;
      }
      const ext = extname(entry.name);
      if (CODE_EXTENSIONS.has(ext)) {
        results.push(entryPath);
      }
    }
  };

  await walk(root, 0);
  return results;
}

// Build nodes and edges from local imports
async function buildGraph(
  root: string,
  files: string[],
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];

  for (const filePath of files) {
    const node = getOrCreateNode(root, filePath, false, nodes);
    const content = await readFileSafe(filePath);
    const imports = extractImports(content);

    for (const specifier of imports) {
      if (!specifier.startsWith(".")) continue;
      const resolved = resolveImportTarget(filePath, specifier);
      if (!resolved) continue;
      if (!resolved.startsWith(root)) continue;

      const isAsset = ASSET_EXTENSIONS.has(extname(resolved));
      const target = getOrCreateNode(root, resolved, isAsset, nodes);
      edges.push({ from: node.id, to: target.id });
    }
  }

  return { nodes: Array.from(nodes.values()), edges };
}

function getOrCreateNode(
  root: string,
  filePath: string,
  isAsset: boolean,
  nodes: Map<string, GraphNode>,
): GraphNode {
  const existing = nodes.get(filePath);
  if (existing) return existing;

  const relPath = relative(root, filePath);
  const label = relPath;
  const shortLabel = basename(relPath, extname(relPath));
  const group = getGroupName(relPath, isAsset);
  const node: GraphNode = {
    id: toNodeId(relPath),
    path: relPath,
    label,
    shortLabel,
    group,
    isAsset,
  };

  nodes.set(filePath, node);
  return node;
}

function getGroupName(relPath: string, isAsset: boolean): string {
  if (isAsset) return "assets";
  const parts = relPath.split(sep);
  return parts.length > 1 ? parts[0] : "root";
}

function toNodeId(relPath: string): string {
  const safe = relPath.replace(/[^a-zA-Z0-9]/g, "_");
  return `node_${safe}`;
}

function extractImports(content: string): string[] {
  const imports: string[] = [];
  const patterns = [
    /import\s+[^'"]*from\s*["']([^"']+)["']/g,
    /export\s+[^'"]*from\s*["']([^"']+)["']/g,
    /import\(\s*["']([^"']+)["']\s*\)/g,
    /require\(\s*["']([^"']+)["']\s*\)/g,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null = null;
    while ((match = pattern.exec(content)) !== null) {
      if (match[1]) imports.push(match[1]);
    }
  }

  return imports;
}

function resolveImportTarget(
  fromFile: string,
  specifier: string,
): string | null {
  const base = resolve(dirname(fromFile), specifier);
  if (existsSync(base) && extname(base)) return base;

  for (const ext of CODE_EXTENSIONS) {
    const candidate = `${base}${ext}`;
    if (existsSync(candidate)) return candidate;
  }

  for (const ext of ASSET_EXTENSIONS) {
    const candidate = `${base}${ext}`;
    if (existsSync(candidate)) return candidate;
  }

  for (const ext of CODE_EXTENSIONS) {
    const candidate = join(base, `index${ext}`);
    if (existsSync(candidate)) return candidate;
  }

  return null;
}

async function readFileSafe(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return "";
  }
}

function pruneGraph(
  nodes: GraphNode[],
  edges: GraphEdge[],
  maxNodes: number,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  if (nodes.length <= maxNodes) return { nodes, edges };

  const degree = new Map<string, number>();
  for (const edge of edges) {
    degree.set(edge.from, (degree.get(edge.from) || 0) + 1);
    degree.set(edge.to, (degree.get(edge.to) || 0) + 1);
  }

  const entryIds = nodes
    .filter((node) => ENTRY_FILES.has(basename(node.path)))
    .map((node) => node.id);

  const sorted = [...nodes].sort((a, b) => {
    const aScore = degree.get(a.id) || 0;
    const bScore = degree.get(b.id) || 0;
    if (aScore !== bScore) return bScore - aScore;
    return a.label.localeCompare(b.label);
  });

  const keepIds = new Set<string>();
  for (const id of entryIds) keepIds.add(id);
  for (const node of sorted) {
    if (keepIds.size >= maxNodes) break;
    keepIds.add(node.id);
  }

  const prunedNodes = nodes.filter((node) => keepIds.has(node.id));
  const prunedEdges = edges.filter(
    (edge) => keepIds.has(edge.from) && keepIds.has(edge.to),
  );

  return { nodes: prunedNodes, edges: prunedEdges };
}

// Convert graph to subway layout
function buildSubwayLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
): { lines: Line[]; transfers: Map<string, string[]> } {
  // Group nodes by folder (each folder = one line)
  const groups = new Map<string, GraphNode[]>();
  for (const node of nodes) {
    if (!groups.has(node.group)) groups.set(node.group, []);
    groups.get(node.group)?.push(node);
  }

  // Build connection map to find transfers
  const connections = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (!connections.has(edge.from)) connections.set(edge.from, new Set());
    if (!connections.has(edge.to)) connections.set(edge.to, new Set());
    connections.get(edge.from)?.add(edge.to);
    connections.get(edge.to)?.add(edge.from);
  }

  // Find which line each node is on
  const nodeToLine = new Map<string, string>();
  const groupEntries = Array.from(groups.entries()).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );

  for (const [group] of groupEntries) {
    const groupNodes = groups.get(group) || [];
    for (const node of groupNodes) {
      nodeToLine.set(node.id, group);
    }
  }

  // Find transfers (nodes connected to nodes on other lines)
  const transfers = new Map<string, string[]>();
  for (const [nodeId, connectedIds] of connections) {
    const nodeLine = nodeToLine.get(nodeId);
    const otherLines: string[] = [];
    for (const connId of connectedIds) {
      const connLine = nodeToLine.get(connId);
      if (connLine && connLine !== nodeLine && !otherLines.includes(connLine)) {
        otherLines.push(connLine);
      }
    }
    if (otherLines.length > 0) {
      transfers.set(nodeId, otherLines);
    }
  }

  // Build lines with station positions
  const lines: Line[] = [];
  const STATION_SPACING = 120;
  const LINE_SPACING = 100;
  const MARGIN_LEFT = 200;
  const MARGIN_TOP = 80;

  groupEntries.forEach(([group, groupNodes], lineIndex) => {
    const color = LINE_COLORS[lineIndex % LINE_COLORS.length];

    // Sort nodes: entry files first, then alphabetically
    const sortedNodes = [...groupNodes].sort((a, b) => {
      const aIsEntry = ENTRY_FILES.has(basename(a.path));
      const bIsEntry = ENTRY_FILES.has(basename(b.path));
      if (aIsEntry !== bIsEntry) return aIsEntry ? -1 : 1;
      return a.shortLabel.localeCompare(b.shortLabel);
    });

    const stations: Station[] = sortedNodes.map((node, stationIndex) => ({
      id: node.id,
      label: node.label,
      shortLabel: node.shortLabel,
      x: MARGIN_LEFT + stationIndex * STATION_SPACING,
      y: MARGIN_TOP + lineIndex * LINE_SPACING,
      line: group,
      isTransfer: transfers.has(node.id),
      connections: Array.from(connections.get(node.id) || []),
    }));

    lines.push({
      id: `line_${lineIndex}`,
      name: group,
      color,
      stations,
    });
  });

  return { lines, transfers };
}

// Build SVG subway map
function buildSubwaySvg(
  lines: Line[],
  transfers: Map<string, string[]>,
): string {
  if (lines.length === 0) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200"><text x="200" y="100" text-anchor="middle" fill="#999">No files to map</text></svg>';
  }

  // Calculate dimensions
  const maxStations = Math.max(...lines.map((l) => l.stations.length), 1);
  const width = Math.max(800, 200 + maxStations * 120 + 100);
  const height = Math.max(400, 80 + lines.length * 100 + 100);

  // Build station lookup
  const stationMap = new Map<string, Station>();
  for (const line of lines) {
    for (const station of line.stations) {
      stationMap.set(station.id, station);
    }
  }

  const svgParts: string[] = [];

  // SVG header
  svgParts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" class="subway-map">`,
  );

  // Background
  svgParts.push(
    `<rect width="100%" height="100%" fill="var(--bg-primary, #faf8f5)"/>`,
  );

  // Draw inter-line connections (transfers) first as curved paths
  const drawnConnections = new Set<string>();
  for (const [nodeId, otherLines] of transfers) {
    const station = stationMap.get(nodeId);
    if (!station) continue;

    for (const otherLine of otherLines) {
      // Find connected station on the other line
      const connectedStations = station.connections
        .map((id) => stationMap.get(id))
        .filter((s) => s && s.line === otherLine);

      for (const connStation of connectedStations) {
        if (!connStation) continue;
        const connKey = [nodeId, connStation.id].sort().join("-");
        if (drawnConnections.has(connKey)) continue;
        drawnConnections.add(connKey);

        // Draw curved connection line
        const midY = (station.y + connStation.y) / 2;
        svgParts.push(
          `<path d="M${station.x},${station.y} Q${station.x},${midY} ${(station.x + connStation.x) / 2},${midY} Q${connStation.x},${midY} ${connStation.x},${connStation.y}" fill="none" stroke="var(--text-muted, #999)" stroke-width="2" stroke-dasharray="4,4" opacity="0.5"/>`,
        );
      }
    }
  }

  // Draw line routes
  for (const line of lines) {
    if (line.stations.length === 0) continue;

    // Draw the main line
    const pathPoints = line.stations.map((s) => `${s.x},${s.y}`).join(" L");
    svgParts.push(
      `<path d="M${pathPoints}" fill="none" stroke="${line.color}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`,
    );

    // Draw stations
    for (const station of line.stations) {
      if (station.isTransfer) {
        // Transfer station: larger white circle with colored ring
        svgParts.push(
          `<circle cx="${station.x}" cy="${station.y}" r="12" fill="var(--bg-primary, #fff)" stroke="${line.color}" stroke-width="4"/>`,
        );
        svgParts.push(
          `<circle cx="${station.x}" cy="${station.y}" r="6" fill="${line.color}"/>`,
        );
      } else {
        // Regular station: small dot
        svgParts.push(
          `<circle cx="${station.x}" cy="${station.y}" r="6" fill="var(--bg-primary, #fff)" stroke="${line.color}" stroke-width="3"/>`,
        );
      }

      // Station label
      const labelY = station.y - 18;
      svgParts.push(
        `<text x="${station.x}" y="${labelY}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="var(--text-primary, #1a1a1a)" font-weight="500">${escapeHtml(station.shortLabel)}</text>`,
      );
    }
  }

  // Draw line labels at the start
  for (const line of lines) {
    if (line.stations.length === 0) continue;
    const firstStation = line.stations[0];
    const labelX = 20;
    const labelY = firstStation.y;

    // Line badge
    svgParts.push(
      `<rect x="${labelX}" y="${labelY - 12}" width="160" height="24" rx="12" fill="${line.color}"/>`,
    );
    svgParts.push(
      `<text x="${labelX + 80}" y="${labelY + 4}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#fff" font-weight="600">${escapeHtml(line.name)}</text>`,
    );
  }

  svgParts.push("</svg>");
  return svgParts.join("\n");
}

// Build ASCII representation
function buildAsciiMap(lines: Line[]): string {
  if (lines.length === 0) return "No files to map";

  const result: string[] = [];

  for (const line of lines) {
    if (line.stations.length === 0) continue;

    // Line header
    result.push(`[${line.name}]`);

    // Draw stations as a horizontal line
    const stationNames = line.stations.map((s) =>
      s.isTransfer ? `(${s.shortLabel})` : s.shortLabel,
    );

    // Build track
    let track = "  ";
    let labels = "  ";
    for (let i = 0; i < stationNames.length; i++) {
      const name = stationNames[i];
      const isTransfer = line.stations[i].isTransfer;

      if (i === 0) {
        track += isTransfer ? "O" : "o";
      } else {
        const padding = Math.max(1, 12 - stationNames[i - 1].length);
        track += "─".repeat(padding) + (isTransfer ? "O" : "o");
      }
    }

    result.push(track);

    // Labels below track
    let labelLine = "  ";
    for (let i = 0; i < stationNames.length; i++) {
      const name = stationNames[i];
      if (i === 0) {
        labelLine += name;
      } else {
        const prevLen = stationNames[i - 1].length;
        const padding = Math.max(1, 13 - prevLen);
        labelLine += " ".repeat(padding) + name;
      }
    }
    result.push(labelLine);
    result.push("");
  }

  // Legend
  result.push("Legend: o = station, O = transfer station");

  return result.join("\n");
}

// Build HTML page
function buildMapHtml(
  svg: string,
  lines: Line[],
  root: string,
  fileCount: number,
): string {
  const legendItems = lines
    .map(
      (line) =>
        `<div class="legend-item">
          <span class="legend-line" style="background:${line.color}"></span>
          <span class="legend-name">${escapeHtml(line.name)}</span>
          <span class="legend-count">${line.stations.length} files</span>
        </div>`,
    )
    .join("");

  const totalStations = lines.reduce((sum, l) => sum + l.stations.length, 0);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Codebase Subway Map</title>
  <style>
    ${getSharedStyles()}
    
    .subway-container {
      background: var(--bg-secondary);
      border-radius: 12px;
      padding: 24px;
      overflow: auto;
      max-height: calc(100vh - 280px);
    }
    
    .subway-map {
      display: block;
      min-width: 100%;
      height: auto;
    }
    
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      padding: 16px;
      background: var(--bg-secondary);
      border-radius: 8px;
      margin-bottom: 16px;
    }
    
    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .legend-line {
      width: 24px;
      height: 6px;
      border-radius: 3px;
    }
    
    .legend-name {
      font-weight: 600;
      color: var(--text-primary);
    }
    
    .legend-count {
      font-size: 12px;
      color: var(--text-muted);
    }
    
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }
    
    .stat-box {
      background: var(--bg-secondary);
      padding: 16px;
      border-radius: 8px;
      text-align: center;
    }
    
    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: var(--text-primary);
    }
    
    .stat-label {
      font-size: 12px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .root-path {
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--text-muted);
      padding: 8px 12px;
      background: var(--bg-tertiary);
      border-radius: 6px;
      margin-bottom: 16px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  </style>
</head>
<body>
  <header class="header">
    <div class="header-left">
      <h1><span class="status-dot"></span> Codebase Subway Map</h1>
    </div>
    <div class="header-actions">
      ${getThemeToggleHtml()}
    </div>
  </header>

  <main class="main-content">
    <div class="stats">
      <div class="stat-box">
        <div class="stat-value">${totalStations}</div>
        <div class="stat-label">Files</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${lines.length}</div>
        <div class="stat-label">Lines</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${lines.reduce((sum, l) => sum + l.stations.filter((s) => s.isTransfer).length, 0)}</div>
        <div class="stat-label">Transfers</div>
      </div>
    </div>
    
    <div class="root-path">${escapeHtml(root)}</div>
    
    <div class="legend">${legendItems}</div>
    
    <div class="subway-container">
      ${svg}
    </div>
  </main>

  <script>
    ${getThemeToggleScript()}
  </script>
</body>
</html>`;
}

function toNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}
