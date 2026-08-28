import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "icon.svg",
        "fonts/marumonica.woff2",
        "fonts/FONT-NOTICES.txt",
        "fonts/VT323-OFL.txt"
      ],
      manifest: {
        name: "Multicolor Sweeper",
        short_name: "MCSweeper",
        description: "3色・4色のNo-Guessマインスイーパー",
        theme_color: "#15182b",
        background_color: "#15182b",
        display: "standalone",
        orientation: "portrait",
        start_url: ".",
        lang: "ja",
        icons: [
          {
            src: "icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,woff2,txt}"]
      }
    })
  ],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"]
  }
});
