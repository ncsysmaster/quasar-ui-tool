const vscode = require('vscode')
const { execFile } = require('child_process')
const { existsSync } = require('fs')
const { join, relative } = require('path')

async function replaceDocument(document, text) {
  const edit = new vscode.WorkspaceEdit()
  const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length))
  edit.replace(document.uri, fullRange, text)
  await vscode.workspace.applyEdit(edit)
}

function isPageJsonDocument(document) {
  return document.uri.fsPath.replaceAll('\\', '/').includes('/.src/pages/') &&
    document.uri.fsPath.toLowerCase().endsWith('.json')
}

function isPageScriptDocument(document) {
  return document.uri.fsPath.replaceAll('\\', '/').includes('/.src/pages/') &&
    document.uri.fsPath.toLowerCase().endsWith('.js')
}

function isPageSourceDocument(document) {
  return isPageJsonDocument(document) || isPageScriptDocument(document)
}

function getPageJsonPath(filePath) {
  return filePath.toLowerCase().endsWith('.js')
    ? filePath.replace(/\.js$/i, '.json')
    : filePath
}

function getPageScriptPath(filePath) {
  return getPageJsonPath(filePath).replace(/\.json$/i, '.js')
}

function generateVueForDocument(document) {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
  if (!workspaceRoot) return

  const generatorPath = join(__dirname, '..', 'generator', 'generate-vue.mjs')
  if (!existsSync(generatorPath)) return

  const jsonPath = getPageJsonPath(document.uri.fsPath)
  if (!existsSync(jsonPath)) return
  const inputPath = relative(workspaceRoot, jsonPath)
  execFile('node', [generatorPath, inputPath], { cwd: workspaceRoot }, (error) => {
    if (error) {
      vscode.window.setStatusBarMessage(`Quasar Tool: Vue generation failed (${error.message})`, 5000)
      return
    }

    vscode.window.setStatusBarMessage(`Quasar Tool: generated ${inputPath}`, 2500)
  })
}

module.exports = {
  generateVueForDocument,
  getPageJsonPath,
  getPageScriptPath,
  isPageJsonDocument,
  isPageScriptDocument,
  isPageSourceDocument,
  replaceDocument
}
