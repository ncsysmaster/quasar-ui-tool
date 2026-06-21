const vscode = require("vscode");

const WATCH_COMMAND = "quasarTool.watchVue";
const TERMINAL_NAME = "Quasar Tool: Vue Watch";

function findWorkspaceFolder(uri) {
  if (uri) {
    const folder = vscode.workspace.getWorkspaceFolder(uri);
    if (folder) {
      return folder;
    }
  }

  const activeUri = vscode.window.activeTextEditor?.document.uri;
  return (
    (activeUri && vscode.workspace.getWorkspaceFolder(activeUri)) ||
    vscode.workspace.workspaceFolders?.[0]
  );
}

function registerWatchVueCommand(context) {
  const disposable = vscode.commands.registerCommand(
    WATCH_COMMAND,
    async (uri) => {
      const workspaceFolder = findWorkspaceFolder(uri);
      if (!workspaceFolder) {
        vscode.window.showWarningMessage("Open the Quasar project folder first.");
        return;
      }

      let terminal = vscode.window.terminals.find(
        (item) => item.name === TERMINAL_NAME,
      );

      if (!terminal) {
        terminal = vscode.window.createTerminal({
          name: TERMINAL_NAME,
          cwd: workspaceFolder.uri.fsPath,
        });
        terminal.sendText("npm run watch:vue", true);
      }

      terminal.show(false);
    },
  );

  context.subscriptions.push(disposable);
}

module.exports = { registerWatchVueCommand };
