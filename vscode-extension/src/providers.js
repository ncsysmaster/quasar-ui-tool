const vscode = require("vscode");
const { getRuntimeUris } = require("./webviewResources");
const { getEventsHtml } = require("./eventsView");
const { getPaletteHtml } = require("./paletteView");
const { getPageTreeHtml } = require("./pageTreeView");
const { getPropertiesHtml } = require("./propertiesView");

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
    await this.state.setDocument(document);

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
        model: this.state.getModel(),
        selectedId: this.state.selectedId,
        selectedCellIds: this.state.selectedCellIds,
        activeTab: this.state.editorTab,
        scriptNavigation: this.state.scriptNavigation,
      });
    };

    const subscription = this.state.onDidChange(postState);
    webviewPanel.onDidDispose(() => subscription.dispose());

    webviewPanel.webview.onDidReceiveMessage(async (message) => {
      console.log("[PageEditorProvider message]", message);

      if (message.type === "ready") {
        console.log("[PageEditorProvider] ready");
        postState();
      }

      if (message.type === "select") {
        console.log("[PageEditorProvider] select:", message.id);
        this.state.selectComponent(message.id);
      }

      if (message.type === "toggleGridCellSelection") {
        this.state.toggleGridCellSelection(message.id);
      }

      if (message.type === "openFirstEventMethod") {
        await this.state.openFirstComponentMethod(message.id);
      }

      if (message.type === "setEditorTab") {
        this.state.setEditorTab(message.tab);
      }

      if (message.type === "updateScript") {
        console.log("[PageEditorProvider] updateScript");
        await this.state.updateScript(message.value);
      }

      if (message.type === "moveComponent") {
        console.log("[PageEditorProvider] moveComponent:", message);
        await this.state.moveComponent(
          message.dragId,
          message.dropId,
          message.mode,
        );
      }

      if (message.type === "formLayoutAction") {
        await this.state.updateFormLayout(message.action, message.targetId);
      }

      if (message.type === "resizeFormLayout") {
        await this.state.resizeFormLayout(
          message.id,
          message.resizeKind,
          message.value,
        );
      }

      if (message.type === "splitFormCell") {
        await this.state.splitFormCell(message.targetId, {
          rowsEnabled: message.rowsEnabled,
          rowCount: message.rowCount,
          columnsEnabled: message.columnsEnabled,
          columnCount: message.columnCount,
        });
      }

      if (message.type === "mergeFormCells") {
        await this.state.mergeSelectedFormCells(message.cellIds);
      }

      if (message.type === "deleteSelected") {
        console.log("[PageEditorProvider] deleteSelected received");
        await this.state.removeSelectedComponent();
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
        await this.state.updateComponentText(message.id, message.value);
      }

      if (message.type === "updateProperty") {
        await this.state.updateSelectedProperty(message.name, message.value);
      }

      if (message.type === "dropPaletteComponent") {
        await this.state.addComponent(message.index, message.targetId, {
          formGridCellOnly: true,
        });
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
