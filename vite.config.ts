import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    outDir: "dist/apps",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        "schema-browser": resolve(__dirname, "apps/schema-browser/index.html"),
        "realtime-dashboard": resolve(
          __dirname,
          "apps/realtime-dashboard/index.html",
        ),
        "kanban-board": resolve(__dirname, "apps/kanban-board/index.html"),
      },
      output: {
        // Inline all JS into HTML for MCP Apps compatibility
        manualChunks: undefined,
      },
    },
    // Inline all assets for single-file distribution
    assetsInlineLimit: 1000000,
    cssCodeSplit: false,
  },
  // Set base to relative for embedded use
  base: "./",
});
