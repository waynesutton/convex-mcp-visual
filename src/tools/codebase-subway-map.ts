/**
 * Codebase Subway Map Tool
 *
 * Generates a subway map style diagram of files and local imports.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { renderMermaid, renderMermaidAscii, THEMES } from "beautiful-mermaid";
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

Shows local imports and file relationships as colored lines connecting files.
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
      theme: {
        type: "string",
        enum: [
          "zinc-light",
          "zinc-dark",
          "tokyo-night",
          "github-light",
          "github-dark",
          "dracula",
          "nord",
        ],
        description: "Color theme for SVG output (default: github-dark)",
        default: "github-dark",
      },
      ascii: {
        type: "boolean",
        description: "Use ASCII characters instead of Unicode (default: false)",
        default: false,
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
  group: string;
  isAsset: boolean;
}

interface GraphEdge {
  from: string;
  to: string;
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

const GROUP_COLORS = [
  "#1f77b4",
  "#2ca02c",
  "#ff7f0e",
  "#17becf",
  "#bcbd22",
  "#8c564b",
  "#7f7f7f",
  "#d62728",
];

export async function handleCodebaseSubwayMap(
  args: Record<string, unknown> = {},
): Promise<ToolResponse> {
  const {
    root: rawRoot,
    maxDepth = 6,
    maxNodes = 120,
    theme = "github-dark",
    ascii = false,
    noBrowser = false,
  } = args as {
    root?: string;
    maxDepth?: number;
    maxNodes?: number;
    theme?: string;
    ascii?: boolean;
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
    const mermaidCode = buildMermaid(pruned.nodes, pruned.edges);

    // Render ASCII for terminal
    let asciiDiagram = "";
    try {
      asciiDiagram = renderMermaidAscii(mermaidCode, { useAscii: ascii });
    } catch {
      asciiDiagram = `[ASCII rendering not available for this diagram]\n\n${mermaidCode}`;
    }

    // Render SVG for browser
    let svgContent = "";
    let uiUrl = "";
    if (!noBrowser) {
      try {
        const themeConfig =
          THEMES[theme as keyof typeof THEMES] || THEMES["github-dark"];
        svgContent = await renderMermaid(mermaidCode, themeConfig);
        const uiServer = await launchUIApp({
          appName: "codebase-subway-map",
          config: {
            svg: svgContent,
            mermaidCode,
            theme,
            root,
            nodeCount: pruned.nodes.length,
            edgeCount: pruned.edges.length,
          },
          port: 3459,
          autoClose: 30 * 60 * 1000,
          customHtml: buildMapHtml(
            svgContent,
            mermaidCode,
            theme,
            pruned.nodes,
          ),
        });
        uiUrl = uiServer.url;
      } catch (err) {
        console.error("Failed to render SVG:", err);
      }
    }

    const lines: string[] = [];
    lines.push("## Codebase Subway Map");
    lines.push("");
    if (uiUrl) {
      lines.push(`**Interactive SVG**: ${uiUrl}`);
      lines.push("");
    }
    lines.push(`Root: \`${root}\``);
    lines.push(`Nodes: ${pruned.nodes.length} | Links: ${pruned.edges.length}`);
    lines.push("");
    lines.push("**ASCII Map:**");
    lines.push("");
    lines.push("```");
    lines.push(asciiDiagram);
    lines.push("```");
    lines.push("");
    lines.push("**Mermaid Code:**");
    lines.push("");
    lines.push("```mermaid");
    lines.push(mermaidCode);
    lines.push("```");

    return {
      content: [
        {
          type: "text",
          text: lines.join("\n"),
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
  const label = formatLabel(relPath);
  const group = getGroupName(relPath, isAsset);
  const node: GraphNode = {
    id: toNodeId(relPath),
    path: relPath,
    label,
    group,
    isAsset,
  };

  nodes.set(filePath, node);
  return node;
}

function formatLabel(relPath: string): string {
  const parts = relPath.split(sep);
  if (parts.length <= 2) return relPath;
  return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
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

function buildMermaid(nodes: GraphNode[], edges: GraphEdge[]): string {
  const lines: string[] = [];
  lines.push('%%{init: {"flowchart": {"curve": "basis"}}}%%');
  lines.push("flowchart LR");

  const groups = new Map<string, GraphNode[]>();
  for (const node of nodes) {
    const group = node.group;
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)?.push(node);
  }

  const groupEntries = Array.from(groups.entries());
  groupEntries.sort((a, b) => a[0].localeCompare(b[0]));

  for (const [group, groupNodes] of groupEntries) {
    const groupId = `group_${group.replace(/[^a-zA-Z0-9]/g, "_")}`;
    lines.push(`  subgraph ${groupId}["${group}"]`);
    for (const node of groupNodes) {
      lines.push(`    ${node.id}["${node.label}"]`);
    }
    lines.push("  end");
  }

  for (const edge of edges) {
    if (edge.from === edge.to) continue;
    lines.push(`  ${edge.from} --- ${edge.to}`);
  }

  const classDefs: string[] = [];
  groupEntries.forEach(([group], index) => {
    const color = GROUP_COLORS[index % GROUP_COLORS.length];
    const className = `line_${group.replace(/[^a-zA-Z0-9]/g, "_")}`;
    const nodeIds = (groups.get(group) || []).map((node) => node.id);
    if (nodeIds.length > 0) {
      lines.push(`  class ${nodeIds.join(",")} ${className}`);
      classDefs.push(
        `  classDef ${className} fill:#f8f7f3,stroke:${color},stroke-width:3px,color:#1a1a1a`,
      );
    }
  });

  lines.push(...classDefs);
  return lines.join("\n");
}

function buildMapHtml(
  svg: string,
  mermaidCode: string,
  _theme: string,
  nodes: GraphNode[],
): string {
  const groupList = Array.from(new Set(nodes.map((node) => node.group))).sort();
  const legendItems = groupList
    .map((group, index) => {
      const color = GROUP_COLORS[index % GROUP_COLORS.length];
      return `<div class="legend-item"><span class="legend-dot" style="background:${color}; border-radius: 50%;"></span>${escapeHtml(group)}</div>`;
    })
    .join("");

  const fileCount = nodes.length;
  const folderCount = groupList.length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Codebase Subway Map</title>
  <style>${getSharedStyles()}</style>
</head>
<body>
  <header class="header">
    <div class="header-left">
      <h1><span class="status-dot"></span> Codebase Subway Map</h1>
      <span class="header-info">${fileCount} files &middot; ${folderCount} folders</span>
    </div>
    <div class="header-actions">
      ${getThemeToggleHtml()}
    </div>
  </header>

  <main class="main-content">
    <div class="legend">${legendItems}</div>

    <div class="diagram-container">
      ${svg}
    </div>

    <div style="margin-top: 24px;">
      <div class="card">
        <div class="card-header">
          <div class="card-title">Mermaid Code</div>
          <button class="btn" onclick="copyCode()">Copy</button>
        </div>
        <div class="card-body" style="padding: 0;">
          <pre id="mermaid-code" style="border: none; border-radius: 0; margin: 0;">${escapeHtml(mermaidCode)}</pre>
        </div>
      </div>
    </div>
  </main>

  <script>
    ${getThemeToggleScript()}

    function copyCode() {
      const code = document.getElementById("mermaid-code").textContent;
      navigator.clipboard.writeText(code).then(() => {
        const btn = document.querySelector(".btn");
        btn.textContent = "Copied!";
        setTimeout(() => { btn.textContent = "Copy"; }, 2000);
      });
    }
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
