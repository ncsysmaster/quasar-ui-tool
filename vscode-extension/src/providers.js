const vscode = require("vscode");
const { getRuntimeUris } = require("./webviewResources");
const { getEventsHtml } = require("./eventsView");
const { getPaletteHtml } = require("./paletteView");
const { getPageTreeHtml } = require("./pageTreeView");
const { getPropertiesHtml } = require("./propertiesView");
const { findProjectFolder } = require("./projectRoot");
const {
  importPiniaStoreIntoPage,
  savePiniaStoreDefinition,
  savePiniaStoreSettings,
} = require("./piniaStoreCommand");
const { listPiniaStores } = require("./piniaStoreRepository");

const {
  getDatasetHtml,
  getEditorHtml,
  getNonce,
  htmlShell,
} = require("./webviews");

class PageEditorProvider {
  constructor(state, context, webviewRoots) {
    this.state = state;
    this.context = context;
    this.webviewRoots = webviewRoots;
  }

  async resolveCustomTextEditor(document, webviewPanel) {
    const editorState = await this.state.getOrCreate(document);
    this.state.activate(editorState);
    const projectFolder = findProjectFolder(document.uri);

    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: this.webviewRoots,
    };
    webviewPanel.webview.html = getEditorHtml(
      webviewPanel.webview,
      getRuntimeUris(webviewPanel.webview, this.context),
    );

    const postState = () => {
      webviewPanel.webview.postMessage({
        type: "state",
        model: editorState.getModel(),
        selectedId: editorState.selectedId,
        selectedCellIds: editorState.selectedCellIds,
        activeTab: editorState.editorTab,
        scriptNavigation: editorState.scriptNavigation,
        tableWizardRequest: editorState.tableWizardRequest,
        tableColumnsRequest: editorState.tableColumnsRequest,
      });
    };

    const postPiniaStores = async () => {
      webviewPanel.webview.postMessage({
        type: "piniaStores",
        stores: await listPiniaStores(projectFolder, document),
      });
    };

