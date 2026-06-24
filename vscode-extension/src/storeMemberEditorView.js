async function mountStoreMemberEditor(store) {
  const container = document.getElementById("store-member-editor");
  const selection = selectedStoreMember ? { ...selectedStoreMember } : null;
  const member = selection
    ? store.definition[selection.kind]?.[selection.index]
    : null;
  if (!container || !member) return;
  const token = ++storeMemberEditorRenderToken;

  try {
    const monaco = await monacoReady;
    if (
      token !== storeMemberEditorRenderToken ||
      activeTab !== "store" ||
      !container.isConnected
    )
      return;

    const modelName = [
      store.definition.store?.fileName || "store",
      selection.kind,
      member.name || selection.index,
    ].join("-");
    storeMemberEditorModel = monaco.editor.createModel(
      buildStoreMemberEditorSource(member),
      "javascript",
      monaco.Uri.parse(
        "inmemory://quasar-tool/store/" +
          encodeURIComponent(modelName) +
          ".js",
      ),
    );
    storeMemberEditor = monaco.editor.create(container, {
      model: storeMemberEditorModel,
      theme: getMonacoTheme(),
      automaticLayout: true,
      fontFamily: "var(--vscode-editor-font-family)",
      fontSize: 13,
      lineHeight: 20,
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      smoothScrolling: true,
      tabSize: 2,
      insertSpaces: true,
      formatOnPaste: true,
      formatOnType: true,
      quickSuggestions: { other: true, comments: false, strings: true },
      suggestOnTriggerCharacters: true,
      parameterHints: { enabled: true },
      bracketPairColorization: { enabled: true },
      guides: { bracketPairs: true, indentation: true },
      wordWrap: "on",
      renderValidationDecorations: "on",
    });
    const lastLine = storeMemberEditorModel.getLineCount();
    storeMemberEditor.setHiddenAreas([
      { startLineNumber: 1, endLineNumber: 1 },
      { startLineNumber: lastLine, endLineNumber: lastLine },
    ]);
    registerStoreMemberEditorShortcuts(monaco);
    storeMemberEditor.onDidChangeModelContent(() => {
      member.body = extractStoreMemberBody(storeMemberEditorModel.getValue());
      scheduleStoreSave(store);
    });
    storeMemberEditor.focus();
  } catch (error) {
    if (container.isConnected) {
      container.innerHTML =
        '<div class="empty error-text">Store editor failed to load: ' +
        escapeHtml(error.message) +
        "</div>";
    }
  }
}

function disposeStoreMemberEditor() {
  storeMemberEditorRenderToken += 1;
  storeMemberEditor?.dispose();
  storeMemberEditorModel?.dispose();
  storeMemberEditor = null;
  storeMemberEditorModel = null;
}

function registerStoreMemberEditorShortcuts(monaco) {
  const ctrlCmd = monaco.KeyMod.CtrlCmd;
  storeMemberEditor.addCommand(
    ctrlCmd | monaco.KeyCode.KeyC,
    copyStoreMemberSelection,
  );
  storeMemberEditor.addCommand(
    ctrlCmd | monaco.KeyCode.KeyV,
    pasteIntoStoreMemberEditor,
  );
  storeMemberEditor.addCommand(ctrlCmd | monaco.KeyCode.KeyZ, () => {
    storeMemberEditor.trigger("keyboard", "undo", null);
  });
  storeMemberEditor.addCommand(
    ctrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyZ,
    () => storeMemberEditor.trigger("keyboard", "redo", null),
  );
  storeMemberEditor.addCommand(ctrlCmd | monaco.KeyCode.KeyY, () => {
    storeMemberEditor.trigger("keyboard", "redo", null);
  });
  storeMemberEditor.addCommand(ctrlCmd | monaco.KeyCode.KeyS, async () => {
    await formatEditorDocument(storeMemberEditor);
  });
  storeMemberEditor.addCommand(
    monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF,
    () => formatEditorDocument(storeMemberEditor),
  );
}

async function copyStoreMemberSelection() {
  const selection = storeMemberEditor?.getSelection();
  if (!selection || !storeMemberEditorModel) return;
  const value = selection.isEmpty()
    ? storeMemberEditorModel.getLineContent(selection.startLineNumber) + "\n"
    : storeMemberEditorModel.getValueInRange(selection);
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    storeMemberEditor.trigger(
      "keyboard",
      "editor.action.clipboardCopyAction",
      null,
    );
  }
}

async function pasteIntoStoreMemberEditor() {
  const selection = storeMemberEditor?.getSelection();
  if (!selection || !storeMemberEditorModel) return;
  try {
    const value = await navigator.clipboard.readText();
    storeMemberEditor.pushUndoStop();
    storeMemberEditor.executeEdits("clipboard", [
      { range: selection, text: value, forceMoveMarkers: true },
    ]);
    storeMemberEditor.pushUndoStop();
    storeMemberEditor.focus();
  } catch {
    storeMemberEditor.trigger(
      "keyboard",
      "editor.action.clipboardPasteAction",
      null,
    );
  }
}

function buildStoreMemberEditorSource(member) {
  const name = /^[A-Za-z_$][\w$]*$/.test(member.name || "")
    ? member.name
    : "storeMember";
  const params = (member.params || [])
    .filter((param) => /^[A-Za-z_$][\w$]*$/.test(param))
    .join(", ");
  return (member.async ? "async function " : "function ") +
    name +
    "(" +
    params +
    ") {\n" +
    String(member.body || "") +
    "\n}";
}

function extractStoreMemberBody(source) {
  const value = String(source || "");
  const start = value.indexOf("{\n");
  const end = value.lastIndexOf("\n}");
  if (start < 0 || end <= start) return value;
  return value.slice(start + 2, end);
}

const storeMemberEditorFunctions = [
  mountStoreMemberEditor,
  disposeStoreMemberEditor,
  registerStoreMemberEditorShortcuts,
  copyStoreMemberSelection,
  pasteIntoStoreMemberEditor,
  buildStoreMemberEditorSource,
  extractStoreMemberBody,
];

module.exports = {
  buildStoreMemberEditorSource,
  disposeStoreMemberEditor,
  extractStoreMemberBody,
  mountStoreMemberEditor,
  storeMemberEditorFunctions,
};
