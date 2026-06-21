const vscode = require("vscode");
const { basename, dirname, extname, join, relative, resolve, sep } = require("path");
const { pathToFileURL } = require("url");
const { findProjectFolder, toProjectRelativePath } = require("./projectRoot");

const CREATE_PINIA_COMMAND = "quasarTool.createPiniaStore";
const SOURCE_ROOT = [".src", "store"];
const TARGET_ROOT = ["src", "store"];

function registerPiniaStoreCommands(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand(CREATE_PINIA_COMMAND, (uri) =>
      createPiniaStore(uri),
    ),
    vscode.workspace.onDidSaveTextDocument((document) =>
      generatePiniaForDocument(document),
    ),
  );
}

async function createPiniaStore(uri) {
  const projectFolder = findProjectFolder(uri);
  if (!projectFolder) {
    vscode.window.showWarningMessage("Quasar 프로젝트 폴더를 먼저 열어주세요.");
    return;
  }

  const ownerPage = getOwnerPage(uri);
  const storePath = await vscode.window.showInputBox({
    title: "Pinia 파일 생성 (1/4)",
    prompt: "Store 하위 경로를 입력하세요. 비워두면 store 루트에 생성됩니다.",
    placeHolder: "예: education/course",
    validateInput: validateRelativePath,
  });
  if (storePath === undefined) return;

  const fileNameInput = await vscode.window.showInputBox({
    title: "Pinia 파일 생성 (2/4)",
    prompt: "확장자를 제외한 Store 파일명을 입력하세요.",
    value: ownerPage || "exampleStore",
    validateInput: validateFileName,
  });
  if (fileNameInput === undefined) return;
  const fileName = stripExtension(fileNameInput.trim());

  const defineStoreId = await vscode.window.showInputBox({
    title: "Pinia 파일 생성 (3/4)",
    prompt: "defineStore에서 사용할 고유한 Store ID를 입력하세요.",
    value: defaultStoreId(fileName),
    validateInput: validateStoreId,
  });
  if (defineStoreId === undefined) return;

  const constName = await vscode.window.showInputBox({
    title: "Pinia 파일 생성 (4/4)",
    prompt: "컴포넌트에서 import할 export const 이름을 입력하세요.",
    value: defaultConstName(fileName),
    validateInput: validateIdentifier,
  });
  if (constName === undefined) return;

  const pathSegments = normalizeStoreSubpath(storePath).split("/").filter(Boolean);
  const sourceUri = vscode.Uri.joinPath(
    projectFolder.uri,
    ...SOURCE_ROOT,
    ...pathSegments,
    `${fileName}.json`,
  );
  const targetUri = vscode.Uri.file(
    resolvePiniaTargetPath(projectFolder, sourceUri),
  );

  if ((await exists(sourceUri)) || (await exists(targetUri))) {
    const answer = await vscode.window.showWarningMessage(
      `${fileName} Store 파일이 이미 존재합니다. 덮어쓸까요?`,
      { modal: true },
      "덮어쓰기",
    );
    if (answer !== "덮어쓰기") return;
  }

  try {
    const generator = await loadPiniaGenerator();
    const sourcePath = toProjectRelativePath(projectFolder, sourceUri);
    const targetPath = toProjectRelativePath(projectFolder, targetUri);
    const definition = generator.createPiniaDefinition({
      fileName,
      defineStoreId: defineStoreId.trim(),
      constName: constName.trim(),
      sourcePath,
      targetPath,
      ownerPage,
    });
    const piniaSource = generator.generatePiniaSource(definition);

    await vscode.workspace.fs.createDirectory(vscode.Uri.file(dirname(sourceUri.fsPath)));
    await vscode.workspace.fs.createDirectory(vscode.Uri.file(dirname(targetUri.fsPath)));
    await vscode.workspace.fs.writeFile(
      sourceUri,
      new TextEncoder().encode(`${JSON.stringify(definition, null, 2)}\n`),
    );
    await vscode.workspace.fs.writeFile(
      targetUri,
      new TextEncoder().encode(piniaSource),
    );

    const document = await vscode.workspace.openTextDocument(sourceUri);
    await vscode.window.showTextDocument(document);
    vscode.window.showInformationMessage(
      `Pinia Store 생성 완료: ${sourcePath} -> ${targetPath}`,
    );
  } catch (error) {
    vscode.window.showErrorMessage(`Pinia Store 생성 실패: ${error.message}`);
  }
}

