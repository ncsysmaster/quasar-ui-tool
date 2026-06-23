const vscode = require("vscode");
const { mkdir, readFile, writeFile } = require("fs/promises");
const { basename, dirname } = require("path");
const { PALETTE } = require("./constants");
const {
  generateVueForDocument,
  isPageJsonDocument,
  isPageScriptDocument,
  isPageSourceDocument,
  getPageScriptPath,
  replaceDocument,
} = require("./generatorBridge");

const {
  coerceValue,
  createComponentId,
  createEmptyModel,
  ensureDataset,
  ensureRootPage,
  findComponent,
  firstSelectableId,
  parseModel,
  stringifyModel,
} = require("./model");

class PageEditorState {
  constructor() {
    this.document = null;
    this.selectedId = "";
    this.selectedCellIds = [];
    this.generateTimer = null;
    this.changeEmitter = new vscode.EventEmitter();
    this.onDidChange = this.changeEmitter.event;
    this.editorTab = "screen";
    this.scriptContent = "";
    this.scriptNavigation = null;
    this.scriptNavigationSequence = 0;
    this.tableWizardRequest = null;
    this.tableWizardSequence = 0;
    this.tableColumnsRequest = null;
    this.tableColumnsSequence = 0;
    this.componentClipboard = null;
  }

  async setDocument(document) {
    this.document = document;
    this.selectedCellIds = [];
    await this.ensureExternalScript();
    const model = this.getModel();
    this.selectedId = this.selectedId || firstSelectableId(model.components);
    this.fire();
  }

  onTextDocumentChanged(document) {
    if (!this.document) return;

    if (document.uri.toString() === this.document.uri.toString()) {
      this.document = document;
      this.fire();
      return;
    }

    if (
      isPageScriptDocument(document) &&
      document.uri.fsPath.toLowerCase() === this.getScriptPath().toLowerCase()
    ) {
      this.scriptContent = document.getText();
      this.fire();
    }
  }

  async onScriptFileChanged(uri) {
    if (
      !this.document ||
      uri.fsPath.toLowerCase() !== this.getScriptPath().toLowerCase()
    )
      return;

    try {
      this.scriptContent = await readFile(uri.fsPath, "utf8");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      this.scriptContent = "";
      await writeFile(uri.fsPath, "", "utf8");
    }

    this.fire();
    this.scheduleGenerateVue({ uri });
  }

  getModel() {
    if (!this.document) {
      return createEmptyModel();
    }

    const model = parseModel(this.document.getText());
    model.script ||= {};
    model.script.src ||= basename(this.getScriptPath());
    model.script.setup = this.scriptContent;
    return model;
  }

  getScriptPath() {
    return this.document ? getPageScriptPath(this.document.uri.fsPath) : "";
  }

  async ensureExternalScript() {
    if (!this.document || !isPageJsonDocument(this.document)) return;

    const model = parseModel(this.document.getText());
    const scriptPath = this.getScriptPath();
    const legacySetup =
      typeof model.script?.setup === "string" ? model.script.setup.trim() : "";

    try {
      this.scriptContent = await readFile(scriptPath, "utf8");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      await mkdir(dirname(scriptPath), { recursive: true });
      this.scriptContent = legacySetup ? `${legacySetup}\n` : "";
      await writeFile(scriptPath, this.scriptContent, "utf8");
    }

    const scriptFileName = basename(scriptPath);
    if (
      model.script?.src !== scriptFileName ||
      model.script?.setup !== undefined
    ) {
      model.script = { ...(model.script || {}), src: scriptFileName };
      delete model.script.setup;
      await replaceDocument(this.document, stringifyModel(model));
    }
  }

  setEditorTab(tabName) {
    const allowedTabs = new Set(["screen", "script", "store"]);
    this.editorTab = allowedTabs.has(tabName) ? tabName : "screen";
    this.fire();
  }

  requestScriptMethod(methodName) {
    if (!methodName) return;
    this.editorTab = "script";
    this.scriptNavigation = {
      methodName,
      requestId: ++this.scriptNavigationSequence,
    };
    this.fire();
  }

  requestTableWizard(options = {}) {
    this.editorTab = "screen";
    this.tableWizardRequest = {
      requestId: ++this.tableWizardSequence,
      paletteIndex: Number(options.paletteIndex),
      targetId: options.targetId || "",
      dropMode: options.dropMode || "inside",
    };
    this.fire();
  }

  requestTableColumns(componentId) {
    const component = findComponent(this.getModel().components, componentId || this.selectedId);
    if (!component || component.type !== "Table") return;
    this.editorTab = "screen";
    this.selectedId = component.id;
    this.tableColumnsRequest = {
      requestId: ++this.tableColumnsSequence,
      componentId: component.id,
    };
    this.fire();
  }

  async updateModel(mutator) {
    if (!this.document) {
      vscode.window.showWarningMessage(
        "Open a Quasar page JSON with Quasar UI Tool Editor first.",
      );
      return;
    }

    const model = this.getModel();
    mutator(model);

    await replaceDocument(this.document, stringifyModel(model));
    this.scheduleGenerateVue(this.document);
  }

  // 콤퍼넌트를 추가 이벤트
  async addComponent(paletteIndex, targetId, options = {}) {
    const item = PALETTE[paletteIndex];
    if (!item) return;
    if (options.formGridCellOnly && !isFormGridDropPaletteItem(item)) return;
    let setupCode = "";

    await this.updateModel((model) => {
      const component =
        item.template === "courseSearchForm"
          ? createCourseSearchForm(model)
          : item.type === "Table" && options.tableOptions
            ? createTableComponent(model, item, options.tableOptions)
            : createPaletteComponent(item);

      if (component.type === "Table") {
        const rowClickHandler = component.events?.["row-click"];
        if (rowClickHandler && !hasFunction(this.scriptContent, rowClickHandler)) {
          setupCode = createTableRowClickCode(rowClickHandler);
        }
        Object.entries(component.table?.handlers || {}).forEach(([action, handler]) => {
          if (handler && !hasFunction(this.scriptContent + setupCode, handler)) {
            setupCode += createTableToolbarHandlerCode(handler, action);
          }
        });
      }

      if (item.type === "Page" && !options.formGridCellOnly) {
        model.components ||= [];
        model.components.push(component);
        this.selectedId = component.id;
        return;
      }

      const root = ensureRootPage(model);

      if (item.template === "courseSearchForm") {
        ensureCourseSearchData(model);
        setupCode = createCourseSearchScript(this.scriptContent);
      }

      let parent = root;

      if (options.formGridCellOnly) {
        const gridCell = findFormGridDropCell(model.components, targetId);
        if (!gridCell) return;
        parent = gridCell;
      } else {
        const selected = findComponent(
          model.components,
          targetId || this.selectedId,
        );

        if (selected && options.dropMode === "after") {
          const target = findComponentWithParent(model.components, selected.id);
          if (target) {
            target.parent.splice(target.index + 1, 0, component);
            this.selectedId = component.id;
            return;
          }
        } else if (selected && canHaveChildren(selected)) {
          parent = selected;
        }
      }

      parent.children ||= [];
      parent.children.push(component);

      this.selectedId = component.id;
    });

    if (setupCode) {
      await this.updateScript(this.scriptContent + setupCode);
    }
  }

