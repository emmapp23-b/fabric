/**
 * Patch @opennextjs/cloudflare so Next.js 16.4's `preview-props.json` is
 * treated as an optional manifest.
 *
 * Next 16.4 loads preview-props.json when constructing the server, but the
 * adapter only inlines `*-manifest`, `required-server-files` and
 * `prefetch-hints` and throws "Unexpected loadManifest" for everything else —
 * crashing the Worker at startup with a 500 on every route.
 *
 * The adapter already returns `{}` for other optional manifests it doesn't
 * inline (react-loadable, subresource-integrity, etc.), matching Next's own
 * tolerant `handleMissing` behaviour. This adds preview-props to that list.
 * This app uses no draft/preview mode, so an empty object is semantically
 * correct (draft mode stays disabled).
 *
 * Run automatically before the opennextjs-cloudflare build.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const target = join(
  process.cwd(),
  "node_modules/@opennextjs/cloudflare/dist/cli/build/patches/plugins/load-manifest.js",
);

if (!existsSync(target)) {
  console.error("[patch] load-manifest.js not found — adapter missing?");
  process.exit(1);
}

const src = readFileSync(target, "utf-8");

if (src.includes('p.endsWith("preview-props")')) {
  console.log("[patch] preview-props already whitelisted — skipping");
  process.exit(0);
}

const needle = 'p.endsWith("prefetch-hints")) {';
if (!src.includes(needle)) {
  console.error("[patch] anchor not found — adapter version changed, review manually");
  process.exit(1);
}

const patched = src.replace(
  needle,
  'p.endsWith("prefetch-hints") ||\n        p.endsWith("preview-props")) {',
);

writeFileSync(target, patched);
console.log("[patch] whitelisted preview-props as an optional manifest");
