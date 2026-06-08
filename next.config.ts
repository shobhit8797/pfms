import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep PDF libraries out of the server bundle. pdf-parse wraps pdfjs-dist,
  // which lazily resolves "./pdf.worker.mjs" relative to its own file. When
  // bundled into .next/chunks that relative path breaks ("Cannot find module
  // './pdf.worker.mjs'"). Externalizing makes them require() from node_modules
  // at runtime, where the sibling worker file resolves correctly.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
