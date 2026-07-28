const vscode = require("vscode");
const {
  copyFile,
  mkdir,
  readdir,
  stat,
  writeFile,
} = require("fs/promises");
const { dirname, join } = require("path");

const NEW_QUASAR_PROJECT_COMMAND = "quasarTool.newQuasarProject";
function registerNewQuasarProjectCommand(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand(NEW_QUASAR_PROJECT_COMMAND, (uri) =>
      createNewQuasarProject(uri, context),
    ),
  );
}

async function createNewQuasarProject(uri, context) {
  const parentDir = await resolveProjectParentDir(uri);
  if (!parentDir) return;

  const projectName = await vscode.window.showInputBox({
    title: "New Quasar Project (1/4)",
    prompt: "생성할 Quasar 프로젝트 폴더명을 입력하세요.",
    value: "quasar-app",
    validateInput: validateProjectName,
  });
  if (projectName === undefined) return;

  const normalizedProjectName = projectName.trim();
  const packageName = await vscode.window.showInputBox({
    title: "New Quasar Project (2/4)",
    prompt: "package.json의 name 값을 입력하세요.",
    value: toPackageName(normalizedProjectName),
    validateInput: validatePackageName,
  });
  if (packageName === undefined) return;

  const appTitle = await vscode.window.showInputBox({
    title: "New Quasar Project (3/4)",
    prompt: "브라우저와 기본 화면에 표시할 앱 제목을 입력하세요.",
    value: toDisplayName(normalizedProjectName),
    validateInput: validateRequired("앱 제목을 입력하세요."),
  });
  if (appTitle === undefined) return;

  const port = await vscode.window.showInputBox({
    title: "New Quasar Project (4/4)",
    prompt: "npm run dev 실행 시 사용할 개발 서버 포트를 입력하세요.",
    value: "9000",
    validateInput: validatePort,
  });
  if (port === undefined) return;

  const projectDir = join(parentDir, normalizedProjectName);
  const blockedReason = await getBlockedTargetReason(projectDir);
  if (blockedReason) {
    vscode.window.showErrorMessage(blockedReason);
    return;
  }

  const options = {
    projectName: normalizedProjectName,
    packageName: packageName.trim(),
    appTitle: appTitle.trim(),
    port: Number(port),
  };

  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Quasar Tool: creating project",
        cancellable: false,
      },
      async (progress) => {
        progress.report({ message: normalizedProjectName });
        await writeProjectScaffold(projectDir, options, context);
      },
    );
  } catch (error) {
    vscode.window.showErrorMessage(
      `Quasar 프로젝트 생성 실패: ${error.message}`,
    );
    return;
  }

  const action = await vscode.window.showInformationMessage(
    `Quasar 프로젝트 생성 완료: ${projectDir}`,
    "Open Folder",
    "Run npm install",
  );

  if (action === "Open Folder") {
    await vscode.commands.executeCommand(
      "vscode.openFolder",
      vscode.Uri.file(projectDir),
      false,
    );
    return;
  }

  if (action === "Run npm install") {
    const terminal = vscode.window.createTerminal({
      name: `Quasar Tool: ${options.projectName}`,
      cwd: projectDir,
    });
    terminal.show(false);
    terminal.sendText("npm install", true);
  }
}

async function resolveProjectParentDir(uri) {
  const explorerParentDir = await getExplorerParentDir(uri);
  if (explorerParentDir) return explorerParentDir;

  const selectedFolder = await vscode.window.showOpenDialog({
    title: "New Quasar Project: Select parent folder",
    openLabel: "Select Folder",
    defaultUri: vscode.workspace.workspaceFolders?.[0]?.uri,
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
  });
  return selectedFolder?.[0]?.fsPath || "";
}

async function getExplorerParentDir(uri) {
  if (!uri?.fsPath) return "";

  try {
    const uriStat = await stat(uri.fsPath);
    return uriStat.isDirectory() ? uri.fsPath : dirname(uri.fsPath);
  } catch (_error) {
    return dirname(uri.fsPath);
  }
}

async function writeProjectScaffold(projectDir, options, context) {
  const files = createProjectFiles(options);
  await mkdir(projectDir, { recursive: true });
  await Promise.all(
    files.map(async (file) => {
      const targetPath = join(projectDir, ...file.path);
      await mkdir(dirname(targetPath), { recursive: true });
      await writeFile(targetPath, file.content, "utf8");
    }),
  );

  await Promise.all(
    [
      [".src", "store", ".gitkeep"],
      ["src", "store", ".gitkeep"],
    ].map(async (filePath) => {
      const targetPath = join(projectDir, ...filePath);
      await mkdir(dirname(targetPath), { recursive: true });
      await writeFile(targetPath, "", "utf8");
    }),
  );

  await copyProjectIconAssets(projectDir, context);
}

