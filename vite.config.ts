// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
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
        srcDir: "public",
        registerType: "autoUpdate",
        injectRegister: "script",
        filename: "sw.js",
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
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        },
      }),
    ],
  },
});
