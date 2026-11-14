import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

// Legacy PWA remains rooted at "/". Only the *separate* hub Worker is
// built under /games/multicolor-sweeper/play/. Never change the old scope.
const hubBase = "/games/multicolor-sweeper/play/";
const basePath = process.env.SWEEPER_BASE === hubBase ? hubBase : "/";
const hubCanonical = "https://hanage.app/games/multicolor-sweeper/play/";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    {
      name: "sweeper-canonical",
      transformIndexHtml(html) {
        // Do not canonicalize the still-live old subdomain until the new
        // hub game has actually shipped and its notice flag is enabled.
        const published = process.env.VITE_LEGACY_NEW_SITE_URL === hubCanonical;
        return basePath === hubBase || published
          ? html.replace("</head>", `  <link rel="canonical" href="${hubCanonical}" />\n  </head>`)
          : html;
      },
    },
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
        id: basePath,
        name: "Multicolor Sweeper",
        short_name: "MCSweeper",
        description: "A multicolor Minesweeper puzzle with three- and four-color modes.",
        theme_color: "#15182b",
        background_color: "#15182b",
        display: "standalone",
        orientation: "portrait",
        start_url: basePath,
        scope: basePath,
        lang: "en",
        icons: [
          {
            src: `${basePath}icons/icon-192.png`,
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: `${basePath}icons/icon-512.png`,
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          },
          {
            src: `${basePath}icons/maskable-192.png`,
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable"
          },
          {
            src: `${basePath}icons/maskable-512.png`,
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          },
          {
            src: `${basePath}icon.svg`,
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
    include: ["src/**/*.test.{ts,tsx}"]
  }
});
