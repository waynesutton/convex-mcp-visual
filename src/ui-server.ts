/**
 * UI Server
 *
 * Starts a local HTTP server to serve interactive UI apps
 * and opens them in the user's default browser.
 */

import { createServer, IncomingMessage, ServerResponse } from "http";
import { readFileSync, existsSync } from "fs";
import { join, dirname, extname } from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import { platform } from "os";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Track active servers to avoid port conflicts
const activeServers = new Map<number, ReturnType<typeof createServer>>();

// MIME types for serving static files
const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

// Find an available port starting from the base
async function findAvailablePort(basePort: number): Promise<number> {
  let port = basePort;
  while (activeServers.has(port)) {
    port++;
  }
  return port;
}

// Open URL in default browser (cross-platform)
function openBrowser(url: string): void {
  const cmd =
    platform() === "darwin"
      ? "open"
      : platform() === "win32"
        ? "start"
        : "xdg-open";

  exec(`${cmd} "${url}"`, (error) => {
    if (error) {
      console.error(`Failed to open browser: ${error.message}`);
    }
  });
}

// Get the base path for built apps
function getDistAppsPath(): string {
  return join(__dirname, "..", "dist", "apps");
}

// Get the path to an app's index.html
function getAppHtmlPath(appName: string): string {
  const basePath = getDistAppsPath();

  // Try Vite's nested output: dist/apps/apps/{appName}/index.html
  const nestedPath = join(basePath, "apps", appName, "index.html");
  if (existsSync(nestedPath)) {
    return nestedPath;
  }

  // Try flat structure: dist/apps/{appName}/index.html
  const flatPath = join(basePath, appName, "index.html");
  if (existsSync(flatPath)) {
    return flatPath;
  }

  // Try source: apps/{appName}/index.html
  const srcPath = join(__dirname, "..", "apps", appName, "index.html");
  if (existsSync(srcPath)) {
    return srcPath;
  }

  throw new Error(`App not found: ${appName}`);
}

export interface UIServerConfig {
  appName:
    | "schema-browser"
    | "realtime-dashboard"
    | "schema-diagram"
    | "codebase-subway-map";
  config: Record<string, unknown>;
  port?: number;
  autoClose?: number; // Auto-close after N milliseconds (0 = never)
  customHtml?: string; // Optional custom HTML content (bypasses app loading)
}

export interface UIServerResult {
  url: string;
  port: number;
  close: () => void;
}

/**
 * Start a local server for a UI app and open it in the browser
 */
export async function launchUIApp(
  options: UIServerConfig,
): Promise<UIServerResult> {
  const {
    appName,
    config,
    port: preferredPort = 3456,
    autoClose = 0,
    customHtml,
  } = options;

  const port = await findAvailablePort(preferredPort);
  const configJson = JSON.stringify(config);
  const distAppsPath = getDistAppsPath();

  // Use custom HTML if provided (for diagram viewer etc)
  let indexHtml: string;
  if (customHtml) {
    indexHtml = customHtml;
  } else {
    // Read and modify the HTML with injected config
    try {
      const appHtmlPath = getAppHtmlPath(appName);
      indexHtml = readFileSync(appHtmlPath, "utf-8");

      // Inject the config into the HTML
      const configScript = `
    <script>
      window.__CONVEX_CONFIG__ = ${configJson};
    </script>
    `;
      indexHtml = indexHtml.replace("<head>", `<head>\n${configScript}`);
    } catch (error) {
      // If app HTML not found, serve an error page
      indexHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Error - ${appName}</title>
  <style>
    body { font-family: system-ui; background: #1a1a2e; color: #eee; padding: 40px; }
    h1 { color: #e94560; }
    pre { background: #16213e; padding: 20px; border-radius: 8px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>UI App Not Found</h1>
  <p>The ${appName} UI could not be loaded. Make sure to build the project first:</p>
  <pre>npm run build</pre>
  <p>Error: ${error instanceof Error ? error.message : String(error)}</p>
  <h2>Config received:</h2>
  <pre>${JSON.stringify(config, null, 2)}</pre>
</body>
</html>
    `;
    }
  }

  return new Promise((resolve, reject) => {
    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      const url = req.url || "/";

      // Serve index.html for root
      if (url === "/" || url === "/index.html") {
        res.writeHead(200, {
          "Content-Type": "text/html",
          "Cache-Control": "no-cache",
        });
        res.end(indexHtml);
        return;
      }

      // Serve static assets from dist/apps/assets/
      if (url.startsWith("/assets/") || url.includes("/assets/")) {
        const assetPath = url.replace(/^.*\/assets\//, "assets/");
        const filePath = join(distAppsPath, assetPath);

        if (existsSync(filePath)) {
          const ext = extname(filePath);
          const contentType = MIME_TYPES[ext] || "application/octet-stream";

          try {
            const content = readFileSync(filePath);
            res.writeHead(200, {
              "Content-Type": contentType,
              "Cache-Control": "public, max-age=31536000",
            });
            res.end(content);
            return;
          } catch {
            // Fall through to 404
          }
        }
      }

      // 404 for everything else
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
    });

    server.on("error", (error: Error & { code?: string }) => {
      if (error.code === "EADDRINUSE") {
        // Port in use, try next
        launchUIApp({ ...options, port: port + 1 })
          .then(resolve)
          .catch(reject);
      } else {
        reject(error);
      }
    });

    server.listen(port, "127.0.0.1", () => {
      activeServers.set(port, server);

      const url = `http://127.0.0.1:${port}`;

      // Open browser
      openBrowser(url);

      // Set up auto-close timer if requested
      let closeTimer: NodeJS.Timeout | null = null;
      if (autoClose > 0) {
        closeTimer = setTimeout(() => {
          close();
        }, autoClose);
      }

      const close = () => {
        if (closeTimer) {
          clearTimeout(closeTimer);
        }
        server.close();
        activeServers.delete(port);
      };

      resolve({
        url,
        port,
        close,
      });
    });
  });
}

/**
 * Close all active UI servers
 */
export function closeAllUIServers(): void {
  for (const [port, server] of activeServers) {
    server.close();
    activeServers.delete(port);
  }
}