  selectComponent(id) {
    this.selectedId = id || "";
    this.selectedCellIds = [];
    this.fire();
  }

  toggleGridCellSelection(componentId) {
    const model = this.getModel();
    const target = findComponentContext(model.components, componentId);

    if (!isMergeableCellContext(target)) {
      this.selectComponent(componentId);
      return;
    }

    const selectionSeed =
      this.selectedCellIds.length > 0
        ? this.selectedCellIds
        : [this.selectedId];
    const current = selectionSeed
      .map((id) => findComponentContext(model.components, id))
      .filter(isMergeableCellContext);
    const existingIndex = current.findIndex(
      (context) => context.component.id === componentId,
    );
    let nextContexts;

    if (existingIndex >= 0) {
      nextContexts = current.filter((_, index) => index !== existingIndex);
    } else if (current.length === 0) {
      nextContexts = [target];
    } else {
      const candidateIds = [
        ...current.map((context) => context.component.id),
        componentId,
      ];
      const candidate = getMergeCellSelection(model.components, candidateIds);
      nextContexts = candidate ? candidate.contexts : [target];
    }

    if (nextContexts.length > 1) {
      const remaining = getMergeCellSelection(
        model.components,
        nextContexts.map((context) => context.component.id),
      );
      nextContexts = remaining?.contexts || [];
    }
    this.selectedCellIds = nextContexts.map((context) => context.component.id);
    this.selectedId = componentId;
    this.fire();
  }

  async updateSelectedProperty(name, value) {
    await this.updateModel((model) => {
      const component = findComponent(model.components, this.selectedId);
      if (!component) return;

      if (name === "id") {
        component.id = value;
        this.selectedId = value;
      } else if (name === "tag") {
        component.tag = value;
      } else if (name === "text") {
        if (component.type === "HtmlElement") {
          component.text = value;
        } else {
          component.label = value;
        }
      } else if (name === "class") {
        if (
          component.type === "Button" ||
          component.type === "Input" ||
          component.type === "Card" ||
          component.type === "Table"
        ) {
          component.props ||= {};
          component.props.class = value;
        } else {
          component.class = value;
        }
      } else if (name === "style") {
        component.style = value;
        if (component.props) {
          delete component.props.style;
          if (Object.keys(component.props).length === 0) delete component.props;
        }
      } else if (name.startsWith("style.")) {
        const property = name.slice(6).trim();
        if (!property) return;

        component.style = String(value).trim()
          ? setStyleDeclaration(component.style, property, String(value).trim())
          : removeStyleDeclarations(component.style, [property]);
        if (component.props) {
          delete component.props.style;
          if (Object.keys(component.props).length === 0) delete component.props;
        }
      } else if (name.startsWith("prop.")) {
        component.props ||= {};
        component.props[name.slice(5)] = coerceValue(value);
      } else if (name.startsWith("dynamic.")) {
        component.dynamicProps ||= {};
        const key = name.slice(8);
        if (String(value || "").trim()) component.dynamicProps[key] = String(value).trim();
        else delete component.dynamicProps[key];
      } else if (name.startsWith("model.")) {
        component.models ||= {};
        const key = name.slice(6);
        if (String(value || "").trim()) component.models[key] = String(value).trim();
        else delete component.models[key];
      } else if (name.startsWith("event.")) {
        component.events ||= {};
        const key = name.slice(6);
        if (String(value || "").trim()) component.events[key] = String(value).trim();
        else delete component.events[key];
      } else if (name.startsWith("table.")) {
        const tablePath = name.slice(6);
        const nextValue = tablePath === "pagination.rowsPerPageOptions"
          ? String(value || "").split(",").map((item) => Number(item.trim())).filter(Number.isFinite)
          : coerceValue(value);
        setNestedComponentValue(component, tablePath, nextValue);
        if (tablePath === "title") component.label = String(nextValue || "Table");
        if (tablePath === "rowKey") {
          component.props ||= {};
          component.props.rowKey = String(nextValue || "id");
        }
        if (tablePath === "selection") {
          component.props ||= {};
          component.models ||= {};
          if (["single", "multiple"].includes(nextValue)) {
            component.props.selection = nextValue;
            const binding = `${component.id}Selected`;
            component.models.selected = binding;
            model.data ||= {};
            model.data[binding] ||= [];
          } else {
            delete component.props.selection;
            delete component.models.selected;
          }
        }
        if (tablePath === "toolbar.filter") {
          component.dynamicProps ||= {};
          if (nextValue) {
            const binding = `${component.id}Filter`;
            component.table.filterBinding = binding;
            component.dynamicProps.filter = binding;
            model.data ||= {};
            model.data[binding] ||= "";
          } else {
            delete component.table.filterBinding;
            delete component.dynamicProps.filter;
          }
        }
        if (tablePath === "pagination.rowsPerPage") {
          const paginationBinding = component.models?.pagination;
          if (paginationBinding) {
            model.data ||= {};
            model.data[paginationBinding] ||= { page: 1, rowsPerPage: 10 };
            model.data[paginationBinding].rowsPerPage = Number(nextValue) || 10;
          }
        }
        if (tablePath === "pagination.mode") {
          component.models ||= {};
          const binding = `${component.id}Pagination`;
          if (nextValue === "none") {
            delete component.models.pagination;
          } else {
            component.models.pagination = binding;
            model.data ||= {};
            model.data[binding] ||= {
              page: 1,
              rowsPerPage: Number(component.table?.pagination?.rowsPerPage) || 10,
            };
          }
        }
      }
    });
  }

  async updateTableColumns(componentId, columns) {
    await this.updateModel((model) => {
      const component = findComponent(model.components, componentId);
      if (!component || component.type !== "Table") return;
      component.columns = normalizeTableColumns(columns);
      this.selectedId = componentId;
    });
  }

  async bindStoreState(componentId, expression, binding = {}) {
    if (!componentId || !String(expression || "").trim()) return;
    await this.updateModel((model) => {
      const component = findComponent(model.components, componentId);
      if (!component) return;
      component.models ||= {};
      component.models.modelValue = String(expression).trim();
      component.designer ||= {};
      component.designer.storeBinding = {
        storePath: binding.storePath || "",
        statePath: Array.isArray(binding.statePath) ? binding.statePath : [],
      };
      this.selectedId = componentId;
      this.selectedCellIds = [];
    });
  }

  async removeSelectedComponent() {
    await this.removeComponentById(this.selectedId);
  }

  copySelectedComponent() {
    const component = findComponent(
      this.getModel().components,
      this.selectedId,
    );
    if (!component) return false;

    this.componentClipboard = JSON.parse(JSON.stringify(component));
    return true;
  }

  async cutSelectedComponent() {
    if (!this.copySelectedComponent()) return;
    await this.removeSelectedComponent();
  }

  async pasteComponent() {
    if (!this.componentClipboard) return;

    await this.updateModel((model) => {
      const nextId = createSequentialIdFactory(model.components);
      const pasted = cloneComponentTreeWithNewIds(
        this.componentClipboard,
        nextId,
      );
      const selected = findComponent(model.components, this.selectedId);

      if (selected && canHaveChildren(selected)) {
        selected.children ||= [];
        selected.children.push(pasted);
      } else {
        const selectedInfo = findComponentWithParent(
          model.components,
          this.selectedId,
        );

        if (selectedInfo) {
          selectedInfo.parent.splice(selectedInfo.index + 1, 0, pasted);
        } else {
          const root = ensureRootPage(model);
          root.children ||= [];
          root.children.push(pasted);
        }
      }

      this.selectedId = pasted.id;
    });
  }

