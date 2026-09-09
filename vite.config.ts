import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      VitePWA({
        strategies: "injectManifest",
        srcDir: "src",
        filename: "sw.js",
        registerType: "autoUpdate",
        injectRegister: "script",
        devOptions: { enabled: false },
        manifest: {
          name: "畫聊 Doodle — 多人遊戲平台",
          short_name: "畫聊",
          description: "即時繪圖猜題與多人小遊戲平台，並支援離線單人街機遊戲。",
          start_url: "/",
          scope: "/",
          display: "standalone",
          background_color: "#ffffff",
          theme_color: "#4f46e5",
          icons: [
            { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
            { src: "/pwa-icon.png", sizes: "512x512", type: "image/png" },
            { src: "/pwa-icon.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
        },
        injectManifest: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2,webmanifest}"],
        },
      }),
    ],
  },
});
