const vscode = require("vscode");
const { TextDecoder, TextEncoder } = require("util");
const { findProjectFolder, toProjectRelativePath } = require("./projectRoot");

const PROJECT_PROPERTIES_VIEW_ID = "quasarTool.projectPropertiesView";
const PROJECT_PROPERTIES_PATH = [".src", "project.json"];

class ProjectPropertiesViewProvider {
  constructor(context) {
    this.context = context;
    this.view = null;
  }

  resolveWebviewView(webviewView) {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri],
    };
    webviewView.webview.html = getProjectPropertiesHtml(getNonce());

    webviewView.webview.onDidReceiveMessage(
      (message) => this.handleMessage(message),
      undefined,
      this.context.subscriptions,
    );
    webviewView.onDidChangeVisibility(
      () => {
        if (webviewView.visible) this.refresh();
      },
      undefined,
      this.context.subscriptions,
    );

    this.refresh();
  }

  async refresh() {
    if (!this.view) return;

    try {
      const project = await loadProjectProperties();
      this.view.webview.postMessage({
        type: "project",
        project,
      });
    } catch (error) {
      this.view.webview.postMessage({
        type: "error",
        message: error.message,
      });
    }
  }

  async handleMessage(message) {
    if (!message || typeof message !== "object") return;

    try {
      if (message.type === "ready" || message.type === "refresh") {
        await this.refresh();
        return;
      }

      if (message.type === "save") {
        await saveProjectProperties(message.project);
        vscode.window.showInformationMessage("Quasar UI Tool project properties saved.");
        await this.refresh();
        return;
      }

      if (message.type === "openProjectFile") {
        await openProjectPropertiesFile();
        return;
      }

      if (message.type === "openPackageFile") {
        await openPackageJsonFile();
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Project properties failed: ${error.message}`);
      this.view?.webview.postMessage({
        type: "error",
        message: error.message,
      });
    }
  }
}

function registerProjectPropertiesView(context) {
  const provider = new ProjectPropertiesViewProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      PROJECT_PROPERTIES_VIEW_ID,
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      },
    ),
    vscode.window.onDidChangeActiveTextEditor(() => provider.refresh()),
    vscode.workspace.onDidChangeWorkspaceFolders(() => provider.refresh()),
  );
}

async function loadProjectProperties() {
  const projectFolder = findProjectFolder();
  if (!projectFolder) {
    return {
      exists: false,
      message: "VS Code에서 Quasar UI 프로젝트 폴더를 먼저 열어주세요.",
    };
  }

  const packageJson = await readPackageJson(projectFolder);
  const stored = await readStoredProjectProperties(projectFolder);
  const project = createDefaultProjectProperties(projectFolder, packageJson);
  const merged = {
    ...project,
    ...(stored.project || {}),
  };

  return {
    exists: true,
    workspaceName: projectFolder.name,
    workspacePath: projectFolder.uri.fsPath,
    projectFilePath: toProjectRelativePath(
      projectFolder,
      vscode.Uri.joinPath(projectFolder.uri, ...PROJECT_PROPERTIES_PATH),
    ),
    packageFilePath: "package.json",
    properties: merged,
  };
}

async function saveProjectProperties(project) {
  const projectFolder = findProjectFolder();
  if (!projectFolder) {
    throw new Error("VS Code에서 Quasar UI 프로젝트 폴더를 먼저 열어주세요.");
  }

  const properties = normalizeProjectProperties(projectFolder, project);
  const projectFileUri = vscode.Uri.joinPath(
    projectFolder.uri,
    ...PROJECT_PROPERTIES_PATH,
  );
  const payload = {
    schemaVersion: "0.1.0",
    tool: {
      name: "quasar-tool",
      artifactType: "project-properties",
      description: "Quasar UI Tool project-level editable properties.",
    },
    project: properties,
  };

  await vscode.workspace.fs.createDirectory(
    vscode.Uri.joinPath(projectFolder.uri, ".src"),
  );
  await vscode.workspace.fs.writeFile(
    projectFileUri,
    new TextEncoder().encode(`${JSON.stringify(payload, null, 2)}\n`),
  );
  await updatePackageJson(projectFolder, properties);
}

async function openProjectPropertiesFile() {
  const projectFolder = findProjectFolder();
  if (!projectFolder) {
    throw new Error("VS Code에서 Quasar UI 프로젝트 폴더를 먼저 열어주세요.");
  }

  const uri = vscode.Uri.joinPath(projectFolder.uri, ...PROJECT_PROPERTIES_PATH);
  if (!(await exists(uri))) {
    await saveProjectProperties({});
  }
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document, { preview: false });
}

async function openPackageJsonFile() {
  const projectFolder = findProjectFolder();
  if (!projectFolder) {
    throw new Error("VS Code에서 Quasar UI 프로젝트 폴더를 먼저 열어주세요.");
  }

  const uri = vscode.Uri.joinPath(projectFolder.uri, "package.json");
  if (!(await exists(uri))) {
    throw new Error("package.json 파일을 찾을 수 없습니다.");
  }
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document, { preview: false });
}

async function readStoredProjectProperties(projectFolder) {
  const uri = vscode.Uri.joinPath(projectFolder.uri, ...PROJECT_PROPERTIES_PATH);
  if (!(await exists(uri))) return {};

  const raw = await vscode.workspace.fs.readFile(uri);
  try {
    return JSON.parse(new TextDecoder().decode(raw));
  } catch (error) {
    throw new Error(`.src/project.json 파일이 올바른 JSON이 아닙니다. (${error.message})`);
  }
}

async function readPackageJson(projectFolder, strict = false) {
  const uri = vscode.Uri.joinPath(projectFolder.uri, "package.json");
  if (!(await exists(uri))) return {};

  const raw = await vscode.workspace.fs.readFile(uri);
  try {
    return JSON.parse(new TextDecoder().decode(raw));
  } catch (error) {
    if (strict) {
      throw new Error(`package.json 파일이 올바른 JSON이 아닙니다. (${error.message})`);
    }
    return {};
  }
}

async function updatePackageJson(projectFolder, properties) {
  const uri = vscode.Uri.joinPath(projectFolder.uri, "package.json");
  const packageJson = await readPackageJson(projectFolder, true);
  if (!Object.keys(packageJson).length && !(await exists(uri))) return;

  packageJson.name = properties.packageName;
  packageJson.productName = properties.displayName;
  packageJson.version = properties.version;
  packageJson.description = properties.description;
  packageJson.scripts ||= {};
  packageJson.scripts.dev = updateDevScriptPort(
    packageJson.scripts.dev,
    properties.devPort,
  );

  await vscode.workspace.fs.writeFile(
    uri,
    new TextEncoder().encode(`${JSON.stringify(packageJson, null, 2)}\n`),
  );
}

function createDefaultProjectProperties(projectFolder, packageJson) {
  const devPort = extractDevPort(packageJson?.scripts?.dev) || 9000;
  const packageName = packageJson?.name || toPackageName(projectFolder.name);
  return {
    name: projectFolder.name,
    packageName,
    displayName: packageJson?.productName || toDisplayName(projectFolder.name),
    version: packageJson?.version || "0.1.0",
    description:
      packageJson?.description ||
      "Quasar UI Tool project.",
    framework: "quasar",
    sourceRoot: ".src",
    pageSourcePath: ".src/pages",
    pageTargetPath: "src/pages",
    storeSourcePath: ".src/store",
    storeTargetPath: "src/store",
    componentApiPath: "src/component/quasar-ui-api",
    devPort,
  };
}

function normalizeProjectProperties(projectFolder, project) {
  const defaults = createDefaultProjectProperties(projectFolder, {});
  const normalized = {
    ...defaults,
    ...(project || {}),
  };

  normalized.name = requireText(normalized.name, "Project Name");
  normalized.packageName = requirePackageName(normalized.packageName);
  normalized.displayName = requireText(normalized.displayName, "Display Name");
  normalized.version = requireText(normalized.version, "Version");
  normalized.description = String(normalized.description || "");
  normalized.framework = "quasar";
  normalized.sourceRoot = normalizePath(normalized.sourceRoot || ".src");
  normalized.pageSourcePath = normalizePath(normalized.pageSourcePath || ".src/pages");
  normalized.pageTargetPath = normalizePath(normalized.pageTargetPath || "src/pages");
  normalized.storeSourcePath = normalizePath(normalized.storeSourcePath || ".src/store");
  normalized.storeTargetPath = normalizePath(normalized.storeTargetPath || "src/store");
  normalized.componentApiPath = normalizePath(
    normalized.componentApiPath || "src/component/quasar-ui-api",
  );
  normalized.devPort = requirePort(normalized.devPort);

  return normalized;
}

function requireText(value, label) {
  const text = String(value || "").trim();
  if (!text) throw new Error(`${label} 값을 입력하세요.`);
  return text;
}

function requirePackageName(value) {
  const packageName = requireText(value, "Package Name");
  const pattern = /^(?:@[a-z0-9._~-]+\/[a-z0-9._~-]+|[a-z0-9._~-]+)$/;
  if (!pattern.test(packageName)) {
    throw new Error("Package Name은 npm package name 형식이어야 합니다.");
  }
  return packageName;
}

function requirePort(value) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Dev Port는 1부터 65535 사이의 숫자여야 합니다.");
  }
  return port;
}

function normalizePath(value) {
  return String(value || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");
}

function updateDevScriptPort(script, port) {
  const defaultScript = "quasar dev --hostname 0.0.0.0 --port 9000";
  const source = String(script || defaultScript);
  if (/--port(?:=|\s+)\d+/i.test(source)) {
    return source.replace(/--port(?:=|\s+)\d+/i, `--port ${port}`);
  }
  return `${source} --port ${port}`;
}

function extractDevPort(script) {
  const match = String(script || "").match(/--port(?:=|\s+)(\d+)/i);
  return match ? Number(match[1]) : 0;
}

async function exists(uri) {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch (_error) {
    return false;
  }
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
  return (
    String(value || "")
      .trim()
      .split(/[\s_-]+/)
      .filter(Boolean)
      .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
      .join(" ") || "Quasar App"
  );
}

function getNonce() {
  let text = "";
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i += 1) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}

function getProjectPropertiesHtml(nonce) {
  return `<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Project Properties</title>
    <style>
      body {
        margin: 0;
        padding: 12px;
        color: var(--vscode-foreground);
        background: var(--vscode-sideBar-background);
        font-family: var(--vscode-font-family);
        font-size: var(--vscode-font-size);
      }

      .section {
        margin-bottom: 14px;
        border: 1px solid var(--vscode-panel-border);
        border-radius: 6px;
        overflow: hidden;
        background: var(--vscode-editor-background);
      }

      .section-title {
        padding: 8px 10px;
        border-left: 4px solid var(--vscode-focusBorder);
        border-bottom: 1px solid var(--vscode-panel-border);
        font-weight: 700;
      }

      .section-body {
        padding: 10px;
      }

      .field {
        margin-bottom: 10px;
      }

      label {
        display: block;
        margin-bottom: 4px;
        color: var(--vscode-descriptionForeground);
        font-size: 12px;
      }

      input,
      textarea {
        box-sizing: border-box;
        width: 100%;
        min-height: 28px;
        padding: 5px 7px;
        border: 1px solid var(--vscode-input-border);
        color: var(--vscode-input-foreground);
        background: var(--vscode-input-background);
        font-family: var(--vscode-font-family);
        font-size: var(--vscode-font-size);
      }

      textarea {
        min-height: 64px;
        resize: vertical;
      }

      input[readonly] {
        color: var(--vscode-disabledForeground);
      }

      .path {
        word-break: break-all;
        color: var(--vscode-descriptionForeground);
        font-size: 12px;
      }

      .actions {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        margin-top: 12px;
      }

      button {
        min-height: 28px;
        padding: 4px 10px;
        border: 1px solid var(--vscode-button-border, transparent);
        color: var(--vscode-button-foreground);
        background: var(--vscode-button-background);
        cursor: pointer;
      }

      button.secondary {
        color: var(--vscode-button-secondaryForeground);
        background: var(--vscode-button-secondaryBackground);
      }

      button:hover {
        background: var(--vscode-button-hoverBackground);
      }

      .message {
        margin: 0 0 10px;
        color: var(--vscode-descriptionForeground);
      }

      .error {
        color: var(--vscode-errorForeground);
      }
    </style>
  </head>
  <body>
    <p id="message" class="message">프로젝트 정보를 불러오는 중입니다.</p>

    <form id="form" hidden>
      <div class="section">
        <div class="section-title">Project</div>
        <div class="section-body">
          <div class="field">
            <label>Workspace</label>
            <div id="workspacePath" class="path"></div>
          </div>
          <div class="field">
            <label>Project Name</label>
            <input data-key="name">
          </div>
          <div class="field">
            <label>Package Name</label>
            <input data-key="packageName">
          </div>
          <div class="field">
            <label>Display Name</label>
            <input data-key="displayName">
          </div>
          <div class="field">
            <label>Version</label>
            <input data-key="version">
          </div>
          <div class="field">
            <label>Description</label>
            <textarea data-key="description"></textarea>
          </div>
          <div class="field">
            <label>Framework</label>
            <input data-key="framework" readonly>
          </div>
          <div class="field">
            <label>Dev Port</label>
            <input data-key="devPort" type="number" min="1" max="65535">
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Paths</div>
        <div class="section-body">
          <div class="field">
            <label>Source Root</label>
            <input data-key="sourceRoot">
          </div>
          <div class="field">
            <label>Page JSON Path</label>
            <input data-key="pageSourcePath">
          </div>
          <div class="field">
            <label>Vue Target Path</label>
            <input data-key="pageTargetPath">
          </div>
          <div class="field">
            <label>Store JSON Path</label>
            <input data-key="storeSourcePath">
          </div>
          <div class="field">
            <label>Store Target Path</label>
            <input data-key="storeTargetPath">
          </div>
          <div class="field">
            <label>Component API Path</label>
            <input data-key="componentApiPath">
          </div>
        </div>
      </div>

      <div class="actions">
        <button id="saveButton" type="submit">Save</button>
        <button id="refreshButton" class="secondary" type="button">Refresh</button>
        <button id="openProjectButton" class="secondary" type="button">Open project.json</button>
        <button id="openPackageButton" class="secondary" type="button">Open package.json</button>
      </div>
    </form>

    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      const form = document.getElementById('form');
      const message = document.getElementById('message');
      const workspacePath = document.getElementById('workspacePath');
      const fields = Array.from(document.querySelectorAll('[data-key]'));

      window.addEventListener('message', (event) => {
        const data = event.data || {};
        if (data.type === 'project') {
          renderProject(data.project);
        }
        if (data.type === 'error') {
          showMessage(data.message || '오류가 발생했습니다.', true);
        }
      });

      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const project = {};
        fields.forEach((field) => {
          project[field.dataset.key] = field.type === 'number'
            ? Number(field.value)
            : field.value;
        });
        vscode.postMessage({ type: 'save', project });
      });

      document.getElementById('refreshButton').addEventListener('click', () => {
        vscode.postMessage({ type: 'refresh' });
      });

      document.getElementById('openProjectButton').addEventListener('click', () => {
        vscode.postMessage({ type: 'openProjectFile' });
      });

      document.getElementById('openPackageButton').addEventListener('click', () => {
        vscode.postMessage({ type: 'openPackageFile' });
      });

      function renderProject(project) {
        if (!project || !project.exists) {
          form.hidden = true;
          showMessage(project?.message || '프로젝트 폴더를 찾을 수 없습니다.', true);
          return;
        }

        form.hidden = false;
        workspacePath.textContent = project.workspacePath || '';
        fields.forEach((field) => {
          const value = project.properties?.[field.dataset.key];
          field.value = value === undefined || value === null ? '' : value;
        });
        showMessage(project.projectFilePath + ' 파일에 저장됩니다.');
      }

      function showMessage(text, isError = false) {
        message.textContent = text || '';
        message.classList.toggle('error', Boolean(isError));
      }

      vscode.postMessage({ type: 'ready' });
    </script>
  </body>
</html>`;
}

module.exports = {
  PROJECT_PROPERTIES_VIEW_ID,
  ProjectPropertiesViewProvider,
  registerProjectPropertiesView,
};