    const subscription = editorState.onDidChange(postState);
    const piniaWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(
        projectFolder.uri.fsPath,
        ".src/store/**/*.json",
      ),
    );
    const piniaSubscriptions = [
      piniaWatcher.onDidCreate(postPiniaStores),
      piniaWatcher.onDidChange(postPiniaStores),
      piniaWatcher.onDidDelete(postPiniaStores),
    ];
    webviewPanel.onDidDispose(() => {
      subscription.dispose();
      piniaSubscriptions.forEach((item) => item.dispose());
      piniaWatcher.dispose();
      this.state.release(document.uri, editorState);
    });
    webviewPanel.onDidChangeViewState((event) => {
      if (event.webviewPanel.active) this.state.activate(editorState);
    });

    webviewPanel.webview.onDidReceiveMessage(async (message) => {
      this.state.activate(editorState);
      console.log("[PageEditorProvider message]", message);

      if (message.type === "ready") {
        console.log("[PageEditorProvider] ready");
        postState();
        await postPiniaStores();
      }

      if (message.type === "select") {
        console.log("[PageEditorProvider] select:", message.id);
        editorState.selectComponent(message.id);
      }

      if (message.type === "toggleGridCellSelection") {
        editorState.toggleGridCellSelection(message.id);
      }

      if (message.type === "openFirstEventMethod") {
        await editorState.openFirstComponentMethod(message.id);
      }

      if (message.type === "setEditorTab") {
        editorState.setEditorTab(message.tab);
      }

      if (message.type === "requestPiniaStores") {
        await postPiniaStores();
      }

      if (message.type === "createPiniaStore") {
        const result = await vscode.commands.executeCommand(
          "quasarTool.createPiniaStore",
          document.uri,
          message.options,
        );
        await postPiniaStores();
        if (result?.sourceUri) {
          webviewPanel.webview.postMessage({
            type: "selectPiniaStore",
            fsPath: result.sourceUri.fsPath,
          });
        }
      }

      if (message.type === "importPiniaStore") {
        try {
          const result = await importPiniaStoreIntoPage(document.uri);
          if (!result?.sourceUri) return;
          await postPiniaStores();
          webviewPanel.webview.postMessage({
            type: "selectPiniaStore",
            fsPath: result.sourceUri.fsPath,
          });
        } catch (error) {
          vscode.window.showErrorMessage(
            `Pinia Store 연결 실패: ${error.message}`,
          );
        }
      }

      if (message.type === "updatePiniaStore" && message.fsPath && message.definition) {
        try {
          await savePiniaStoreDefinition(message.fsPath, message.definition, document.uri);
        } catch (error) {
          vscode.window.showErrorMessage(`Pinia Store 저장 실패: ${error.message}`);
        }
      }

      if (message.type === "updatePiniaStoreSettings" && message.fsPath && message.definition) {
        try {
          const result = await savePiniaStoreSettings(
            message.fsPath,
            message.definition,
            document.uri,
          );
          await postPiniaStores();
          if (result?.sourceUri) {
            webviewPanel.webview.postMessage({
              type: "selectPiniaStore",
              fsPath: result.sourceUri.fsPath,
            });
          }
        } catch (error) {
          vscode.window.showErrorMessage(`Pinia Store 설정 저장 실패: ${error.message}`);
        }
      }

      if (message.type === "openPiniaStore" && message.fsPath) {
        const storeDocument = await vscode.workspace.openTextDocument(
          vscode.Uri.file(message.fsPath),
        );
        await vscode.window.showTextDocument(storeDocument);
      }

      if (message.type === "updateScript") {
        console.log("[PageEditorProvider] updateScript");
        await editorState.updateScript(message.value);
      }

      if (message.type === "moveComponent") {
        console.log("[PageEditorProvider] moveComponent:", message);
        await editorState.moveComponent(
          message.dragId,
          message.dropId,
          message.mode,
        );
      }

      if (message.type === "bindStoreState") {
        await editorState.bindStoreState(message.id, message.expression, {
          storePath: message.storePath,
          statePath: message.statePath,
        });
      }

      if (message.type === "formLayoutAction") {
        await editorState.updateFormLayout(message.action, message.targetId);
      }

      if (message.type === "resizeFormLayout") {
        await editorState.resizeFormLayout(
          message.id,
          message.resizeKind,
          message.value,
        );
      }

      if (message.type === "splitFormCell") {
        await editorState.splitFormCell(message.targetId, {
          rowsEnabled: message.rowsEnabled,
          rowCount: message.rowCount,
          columnsEnabled: message.columnsEnabled,
          columnCount: message.columnCount,
        });
      }

      if (message.type === "mergeFormCells") {
        await editorState.mergeSelectedFormCells(message.cellIds);
      }

      if (message.type === "deleteSelected") {
        console.log("[PageEditorProvider] deleteSelected received");
        await editorState.removeSelectedComponent();
      }

      if (message.type === "componentClipboard") {
        if (message.action === "copy") {
          this.state.copySelectedComponent();
        } else if (message.action === "cut") {
          await this.state.cutSelectedComponent();
        } else if (message.action === "paste") {
          await this.state.pasteComponent();
        }
      }

      if (message.type === "updateComponentText") {
        await editorState.updateComponentText(message.id, message.value);
      }

      if (message.type === "updateProperty") {
        await editorState.updateSelectedProperty(message.name, message.value);
      }

      if (message.type === "dropPaletteComponent") {
        await editorState.addComponent(message.index, message.targetId, {
          dropMode: message.mode || "inside",
        });
      }

      if (message.type === "createTable") {
        await editorState.addComponent(message.paletteIndex, message.targetId, {
          dropMode: message.dropMode || "inside",
          tableOptions: message.options || {},
        });
      }

      if (message.type === "updateTableColumns") {
        await editorState.updateTableColumns(message.id, message.columns);
      }
    });
  }
}

class PaletteViewProvider {
  constructor(state, webviewRoots) {
    this.state = state;
    this.webviewRoots = webviewRoots;
  }

  resolveWebviewView(view) {
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: this.webviewRoots,
    };
    view.webview.html = getPaletteHtml(view.webview, htmlShell, getNonce);
    view.webview.onDidReceiveMessage((message) => {
      if (message.type === "requestTableWizard") {
        this.state.requestTableWizard({ paletteIndex: message.index });
        return;
      }
      if (message.type === "addComponent")
        this.state.addComponent(message.index);
    });
  }
}

class PropertiesViewProvider {
  constructor(state, webviewRoots) {
    this.state = state;
    this.webviewRoots = webviewRoots;
  }

  resolveWebviewView(view) {
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: this.webviewRoots,
    };

    view.webview.html = getPropertiesHtml(
      view.webview,
      htmlShell,
      getNonce,
    );

    const postState = () => postViewState(view, this.state);
    const subscription = this.state.onDidChange(postState);

