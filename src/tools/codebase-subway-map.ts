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

// Convert graph to subway layout (VERTICAL layout like NYC subway map)
function buildSubwayLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
): { lines: Line[]; transfers: Map<string, string[]> } {
  // Group nodes by folder (each folder = one vertical line)
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

  // Build lines with VERTICAL station positions
  const lines: Line[] = [];
  const STATION_SPACING_Y = 70; // Vertical spacing between stations
  const LINE_SPACING_X = 180; // Horizontal spacing between lines
  const MARGIN_LEFT = 60;
  const MARGIN_TOP = 100;

  groupEntries.forEach(([group, groupNodes], lineIndex) => {
    const color = LINE_COLORS[lineIndex % LINE_COLORS.length];

    // Sort nodes: entry files first, then alphabetically
    const sortedNodes = [...groupNodes].sort((a, b) => {
      const aIsEntry = ENTRY_FILES.has(basename(a.path));
      const bIsEntry = ENTRY_FILES.has(basename(b.path));
      if (aIsEntry !== bIsEntry) return aIsEntry ? -1 : 1;
      return a.shortLabel.localeCompare(b.shortLabel);
    });

    // Vertical layout: x is fixed per line, y increases per station
    const stations: Station[] = sortedNodes.map((node, stationIndex) => ({
      id: node.id,
      label: node.label,
      shortLabel: node.shortLabel,
      x: MARGIN_LEFT + lineIndex * LINE_SPACING_X,
      y: MARGIN_TOP + stationIndex * STATION_SPACING_Y,
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

// Build SVG subway map with VERTICAL layout (lines go down, connections go across)
function buildSubwaySvg(
  lines: Line[],
  transfers: Map<string, string[]>,
): string {
  if (lines.length === 0) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="400"><text x="50%" y="200" text-anchor="middle" fill="#999" font-size="18">No files to map</text></svg>';
  }

  // Vertical layout constants
  const STATION_SPACING_Y = 70;
  const LINE_SPACING_X = 180;
  const MARGIN_LEFT = 60;
  const MARGIN_TOP = 100;
  const STATION_RADIUS = 10;
  const TRANSFER_RADIUS = 14;
  const LINE_WIDTH = 8;
  const FONT_SIZE = 12;
  const LABEL_OFFSET_X = 20;

  // Calculate dimensions based on vertical layout
  const maxStations = Math.max(...lines.map((l) => l.stations.length), 1);
  const width = Math.max(
    1000,
    MARGIN_LEFT + lines.length * LINE_SPACING_X + 200,
  );
  const height = Math.max(
    600,
    MARGIN_TOP + maxStations * STATION_SPACING_Y + 80,
  );

  // Set station positions (vertical layout)
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    for (
      let stationIndex = 0;
      stationIndex < line.stations.length;
      stationIndex++
    ) {
      line.stations[stationIndex].x = MARGIN_LEFT + lineIndex * LINE_SPACING_X;
      line.stations[stationIndex].y =
        MARGIN_TOP + stationIndex * STATION_SPACING_Y;
    }
  }

  // Build station lookup for connections
  const stationMap = new Map<string, Station>();
  for (const line of lines) {
    for (const station of line.stations) {
      stationMap.set(station.id, station);
    }
  }

  // Build connection data for horizontal cross-line connections
  const connectionData: Array<{ from: string; to: string }> = [];
  const drawnConnections = new Set<string>();
  for (const [nodeId, otherLines] of transfers) {
    const station = stationMap.get(nodeId);
    if (!station) continue;
    for (const otherLine of otherLines) {
      const connectedStations = station.connections
        .map((id) => stationMap.get(id))
        .filter((s) => s && s.line === otherLine);
      for (const connStation of connectedStations) {
        if (!connStation) continue;
        const connKey = [nodeId, connStation.id].sort().join("-");
        if (drawnConnections.has(connKey)) continue;
        drawnConnections.add(connKey);
        connectionData.push({ from: nodeId, to: connStation.id });
      }
    }
  }

  const svgParts: string[] = [];

  // SVG header
  svgParts.push(
    `<svg id="subway-svg" xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" class="subway-map" style="min-width: ${width}px; min-height: ${height}px;">`,
  );

  // Background
  svgParts.push(
    `<rect width="100%" height="100%" fill="var(--subway-bg, #f5f3ef)"/>`,
  );

  // Subtle grid pattern
  svgParts.push(`<defs>
    <pattern id="subway-grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--subway-grid, rgba(0,0,0,0.03))" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#subway-grid)"/>`);

  // Title at top
  const totalStations = lines.reduce((sum, l) => sum + l.stations.length, 0);
  const totalConnections = connectionData.length;
  svgParts.push(
    `<text x="${width / 2}" y="36" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="700" fill="var(--subway-text, #1a1a1a)">Codebase Metro Map</text>`,
  );
  svgParts.push(
    `<text x="${width / 2}" y="56" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="13" fill="var(--subway-text-muted, #666)">${totalStations} stations  ·  ${totalConnections} connections</text>`,
  );

  // Group for horizontal transfer connections (dashed lines across)
  svgParts.push(`<g id="transfer-connections">`);
  for (const conn of connectionData) {
    const s1 = stationMap.get(conn.from);
    const s2 = stationMap.get(conn.to);
    if (!s1 || !s2) continue;

    // Horizontal bezier curve connection
    const midX = (s1.x + s2.x) / 2;
    svgParts.push(
      `<path id="conn-${conn.from}-${conn.to}" class="transfer-path" data-from="${conn.from}" data-to="${conn.to}" d="M${s1.x},${s1.y} C${midX},${s1.y} ${midX},${s2.y} ${s2.x},${s2.y}" fill="none" stroke="var(--subway-connection, #9d8ec9)" stroke-width="2.5" stroke-dasharray="6,4" opacity="0.7"/>`,
    );
  }
  svgParts.push(`</g>`);

  // Group for vertical line routes
  svgParts.push(`<g id="line-routes">`);
  for (const line of lines) {
    if (line.stations.length === 0) continue;
    const stationIds = line.stations.map((s) => s.id).join(",");
    const pathPoints = line.stations.map((s) => `${s.x},${s.y}`).join(" L");

    // Glow effect
    svgParts.push(
      `<path id="glow-${line.id}" class="line-glow" data-line="${line.id}" data-stations="${stationIds}" d="M${pathPoints}" fill="none" stroke="${line.color}" stroke-width="${LINE_WIDTH + 6}" stroke-linecap="round" stroke-linejoin="round" opacity="0.12"/>`,
    );
    // Main line
    svgParts.push(
      `<path id="path-${line.id}" class="line-path" data-line="${line.id}" data-stations="${stationIds}" d="M${pathPoints}" fill="none" stroke="${line.color}" stroke-width="${LINE_WIDTH}" stroke-linecap="round" stroke-linejoin="round"/>`,
    );
  }
  svgParts.push(`</g>`);

  // Group for stations
  svgParts.push(`<g id="stations">`);
  for (const line of lines) {
    for (const station of line.stations) {
      const r = station.isTransfer ? TRANSFER_RADIUS : STATION_RADIUS;
      svgParts.push(
        `<g id="station-${station.id}" class="station-group" data-id="${station.id}" data-line="${line.id}" data-x="${station.x}" data-y="${station.y}" style="cursor: grab;">`,
      );

      if (station.isTransfer) {
        // Transfer station: larger circle with inner dot
        svgParts.push(
          `<circle class="station-outer" cx="${station.x}" cy="${station.y}" r="${TRANSFER_RADIUS}" fill="var(--subway-station, #fff)" stroke="${line.color}" stroke-width="4"/>`,
        );
        svgParts.push(
          `<circle class="station-inner" cx="${station.x}" cy="${station.y}" r="${TRANSFER_RADIUS - 6}" fill="${line.color}"/>`,
        );
      } else {
        // Regular station: simple dot
        svgParts.push(
          `<circle class="station-dot" cx="${station.x}" cy="${station.y}" r="${STATION_RADIUS}" fill="var(--subway-station, #fff)" stroke="${line.color}" stroke-width="3"/>`,
        );
      }

      // Label to the right of station
      svgParts.push(
        `<text class="station-label" x="${station.x + r + LABEL_OFFSET_X}" y="${station.y + 4}" text-anchor="start" font-family="system-ui, -apple-system, sans-serif" font-size="${FONT_SIZE}" fill="var(--subway-text, #333)" font-weight="500">${escapeHtml(station.shortLabel)}</text>`,
      );

      svgParts.push(`</g>`);
    }
  }
  svgParts.push(`</g>`);

  // Line labels at top of each vertical line
  svgParts.push(`<g id="line-labels">`);
  for (const line of lines) {
    if (line.stations.length === 0) continue;
    const firstStation = line.stations[0];
    const labelX = firstStation.x;
    const labelY = MARGIN_TOP - 30;

    svgParts.push(
      `<g id="label-${line.id}" class="line-label" data-line="${line.id}">`,
    );
    // Colored dot indicator
    svgParts.push(
      `<circle cx="${labelX}" cy="${labelY}" r="8" fill="${line.color}"/>`,
    );
    // Label text below dot
    svgParts.push(
      `<text x="${labelX}" y="${labelY + 22}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="var(--subway-text, #333)" font-weight="600">${escapeHtml(line.name)}</text>`,
    );
    svgParts.push(`</g>`);
  }
  svgParts.push(`</g>`);

  // Legend in bottom right
  const legendX = width - 200;
  const legendY = height - (lines.length * 22 + 50);
  svgParts.push(
    `<g id="legend" transform="translate(${legendX}, ${legendY})">`,
  );
  svgParts.push(
    `<rect x="0" y="0" width="180" height="${lines.length * 22 + 40}" rx="8" fill="var(--subway-legend-bg, rgba(255,255,255,0.9))" stroke="var(--subway-border, #ddd)" stroke-width="1"/>`,
  );
  svgParts.push(
    `<text x="16" y="24" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="600" fill="var(--subway-text, #333)">Legend</text>`,
  );
  lines.forEach((line, i) => {
    const y = 44 + i * 22;
    svgParts.push(
      `<rect x="16" y="${y}" width="20" height="6" rx="3" fill="${line.color}"/>`,
    );
    svgParts.push(
      `<text x="44" y="${y + 5}" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="var(--subway-text, #333)">${escapeHtml(line.name)}</text>`,
    );
  });
  svgParts.push(`</g>`);

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
  _fileCount: number,
): string {
  const legendItems = lines
    .map(
      (line) =>
        `<div class="legend-item">
          <span class="legend-dot" style="background:${line.color}"></span>
          <span class="legend-name">${escapeHtml(line.name)}</span>
          <span class="legend-count">${line.stations.length}</span>
        </div>`,
    )
    .join("");

  const totalStations = lines.reduce((sum, l) => sum + l.stations.length, 0);
  const totalTransfers = lines.reduce(
    (sum, l) => sum + l.stations.filter((s) => s.isTransfer).length,
    0,
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Codebase Subway Map</title>
  <style>
    ${getSharedStyles()}
    
    :root {
      --subway-bg: #f8f6f3;
      --subway-grid: rgba(0,0,0,0.04);
      --subway-station: #fff;
      --subway-text: #333;
    }
    
    [data-theme="dark"] {
      --subway-bg: #1e1e1e;
      --subway-grid: rgba(255,255,255,0.04);
      --subway-station: #2d2d2d;
      --subway-text: #ccc;
    }
    
    body {
      margin: 0;
      padding: 0;
      min-height: 100vh;
      background: var(--bg-primary);
    }
    
    .top-bar {
      position: sticky;
      top: 0;
      z-index: 100;
      background: var(--bg-primary);
      border-bottom: 1px solid var(--border-subtle, #e5e5e5);
      padding: 16px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
    }
    
    .top-bar h1 {
      font-size: 18px;
      font-weight: 600;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--text-primary);
    }
    
    .top-bar .status-dot {
      width: 10px;
      height: 10px;
      background: #22c55e;
      border-radius: 50%;
    }
    
    .stats-row {
      display: flex;
      gap: 24px;
      align-items: center;
    }
    
    .stat-item {
      display: flex;
      align-items: baseline;
      gap: 6px;
    }
    
    .stat-item .value {
      font-size: 20px;
      font-weight: 700;
      color: var(--text-primary);
    }
    
    .stat-item .label {
      font-size: 12px;
      color: var(--text-muted);
      text-transform: uppercase;
    }
    
    .legend-bar {
      background: var(--bg-secondary);
      padding: 12px 24px;
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      align-items: center;
      border-bottom: 1px solid var(--border-subtle, #e5e5e5);
    }
    
    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
    }
    
    .legend-dot {
      width: 20px;
      height: 8px;
      border-radius: 4px;
    }
    
    .legend-name {
      font-weight: 600;
      color: var(--text-primary);
    }
    
    .legend-count {
      font-size: 11px;
      color: var(--text-muted);
      background: var(--bg-tertiary);
      padding: 2px 6px;
      border-radius: 10px;
    }
    
    .map-container {
      overflow: auto;
      padding: 24px;
      min-height: calc(100vh - 160px);
      background: var(--subway-bg);
    }
    
    .subway-map {
      display: block;
    }
    
    .path-bar {
      padding: 8px 24px;
      background: var(--bg-tertiary);
      font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
      font-size: 12px;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  </style>
</head>
<body>
  <div class="top-bar">
    <h1><span class="status-dot"></span> Codebase Subway Map</h1>
    <div class="stats-row">
      <div class="stat-item">
        <span class="value">${totalStations}</span>
        <span class="label">files</span>
      </div>
      <div class="stat-item">
        <span class="value">${lines.length}</span>
        <span class="label">lines</span>
      </div>
      <div class="stat-item">
        <span class="value">${totalTransfers}</span>
        <span class="label">transfers</span>
      </div>
    </div>
    ${getThemeToggleHtml()}
  </div>
  
  <div class="path-bar">${escapeHtml(root)}</div>
  
  <div class="legend-bar">${legendItems}</div>
  
  <div class="map-container">
    ${svg}
  </div>

  <script>
    ${getThemeToggleScript()}
    
    // Drag and drop functionality for stations
    (function() {
      const svg = document.getElementById('subway-svg');
      if (!svg) return;
      
      let isDragging = false;
      let dragTarget = null;
      let dragStartX = 0;
      let dragStartY = 0;
      let originalX = 0;
      let originalY = 0;
      
      // Store station positions
      const stationPositions = new Map();
      document.querySelectorAll('.station-group').forEach(g => {
        const id = g.dataset.id;
        const x = parseFloat(g.dataset.x);
        const y = parseFloat(g.dataset.y);
        stationPositions.set(id, { x, y, lineId: g.dataset.line });
      });
      
      // Get SVG coordinates from mouse event
      function getSvgPoint(e) {
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        return pt.matrixTransform(svg.getScreenCTM().inverse());
      }
      
      // Update a station's visual position
      function updateStationPosition(stationId, x, y) {
        const group = document.getElementById('station-' + stationId);
        if (!group) return;
        
        // Update data attributes
        group.dataset.x = x;
        group.dataset.y = y;
        stationPositions.set(stationId, { ...stationPositions.get(stationId), x, y });
        
        // Update circles
        group.querySelectorAll('circle').forEach(c => {
          c.setAttribute('cx', x);
          c.setAttribute('cy', y);
        });
        
        // Update label
        const label = group.querySelector('.station-label');
        if (label) {
          const r = group.querySelector('.station-outer') ? 18 : 12;
          label.setAttribute('x', x);
          label.setAttribute('y', y - r - 8);
        }
      }
      
      // Update line paths that include a station
      function updateLinePaths(stationId) {
        const pos = stationPositions.get(stationId);
        if (!pos) return;
        
        // Find and update line paths
        document.querySelectorAll('.line-path, .line-glow').forEach(path => {
          const stationIds = path.dataset.stations.split(',');
          if (!stationIds.includes(stationId)) return;
          
          // Rebuild path
          const points = stationIds.map(id => {
            const p = stationPositions.get(id);
            return p ? p.x + ',' + p.y : null;
          }).filter(Boolean);
          
          path.setAttribute('d', 'M' + points.join(' L'));
        });
        
        // Update transfer connections
        document.querySelectorAll('.transfer-path').forEach(path => {
          const fromId = path.dataset.from;
          const toId = path.dataset.to;
          if (fromId !== stationId && toId !== stationId) return;
          
          const p1 = stationPositions.get(fromId);
          const p2 = stationPositions.get(toId);
          if (!p1 || !p2) return;
          
          const midY = (p1.y + p2.y) / 2;
          const midX = (p1.x + p2.x) / 2;
          path.setAttribute('d', 'M' + p1.x + ',' + p1.y + ' Q' + p1.x + ',' + midY + ' ' + midX + ',' + midY + ' Q' + p2.x + ',' + midY + ' ' + p2.x + ',' + p2.y);
        });
        
        // Update line badge if this is the first station
        document.querySelectorAll('.line-badge').forEach(badge => {
          if (badge.dataset.firstStation !== stationId) return;
          const labelY = pos.y;
          const labelHeight = 36;
          badge.querySelector('.badge-shadow').setAttribute('y', labelY - labelHeight/2 + 2);
          badge.querySelector('.badge-bg').setAttribute('y', labelY - labelHeight/2);
          badge.querySelector('.badge-text').setAttribute('y', labelY + 5);
        });
      }
      
      // Mouse down - start drag
      svg.addEventListener('mousedown', function(e) {
        const target = e.target.closest('.station-group');
        if (!target) return;
        
        isDragging = true;
        dragTarget = target;
        dragTarget.style.cursor = 'grabbing';
        
        const pt = getSvgPoint(e);
        dragStartX = pt.x;
        dragStartY = pt.y;
        originalX = parseFloat(dragTarget.dataset.x);
        originalY = parseFloat(dragTarget.dataset.y);
        
        e.preventDefault();
      });
      
      // Mouse move - drag
      svg.addEventListener('mousemove', function(e) {
        if (!isDragging || !dragTarget) return;
        
        const pt = getSvgPoint(e);
        const dx = pt.x - dragStartX;
        const dy = pt.y - dragStartY;
        
        const newX = originalX + dx;
        const newY = originalY + dy;
        const stationId = dragTarget.dataset.id;
        
        updateStationPosition(stationId, newX, newY);
        updateLinePaths(stationId);
      });
      
      // Mouse up - end drag
      svg.addEventListener('mouseup', function() {
        if (dragTarget) {
          dragTarget.style.cursor = 'grab';
        }
        isDragging = false;
        dragTarget = null;
      });
      
      // Mouse leave SVG
      svg.addEventListener('mouseleave', function() {
        if (dragTarget) {
          dragTarget.style.cursor = 'grab';
        }
        isDragging = false;
        dragTarget = null;
      });
      
      // Touch support for mobile
      svg.addEventListener('touchstart', function(e) {
        const touch = e.touches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        const group = target?.closest('.station-group');
        if (!group) return;
        
        isDragging = true;
        dragTarget = group;
        
        const pt = getSvgPoint(touch);
        dragStartX = pt.x;
        dragStartY = pt.y;
        originalX = parseFloat(dragTarget.dataset.x);
        originalY = parseFloat(dragTarget.dataset.y);
        
        e.preventDefault();
      }, { passive: false });
      
      svg.addEventListener('touchmove', function(e) {
        if (!isDragging || !dragTarget) return;
        
        const touch = e.touches[0];
        const pt = getSvgPoint(touch);
        const dx = pt.x - dragStartX;
        const dy = pt.y - dragStartY;
        
        const newX = originalX + dx;
        const newY = originalY + dy;
        const stationId = dragTarget.dataset.id;
        
        updateStationPosition(stationId, newX, newY);
        updateLinePaths(stationId);
        
        e.preventDefault();
      }, { passive: false });
      
      svg.addEventListener('touchend', function() {
        isDragging = false;
        dragTarget = null;
      });
    })();
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