// Quasar UI Tool 아이콘을 새 프로젝트의 favicon/앱 아이콘으로 복사한다.
// 아이콘 복사 실패는 프로젝트 생성 자체를 막지 않는다.
async function copyProjectIconAssets(projectDir, context) {
  if (!context?.extensionPath) return;

  const iconSource = join(context.extensionPath, "media", "quasar-tool.png");
  try {
    await stat(iconSource);
  } catch {
    return;
  }

  try {
    const iconsDir = join(projectDir, "public", "icons");
    await mkdir(iconsDir, { recursive: true });
    await copyFile(iconSource, join(projectDir, "public", "favicon.png"));
    await copyFile(iconSource, join(iconsDir, "quasar-ui-tool.png"));
  } catch (error) {
    vscode.window.showWarningMessage(
      `프로젝트 아이콘 복사 실패: ${error.message}`,
    );
  }
}

function createProjectFiles(options) {
  return [
    { path: [".gitignore"], content: createGitignoreContent() },
    { path: ["README.md"], content: createReadmeContent(options) },
    { path: ["package.json"], content: createPackageJsonContent(options) },
    { path: [".src", "project.json"], content: createProjectJsonContent(options) },
    {
      path: ["scripts", "check-quasar-install.cjs"],
      content: createQuasarInstallCheckContent(),
    },
    { path: ["index.html"], content: createIndexHtmlContent(options) },
    { path: ["quasar.config.js"], content: createQuasarConfigContent(options) },
    { path: ["src", "App.vue"], content: createAppVueContent() },
    { path: ["src", "boot", "pinia.js"], content: createPiniaBootContent() },
    { path: ["src", "css", "app.scss"], content: createAppScssContent() },
    {
      path: ["src", "layouts", "MainLayout.vue"],
      content: createMainLayoutContent(options),
    },
    { path: ["src", "pages", "IndexPage.vue"], content: createIndexPageVueContent(options) },
    { path: ["src", "router", "index.js"], content: createRouterIndexContent() },
    { path: ["src", "router", "routes.js"], content: createRoutesContent() },
    {
      path: [".src", "pages", "IndexPage.json"],
      content: createIndexPageJsonContent(options),
    },
    { path: [".src", "pages", "IndexPage.js"], content: "" },
  ];
}

function createGitignoreContent() {
  return [
    ".DS_Store",
    "node_modules",
    "dist",
    ".quasar",
    ".vscode/*",
    "!.vscode/extensions.json",
    "npm-debug.log*",
    "yarn-debug.log*",
    "yarn-error.log*",
    "",
  ].join("\n");
}

function createReadmeContent(options) {
  return `# ${options.appTitle}

This Quasar project was created by the Quasar UI Tool VS Code extension.

## Scripts

\`\`\`bash
npm install
npm run dev
npm run build
\`\`\`

## UI Tool folders

- \`.src/pages/*.json\`: editable page definition files
- \`.src/pages/*.js\`: page script setup files
- \`.src/store/**/*.json\`: editable Pinia store definition files
- \`src/pages/*.vue\`: generated Vue page files
- \`src/store/**/*.js\`: generated Pinia store files
`;
}

function createPackageJsonContent(options) {
  const packageJson = {
    name: options.packageName,
    version: "0.1.0",
    private: true,
    type: "module",
    description: "Quasar project created by Quasar UI Tool.",
    productName: options.appTitle,
    scripts: {
      predev: "node scripts/check-quasar-install.cjs",
      dev: `quasar dev --hostname 0.0.0.0 --port ${options.port}`,
      prebuild: "node scripts/check-quasar-install.cjs",
      build: "quasar build",
    },
    dependencies: {
      "@quasar/extras": "^2.0.1",
      "ag-grid-community": "^35.3.1",
      "ag-grid-vue3": "^35.3.1",
      pinia: "^3.0.4",
      quasar: "^2.20.1",
      vue: "^3.5.38",
      "vue-router": "^5.1.0",
    },
    devDependencies: {
      "@quasar/app-vite": "^3.0.0-rc.3",
    },
  };
  return `${JSON.stringify(packageJson, null, 2)}\n`;
}

