import { defineConfig } from "@quasar/app-vite";
import { fileURLToPath } from "node:url";

const srcPath = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig(() => ({
  boot: ["pinia"],
  css: ["app.scss"],
  extras: ["material-icons"],
  build: {
    vueRouterMode: "hash",
    extendViteConf(viteConf) {
      viteConf.resolve ||= {};
      viteConf.resolve.alias = {
        ...(viteConf.resolve.alias || {}),
        src: srcPath,
      };
      viteConf.plugins.push({
        name: "normalize-quasar-windows-entry-path",
        transformIndexHtml: {
          order: "post",
          handler(html) {
            return html.replaceAll("\\", "/");
          },
        },
      });
    },
  },
  devServer: {
    port: 9000,
    open: true,
  },
  framework: {
    config: {},
    plugins: [],
  },
  animations: [],
}));