async function generatePiniaForDocument(document) {
  const projectFolder = findProjectFolder(document.uri);
  if (!projectFolder || !isPiniaDefinition(document.uri, projectFolder)) return;

  try {
    const definition = JSON.parse(document.getText());
    const generator = await loadPiniaGenerator();
    const source = generator.generatePiniaSource(definition);
    const targetPath = resolvePiniaTargetPath(
      projectFolder,
      document.uri,
    );
    const targetUri = vscode.Uri.file(targetPath);

    await vscode.workspace.fs.createDirectory(vscode.Uri.file(dirname(targetPath)));
    await vscode.workspace.fs.writeFile(
      targetUri,
      new TextEncoder().encode(source),
    );
    vscode.window.setStatusBarMessage(
      `Quasar Tool: Pinia 생성 완료 (${toProjectRelativePath(projectFolder, targetUri)})`,
      3000,
    );
  } catch (error) {
    vscode.window.showErrorMessage(`Pinia Store 생성 실패: ${error.message}`);
  }
}

function isPiniaDefinition(uri, workspaceFolder) {
  if (!uri.fsPath.toLowerCase().endsWith(".json")) return false;
  const sourceRoot = resolve(workspaceFolder.uri.fsPath, ...SOURCE_ROOT);
  const relativePath = relative(sourceRoot, uri.fsPath);
  return relativePath !== "" && !relativePath.startsWith(`..${sep}`) && relativePath !== "..";
}

function resolvePiniaTargetPath(workspaceFolder, sourceUri) {
  const workspaceRoot = workspaceFolder.uri.fsPath;
  const sourceRoot = resolve(workspaceRoot, ...SOURCE_ROOT);
  const targetRoot = resolve(workspaceRoot, ...TARGET_ROOT);
  const relativePath = relative(sourceRoot, sourceUri.fsPath);
  const targetPath = resolve(
    targetRoot,
    relativePath.replace(/\.json$/i, ".js"),
  );

  const pathFromTargetRoot = relative(targetRoot, targetPath);
  const isInsideTargetRoot = pathFromTargetRoot !== ".." &&
    !pathFromTargetRoot.startsWith(`..${sep}`);

  if (!isInsideTargetRoot || !targetPath.toLowerCase().endsWith(".js")) {
    throw new Error("store.targetPath must be a .js file inside src/store");
  }

  return targetPath;
}

async function loadPiniaGenerator() {
  const modulePath = join(__dirname, "..", "generator", "pinia-store.mjs");
  return import(pathToFileURL(modulePath).href);
}

async function exists(uri) {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch (error) {
    if (error.code === "FileNotFound" || error.name === "EntryNotFound (FileSystemError)") {
      return false;
    }
    return false;
  }
}

function normalizeRelativePath(value) {
  return String(value || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");
}

function normalizeStoreSubpath(value) {
  return normalizeRelativePath(value)
    .replace(/^\.src\/store(?:\/|$)/i, "")
    .replace(/^src\/store(?:\/|$)/i, "");
}

function validateRelativePath(value) {
  const normalized = normalizeStoreSubpath(value);
  if (!normalized) return null;
  const segments = normalized.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    return "상대 경로만 사용할 수 있습니다.";
  }
  if (segments.some((segment) => /[<>:"|?*]/.test(segment))) {
    return "경로에 사용할 수 없는 문자가 포함되어 있습니다.";
  }
  return null;
}

function validateFileName(value) {
  const fileName = stripExtension(String(value || "").trim());
  if (!fileName) return "파일명을 입력하세요.";
  if (/[\\/<>:"|?*]/.test(fileName)) return "파일명에 사용할 수 없는 문자가 있습니다.";
  return null;
}

function validateStoreId(value) {
  return String(value || "").trim() ? null : "defineStore ID를 입력하세요.";
}

function validateIdentifier(value) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(String(value || ""))
    ? null
    : "올바른 JavaScript 식별자를 입력하세요. 예: useCourseStore";
}

function stripExtension(value) {
  return String(value).replace(/\.(json|js)$/i, "");
}

function defaultStoreId(fileName) {
  const base = fileName.replace(/Store$/i, "") || fileName;
  return base.charAt(0).toLowerCase() + base.slice(1);
}

function defaultConstName(fileName) {
  const base = fileName.replace(/Store$/i, "") || fileName;
  const pascalName = base
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  return `use${pascalName || "Example"}Store`;
}

function getOwnerPage(uri) {
  if (!uri?.fsPath) return "";
  const normalized = uri.fsPath.replace(/\\/g, "/");
  if (!/\/\.src\/pages\/[^/]+\.json$/i.test(normalized)) return "";
  return basename(uri.fsPath, extname(uri.fsPath));
}

module.exports = { registerPiniaStoreCommands };
