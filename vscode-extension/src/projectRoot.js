const vscode = require("vscode");
const { basename, relative, sep } = require("path");

function findProjectFolder(uri) {
  const candidates = [
    uri,
    vscode.window.activeTextEditor?.document.uri,
    ...(vscode.workspace.workspaceFolders || []).map((folder) => folder.uri),
  ].filter(Boolean);

  for (const candidate of candidates) {
    const rootPath = extractRootFromSourcePath(candidate.fsPath);
    if (rootPath) return createProjectFolder(rootPath);
  }

  return vscode.workspace.workspaceFolders?.[0];
}

function extractRootFromSourcePath(filePath) {
  const normalized = String(filePath || "").replace(/\\/g, "/");
  const match = normalized.match(/\/\.src\/(?:pages|store)(?:\/|$)/i);
  if (!match || match.index === undefined) return "";
  return normalized.slice(0, match.index);
}

function createProjectFolder(rootPath) {
  const uri = vscode.Uri.file(rootPath);
  return {
    uri,
    name: basename(rootPath),
    index: -1,
  };
}

function toProjectRelativePath(projectFolder, uri) {
  return relative(projectFolder.uri.fsPath, uri.fsPath).split(sep).join("/");
}

module.exports = {
  findProjectFolder,
  toProjectRelativePath,
};

