import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const proxyTarget =
  process.env.VITE_PROXY_TARGET ?? "http://127.0.0.1:8001";

const disableHmr = process.env.VITE_DISABLE_HMR === "1";
const hmrHost = process.env.VITE_HMR_HOST;

const proxy = {
  "/api": { target: proxyTarget, changeOrigin: true },
  "/health": { target: proxyTarget, changeOrigin: true },
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 3000,
    allowedHosts: true,
    proxy,
    // Dev WS defaults to localhost → reload loop on phones using the LAN IP
    hmr: disableHmr
      ? false
      : hmrHost
        ? { host: hmrHost, clientPort: 3000 }
        : true,
  },
  preview: {
    host: true,
    port: 3000,
    allowedHosts: true,
    proxy,
  },
});