  async updateComponentText(componentId, value) {
    if (!componentId) return;

    await this.updateModel((model) => {
      const component = findComponent(model.components, componentId);
      if (!component || component.type !== "HtmlElement") return;
      component.text = String(value ?? "");
    });
  }

  async removeComponentById(componentId) {
    if (!componentId) return;

    await this.updateModel((model) => {
      const context = findComponentContext(model.components, componentId);
      if (!context) return;

      const parentId = context.parentComponent?.id || "";
      context.parent.splice(context.index, 1);
      this.selectedId = parentId || firstSelectableId(model.components);
    });
  }

  async moveComponent(dragId, dropId, mode = "inside") {
    if (!dragId || !dropId || dragId === dropId) return;

    await this.updateModel((model) => {
      let moved = false;

      if (mode === "inside") {
        moved = moveComponentInside(model.components, dragId, dropId);
      } else {
        moved = moveComponentInTree(model.components, dragId, dropId);
      }

      if (moved) {
        this.selectedId = dragId;
      }
    });
  }

  async updateFormLayout(action, targetId) {
    if (!targetId) return;

    await this.updateModel((model) => {
      const target = findComponentContext(model.components, targetId);
      if (!target) return;

      const nextId = createSequentialIdFactory(model.components);

      if (action === "add-row" && isRowComponent(target.component)) {
        const newRow = cloneComponentTreeWithNewIds(target.component, nextId);
        target.parent.splice(target.index + 1, 0, newRow);
        this.selectedId = newRow.id;
        return;
      }

      if (action === "add-column" && isColumnComponent(target.component)) {
        const newColumn = createEmptyLayoutColumn(
          nextId,
          target.component.class || "col-12 col-md-2",
        );
        target.parent.splice(target.index + 1, 0, newColumn);
        this.selectedId = newColumn.id;
        return;
      }

      if (action === "delete-row" && isRowComponent(target.component)) {
        const parentId = target.parentComponent?.id || "";
        target.parent.splice(target.index, 1);
        this.selectedId = parentId || firstSelectableId(model.components);
        return;
      }

      if (action === "delete-column" && isColumnComponent(target.component)) {
        const parentId = target.parentComponent?.id || "";
        target.parent.splice(target.index, 1);
        this.selectedId = parentId || firstSelectableId(model.components);
      }
    });
  }

  async resizeFormLayout(componentId, resizeKind, rawValue) {
    if (!componentId) return;

    const value = Number(rawValue);
    if (!Number.isFinite(value)) return;

    await this.updateModel((model) => {
      const component = findComponent(model.components, componentId);
      if (!component) return;

      if (resizeKind === "row" && isRowComponent(component)) {
        component.style = setStyleDeclaration(
          component.style,
          "height",
          `${Math.max(24, Math.round(value))}px`,
        );
        this.selectedId = componentId;
        return;
      }

      if (resizeKind === "column" && isColumnComponent(component)) {
        const percent = Math.max(2, Math.min(100, value));
        const formatted = `${Math.round(percent * 100) / 100}%`;
        component.style = setStyleDeclaration(
          component.style,
          "flex",
          `0 0 ${formatted}`,
        );
        component.style = setStyleDeclaration(
          component.style,
          "width",
          formatted,
        );
        component.style = setStyleDeclaration(
          component.style,
          "max-width",
          formatted,
        );
        this.selectedId = componentId;
      }
    });
  }

  async splitFormCell(componentId, options = {}) {
    if (!componentId || (!options.rowsEnabled && !options.columnsEnabled))
      return;

    const splitByRows = Boolean(options.rowsEnabled);
    const splitCount = clampInteger(
      splitByRows ? options.rowCount : options.columnCount,
      1,
      20,
    );

    await this.updateModel((model) => {
      const context = findComponentContext(model.components, componentId);
      const component = context?.component;
      const row = context?.parentComponent;
      if (
        !component ||
        !row ||
        !isColumnComponent(component) ||
        !isRowComponent(row)
      ) {
        return;
      }

      const nextId = createSequentialIdFactory(model.components);
      if (splitByRows) {
        const existingRows = component.designer?.splitRows
          ? (component.children || []).map((splitRow) =>
              normalizeCellSplitRow(splitRow, nextId),
            )
          : [
              createCellSplitRow(
                nextId,
                component.children || [],
                component.text,
              ),
            ];

        while (existingRows.length < splitCount) {
          existingRows.push(createCellSplitRow(nextId));
        }
        if (existingRows.length > splitCount) {
          const retainedRows = existingRows.slice(0, splitCount);
          const lastCell = getCellSplitContentCell(retainedRows.at(-1));
          existingRows.slice(splitCount).forEach((removedRow) => {
            const removedCell = getCellSplitContentCell(removedRow);
            if (removedCell?.text) {
              lastCell.text = [lastCell.text, removedCell.text]
                .filter(Boolean)
                .join(" ");
            }
            lastCell.children ||= [];
            lastCell.children.push(...(removedCell?.children || []));
          });
          existingRows.length = 0;
          existingRows.push(...retainedRows);
        }

        const baseHeight = Math.floor(100 / splitCount);
        const heightRemainder = 100 % splitCount;
        existingRows.forEach((splitRow, index) => {
          const receivesRemainder = index >= splitCount - heightRemainder;
          splitRow.style = setStyleDeclaration(splitRow.style, "width", "100%");
          splitRow.style = setStyleDeclaration(
            splitRow.style,
            "height",
            `${baseHeight + (receivesRemainder ? 1 : 0)}%`,
          );
        });

        delete component.text;
        component.children = existingRows;
        component.style = removeStyleDeclarations(component.style, [
          "display",
          "flex-direction",
        ]);
        component.designer = { ...(component.designer || {}), splitRows: true };
        this.selectedId = component.id;
        return;
      }

      const selectedSpan = getPlainColumnSpan(component) || 12;
      const appliedSplitCount = Math.max(1, Math.min(selectedSpan, splitCount));
      const baseSpan = Math.floor(selectedSpan / appliedSplitCount);
      const remainder = selectedSpan % appliedSplitCount;
      const source = JSON.parse(JSON.stringify(component));
      const splitCells = Array.from(
        { length: appliedSplitCount },
        (_, index) => {
          const cell =
            index === 0 ? component : createEmptySplitSibling(source, nextId);
          const span = baseSpan + (index < remainder ? 1 : 0);

          cell.class = replacePlainColumnClass(cell.class, span);
          cell.style = removeStyleDeclarations(cell.style, [
            "grid-column",
            "grid-row",
            "width",
            "max-width",
            "min-width",
            "flex",
          ]);
          cell.designer = { ...(cell.designer || {}), role: "splitCell" };
          return cell;
        },
      );

      if (row.designer?.splitGrid) {
        row.style = removeStyleDeclarations(row.style, [
          "display",
          "grid-template-columns",
          "grid-template-rows",
        ]);
        delete row.designer.splitGrid;
        if (Object.keys(row.designer).length === 0) delete row.designer;

        (row.children || []).forEach((cell) => {
          if (cell === component) return;
          cell.style = removeStyleDeclarations(cell.style, [
            "grid-column",
            "grid-row",
            "width",
            "max-width",
            "min-width",
            "flex",
          ]);
        });
      }

      context.parent.splice(context.index, 1, ...splitCells);
      this.selectedId = component.id;
    });
  }

