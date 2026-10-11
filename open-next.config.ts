// OpenNext config for deploying the Next.js app to Cloudflare Workers.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// Use the static-assets incremental cache so the first deploy needs no extra
// R2/KV binding — ISR entries are served from the deployed asset bundle.
export default defineCloudflareConfig({
	incrementalCache: staticAssetsIncrementalCache,
});
