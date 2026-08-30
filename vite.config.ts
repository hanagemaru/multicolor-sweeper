import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

// mcsweeper.hanage.app 専用ドメインに配信するため base は "/" 固定。
// サブパス配信にするとService Workerのscopeとアセットの絶対パスが崩れる。
export default defineConfig({
  base: "/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "icon.svg",
        "apple-touch-icon.png",
        "icons/icon-192.png",
        "icons/icon-512.png",
        "icons/maskable-192.png",
        "icons/maskable-512.png",
        "fonts/marumonica.woff2",
        "fonts/FONT-NOTICES.txt",
        "fonts/VT323-OFL.txt"
      ],
      manifest: {
        id: "/",
        name: "Multicolor Sweeper",
        short_name: "MCSweeper",
        description: "A multicolor Minesweeper puzzle with three- and four-color modes.",
        theme_color: "#15182b",
        background_color: "#15182b",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        lang: "en",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icons/maskable-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable"
          },
          {
            src: "/icons/maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          },
          {
            src: "/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,woff2,txt,png,svg}"]
      }
    })
  ],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"]
  }
});
