const vscode = require("vscode");

const { EDITOR_VIEW_TYPE } = require("./constants");
const { PageEditorStateManager } = require("./stateManager");
const { PageEditorProvider } = require("./providers");
const { getWebviewRoots } = require("./webviewResources");
const { registerWatchVueCommand } = require("./watchVueCommand");
const { registerPiniaStoreCommands } = require("./piniaStoreCommand");
const { registerPptTaggedJsonCommands } = require("./pptTaggedJsonCommand");

function activate(context) {
  const state = new PageEditorStateManager();
  const webviewRoots = getWebviewRoots(context);
  registerWatchVueCommand(context);
  registerPiniaStoreCommands(context);
  registerPptTaggedJsonCommands(context);
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
