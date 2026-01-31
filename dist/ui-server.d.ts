/**
 * UI Server
 *
 * Starts a local HTTP server to serve interactive UI apps
 * and opens them in the user's default browser.
 */
export interface UIServerConfig {
    appName: "schema-browser" | "realtime-dashboard" | "schema-diagram";
    config: Record<string, unknown>;
    port?: number;
    autoClose?: number;
    customHtml?: string;
}
export interface UIServerResult {
    url: string;
    port: number;
    close: () => void;
}
/**
 * Start a local server for a UI app and open it in the browser
 */
export declare function launchUIApp(options: UIServerConfig): Promise<UIServerResult>;
/**
 * Close all active UI servers
 */
export declare function closeAllUIServers(): void;
//# sourceMappingURL=ui-server.d.ts.map