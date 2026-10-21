import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";

/** En desarrollo sirve /api con el mismo router que usa Vercel (api/router.ts). */
function devApi(): Plugin {
  return {
    name: "dev-api",
    apply: "serve",
    configureServer(server) {
      // Solo en el proceso del servidor: las variables sin prefijo VITE_ nunca llegan al navegador.
      Object.assign(process.env, loadEnv(server.config.mode, process.cwd(), ""));

      server.middlewares.use("/api", async (req, res, next) => {
        try {
          const { handle } = await server.ssrLoadModule("/api/router.ts");
          const url = new URL(req.originalUrl ?? "/", `http://${req.headers.host}`);
          const headers = new Headers();
          for (const [key, value] of Object.entries(req.headers)) {
            if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(", ") : value);
          }
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const hasBody = req.method !== "GET" && req.method !== "HEAD";

          const response: Response = await handle(
            new Request(url, { method: req.method, headers, body: hasBody ? Buffer.concat(chunks) : undefined }),
          );

          res.statusCode = response.status;
          response.headers.forEach((value, key) => {
            if (key !== "set-cookie") res.setHeader(key, value);
          });
          const cookies = response.headers.getSetCookie();
          if (cookies.length) res.setHeader("set-cookie", cookies);
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (error) {
          next(error);
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [
    devApi(),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Process Hub",
        short_name: "Process Hub",
        description:
          "Espacio de trabajo del Process Automation Team: proyectos, documentación y seguimiento.",
        lang: "es",
        dir: "ltr",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "any",
        background_color: "#f8f9fa",
        theme_color: "#0066cc",
        categories: ["business", "productivity"],
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        shortcuts: [
          {
            name: "Dashboard",
            short_name: "Dashboard",
            url: "/",
            icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
          },
          {
            name: "Proyectos",
            short_name: "Proyectos",
            url: "/projects",
            icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,woff2,png,svg,webmanifest}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  preview: {
    port: 4173,
  },
});
