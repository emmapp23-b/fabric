import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Cache Components + Partial Prefetching are disabled: this app is entirely
  // client components (Firestore real-time) and uses none of the `use cache` /
  // cacheLife / revalidate APIs. Keeping them on crashed the OpenNext
  // Cloudflare Worker at startup (it tried to load preview-props.json, which
  // the Workers runtime doesn't intercept). Both are opt-in caching features;
  // turning them off restores the standard model with no behavior change here.
  cacheComponents: false,
  partialPrefetching: false,
  images: {
    // Admin-posted media lives on Cloudinary (cloud: dwgdp6afp)
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/dwgdp6afp/**" },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