function createProjectJsonContent(options) {
  const definition = {
    schemaVersion: "0.1.0",
    tool: {
      name: "quasar-tool",
      artifactType: "project-properties",
      description: "Quasar UI Tool project-level editable properties.",
    },
    project: {
      name: options.projectName,
      packageName: options.packageName,
      displayName: options.appTitle,
      version: "0.1.0",
      description: "Quasar project created by Quasar UI Tool.",
      framework: "quasar",
      sourceRoot: ".src",
      pageSourcePath: ".src/pages",
      pageTargetPath: "src/pages",
      storeSourcePath: ".src/store",
      storeTargetPath: "src/store",
      componentApiPath: "src/component/quasar-ui-api",
      devPort: Number(options.port),
    },
  };
  return `${JSON.stringify(definition, null, 2)}\n`;
}

function createQuasarInstallCheckContent() {
  return `const { existsSync } = require("fs");
const { join } = require("path");

const appVitePath = join(__dirname, "..", "node_modules", "@quasar", "app-vite");

if (!existsSync(appVitePath)) {
  console.error("");
  console.error("[quasar-tool] Project dependencies are not installed.");
  console.error("[quasar-tool] Run \"npm install\" in this project folder first, then run \"npm run dev\" again.");
  console.error("");
  process.exit(1);
}
`;
}

function createIndexHtmlContent(options) {
  return `<!DOCTYPE html>
<html>
  <head>
    <title>${escapeHtml(options.appTitle)}</title>
    <meta charset="utf-8">
    <meta name="description" content="Quasar UI Tool project">
    <meta name="format-detection" content="telephone=no">
    <meta name="msapplication-tap-highlight" content="no">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/png" href="favicon.png">
  </head>
  <body>
    <!-- quasar:entry-point -->
  </body>
</html>
`;
}

function createQuasarConfigContent(options) {
  return `import { defineConfig } from "@quasar/app-vite";
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
    },
  },
  devServer: {
    port: ${Number(options.port)},
    host: "0.0.0.0",
    open: true,
  },
  framework: {
    config: {},
    plugins: [],
  },
  animations: [],
}));
`;
}

function createAppVueContent() {
  return `<template>
  <router-view />
</template>
`;
}

function createPiniaBootContent() {
  return `import { createPinia } from "pinia";
import { boot } from "quasar/wrappers";

export default boot(({ app }) => {
  app.use(createPinia());
});
`;
}

function createAppScssContent() {
  return `body {
  background: #f6f8fb;
}

.qt-ag-table-wrap {
  width: 100%;
}

.qt-table-toolbar-preview {
  margin-bottom: 4px;
}

.qt-ag-grid {
  --ag-font-family: "Inter", "Segoe UI", Arial, sans-serif;
  --ag-font-size: 14px;
  --ag-border-radius: 6px;
  --ag-wrapper-border-radius: 6px;
  --ag-header-background-color: #3f94d9;
  --ag-header-foreground-color: #ffffff;
  --ag-background-color: #ffffff;
  --ag-foreground-color: #111827;
  --ag-border-color: #cfd7e3;
  --ag-row-border-color: #d9dee7;
  --ag-row-hover-color: #eef7ff;
  --ag-selected-row-background-color: #dff0ff;
  --ag-range-selection-border-color: #1a73ff;
  --ag-input-focus-border-color: #1a73ff;
  --ag-checkbox-border-radius: 3px;
  border: 1px solid #aeb8c7;
  border-radius: 6px;
  overflow: hidden;
}

.qt-ag-grid .ag-root-wrapper {
  border: 0;
  border-radius: 6px;
}

.qt-ag-grid .ag-header,
.qt-ag-grid .ag-header-row,
.qt-ag-grid .ag-header-cell,
.qt-ag-grid .ag-header-group-cell {
  background-color: #3f94d9;
  color: #ffffff;
}

.qt-ag-grid .ag-row-even,
.qt-ag-grid .ag-row.qt-ag-logical-row-even,
.qt-ag-grid .ag-cell.qt-ag-logical-cell-even {
  background: #ffffff !important;
}

.qt-ag-grid .ag-row-odd,
.qt-ag-grid .ag-row.qt-ag-logical-row-odd,
.qt-ag-grid .ag-cell.qt-ag-logical-cell-odd {
  background: #eef8ff !important;
}

.qt-ag-grid .ag-row-selected,
.qt-ag-grid .ag-row-selected::before {
  background-color: #dff0ff !important;
}

.qt-ag-grid .ag-cell-focus,
.qt-ag-grid .ag-cell-inline-editing {
  border: 0 !important;
  outline: none !important;
  box-shadow: inset 0 0 0 1px #1a73ff !important;
}

.qt-table-mode-cell {
  justify-content: center;
  color: #2563eb;
  font-weight: 700;
}
`;
}

