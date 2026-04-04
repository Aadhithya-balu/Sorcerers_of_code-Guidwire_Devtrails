import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const DEFAULT_PORT = 5173;
const rawPort = process.env.PORT ?? String(DEFAULT_PORT);

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const rawBasePath = process.env.BASE_PATH?.trim() || "/";
const basePath =
  rawBasePath === "/" ? "/" : `/${rawBasePath.replace(/^\/+|\/+$/g, "")}/`;
const insuranceProxyTarget =
  process.env.VITE_INSURANCE_API_URL || "http://localhost:5000";
const automationProxyTarget =
  process.env.VITE_AUTOMATION_API_URL || "http://localhost:3000";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      "/insurance-api": {
        target: insuranceProxyTarget,
        changeOrigin: true,
        rewrite: (apiPath) => apiPath.replace(/^\/insurance-api/, ""),
      },
      "/automation-api": {
        target: automationProxyTarget,
        changeOrigin: true,
        rewrite: (apiPath) => apiPath.replace(/^\/automation-api/, ""),
      },
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