  async mergeSelectedFormCells(cellIds = this.selectedCellIds) {
    const selectedIds = [...new Set(cellIds || [])];
    const validation = getMergeCellSelection(
      this.getModel().components,
      selectedIds,
    );

    if (!validation) {
      vscode.window.showWarningMessage(
        "Quasar Tool: 같은 Row의 연속 셀 또는 같은 위치의 상하 셀을 2개 이상 선택해야 합니다.",
      );
      return;
    }

    if (validation.totalSpan > 12) {
      vscode.window.showWarningMessage(
        "Quasar Tool: 병합한 셀의 col 합계는 12를 초과할 수 없습니다.",
      );
      return;
    }

    await this.updateModel((model) => {
      const current = getMergeCellSelection(model.components, selectedIds);
      if (!current || current.totalSpan > 12) return;

      if (current.orientation === "vertical") {
        const mergedCell = mergeVerticalCellSelection(model, current);
        if (!mergedCell) return;
        this.selectedId = mergedCell.id;
        this.selectedCellIds = [mergedCell.id];
        return;
      }

      const [survivor, ...removed] = current.contexts;
      const survivorComponent = survivor.component;
      survivorComponent.children ||= [];

      removed.forEach((context) => {
        const component = context.component;
        if (component.text !== undefined) {
          survivorComponent.text =
            survivorComponent.text === undefined
              ? component.text
              : `${survivorComponent.text} ${component.text}`;
        }
        if (component.textBinding && !survivorComponent.textBinding) {
          survivorComponent.textBinding = component.textBinding;
        }
        survivorComponent.children.push(...(component.children || []));
      });

      survivorComponent.class = replacePlainColumnClass(
        survivorComponent.class,
        current.totalSpan,
      );

      [...removed]
        .sort((a, b) => b.index - a.index)
        .forEach((context) => context.parent.splice(context.index, 1));

      this.selectedId = survivorComponent.id;
      this.selectedCellIds = [survivorComponent.id];
    });
  }

  async updateScript(value) {
    if (!this.document) return;

    this.scriptContent = String(value ?? "");
    const scriptPath = this.getScriptPath();
    await mkdir(dirname(scriptPath), { recursive: true });
    await writeFile(scriptPath, this.scriptContent, "utf8");
    this.fire();
    this.scheduleGenerateVue(this.document);
  }

  async addDatasetField() {
    await this.updateModel((model) => {
      const dataset = ensureDataset(model);
      const next = dataset.fields.length + 1;

      dataset.fields.push({
        name: `field${next}`,
        label: `Field ${next}`,
        type: "string",
        required: false,
      });
    });
  }

  async updateDatasetField(index, name, value) {
    await this.updateModel((model) => {
      const field = ensureDataset(model).fields[index];
      if (!field) return;

      field[name] =
        name === "required" ? value === true || value === "true" : value;
    });
  }

  async removeDatasetField(index) {
    await this.updateModel((model) => {
      ensureDataset(model).fields.splice(index, 1);
    });
  }

  fire() {
    this.changeEmitter.fire({
      model: this.getModel(),
      selectedId: this.selectedId,
      selectedCellIds: this.selectedCellIds,
      hasDocument: Boolean(this.document),
      editorTab: this.editorTab,
    });
  }

  scheduleGenerateVue(document) {
    if (!document || !isPageSourceDocument(document)) return;

    clearTimeout(this.generateTimer);

    this.generateTimer = setTimeout(() => {
      generateVueForDocument(document);
    }, 250);
  }

  async updateSelectedEvent(eventName, value) {
    let shouldCreateHandler = false;

    await this.updateModel((model) => {
      const component = findComponent(model.components, this.selectedId);
      if (!component) return;

      component.events ||= {};

      if (!value) {
        delete component.events[eventName];
        return;
      }

      component.events[eventName] = value;

      shouldCreateHandler = !hasFunction(this.scriptContent, value);
    });

    if (shouldCreateHandler) {
      await this.updateScript(
        this.scriptContent + createHandlerCode(value, eventName),
      );
    }
  }

  async openSelectedEventMethod(eventName, preferredName = "") {
    const component = findComponent(
      this.getModel().components,
      this.selectedId,
    );
    if (!component) return;

    const existingName =
      preferredName.trim() || component.events?.[eventName] || "";
    const methodName = isMethodName(existingName)
      ? existingName
      : createEventHandlerName(eventName, component.id);

    if (
      component.events?.[eventName] !== methodName ||
      !hasFunction(this.scriptContent, methodName)
    ) {
      await this.updateSelectedEvent(eventName, methodName);
    }

    this.requestScriptMethod(methodName);
  }

  async openFirstComponentMethod(componentId) {
    const component = findComponent(this.getModel().components, componentId);
    if (!component) return;

    this.selectedId = componentId;
    const firstEvent = Object.entries(component.events || {}).find(
      ([, methodName]) => typeof methodName === "string" && methodName.trim(),
    );

    if (!firstEvent) {
      this.fire();
      return;
    }

    await this.openSelectedEventMethod(firstEvent[0], firstEvent[1]);
  }
}

function createPaletteComponent(item) {
  const component = {
    id: createComponentId(item.type),
    type: item.type,
    props: { ...(item.props || {}) },
  };

  if (item.tag) component.tag = item.tag;
  if (item.class) component.class = item.class;
  if (item.style !== undefined) component.style = item.style;
  if (item.text) component.text = item.text;
  if (
    item.label &&
    !item.text &&
    item.type !== "Input" &&
    item.type !== "Page" &&
    item.type !== "HtmlElement"
  ) {
    component.label = item.label;
  }

  return component;
}

