const vscode = require('vscode')
const { existsSync, readdirSync } = require('fs')
const { dirname, join } = require('path')

function getWebviewRoots(context) {
  return [
    context.extensionUri,
    ...getNodeModulesCandidates(context).map((candidate) => vscode.Uri.file(candidate))
  ]
}

function getRuntimeUris(webview, context) {
  const nodeModulesPath = getNodeModulesPath(context)
  const nodeModulesBase = vscode.Uri.file(nodeModulesPath)
  const monacoVsPath = join(nodeModulesPath, 'monaco-editor', 'min', 'vs')

  return {
    vue: webview.asWebviewUri(vscode.Uri.joinPath(nodeModulesBase, 'vue', 'dist', 'vue.global.prod.js')),
    agGridCommunity: webview.asWebviewUri(vscode.Uri.joinPath(nodeModulesBase, 'ag-grid-community', 'dist', 'ag-grid-community.min.js')),
    agGridVue: webview.asWebviewUri(vscode.Uri.joinPath(nodeModulesBase, 'ag-grid-vue3', 'dist', 'main.umd.js')),
    agGridCss: webview.asWebviewUri(vscode.Uri.joinPath(nodeModulesBase, 'ag-grid-community', 'styles', 'ag-grid.css')),
    agGridThemeCss: webview.asWebviewUri(vscode.Uri.joinPath(nodeModulesBase, 'ag-grid-community', 'styles', 'ag-theme-quartz.css')),
    quasar: webview.asWebviewUri(vscode.Uri.joinPath(nodeModulesBase, 'quasar', 'dist', 'quasar.umd.prod.js')),
    quasarCss: webview.asWebviewUri(vscode.Uri.joinPath(nodeModulesBase, 'quasar', 'dist', 'quasar.prod.css')),
    materialIconsCss: webview.asWebviewUri(vscode.Uri.joinPath(nodeModulesBase, '@quasar', 'extras', 'exports', 'material-icons', 'material-icons.css')),
    monacoLoader: webview.asWebviewUri(vscode.Uri.file(join(monacoVsPath, 'loader.js'))),
    monacoVs: webview.asWebviewUri(vscode.Uri.file(monacoVsPath)),
    monacoEditorWorker: webview.asWebviewUri(findMonacoWorker(monacoVsPath, 'editor.worker-')),
    monacoTypeScriptWorker: webview.asWebviewUri(findMonacoWorker(monacoVsPath, 'ts.worker-'))
  }
}

function findMonacoWorker(monacoVsPath, prefix) {
  const assetsPath = join(monacoVsPath, 'assets')
  const fileName = readdirSync(assetsPath).find((name) => name.startsWith(prefix) && name.endsWith('.js'))

  if (!fileName) {
    throw new Error(`Monaco worker not found: ${prefix}*.js`)
  }

  return vscode.Uri.file(join(assetsPath, fileName))
}

function getNodeModulesPath(context) {
  const candidates = getNodeModulesCandidates(context)
  const found = candidates.find((candidate) => {
    return existsSync(join(candidate, 'vue', 'dist', 'vue.global.prod.js')) &&
      existsSync(join(candidate, 'ag-grid-community', 'dist', 'ag-grid-community.min.js')) &&
      existsSync(join(candidate, 'ag-grid-vue3', 'dist', 'main.umd.js')) &&
      existsSync(join(candidate, 'ag-grid-community', 'styles', 'ag-grid.css')) &&
      existsSync(join(candidate, 'ag-grid-community', 'styles', 'ag-theme-quartz.css')) &&
      existsSync(join(candidate, 'quasar', 'dist', 'quasar.umd.prod.js')) &&
      existsSync(join(candidate, 'quasar', 'dist', 'quasar.prod.css')) &&
      existsSync(join(candidate, '@quasar', 'extras', 'exports', 'material-icons', 'material-icons.css')) &&
      existsSync(join(candidate, 'monaco-editor', 'min', 'vs', 'loader.js'))
  })

  return found || candidates[0]
}

function getNodeModulesCandidates(context) {
  const extensionPath = context.extensionUri.fsPath
  const candidates = [
    ...(vscode.workspace.workspaceFolders || []).map((folder) => join(folder.uri.fsPath, 'node_modules')),
    join(extensionPath, 'node_modules'),
    join(dirname(extensionPath), 'node_modules'),
    join(dirname(dirname(extensionPath)), 'node_modules')
  ]

  return [...new Set(candidates)]
}

module.exports = {
  getRuntimeUris,
  getWebviewRoots
}
