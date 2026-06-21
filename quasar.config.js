import { defineConfig } from "@quasar/app-vite";

export default defineConfig(() => ({
  boot: ["pinia"],
  css: ["app.scss"],
  extras: ["material-icons"],
  build: {
    vueRouterMode: "hash",
    extendViteConf(viteConf) {
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
