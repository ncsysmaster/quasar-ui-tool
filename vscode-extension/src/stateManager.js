const vscode = require("vscode");
const { PageEditorState } = require("./state");

class PageEditorStateManager {
  constructor() {
    this.states = new Map();
    this.fallbackState = new PageEditorState();
    this.activeState = this.fallbackState;
    this.sharedComponentClipboard = null;
    this.changeEmitter = new vscode.EventEmitter();
    this.onDidChange = this.changeEmitter.event;

    return new Proxy(this, {
      get: (target, property, receiver) => {
        if (Reflect.has(target, property)) {
          const value = Reflect.get(target, property, receiver);
          return typeof value === "function" ? value.bind(target) : value;
        }

        const value = target.activeState?.[property];
        return typeof value === "function"
          ? value.bind(target.activeState)
          : value;
      },
    });
  }

  async getOrCreate(document) {
    const key = document.uri.toString();
    const existing = this.states.get(key);
    if (existing) {
      existing.state.onTextDocumentChanged(document);
      return existing.state;
    }

    const state = new PageEditorState();
    await state.setDocument(document);
    const subscription = state.onDidChange(() => {
      if (this.activeState === state) this.changeEmitter.fire();
    });
    this.states.set(key, { state, subscription });
    return state;
  }

  activate(state) {
    if (!state || this.activeState === state) return;
    this.activeState = state;
    this.changeEmitter.fire();
  }

  release(documentUri, state) {
    const key = documentUri.toString();
    const entry = this.states.get(key);
    if (!entry || entry.state !== state) return;

    entry.subscription.dispose();
    this.states.delete(key);

    if (this.activeState === state) {
      this.activeState = this.states.values().next().value?.state || this.fallbackState;
      this.changeEmitter.fire();
    }
  }

  onTextDocumentChanged(document) {
    for (const { state } of this.states.values()) {
      state.onTextDocumentChanged(document);
    }
  }

  async onScriptFileChanged(uri) {
    await Promise.all(
      [...this.states.values()].map(({ state }) =>
        state.onScriptFileChanged(uri),
      ),
    );
  }

  scheduleGenerateVue(document) {
    const documentUri = document?.uri?.toString();
    const documentPath = document?.uri?.fsPath?.toLowerCase();
    const entry = [...this.states.values()].find(({ state }) =>
      state.document?.uri.toString() === documentUri ||
      state.getScriptPath()?.toLowerCase() === documentPath,
    );
    (entry?.state || this.activeState).scheduleGenerateVue(document);
  }

  copySelectedComponent() {
    const copied = this.activeState.copySelectedComponent();
    if (!copied) return false;

    this.sharedComponentClipboard = cloneClipboard(
      this.activeState.componentClipboard,
    );
    return true;
  }

  async cutSelectedComponent() {
    if (!this.copySelectedComponent()) return;
    await this.activeState.removeSelectedComponent();
  }

  async pasteComponent() {
    if (!this.sharedComponentClipboard) return;

    this.activeState.componentClipboard = cloneClipboard(
      this.sharedComponentClipboard,
    );
    await this.activeState.pasteComponent();
  }
}

function cloneClipboard(value) {
  return value ? JSON.parse(JSON.stringify(value)) : null;
}

module.exports = { PageEditorStateManager };