    view.onDidDispose(() => subscription.dispose());

    view.webview.onDidReceiveMessage(async (message) => {
      console.log("[PropertiesViewProvider message]", message);

      if (message.type === "ready") {
        postState();
      }

      if (message.type === "updateProperty") {
        await this.state.updateSelectedProperty(message.name, message.value);
      }

      if (message.type === "deleteSelected") {
        console.log("[PropertiesViewProvider] deleteSelected");
        await this.state.removeSelectedComponent();
      }

      if (message.type === "editTableColumns") {
        this.state.requestTableColumns(message.id);
      }
    });
  }
}

class EventsViewProvider {
  constructor(state, webviewRoots) {
    this.state = state;
    this.webviewRoots = webviewRoots;
  }

  resolveWebviewView(view) {
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: this.webviewRoots,
    };

    view.webview.html = getEventsHtml(
      view.webview,
      htmlShell,
      getNonce,
    );

    const postState = () => postViewState(view, this.state);
    const subscription = this.state.onDidChange(postState);
    view.onDidDispose(() => subscription.dispose());

    view.webview.onDidReceiveMessage(async (message) => {
      if (message.type === "ready") postState();

      if (message.type === "updateEvent") {
        await this.state.updateSelectedEvent(message.eventName, message.value);

        if (message.openScriptTab && message.value) {
          this.state.setEditorTab("script");
        }
      }

      if (message.type === "openEventMethod") {
        await this.state.openSelectedEventMethod(
          message.eventName,
          message.value || "",
        );
      }
    });
  }
}

class PageTreeViewProvider {
  constructor(state, webviewRoots) {
    this.state = state;
    this.webviewRoots = webviewRoots;
  }

  resolveWebviewView(view) {
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: this.webviewRoots,
    };
    view.webview.html = getPageTreeHtml(
      view.webview,
      htmlShell,
      getNonce,
    );

    const postState = () => postViewState(view, this.state);
    const subscription = this.state.onDidChange(postState);
    view.onDidDispose(() => subscription.dispose());

    view.webview.onDidReceiveMessage(async (message) => {
      if (message.type === "ready") {
        postState();
      }

      if (message.type === "select") {
        this.state.selectComponent(message.id);
      }

      if (message.type === "deleteComponent") {
        await this.state.removeComponentById(message.id);
      }

      if (message.type === "componentClipboard") {
        if (message.action === "copy") {
          this.state.copySelectedComponent();
        } else if (message.action === "cut") {
          await this.state.cutSelectedComponent();
        } else if (message.action === "paste") {
          await this.state.pasteComponent();
        }
      }

      if (message.type === "moveComponent") {
        await this.state.moveComponent(
          message.dragId,
          message.dropId,
          message.mode,
        );
      }

      if (message.type === "formLayoutAction") {
        await this.state.updateFormLayout(message.action, message.targetId);
      }

      if (message.type === "splitFormCell") {
        await this.state.splitFormCell(message.targetId, {
          rowsEnabled: message.rowsEnabled,
          rowCount: message.rowCount,
          columnsEnabled: message.columnsEnabled,
          columnCount: message.columnCount,
        });
      }
    });
  }
}

class DatasetViewProvider {
  constructor(state, webviewRoots) {
    this.state = state;
    this.webviewRoots = webviewRoots;
  }

  resolveWebviewView(view) {
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: this.webviewRoots,
    };
    view.webview.html = getDatasetHtml(view.webview);

    const postState = () => postViewState(view, this.state);
    const subscription = this.state.onDidChange(postState);
    view.onDidDispose(() => subscription.dispose());

    view.webview.onDidReceiveMessage(async (message) => {
      if (message.type === "ready") postState();
      if (message.type === "addField") await this.state.addDatasetField();
      if (message.type === "updateField")
        await this.state.updateDatasetField(
          message.index,
          message.name,
          message.value,
        );
      if (message.type === "removeField")
        await this.state.removeDatasetField(message.index);
    });
  }
}

function postViewState(view, state) {
  view.webview.postMessage({
    type: "state",
    model: state.getModel(),
    selectedId: state.selectedId,
    selectedCellIds: state.selectedCellIds,
    hasDocument: Boolean(state.document),
  });
}

module.exports = {
  DatasetViewProvider,
  PageEditorProvider,
  EventsViewProvider,
  PageTreeViewProvider,
  PaletteViewProvider,
  PropertiesViewProvider,
};