function createTableComponent(model, item, options = {}) {
  const nextId = createSequentialIdFactory(model.components);
  const id = nextId("Table");
  const selection = ["single", "multiple"].includes(options.selection)
    ? options.selection
    : "none";
  const dynamicProps = {};
  if (options.rowsBinding) dynamicProps.rows = String(options.rowsBinding).trim();
  if (options.loadingBinding) dynamicProps.loading = String(options.loadingBinding).trim();
  const { columns: _paletteColumns, rows: _paletteRows, ...baseProps } = item.props || {};
  const toolbar = {
    filter: Boolean(options.filter),
    search: Boolean(options.toolbar?.search),
    add: Boolean(options.toolbar?.add),
    save: Boolean(options.toolbar?.save),
    delete: Boolean(options.toolbar?.delete),
    excel: Boolean(options.toolbar?.excel),
    refresh: Boolean(options.toolbar?.refresh),
  };
  const handlers = Object.fromEntries(
    Object.keys(toolbar)
      .filter((key) => key !== "filter" && toolbar[key])
      .map((key) => [key, createEventHandlerName(`table-${key}`, id)]),
  );
  if (selection !== "none") {
    model.data ||= {};
    model.data[`${id}Selected`] ||= [];
  }
  if (toolbar.filter) {
    model.data ||= {};
    model.data[`${id}Filter`] ||= "";
    dynamicProps.filter = `${id}Filter`;
  }
  const paginationEnabled = options.pagination !== false;
  if (paginationEnabled) {
    model.data ||= {};
    model.data[`${id}Pagination`] ||= { page: 1, rowsPerPage: 10 };
  }
  const models = {};
  if (selection !== "none") models.selected = `${id}Selected`;
  if (paginationEnabled) models.pagination = `${id}Pagination`;

  return {
    id,
    type: "Table",
    label: options.title || "Table",
    props: {
      ...baseProps,
      ...(!options.rowsBinding ? { rows: [] } : {}),
      rowKey: options.rowKey || "id",
      flat: true,
      bordered: true,
      dense: true,
      separator: "horizontal",
      noDataLabel: "데이터가 없습니다.",
      loadingLabel: "데이터를 불러오는 중입니다.",
      ...(selection !== "none" ? { selection } : {}),
    },
    ...(Object.keys(dynamicProps).length ? { dynamicProps } : {}),
    ...(Object.keys(models).length ? { models } : {}),
    columns: normalizeTableColumns([
      { name: "name", label: "명칭", field: "name", type: "text", align: "left", sortable: true },
      { name: "dtlDt", label: "상세일자", field: "dtlDt", type: "date", align: "center", sortable: true },
      { name: "actions", label: "작업", field: "actions", type: "actions", align: "center", sortable: false },
    ]),
    table: {
      title: options.title || "Table",
      rowKey: options.rowKey || "id",
      selection,
      rowsBinding: options.rowsBinding || "",
      loadingBinding: options.loadingBinding || "",
      toolbar,
      handlers,
      ...(toolbar.filter ? { filterBinding: `${id}Filter` } : {}),
      pagination: {
        mode: paginationEnabled ? "client" : "none",
        rowsPerPage: 10,
        rowsPerPageOptions: [10, 20, 50, 0],
      },
      states: { noData: true, loading: true, error: true },
    },
    events: { "row-click": createEventHandlerName("row-click", id) },
  };
}

function normalizeTableColumns(columns) {
  const allowedTypes = new Set([
    "text", "number", "date", "datetime", "checkbox", "select",
    "badge", "button", "link", "image", "actions",
  ]);
  return (Array.isArray(columns) ? columns : []).map((column, index) => {
    const name = String(column?.name || `column${index + 1}`).trim();
    const width = String(column?.width || "").trim();
    return {
      name,
      label: String(column?.label || name),
      field: String(column?.field || name),
      type: allowedTypes.has(column?.type) ? column.type : "text",
      align: ["left", "center", "right"].includes(column?.align) ? column.align : "left",
      ...(width ? { width, style: `width: ${width}`, headerStyle: `width: ${width}` } : {}),
      sortable: Boolean(column?.sortable),
      required: Boolean(column?.required),
      editable: Boolean(column?.editable),
      ...(column?.format ? { format: String(column.format) } : {}),
    };
  });
}

function createTableRowClickCode(functionName) {
  return `\n\nfunction ${functionName}(event, row) {\n  console.log('row-click', row)\n}\n`;
}

function createTableToolbarHandlerCode(functionName, action) {
  return `\n\nfunction ${functionName}() {\n  console.log('table-${action}')\n}\n`;
}

function setNestedComponentValue(component, path, value) {
  const keys = String(path || "").split(".").filter(Boolean);
  if (!keys.length) return;
  component.table ||= {};
  let target = component.table;
  while (keys.length > 1) {
    const key = keys.shift();
    target[key] ||= {};
    target = target[key];
  }
  target[keys[0]] = value;
}

