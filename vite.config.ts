import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: { outDir: "dist" },
  // Local dev: /api/* is served by `npm run dev:api` (or `npm run dev:mock`)
  server: { proxy: { "/api": "http://localhost:3001" } },
});
