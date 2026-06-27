const vscode = require("vscode");

const { EDITOR_VIEW_TYPE, VIEW_IDS } = require("./constants");
const { PageEditorStateManager } = require("./stateManager");
const {
  DatasetViewProvider,
  PageEditorProvider,
  EventsViewProvider,
  PageTreeViewProvider,
  PaletteViewProvider,
  PropertiesViewProvider,
} = require("./providers");
const { getWebviewRoots } = require("./webviewResources");
const { registerWatchVueCommand } = require("./watchVueCommand");
const { registerPiniaStoreCommands } = require("./piniaStoreCommand");

function activate(context) {
  const state = new PageEditorStateManager();
  const webviewRoots = getWebviewRoots(context);
  registerWatchVueCommand(context);
  registerPiniaStoreCommands(context);
  const scriptWatcher = vscode.workspace.createFileSystemWatcher(
    "**/.src/pages/*.js",
  );

  context.subscriptions.push(
    scriptWatcher,
    scriptWatcher.onDidChange((uri) => state.onScriptFileChanged(uri)),
    scriptWatcher.onDidCreate((uri) => state.onScriptFileChanged(uri)),
    scriptWatcher.onDidDelete((uri) => state.onScriptFileChanged(uri)),
    vscode.window.registerCustomEditorProvider(
      EDITOR_VIEW_TYPE,
      new PageEditorProvider(state, context, webviewRoots),
      {
        supportsMultipleEditorsPerDocument: false,
        webviewOptions: { retainContextWhenHidden: true },
      },
    ),
    vscode.window.registerWebviewViewProvider(
      VIEW_IDS.palette,
      new PaletteViewProvider(state, webviewRoots),
    ),
    vscode.window.registerWebviewViewProvider(
      VIEW_IDS.properties,
      new PropertiesViewProvider(state, webviewRoots),
    ),
    vscode.window.registerWebviewViewProvider(
      VIEW_IDS.events,
      new EventsViewProvider(state, webviewRoots),
    ),
    vscode.window.registerWebviewViewProvider(
      VIEW_IDS.pageTree,
      new PageTreeViewProvider(state, webviewRoots),
    ),
    vscode.window.registerWebviewViewProvider(
      VIEW_IDS.dataset,
      new DatasetViewProvider(state, webviewRoots),
    ),
    vscode.workspace.onDidChangeTextDocument((event) =>
      state.onTextDocumentChanged(event.document),
    ),
    vscode.workspace.onDidSaveTextDocument(async (document) => {
      await state.onTextDocumentSaved(document);
      state.scheduleGenerateVue(document);
    }),
    vscode.commands.registerCommand(
      "quasarTool.openPageEditor",
      async (uri) => {
        const targetUri = uri || vscode.window.activeTextEditor?.document.uri;

        if (!targetUri) {
          vscode.window.showWarningMessage(
            "Open a .src/pages/*.json file first.",
          );
          return;
        }

        await vscode.commands.executeCommand(
          "vscode.openWith",
          targetUri,
          EDITOR_VIEW_TYPE,
        );
      },
    ),
    vscode.commands.registerCommand("quasarTool.saveActiveEditor", async () => {
      const saved = await state.saveActiveEditor();
      if (!saved) {
        await vscode.commands.executeCommand("workbench.action.files.save");
      }
    }),
  );
}

function deactivate() {}

module.exports = { activate, deactivate };
