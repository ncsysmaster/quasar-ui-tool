import { defineConfig } from "@quasar/app-vite";
import { fileURLToPath } from "node:url";

const srcPath = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig(() => ({
  boot: ["pinia"],
  css: ["app.scss"],
  extras: ["material-icons"],
  build: {
    vueRouterMode: "hash",
    // 루트 .env 파일은 @quasar/app-vite가 자동으로 읽는다.
    // 단, QCLI_ 접두사가 붙은 변수만 클라이언트 코드(process.env.QCLI_*)에 노출된다.
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