function createCourseSearchForm(model) {
  const nextId = createSequentialIdFactory(model.components);
  const make = (type, options = {}) => {
    const component = { id: nextId(type, options.tag), type };
    if (options.tag) component.tag = options.tag;
    if (options.class) component.class = options.class;
    if (options.style !== undefined) component.style = options.style;
    if (options.text !== undefined) component.text = options.text;
    if (options.props && Object.keys(options.props).length) {
      const componentProps = { ...options.props };
      if (component.style === undefined && componentProps.style !== undefined) {
        component.style = componentProps.style;
      }
      delete componentProps.style;
      if (Object.keys(componentProps).length) component.props = componentProps;
    }
    if (options.models) component.models = options.models;
    if (options.dynamicProps) component.dynamicProps = options.dynamicProps;
    if (options.events) component.events = options.events;
    if (options.children) component.children = options.children;
    return component;
  };
  const div = (className, options = {}) =>
    make("HtmlElement", {
      tag: "div",
      class: className,
      ...options,
    });
  const span = (className, text) =>
    make("HtmlElement", {
      tag: "span",
      class: className,
      text,
    });
  const labelClass =
    "bg-grey-4 row items-center q-px-md full-height rounded-borders overflow-hidden";
  const roundedStyle = "border-radius: 4px";

  const form = make("Card", {
    props: { flat: true, bordered: true },
    children: [
      make("CardSection", {
        class: "q-pa-sm",
        children: [
          div("row q-col-gutter-sm", {
            children: [
              div("col", {
                children: [
                  div("row", {
                    children: [
                      div("col-2", {
                        children: [
                          div(labelClass, {
                            text: "조회분류",
                            style: roundedStyle,
                            children: [span("text-negative q-ml-xs", "*")],
                          }),
                        ],
                      }),
                      div("col-2 bg-white q-pa-xs", {
                        children: [
                          make("Select", {
                            models: { modelValue: "search.class1" },
                            dynamicProps: { options: "classOptions" },
                            props: {
                              outlined: true,
                              dense: true,
                              bgColor: "white",
                            },
                          }),
                        ],
                      }),
                      div("col-2 bg-white q-pa-xs", {
                        children: [
                          make("Select", {
                            models: { modelValue: "search.class2" },
                            dynamicProps: { options: "classOptions" },
                            props: {
                              outlined: true,
                              dense: true,
                              bgColor: "white",
                            },
                          }),
                        ],
                      }),
                      div("col-2", {
                        children: [
                          div(labelClass, {
                            text: "조회구분",
                            style: roundedStyle,
                          }),
                        ],
                      }),
                      div("col-2 bg-white row items-center q-px-sm", {
                        children: [
                          make("Toggle", {
                            models: { modelValue: "search.requiredYn" },
                            props: { label: "필수", dense: true },
                          }),
                        ],
                      }),
                      div("col-2 bg-white row items-center q-px-sm", {
                        children: [
                          make("Toggle", {
                            models: { modelValue: "search.useYn" },
                            props: { label: "사용여부", dense: true },
                          }),
                        ],
                      }),
                    ],
                  }),
                  div("row", {
                    children: [
                      div("col-2", {
                        children: [
                          div(labelClass, {
                            text: "조회명",
                            style: roundedStyle,
                          }),
                        ],
                      }),
                      div("col-10 bg-white q-pa-xs", {
                        children: [
                          make("Input", {
                            models: { modelValue: "search.name" },
                            props: {
                              outlined: true,
                              dense: true,
                              bgColor: "white",
                            },
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              div("col-auto", {
                style: "min-width: 180px; display: flex; align-items: flex-end",
                children: [
                  div("row no-wrap", {
                    style:
                      "width: 100%; height: 48px; align-items: center; justify-content: flex-end; gap: 8px; padding: 4px; background: white",
                    children: [
                      make("Button", {
                        style: "min-width: 80px; height: 36px",
                        props: {
                          label: "초기화",
                          outline: true,
                          color: "grey-7",
                        },
                        events: { click: "resetSearch" },
                      }),
                      make("Button", {
                        style: "min-width: 80px; height: 36px",
                        props: {
                          label: "검색",
                          color: "primary",
                        },
                        events: { click: "onSearch" },
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
  form.designer = { template: "courseSearchForm" };
  return form;
}

function createLegacyCourseSearchForm(model) {
  const nextId = createSequentialIdFactory(model.components);
  const make = (type, options = {}) => {
    const component = { id: nextId(type, options.tag), type };
    if (options.tag) component.tag = options.tag;
    if (options.class) component.class = options.class;
    if (options.props && Object.keys(options.props).length)
      component.props = options.props;
    if (options.models) component.models = options.models;
    if (options.dynamicProps) component.dynamicProps = options.dynamicProps;
    if (options.events) component.events = options.events;
    if (options.children) component.children = options.children;
    return component;
  };
  const div = (className, children) =>
    make("HtmlElement", {
      tag: "div",
      class: className,
      children,
    });

  const form = make("Card", {
    class: "q-mb-md",
    props: { flat: true, bordered: true },
    children: [
      make("CardSection", {
        children: [
          div("row q-col-gutter-md items-end", [
            div("col-12 col-md-2", [
              make("Select", {
                models: { modelValue: "searchForm.clsfCd" },
                dynamicProps: { options: "classOptions" },
                props: {
                  optionLabel: "label",
                  optionValue: "value",
                  emitValue: true,
                  mapOptions: true,
                  outlined: true,
                  dense: true,
                  label: "교육분류",
                },
                events: { "update:model-value": "onChangeClass" },
              }),
            ]),
            div("col-12 col-md-2", [
              make("Select", {
                models: { modelValue: "searchForm.dclsfCd" },
                dynamicProps: { options: "detailOptionsFiltered" },
                props: {
                  optionLabel: "label",
                  optionValue: "value",
                  emitValue: true,
                  mapOptions: true,
                  outlined: true,
                  dense: true,
                  label: "분류상세",
                },
              }),
            ]),
            div("col-12 col-md-2", [
              div("row items-center q-gutter-md search-toggle-wrap", [
                make("Toggle", {
                  models: { modelValue: "searchForm.requiredYn" },
                  props: {
                    trueValue: "Y",
                    falseValue: "",
                    label: "필수",
                    color: "primary",
                  },
                }),
                make("Toggle", {
                  models: { modelValue: "searchForm.closedYn" },
                  props: {
                    trueValue: "Y",
                    falseValue: "",
                    label: "사용여부",
                    color: "grey-7",
                  },
                }),
              ]),
            ]),
            div("col-12 col-md-4", [
              make("Input", {
                models: { modelValue: "searchForm.courseNm" },
                props: {
                  outlined: true,
                  dense: true,
                  label: "교육과정명",
                  clearable: true,
                },
                events: { "keyup.enter": "fetchCourseList" },
              }),
            ]),
            div("col-12 col-md-2", [
              div("row q-gutter-sm justify-end", [
                make("Button", {
                  props: { color: "primary", label: "검색" },
                  events: { click: "fetchCourseList" },
                }),
                make("Button", {
                  props: { flat: true, color: "grey-8", label: "초기화" },
                  events: { click: "resetSearch" },
                }),
              ]),
            ]),
          ]),
        ],
      }),
    ],
  });
  form.designer = { template: "courseSearchForm" };
  return form;
}

function createSequentialIdFactory(components) {
  const usedIds = new Set();
  const counters = new Map();

  const visit = (items) =>
    (items || []).forEach((component) => {
      if (component.id) usedIds.add(component.id);
      visit(component.children);
    });
  visit(components);

  return (type, tag) => {
    const base =
      type === "HtmlElement"
        ? `${String(tag || "div")
            .charAt(0)
            .toUpperCase()}${String(tag || "div").slice(1)}`
        : type;
    let number = counters.get(base) || 0;
    let id;
    do {
      number += 1;
      id = `${base}${String(number).padStart(3, "0")}`;
    } while (usedIds.has(id));
    counters.set(base, number);
    usedIds.add(id);
    return id;
  };
}

function createEmptyLayoutColumn(nextId, className) {
  return {
    id: nextId("HtmlElement", "div"),
    type: "HtmlElement",
    tag: "div",
    class: className,
    children: [],
  };
}

function cloneComponentTreeWithNewIds(component, nextId) {
  const clone = JSON.parse(JSON.stringify(component));

  const assignIds = (item) => {
    item.id = nextId(item.type || "Component", item.tag);
    if (Array.isArray(item.children)) item.children.forEach(assignIds);
  };

  assignIds(clone);
  return clone;
}

function ensureCourseSearchData(model) {
  model.data ||= {};
  model.data.search ||= {
    class1: null,
    class2: null,
    requiredYn: false,
    useYn: false,
    name: "",
  };
  model.data.classOptions ||= [];

  model.generation ||= {};
  model.generation.scriptSetup ||= {};
  const exports = (model.generation.scriptSetup.dataExports ||= []);
  ["search", "classOptions"].forEach((name) => {
    if (!exports.includes(name)) exports.push(name);
  });
}

function createCourseSearchScript(existingScript) {
  const definitions = [
    [
      "onSearch",
      `function onSearch() {
  console.log('onSearch', { ...search })
}`,
    ],
    [
      "resetSearch",
      `function resetSearch() {
  Object.assign(search, {
    class1: null,
    class2: null,
    requiredYn: false,
    useYn: false,
    name: ''
  })
}`,
    ],
  ];
  const missing = definitions
    .filter(([name]) => !hasFunction(existingScript, name))
    .map(([, code]) => code);

  return missing.length ? `\n\n${missing.join("\n\n")}\n` : "";
}

function moveComponentInTree(components, dragId, dropId) {
  const dragInfo = findComponentWithParent(components, dragId);
  const dropInfo = findComponentWithParent(components, dropId);

  if (!dragInfo || !dropInfo) return false;

  if (isDescendant(dragInfo.component, dropId)) {
    return false;
  }

  const [dragItem] = dragInfo.parent.splice(dragInfo.index, 1);

  let dropIndex = dropInfo.index;

  if (dragInfo.parent === dropInfo.parent && dragInfo.index < dropInfo.index) {
    dropIndex -= 1;
  }

  dropInfo.parent.splice(dropIndex, 0, dragItem);

  return true;
}

function findComponentWithParent(components, id, parent = components) {
  if (!Array.isArray(components)) return null;

  for (let i = 0; i < components.length; i++) {
    const component = components[i];

    if (component.id === id) {
      return {
        component,
        parent,
        index: i,
      };
    }

    const childResult = findComponentWithParent(
      component.children,
      id,
      component.children,
    );

    if (childResult) return childResult;
  }

  return null;
}

function findComponentContext(
  components,
  id,
  parentComponent = null,
  parent = components,
) {
  if (!Array.isArray(components)) return null;

  for (let index = 0; index < components.length; index += 1) {
    const component = components[index];
    if (component.id === id) {
      return { component, parentComponent, parent, index };
    }

    const childContext = findComponentContext(
      component.children,
      id,
      component,
      component.children,
    );
    if (childContext) return childContext;
  }

  return null;
}

function isDescendant(component, targetId) {
  const children = component?.children || [];

  for (const child of children) {
    if (child.id === targetId) return true;
    if (isDescendant(child, targetId)) return true;
  }

  return false;
}

function canHaveChildren(component) {
  if (!component) return false;

  if (component.type === "HtmlElement") {
    return [
      "div",
      "section",
      "article",
      "main",
      "aside",
      "header",
      "footer",
    ].includes(component.tag || "div");
  }

  return [
    "Page",
    "Card",
    "CardSection",
    "Layout",
    "PageContainer",
  ].includes(component.type);
}

function isFormGridDropPaletteItem(item) {
  return (
    item?.type === "Button" ||
    item?.type === "Input" ||
    (item?.type === "HtmlElement" &&
      ["Text", "Row", "Column"].includes(item.label))
  );
}

function findFormGridDropCell(components, targetId) {
  const path = findComponentPathById(components, targetId);
  if (
    !path.some(
      (component) => component?.designer?.template === "courseSearchForm",
    )
  ) {
    return null;
  }

  return (
    [...path].reverse().find((component) => {
      if (component?.type !== "HtmlElement") return false;
      const tokens = String(component.class || component.props?.class || "")
        .split(/\s+/)
        .filter(Boolean);
      return (
        component?.designer?.role === "splitCell" ||
        tokens.some(
          (token) =>
            token === "col" || /^col-(?:auto|[1-9]|1[0-2])$/.test(token),
        )
      );
    }) || null
  );
}

function findComponentPathById(components, id, ancestors = []) {
  for (const component of components || []) {
    const path = [...ancestors, component];
    if (component.id === id) return path;
    const childPath = findComponentPathById(component.children, id, path);
    if (childPath.length) return childPath;
  }
  return [];
}

function isRowComponent(component) {
  return component?.type === "HtmlElement" && hasClassToken(component, "row");
}

function isColumnComponent(component) {
  return (
    component?.type === "HtmlElement" &&
    (component.designer?.role === "splitCell" ||
      getClassTokens(component).some(
        (token) => token === "col" || /^col-/.test(token),
      ))
  );
}

function isMergeableCellContext(context) {
  return Boolean(
    context?.component &&
    context?.parentComponent &&
    isColumnComponent(context.component) &&
    isRowComponent(context.parentComponent) &&
    getPlainColumnSpan(context.component) > 0,
  );
}

function getMergeCellSelection(components, cellIds) {
  if (!Array.isArray(cellIds) || cellIds.length < 2) return null;

  const contexts = cellIds
    .map((id) => findComponentContext(components, id))
    .filter(isMergeableCellContext);

  if (contexts.length !== cellIds.length) return null;

  const sameRow = contexts.every(
    (context) => context.parentComponent === contexts[0].parentComponent,
  );
  if (sameRow) {
    contexts.sort((a, b) => a.index - b.index);
    const contiguous = contexts.every(
      (context, index) =>
        index === 0 || context.index === contexts[index - 1].index + 1,
    );
    if (!contiguous) return null;

    return {
      orientation: "horizontal",
      contexts,
      totalSpan: contexts.reduce(
        (total, context) => total + getPlainColumnSpan(context.component),
        0,
      ),
    };
  }

  const positions = contexts.map((context) =>
    getVerticalCellPosition(components, context),
  );
  if (positions.some((position) => !position)) return null;

  positions.sort((a, b) => a.rowContext.index - b.rowContext.index);
  const first = positions[0];
  const sameContainer = positions.every(
    (position) =>
      position.rowContext.parentComponent === first.rowContext.parentComponent,
  );
  const sameBounds = positions.every(
    (position) =>
      position.start === first.start && position.span === first.span,
  );
  const sameRowTotals = positions.every(
    (position) => position.rowTotal === first.rowTotal,
  );
  const contiguousRows = positions.every(
    (position, index) =>
      index === 0 ||
      position.rowContext.index === positions[index - 1].rowContext.index + 1,
  );
  if (!sameContainer || !sameBounds || !sameRowTotals || !contiguousRows)
    return null;

  return {
    orientation: "vertical",
    contexts: positions.map((position) => position.cellContext),
    positions,
    start: first.start,
    span: first.span,
    totalSpan: first.span,
  };
}

function getVerticalCellPosition(components, cellContext) {
  if (!isMergeableCellContext(cellContext)) return null;

  const row = cellContext.parentComponent;
  const rowContext = findComponentContext(components, row.id);
  if (!rowContext?.parentComponent) return null;

  const spans = (row.children || []).map(getPlainColumnSpan);
  if (spans.some((span) => span < 1)) return null;

  return {
    cellContext,
    rowContext,
    start: spans
      .slice(0, cellContext.index)
      .reduce((total, span) => total + span, 0),
    span: spans[cellContext.index],
    rowTotal: spans.reduce((total, span) => total + span, 0),
  };
}

function mergeVerticalCellSelection(model, selection) {
  const positions = selection.positions || [];
  if (positions.length < 2) return null;

  const first = positions[0];
  const rowParent = first.rowContext.parent;
  const rowStartIndex = first.rowContext.index;
  const rowTotal = first.rowTotal;
  const rightSpan = rowTotal - selection.start - selection.span;
  if (selection.start < 0 || rightSpan < 0 || rowTotal > 12) return null;

  const nextId = createSequentialIdFactory(model.components);
  const sourceRows = positions.map((position) => position.rowContext.component);
  const mergedHeight = sourceRows.reduce(
    (total, row) => total + (getPixelStyleValue(row.style, "height") || 48),
    0,
  );
  const survivor = positions[0].cellContext.component;
  const removedCells = positions
    .slice(1)
    .map((position) => position.cellContext.component);
  const hasRichContent = [survivor, ...removedCells].some(
    (component) =>
      (component.children || []).length > 0 || component.textBinding,
  );

  if (hasRichContent) {
    survivor.children ||= [];
    removedCells.forEach((component) => {
      survivor.children.push(...(component.children || []));
      if (component.text !== undefined) {
        survivor.text =
          survivor.text === undefined
            ? component.text
            : `${survivor.text} ${component.text}`;
      }
      if (component.textBinding && !survivor.textBinding) {
        survivor.textBinding = component.textBinding;
      }
    });
  } else {
    survivor.children = [];
    delete survivor.text;
    delete survivor.textBinding;
  }

  survivor.class = appendClassTokens(
    replacePlainColumnClass(survivor.class, selection.span),
    ["row", "items-center", "justify-center"],
  );
  survivor.style = setStyleDeclaration(
    survivor.style,
    "min-height",
    `${mergedHeight}px`,
  );
  survivor.designer = {
    ...(survivor.designer || {}),
    role: "mergedCell",
    mergeDirection: "vertical",
    sourceRowCount: positions.length,
  };

  const outerChildren = [];
  if (selection.start > 0) {
    outerChildren.push(
      createVerticalMergeRegion(
        nextId,
        sourceRows,
        0,
        positions.map((position) => position.cellContext.index),
        selection.start,
        "left",
      ),
    );
  }

  outerChildren.push(survivor);

  if (rightSpan > 0) {
    outerChildren.push(
      createVerticalMergeRegion(
        nextId,
        sourceRows,
        positions.map((position) => position.cellContext.index + 1),
        sourceRows.map((row) => (row.children || []).length),
        rightSpan,
        "right",
      ),
    );
  }

  const mergedRow = {
    id: nextId("HtmlElement", "div"),
    type: "HtmlElement",
    tag: "div",
    class: sourceRows[0].class || "row",
    style: `min-height: ${mergedHeight}px`,
    designer: {
      role: "verticalMergeRow",
      sourceRowCount: positions.length,
    },
    children: outerChildren,
  };

  rowParent.splice(rowStartIndex, positions.length, mergedRow);
  return survivor;
}

function createVerticalMergeRegion(
  nextId,
  sourceRows,
  startIndices,
  endIndices,
  regionSpan,
  side,
) {
  const nestedRows = sourceRows.map((row, rowIndex) => {
    const cells = (row.children || []).slice(
      Array.isArray(startIndices) ? startIndices[rowIndex] : startIndices,
      Array.isArray(endIndices) ? endIndices[rowIndex] : endIndices,
    );
    normalizeRegionColumnSpans(cells, regionSpan);

    return {
      id: nextId("HtmlElement", "div"),
      type: "HtmlElement",
      tag: "div",
      class: row.class || "row",
      ...(row.style ? { style: row.style } : {}),
      designer: { role: "verticalMergeSourceRow", side },
      children: cells,
    };
  });

  return {
    id: nextId("HtmlElement", "div"),
    type: "HtmlElement",
    tag: "div",
    class: `col-${regionSpan}`,
    designer: { role: "verticalMergeRegion", side },
    children: nestedRows,
  };
}

function normalizeRegionColumnSpans(cells, originalTotal) {
  if (!cells.length || originalTotal < 1) return;

  let remaining = 12;
  cells.forEach((cell, index) => {
    const cellsLeft = cells.length - index - 1;
    const span =
      index === cells.length - 1
        ? remaining
        : Math.max(
            1,
            Math.min(
              remaining - cellsLeft,
              Math.ceil((getPlainColumnSpan(cell) / originalTotal) * 12),
            ),
          );
    cell.class = replacePlainColumnClass(cell.class, span);
    remaining -= span;
  });
}

function appendClassTokens(className, tokens) {
  const values = String(className || "")
    .split(/\s+/)
    .filter(Boolean);
  tokens.forEach((token) => {
    if (!values.includes(token)) values.push(token);
  });
  return values.join(" ");
}

function getPixelStyleValue(style, property) {
  const pattern = new RegExp(
    `(?:^|;)\\s*${property}\\s*:\\s*(\\d+(?:\\.\\d+)?)px`,
    "i",
  );
  const match = String(style || "").match(pattern);
  return match ? Number(match[1]) : 0;
}

function hasClassToken(component, token) {
  return getClassTokens(component).includes(token);
}

function getClassTokens(component) {
  return String(component?.class || component?.props?.class || "")
    .split(/\s+/)
    .filter(Boolean);
}

function setStyleDeclaration(style, property, value) {
  const propertyName = String(property).toLowerCase();
  const declarations = String(style || "")
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => {
      const separator = item.indexOf(":");
      if (separator < 0) return true;
      return item.slice(0, separator).trim().toLowerCase() !== propertyName;
    });

  declarations.push(`${property}: ${value}`);
  return declarations.join("; ");
}

function getPlainColumnSpan(component) {
  const match = getClassTokens(component)
    .map((token) => token.match(/^col-(\d+)$/))
    .find(Boolean);
  return match ? Math.max(1, Math.min(12, Number(match[1]))) : 0;
}

function replacePlainColumnClass(className, span) {
  const nextClass = `col-${Math.max(1, Math.min(12, span))}`;
  const tokens = String(className || "")
    .split(/\s+/)
    .filter(Boolean);
  const index = tokens.findIndex((token) => /^col-\d+$/.test(token));
  const flexibleIndex = tokens.indexOf("col");

  if (index >= 0) {
    tokens[index] = nextClass;
  } else if (flexibleIndex >= 0) {
    tokens[flexibleIndex] = nextClass;
  } else {
    tokens.unshift(nextClass);
  }

  return tokens.join(" ");
}

function removeStyleDeclarations(style, properties) {
  const propertyNames = new Set(
    properties.map((property) => property.toLowerCase()),
  );
  return String(style || "")
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => {
      const separator = item.indexOf(":");
      if (separator < 0) return true;
      return !propertyNames.has(item.slice(0, separator).trim().toLowerCase());
    })
    .join("; ");
}

function createEmptySplitSibling(source, nextId) {
  return {
    id: nextId(source.type || "HtmlElement", source.tag),
    type: source.type || "HtmlElement",
    ...(source.tag ? { tag: source.tag } : {}),
    ...(source.class ? { class: source.class } : {}),
    ...(source.style ? { style: source.style } : {}),
    designer: { ...(source.designer || {}), role: "splitCell" },
    children: [],
  };
}

function createCellSplitRow(nextId, children = [], text) {
  return {
    id: nextId("HtmlElement", "div"),
    type: "HtmlElement",
    tag: "div",
    class: "row",
    style: "width: 100%",
    designer: { role: "cellSplitRow" },
    children: [
      {
        id: nextId("HtmlElement", "div"),
        type: "HtmlElement",
        tag: "div",
        class: "col-12",
        ...(text !== undefined ? { text } : {}),
        children,
      },
    ],
  };
}

function normalizeCellSplitRow(splitRow, nextId) {
  const isRow = hasClassToken(splitRow, "row");
  const contentCell =
    isRow &&
    (splitRow.children || []).find(
      (child) => isColumnComponent(child) && getPlainColumnSpan(child) === 12,
    );
  if (contentCell) return splitRow;

  return createCellSplitRow(nextId, splitRow.children || [], splitRow.text);
}

function getCellSplitContentCell(splitRow) {
  return (splitRow?.children || []).find(
    (child) => isColumnComponent(child) && getPlainColumnSpan(child) === 12,
  );
}

function clampInteger(value, minimum, maximum) {
  const number = Math.round(Number(value) || minimum);
  return Math.max(minimum, Math.min(maximum, number));
}

function moveComponentInside(components, dragId, dropId) {
  const dragInfo = findComponentWithParent(components, dragId);
  const dropInfo = findComponentWithParent(components, dropId);

  if (!dragInfo || !dropInfo) return false;
  if (isDescendant(dragInfo.component, dropId)) return false;
  if (!canHaveChildren(dropInfo.component)) return false;

  const [dragItem] = dragInfo.parent.splice(dragInfo.index, 1);

  dropInfo.component.children ||= [];
  dropInfo.component.children.push(dragItem);

  return true;
}

function hasFunction(script, functionName) {
  const escapedName = String(functionName).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
  const pattern = new RegExp(
    `function\\s+${escapedName}\\s*\\(|const\\s+${escapedName}\\s*=`,
  );

  return pattern.test(script || "");
}

function isMethodName(value) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value || "");
}

function createHandlerCode(functionName, eventName) {
  return `

function ${functionName}(payload) {
  console.log('${eventName}', payload)
}
`;
}

function createEventHandlerName(eventName, componentId) {
  const eventSuffix = String(eventName || "event")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  const safeId = String(componentId || "Component")
    .replace(/[^A-Za-z0-9_$]/g, "_")
    .replace(/^(?=\d)/, "_");

  return `on${eventSuffix || "Event"}_${safeId}`;
}

module.exports = {
  PageEditorState,
};
