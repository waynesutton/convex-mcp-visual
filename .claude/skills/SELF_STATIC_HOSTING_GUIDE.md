# How to use Convex self static hosting

A step by step guide for adding `@convex-dev/self-static-hosting` to any React + Vite + Convex project. This lets you serve your frontend directly from Convex with no external hosting provider.

## 1. Install the package

```bash
npm install @convex-dev/self-static-hosting
```

Or install from GitHub directly:

```bash
npm install github:get-convex/self-static-hosting
```

## 2. Register the component

Create or update `convex/convex.config.ts`:

```typescript
import { defineApp } from "convex/server";
import selfStaticHosting from "@convex-dev/self-static-hosting/convex.config.js";

const app = defineApp();
app.use(selfStaticHosting);

export default app;
```

## 3. Set up HTTP routes

Create or update `convex/http.ts` to serve your static files:

```typescript
import { httpRouter } from "convex/server";
import { registerStaticRoutes } from "@convex-dev/self-static-hosting";
import { components } from "./_generated/api";

const http = httpRouter();

// Serve static files at root with SPA fallback
registerStaticRoutes(http, components.selfStaticHosting);

export default http;
```

If you have other HTTP routes (webhooks, etc.), register them on the same router before or after `registerStaticRoutes`.

## 4. Expose the upload API

Create `convex/staticHosting.ts`:

```typescript
import { components } from "./_generated/api";
import {
  exposeUploadApi,
  exposeDeploymentQuery,
} from "@convex-dev/self-static-hosting";

// INTERNAL functions, only callable via `npx convex run`, not from the public internet
export const { generateUploadUrl, recordAsset, gcOldAssets, listAssets } =
  exposeUploadApi(components.selfStaticHosting);

// Public query for live reload notifications (optional)
export const { getCurrentDeployment } =
  exposeDeploymentQuery(components.selfStaticHosting);
```

## 5. Update your Convex URL resolution

In `src/main.tsx` (or wherever you create your Convex client), use `getConvexUrl` so the app works both in local dev and when self hosted:

```typescript
import { getConvexUrl } from "@convex-dev/self-static-hosting";

// Uses env var in dev, derives from hostname when self hosted
const convexUrl = import.meta.env.VITE_CONVEX_URL ?? getConvexUrl();
```

Then pass `convexUrl` to your `ConvexProvider` or `ConvexReactClient` as usual.

## 6. Add deploy scripts to package.json

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "deploy": "npx @convex-dev/self-static-hosting deploy",
    "deploy:static": "npx @convex-dev/self-static-hosting upload --build --prod"
  }
}
```

What each script does:

- `deploy` runs a full deployment: builds the frontend with the production `VITE_CONVEX_URL`, deploys the Convex backend, then uploads static files
- `deploy:static` builds and uploads only the static files to an already deployed backend

## 7. Set up environment variables

Your `.env.local` should have:

```
CONVEX_DEPLOYMENT=prod:your-deployment-name
VITE_CONVEX_URL=https://your-deployment-name.convex.cloud
VITE_CONVEX_SITE_URL=https://your-deployment-name.convex.site
```

The `--build` flag in the deploy script sets `VITE_CONVEX_URL` to the production URL automatically during the build step. Do not run `npm run build` separately before uploading because that would use the dev URL from `.env.local`.

## 8. Vite config

If you run into React version conflicts (common with component libraries), add resolve aliases in `vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      react: path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
      "convex/react": path.resolve(__dirname, "./node_modules/convex/react"),
    },
  },
});
```

## 9. Deploy

Run Convex dev once to push the schema and enable HTTP actions:

```bash
npx convex dev
```

Then deploy everything to production:

```bash
npm run deploy
```

Your app is live at `https://your-deployment-name.convex.site`.

## Quick checklist

- [ ] `@convex-dev/self-static-hosting` installed
- [ ] `convex/convex.config.ts` registers the component
- [ ] `convex/http.ts` registers static routes
- [ ] `convex/staticHosting.ts` exposes internal upload API
- [ ] `src/main.tsx` uses `getConvexUrl()` fallback
- [ ] `package.json` has deploy scripts
- [ ] Run `npx convex dev` at least once before first deploy

## Optional: live reload banner

If you want connected users to see a prompt when you deploy a new version, add the `UpdateBanner` component to your app:

```typescript
import { UpdateBanner } from "@convex-dev/self-static-hosting/react";
import { api } from "../convex/_generated/api";

function App() {
  return (
    <div>
      <UpdateBanner
        getCurrentDeployment={api.staticHosting.getCurrentDeployment}
        message="New version available!"
        buttonText="Refresh"
      />
      {/* rest of your app */}
    </div>
  );
}
```

This requires the `exposeDeploymentQuery` from step 4.

## Optional: Cloudflare Workers

For edge performance, deploy static files to Cloudflare Workers instead of Convex storage:

```bash
npx wrangler login
npx @convex-dev/self-static-hosting upload --build --prod --cloudflare-workers --worker-name my-app
```

Or run the interactive setup wizard:

```bash
npx @convex-dev/self-static-hosting setup-cloudflare
```

## Source

https://github.com/get-convex/self-static-hosting