function createMainLayoutContent(options) {
  return `<template>
  <q-layout view="hHh Lpr fFf">
    <q-header elevated>
      <q-toolbar>
        <q-toolbar-title>${escapeHtml(options.appTitle)}</q-toolbar-title>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>
`;
}

function createIndexPageVueContent(options) {
  return `<template>
  <q-page padding>
    <div class="text-h5 q-mb-sm">{{ title }}</div>
    <div class="text-body1 text-grey-7">
      Edit .src/pages/IndexPage.json with the Quasar UI Tool editor.
    </div>
  </q-page>
</template>

<script setup>
const title = ${JSON.stringify(options.appTitle)}
</script>
`;
}

function createRouterIndexContent() {
  return `import { defineRouter } from "@quasar/app-vite";
import { createRouter, createWebHashHistory } from "vue-router";
import routes from "./routes";

export default defineRouter(function () {
  return createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createWebHashHistory(),
  });
});
`;
}

function createRoutesContent() {
  return `const routes = [
  {
    path: "/",
    component: () => import("../layouts/MainLayout.vue"),
    children: [
      {
        path: "",
        component: () => import("../pages/IndexPage.vue"),
      },
    ],
  },
];

export default routes;
`;
}

function createIndexPageJsonContent(options) {
  const definition = {
    schemaVersion: "0.1.0",
    tool: {
      name: "quasar-tool",
      artifactType: "page-definition",
      description: "Editable page definition generated by Quasar UI Tool.",
    },
    page: {
      id: "IndexPage",
      name: "IndexPage",
      route: "/",
      framework: "quasar",
      component: "Page",
    },
    script: {
      src: "IndexPage.js",
    },
    imports: [],
    components: [
      {
        id: "Page001",
        type: "Page",
        props: {
          padding: true,
        },
        children: [
          {
            id: "Title001",
            type: "HtmlElement",
            tag: "div",
            class: "text-h5 q-mb-sm",
            text: options.appTitle,
          },
          {
            id: "Desc001",
            type: "HtmlElement",
            tag: "div",
            class: "text-body1 text-grey-7",
            text: "Edit .src/pages/IndexPage.json with the Quasar UI Tool editor.",
          },
        ],
      },
    ],
  };
  return `${JSON.stringify(definition, null, 2)}\n`;
}

async function getBlockedTargetReason(projectDir) {
  try {
    const targetStat = await stat(projectDir);
    if (!targetStat.isDirectory()) {
      return "같은 이름의 파일이 이미 존재합니다. 다른 프로젝트명을 입력하세요.";
    }

    const entries = await readdir(projectDir);
    if (entries.length > 0) {
      return "대상 프로젝트 폴더가 비어 있지 않습니다. 빈 폴더명으로 다시 시도하세요.";
    }
    return "";
  } catch (error) {
    if (error.code === "ENOENT") return "";
    throw error;
  }
}

function validateProjectName(value) {
  const name = String(value || "").trim();
  if (!name) return "프로젝트 폴더명을 입력하세요.";
  if (name === "." || name === "..") return "사용할 수 없는 폴더명입니다.";
  if (/[\x00-\x1f<>:"/\\|?*]/.test(name)) {
    return "폴더명에 사용할 수 없는 문자가 포함되어 있습니다.";
  }
  return undefined;
}

function validatePackageName(value) {
  const packageName = String(value || "").trim();
  if (!packageName) return "package name을 입력하세요.";
  const npmNamePattern =
    /^(?:@[a-z0-9._~-]+\/[a-z0-9._~-]+|[a-z0-9._~-]+)$/;
  if (!npmNamePattern.test(packageName)) {
    return "npm package name 형식으로 입력하세요. 예: quasar-app";
  }
  return undefined;
}

function validatePort(value) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return "1부터 65535 사이의 포트를 입력하세요.";
  }
  return undefined;
}

function validateRequired(message) {
  return (value) => (String(value || "").trim() ? undefined : message);
}

function toPackageName(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._~-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "quasar-app";
}

function toDisplayName(value) {
  return String(value || "")
    .trim()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ") || "Quasar App";
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = {
  NEW_QUASAR_PROJECT_COMMAND,
  registerNewQuasarProjectCommand,
};
