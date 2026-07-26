const { PALETTE } = require("./constants");

// Screen 탭 왼쪽에 도킹되는 보조 패널(Components / Page Tree / Properties /
// Events / DataSet). 편집기 웹뷰 전역(model, selectedId, vscode, escapeHtml,
// findComponent, showTableWizard, showTableColumnsDialog, getFormLayoutContext,
// showFormContextMenu)을 그대로 사용한다.
function getScreenSidePanelsScript() {
  const paletteItems = PALETTE.map((item, index) => ({
    index,
    type: item.type,
    label: item.label,
    icon: getPaletteIcon(item.type, item.label),
  }));

  const preamble = [
    `const spPaletteItems = ${JSON.stringify(paletteItems)}`,
    "let spPanelWidth = Number(vscode.getState()?.screenSidePanelsWidth) || 280",
    "let spCollapsedSections = new Set(vscode.getState()?.screenSidePanelsCollapsed || [])",
    "const spTreeCollapsedIds = new Set()",
    "let spTreeLastSelectedId = ''",
    "let spTreePendingLocalSelection = ''",
    "let screenRightActiveTab = vscode.getState()?.screenRightActiveTab === 'storeState' ? 'storeState' : 'pageTree'",
    "let spTreeScrollTop = 0",
    "let spSidePanelsScrollTop = 0",
  ].join("\n");

  return (
    preamble +
    "\n\n" +
    [
      renderScreenSidePanels,
      renderScreenRightPanel,
      spSetRightPanelTab,
      setupScreenSidePanelsResize,
      spClampPanelWidth,
      spSection,
      spSetupSectionToggles,
      spPaletteSectionHtml,
      spSetupPaletteSection,
      spPageTreeSectionHtml,
      spTreeRowHtml,
      spTreeDisplayTag,
      spSetupPageTreeSection,
      spTreeDropMode,
      spSetTreeDropIndicator,
      spSelectFromTree,
      spExpandSelectedTreeAncestors,
      spRevealSelectedTreeRow,
      spPropertiesSectionHtml,
      spTablePropertiesHtml,
      spPropertySection,
      spPropertySectionWithAction,
      spField,
      spFieldWithButton,
      spCheckField,
      spSelectField,
      spSelectFieldLabeled,
      spGetButtonStyle,
      spGetButtonPosition,
      spHasRequiredMark,
      spGetStyleDeclaration,
      spSetupPropertiesSection,
      spAttachLabelSplitter,
      spOpenClassPopup,
      spCloseClassPopup,
      spIsClassSelected,
      spClassGroupsByComponent,
      spCommonSpacingGroups,
      spCommonTextGroups,
      spCommonBackgroundGroups,
      spCommonSizeGroups,
      spHtmlElementClassGroups,
      spButtonClassGroups,
      spInputClassGroups,
      spCardClassGroups,
      spCardSectionClassGroups,
      spTableClassGroups,
      spPageClassGroups,
      spEventsSectionHtml,
      spEventFieldHtml,
      spEventsByComponent,
      spSetupEventsSection,
      spDatasetSectionHtml,
      spDatasetFieldRowHtml,
      spSetupDatasetSection,
    ]
      .map((fn) => fn.toString())
      .join("\n\n")
  );
}

function renderScreenSidePanels() {
  const panel = document.getElementById("screen-side-panels");
  if (!panel) return;

  panel.innerHTML =
    spSection("palette", "Components", spPaletteSectionHtml()) +
    spSection("properties", "Properties", spPropertiesSectionHtml()) +
    spSection("events", "Events", spEventsSectionHtml()) +
    spSection("dataset", "DataSet", spDatasetSectionHtml());

  spSetupSectionToggles(panel);
  spSetupPaletteSection(panel);
  spSetupPropertiesSection(panel);
  spSetupEventsSection(panel);
  spSetupDatasetSection(panel);

  panel.scrollTop = spSidePanelsScrollTop;
  if (panel.dataset.scrollTracked !== "true") {
    panel.dataset.scrollTracked = "true";
    panel.addEventListener("scroll", () => {
      spSidePanelsScrollTop = panel.scrollTop;
    });
  }
}

function renderScreenRightPanel() {
  const panel = document.getElementById("screen-right-panel");
  if (!panel) return;

  const selectionChanged = selectedId && selectedId !== spTreeLastSelectedId;
  const isLocalSelection =
    spTreePendingLocalSelection && spTreePendingLocalSelection === selectedId;
  spTreePendingLocalSelection = "";
  if (selectionChanged) spExpandSelectedTreeAncestors();
  spTreeLastSelectedId = selectedId || "";

  panel.querySelectorAll("[data-right-tab]").forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.rightTab === screenRightActiveTab,
    );
    if (button.dataset.rightTabReady === "true") return;
    button.dataset.rightTabReady = "true";
    button.addEventListener("click", () =>
      spSetRightPanelTab(button.dataset.rightTab),
    );
  });

  const treeBody = document.getElementById("screen-right-page-tree");
  document
    .getElementById("screen-store-state-panel")
    ?.classList.toggle("hidden", screenRightActiveTab !== "storeState");
  treeBody?.classList.toggle("hidden", screenRightActiveTab !== "pageTree");

  if (treeBody) {
    treeBody.innerHTML = spPageTreeSectionHtml();
    spSetupPageTreeSection(treeBody);
    treeBody.scrollTop = spTreeScrollTop;
    if (treeBody.dataset.scrollTracked !== "true") {
      treeBody.dataset.scrollTracked = "true";
      treeBody.addEventListener("scroll", () => {
        spTreeScrollTop = treeBody.scrollTop;
      });
    }
  }

  if (selectionChanged && !isLocalSelection) {
    requestAnimationFrame(spRevealSelectedTreeRow);
  }
}

function spSetRightPanelTab(tab) {
  screenRightActiveTab = tab === "pageTree" ? "pageTree" : "storeState";
  vscode.setState({
    ...(vscode.getState() || {}),
    screenRightActiveTab,
  });
  renderScreenRightPanel();
}

function setupScreenSidePanelsResize() {
  const workspace = document.querySelector(".screen-editor-workspace");
  const resizer = document.getElementById("screen-side-panels-resizer");
  if (!workspace || !resizer) return;

  spPanelWidth = spClampPanelWidth(spPanelWidth);
  workspace.style.setProperty("--sp-panel-width", spPanelWidth + "px");

  resizer.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = spPanelWidth;
    resizer.setPointerCapture?.(event.pointerId);
    resizer.classList.add("active");
    document.body.classList.add("sp-panel-resizing");

    const move = (moveEvent) => {
      spPanelWidth = spClampPanelWidth(startWidth + moveEvent.clientX - startX);
      workspace.style.setProperty("--sp-panel-width", spPanelWidth + "px");
    };
    const finish = () => {
      resizer.removeEventListener("pointermove", move);
      resizer.removeEventListener("pointerup", finish);
      resizer.removeEventListener("pointercancel", finish);
      resizer.classList.remove("active");
      document.body.classList.remove("sp-panel-resizing");
      vscode.setState({
        ...(vscode.getState() || {}),
        screenSidePanelsWidth: spPanelWidth,
      });
    };

    resizer.addEventListener("pointermove", move);
    resizer.addEventListener("pointerup", finish);
    resizer.addEventListener("pointercancel", finish);
  });
}

function spClampPanelWidth(value) {
  const width = Math.round(Number(value) || 280);
  return Math.max(
    170,
    Math.min(Math.max(220, Math.round(window.innerWidth * 0.6)), width),
  );
}

function spSection(key, title, bodyHtml) {
  const open = spCollapsedSections.has(key) ? "" : " open";
  return (
    '<details class="sp-section" data-sp-section="' + escapeAttr(key) + '"' + open + ">" +
    "<summary>" + escapeHtml(title) + "</summary>" +
    '<div class="sp-section-body">' + bodyHtml + "</div>" +
    "</details>"
  );
}

function spSetupSectionToggles(panel) {
  panel.querySelectorAll("details.sp-section").forEach((section) => {
    section.addEventListener("toggle", () => {
      const key = section.dataset.spSection;
      if (!key) return;
      if (section.open) spCollapsedSections.delete(key);
      else spCollapsedSections.add(key);
      vscode.setState({
        ...(vscode.getState() || {}),
        screenSidePanelsCollapsed: [...spCollapsedSections],
      });
    });
  });
}

// ---- Components (palette) ----

function spPaletteSectionHtml() {
  return (
    '<div class="palette-grid">' +
    spPaletteItems
      .map(
        (item) =>
          '<button class="palette-item" draggable="true" data-sp-add="' +
          item.index +
          '" data-sp-type="' +
          escapeAttr(item.type) +
          '"><span class="palette-icon">' +
          escapeHtml(item.icon) +
          '</span><span class="palette-label">' +
          escapeHtml(item.label) +
          "</span></button>",
      )
      .join("") +
    "</div>"
  );
}

function spSetupPaletteSection(panel) {
  panel.querySelectorAll("[data-sp-add]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.spAdd);
      if (button.dataset.spType === "Table") {
        showTableWizard({ paletteIndex: index });
        return;
      }
      if (button.dataset.spType === "GridTemplate") {
        showLayoutGridWizard({});
        return;
      }
      vscode.postMessage({ type: "addComponent", index });
    });

    button.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData(
        "application/quasar-palette-index",
        button.dataset.spAdd,
      );
      event.dataTransfer.setData("text/plain", "palette:" + button.dataset.spAdd);
      event.dataTransfer.effectAllowed = "copy";
    });
  });
}

// ---- Page Tree ----

function spPageTreeSectionHtml() {
  if (!model) return '<div class="empty">No page is open.</div>';
  return (
    '<div class="tree-root" role="tree">' +
    (model.components || []).map((item) => spTreeRowHtml(item)).join("") +
    "</div>"
  );
}

function spTreeRowHtml(component) {
  const children = Array.isArray(component.children)
    ? component.children.filter(
        (child) => child?.designer?.role !== "requiredMark",
      )
    : [];
  const tagName = spTreeDisplayTag(component);
  const idText = component.id || "";
  const hasChildren = children.length > 0;
  const isCollapsed = hasChildren && spTreeCollapsedIds.has(idText);
  const toggle = hasChildren
    ? '<button class="tree-toggle ' +
      (isCollapsed ? "collapsed" : "expanded") +
      '" data-sp-toggle="' +
      escapeAttr(idText) +
      '" title="' +
      (isCollapsed ? "Expand" : "Collapse") +
      '" aria-label="' +
      (isCollapsed ? "Expand" : "Collapse") +
      '"></button>'
    : '<span class="tree-toggle-spacer"></span>';
  const childrenHtml =
    hasChildren && !isCollapsed
      ? '<div class="tree-children" role="group">' +
        children.map((child) => spTreeRowHtml(child)).join("") +
        "</div>"
      : "";

  return (
    '<div class="tree-node">' +
    '<div class="tree-row ' +
    (component.id === selectedId ? "selected" : "") +
    '" draggable="true" role="treeitem" tabindex="0" data-sp-select="' +
    escapeAttr(idText) +
    '">' +
    '<span class="tree-main">' +
    toggle +
    '<span class="tree-tag">' + escapeHtml(tagName) + "</span>" +
    '<span class="tree-id">(' + escapeHtml(idText) + ")</span>" +
    "</span>" +
    "</div>" +
    childrenHtml +
    "</div>"
  );
}

function spTreeDisplayTag(component) {
  if (!component) return "";

  if (component.type === "HtmlElement") {
    const tagName = component.tag || "div";
    if (tagName.toLowerCase() !== "div") return tagName;

    const classTokens = getComponentClassTokens(component);
    if (classTokens.includes("row")) return "div-row";
    if (classTokens.some((token) => token === "col" || token.startsWith("col-"))) {
      return "div-col";
    }
    return tagName;
  }

  return component.type || "";
}

function spSetupPageTreeSection(panel) {
  panel.querySelectorAll("[data-sp-toggle]").forEach((toggle) => {
    toggle.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const id = toggle.dataset.spToggle;
      if (spTreeCollapsedIds.has(id)) spTreeCollapsedIds.delete(id);
      else spTreeCollapsedIds.add(id);
      renderScreenRightPanel();
    });
  });

  panel.querySelectorAll("[data-sp-select]").forEach((button) => {
    button.addEventListener("click", () => {
      spSelectFromTree(button.dataset.spSelect);
    });

    button.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        spSelectFromTree(button.dataset.spSelect);
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        event.stopPropagation();
        vscode.postMessage({
          type: "deleteComponent",
          id: button.dataset.spSelect,
        });
      }
    });

    button.addEventListener("contextmenu", (event) => {
      const layoutContext = getFormLayoutContext(button.dataset.spSelect);
      if (!layoutContext.rowId && !layoutContext.columnId) return;

      event.preventDefault();
      event.stopPropagation();
      showFormContextMenu(event.clientX, event.clientY, layoutContext);
    });

    button.addEventListener("dragstart", (event) => {
      event.stopPropagation();
      const dragId = button.dataset.spSelect;
      event.dataTransfer.setData("text/plain", dragId);
      event.dataTransfer.setData("application/quasar-tree-id", dragId);
      event.dataTransfer.effectAllowed = "move";
      button.classList.add("dragging");
      spSelectFromTree(dragId);
    });

    button.addEventListener("dragend", () => {
      button.classList.remove("dragging");
      panel
        .querySelectorAll(".drag-over, .drag-over-before, .drag-over-after")
        .forEach((el) => {
          el.classList.remove("drag-over", "drag-over-before", "drag-over-after");
        });
    });

    button.addEventListener("dragover", (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (isPaletteDrag(event.dataTransfer)) {
        spSetTreeDropIndicator(button, "inside");
        event.dataTransfer.dropEffect = "copy";
        return;
      }

      const types = Array.from(event.dataTransfer.types || []);
      if (
        !types.includes("application/quasar-tree-id") &&
        !types.includes("text/plain")
      ) {
        return;
      }

      spSetTreeDropIndicator(button, spTreeDropMode(event, button));
      event.dataTransfer.dropEffect = "move";
    });

    button.addEventListener("dragleave", () => {
      spSetTreeDropIndicator(button, "");
    });

    button.addEventListener("drop", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const mode = spTreeDropMode(event, button);
      spSetTreeDropIndicator(button, "");

      const dropId = button.dataset.spSelect;

      const paletteIndex = getPaletteDragIndex(event.dataTransfer);
      if (paletteIndex >= 0) {
        if (paletteIndex === tablePaletteIndex) {
          showTableWizard({ paletteIndex, targetId: dropId, dropMode: "inside" });
          return;
        }
        if (paletteIndex === gridPaletteIndex) {
          showLayoutGridWizard({ targetId: dropId, dropMode: "inside" });
          return;
        }
        vscode.postMessage({
          type: "dropPaletteComponent",
          index: paletteIndex,
          targetId: dropId,
          mode: "inside",
        });
        return;
      }

      const dragId =
        event.dataTransfer.getData("application/quasar-tree-id") ||
        event.dataTransfer.getData("text/plain");
      if (!dragId || !dropId || dragId === dropId) return;

      vscode.postMessage({
        type: "moveComponent",
        dragId,
        dropId,
        mode,
      });
    });
  });
}

function spTreeDropMode(event, row) {
  const rect = row.getBoundingClientRect();
  const offset = event.clientY - rect.top;
  if (offset < rect.height * 0.25) return "before";
  if (offset > rect.height * 0.75) return "after";
  return "inside";
}

function spSetTreeDropIndicator(row, mode) {
  row.classList.toggle("drag-over", mode === "inside");
  row.classList.toggle("drag-over-before", mode === "before");
  row.classList.toggle("drag-over-after", mode === "after");
}

function spSelectFromTree(id) {
  spTreePendingLocalSelection = id || "";
  vscode.postMessage({ type: "select", id: spTreePendingLocalSelection });
}

function spExpandSelectedTreeAncestors() {
  const path = findComponentPath(model?.components || [], selectedId);
  path.slice(0, -1).forEach((component) => {
    if (component?.id) spTreeCollapsedIds.delete(component.id);
  });
}

function spRevealSelectedTreeRow() {
  const treeBody = document.getElementById("screen-right-page-tree");
  if (!treeBody || treeBody.classList.contains("hidden")) return;
  const selectedRow = [...treeBody.querySelectorAll("[data-sp-select]")].find(
    (rowElement) => rowElement.dataset.spSelect === selectedId,
  );
  selectedRow?.scrollIntoView({ block: "nearest", inline: "nearest" });
}

// ---- Properties ----

function spPropertiesSectionHtml() {
  if (!model) return '<div class="empty">No model loaded.</div>';

  const component = findComponent(model.components || [], selectedId);
  if (!component) return '<div class="empty">Select a component.</div>';

  const props = component.props || {};
  const models = component.models || {};
  const componentStyle = component.style || props.style || "";

  const body =
    component.type === "Table"
      ? spTablePropertiesHtml(component)
      : spField("ID", "id", component.id || "") +
        spField("Type", "type", component.type || "") +
        spField("Tag", "tag", component.tag || "") +
        spField(
          "Label/Text",
          "text",
          component.text || component.label || props.label || "",
        ) +
        (component.type === "HtmlElement" && component.text !== undefined
          ? spCheckField("필수(*)", "requiredMark", spHasRequiredMark(component))
          : "") +
        spField("Value", "model.modelValue", models.modelValue || "") +
        spFieldWithButton(
          "Class",
          "class",
          component.class || component.props?.class || "",
          "...",
        ) +
        spField("Style", "style", componentStyle) +
        spField("Width", "style.width", spGetStyleDeclaration(componentStyle, "width")) +
        spField("Height", "style.height", spGetStyleDeclaration(componentStyle, "height")) +
        spField("Color", "prop.color", props.color || "") +
        spField("Label Prop", "prop.label", props.label || "") +
        spField("Placeholder", "prop.placeholder", props.placeholder || "") +
        (component.type === "Button"
          ? spField(
              "최소 넓이",
              "style.min-width",
              spGetStyleDeclaration(componentStyle, "min-width"),
            ) +
            spField(
              "최소 높이",
              "style.min-height",
              spGetStyleDeclaration(componentStyle, "min-height"),
            ) +
            spSelectFieldLabeled(
              "버튼 스타일",
              "buttonStyle",
              spGetButtonStyle(props),
              [
                ["", "기본(입체)"],
                ["unelevated", "Unelevated(평면)"],
                ["flat", "Flat(투명)"],
                ["outline", "Outline(테두리)"],
                ["push", "Push(눌림)"],
                ["glossy", "Glossy(광택)"],
                ["rounded", "Rounded(둥근 모서리)"],
                ["round", "Round(원형)"],
              ],
            ) +
            spSelectFieldLabeled(
              "가로 정렬",
              "buttonPosition.h",
              spGetButtonPosition(componentStyle, "h"),
              [
                ["", "기본"],
                ["left", "왼쪽"],
                ["center", "가운데"],
                ["right", "오른쪽"],
              ],
            ) +
            spSelectFieldLabeled(
              "세로 정렬",
              "buttonPosition.v",
              spGetButtonPosition(componentStyle, "v"),
              [
                ["", "기본"],
                ["top", "위"],
                ["middle", "중간"],
                ["bottom", "아래"],
              ],
            )
          : "");

  return '<div id="sp-properties-body" class="view-body">' + body + "</div>";
}

function spTablePropertiesHtml(component) {
  const props = component.props || {};
  const table = component.table || {};
  const toolbar = table.toolbar || {};
  const pagination = table.pagination || {};
  const dynamicProps = component.dynamicProps || {};
  const models = component.models || {};
  const columns = component.columns || [];
  const componentStyle = component.style || props.style || "";
  return spPropertySection(
    "Basic",
    spField("id", "id", component.id || "") +
      spField("title", "table.title", table.title || component.label || "") +
      spField("row-key", "table.rowKey", table.rowKey || props.rowKey || "id") +
      spSelectField("header rows", "table.headerRows", String(table.headerRows || 1), ["1", "2", "3"]) +
      spSelectField("row rows", "table.rowRows", String(table.rowRows || 1), ["1", "2", "3"]) +
      spFieldWithButton("Class", "class", component.class || props.class || "", "...") +
      spField("Style", "style", componentStyle) +
      spField("Height", "style.height", spGetStyleDeclaration(componentStyle, "height")) +
      spCheckField("mode column", "table.showModeColumn", table.showModeColumn !== false) +
      spCheckField("excel copy", "table.excelCopy", table.excelCopy !== false),
  ) + spPropertySection(
    "Data",
    spField("rows binding", "dynamic.rows", dynamicProps.rows || table.rowsBinding || "") +
      spField("columns binding", "dynamic.columns", dynamicProps.columns || "") +
      spField("loading binding", "dynamic.loading", dynamicProps.loading || table.loadingBinding || "") +
      spField("error binding", "table.errorBinding", table.errorBinding || "") +
      spField("selected binding", "model.selected", models.selected || ""),
  ) + spPropertySectionWithAction(
    "Columns",
    '<div class="table-prop-columns">' +
      columns
        .map(
          (column, index) =>
            "<div><span>" +
            (index + 1) +
            ". " +
            escapeHtml(column.label || column.name) +
            "</span><small>" +
            escapeHtml(column.type || "text") +
            "</small></div>",
        )
        .join("") +
      "</div>",
    '<button type="button" class="table-prop-section-action" data-sp-edit-table-columns title="컬럼 편집" aria-label="컬럼 편집">...</button>',
  ) + spPropertySection(
    "Selection",
    spSelectField("selection", "table.selection", table.selection || "none", ["none", "single", "multiple"]) +
      spField("row-click event", "event.row-click", component.events?.["row-click"] || "") +
      spField("selectedRow binding", "model.selected", models.selected || ""),
  ) + spPropertySection(
    "Toolbar",
    spCheckField("filter", "table.toolbar.filter", toolbar.filter) +
      spCheckField("search button", "table.toolbar.search", toolbar.search) +
      spCheckField("add button", "table.toolbar.add", toolbar.add) +
      spCheckField("save button", "table.toolbar.save", toolbar.save) +
      spCheckField("delete button", "table.toolbar.delete", toolbar.delete) +
      spCheckField("excel button", "table.toolbar.excel", toolbar.excel) +
      spCheckField("refresh button", "table.toolbar.refresh", toolbar.refresh),
  ) + spPropertySection(
    "Pagination",
    spSelectField("mode", "table.pagination.mode", pagination.mode || "client", ["client", "server", "none"]) +
      spField("rowsPerPage", "table.pagination.rowsPerPage", pagination.rowsPerPage ?? 10) +
      spField(
        "rowsPerPageOptions",
        "table.pagination.rowsPerPageOptions",
        (pagination.rowsPerPageOptions || [10, 20, 50, 0]).join(","),
      ),
  );
}

function spPropertySection(title, body) {
  return '<section class="table-prop-section"><h3>' + escapeHtml(title) + "</h3>" + body + "</section>";
}

function spPropertySectionWithAction(title, body, action) {
  return (
    '<section class="table-prop-section"><h3><span>' +
    escapeHtml(title) +
    "</span>" +
    action +
    "</h3>" +
    body +
    "</section>"
  );
}

function spField(label, name, value) {
  return (
    '<label class="prop-field">' +
    '<span class="prop-label">' + escapeHtml(label) + "</span>" +
    '<span class="prop-splitter"></span>' +
    '<input class="prop-input" data-sp-name="' +
    escapeAttr(name) +
    '" value="' +
    escapeAttr(value) +
    '">' +
    "</label>"
  );
}

function spFieldWithButton(label, name, value, buttonLabel) {
  return (
    '<label class="prop-field">' +
    '<span class="prop-label">' + escapeHtml(label) + "</span>" +
    '<span class="prop-splitter"></span>' +
    '<div class="prop-input-wrap">' +
    '<input class="prop-input" data-sp-name="' +
    escapeAttr(name) +
    '" value="' +
    escapeAttr(value) +
    '">' +
    '<button class="prop-button" data-sp-open="' +
    escapeAttr(name) +
    '">' +
    buttonLabel +
    "</button>" +
    "</div>" +
    "</label>"
  );
}

function spCheckField(label, name, checked) {
  return (
    '<label class="prop-field table-prop-check"><span class="prop-label">' +
    escapeHtml(label) +
    '</span><span class="prop-splitter"></span><input type="checkbox" data-sp-name="' +
    escapeAttr(name) +
    '"' +
    (checked ? " checked" : "") +
    "></label>"
  );
}

function spSelectField(label, name, value, options) {
  return (
    '<label class="prop-field"><span class="prop-label">' +
    escapeHtml(label) +
    '</span><span class="prop-splitter"></span><select class="prop-input" data-sp-name="' +
    escapeAttr(name) +
    '">' +
    options
      .map(
        (option) =>
          '<option value="' +
          escapeAttr(option) +
          '"' +
          (String(value) === option ? " selected" : "") +
          ">" +
          escapeHtml(option) +
          "</option>",
      )
      .join("") +
    "</select></label>"
  );
}

function spSelectFieldLabeled(label, name, value, options) {
  return (
    '<label class="prop-field"><span class="prop-label">' +
    escapeHtml(label) +
    '</span><span class="prop-splitter"></span><select class="prop-input" data-sp-name="' +
    escapeAttr(name) +
    '">' +
    options
      .map(
        ([optionValue, optionLabel]) =>
          '<option value="' +
          escapeAttr(optionValue) +
          '"' +
          (String(value) === optionValue ? " selected" : "") +
          ">" +
          escapeHtml(optionLabel) +
          "</option>",
      )
      .join("") +
    "</select></label>"
  );
}

function spGetButtonStyle(props) {
  const styleFlags = [
    "flat",
    "outline",
    "push",
    "glossy",
    "unelevated",
    "rounded",
    "round",
  ];
  return styleFlags.find((key) => props?.[key] === true) || "";
}

function spGetButtonPosition(style, axis) {
  if (axis === "h") {
    const marginLeft = spGetStyleDeclaration(style, "margin-left") === "auto";
    const marginRight = spGetStyleDeclaration(style, "margin-right") === "auto";
    if (marginLeft && marginRight) return "center";
    if (marginLeft) return "right";
    if (marginRight) return "left";
    return "";
  }
  const alignSelf = spGetStyleDeclaration(style, "align-self");
  if (alignSelf === "flex-start") return "top";
  if (alignSelf === "center") return "middle";
  if (alignSelf === "flex-end") return "bottom";
  return "";
}

function spHasRequiredMark(component) {
  return (component?.children || []).some(
    (child) =>
      child?.designer?.role === "requiredMark" ||
      (child?.type === "HtmlElement" &&
        (child.tag || "div") === "span" &&
        String(child.text || "").trim() === "*" &&
        String(child.class || "").includes("text-negative")),
  );
}

function spGetStyleDeclaration(style, property) {
  const propertyName = String(property || "").trim().toLowerCase();
  const declaration = String(style || "")
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .find((item) => {
      const separator = item.indexOf(":");
      return (
        separator >= 0 &&
        item.slice(0, separator).trim().toLowerCase() === propertyName
      );
    });

  if (!declaration) return "";
  return declaration.slice(declaration.indexOf(":") + 1).trim();
}

function spSetupPropertiesSection(panel) {
  const body = panel.querySelector("#sp-properties-body");
  if (!body) return;

  spAttachLabelSplitter(body);

  body.querySelectorAll("[data-sp-name]").forEach((input) => {
    input.addEventListener("change", () => {
      vscode.postMessage({
        type: "updateProperty",
        name: input.dataset.spName,
        value: input.type === "checkbox" ? input.checked : input.value,
      });
    });
  });

  body
    .querySelector("[data-sp-edit-table-columns]")
    ?.addEventListener("click", () => {
      showTableColumnsDialog(selectedId);
    });

  body.querySelectorAll("[data-sp-open]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      const component = findComponent(model?.components || [], selectedId);
      const currentClassValue =
        component?.class || component?.props?.class || "";
      spOpenClassPopup(button.dataset.spOpen, currentClassValue);
    });
  });
}

function spAttachLabelSplitter(body) {
  body.querySelectorAll(".prop-splitter").forEach((splitter) => {
    splitter.onmousedown = (event) => {
      event.preventDefault();
      const currentWidth =
        Number(
          getComputedStyle(body).getPropertyValue("--label-width").replace("px", ""),
        ) || 90;
      const startX = event.clientX;

      function move(e) {
        const width = Math.max(60, Math.min(220, currentWidth + (e.clientX - startX)));
        body.style.setProperty("--label-width", width + "px");
      }

      function up() {
        document.removeEventListener("mousemove", move);
        document.removeEventListener("mouseup", up);
      }

      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", up);
    };
  });
}

function spOpenClassPopup(name, value) {
  let popup = document.getElementById("sp-class-popup");
  if (!popup) {
    popup = document.createElement("div");
    popup.id = "sp-class-popup";
    popup.className = "designer-dialog-backdrop hidden";
    document.body.appendChild(popup);
  }

  const currentClasses = String(value || "").split(/\s+/).filter(Boolean);
  const component = findComponent(model?.components || [], selectedId);
  const classGroups = spClassGroupsByComponent(component);

  popup.innerHTML =
    '<div class="designer-dialog class-selector-dialog" role="dialog" aria-modal="true" aria-labelledby="sp-class-selector-title">' +
    '<div class="designer-dialog-header">' +
    '<strong id="sp-class-selector-title">Class 선택</strong>' +
    '<button class="designer-dialog-close" data-sp-class-cancel title="닫기" aria-label="닫기">×</button>' +
    "</div>" +
    '<div class="designer-dialog-body class-selector-body">' +
    '<div class="class-popup-list">' +
    classGroups
      .map(
        (group) =>
          '<div class="class-group">' +
          '<div class="class-group-title">' +
          escapeHtml(group.title) +
          "</div>" +
          '<div class="class-group-items">' +
          group.items
            .map((cls) => {
              const checked = spIsClassSelected(cls, currentClasses)
                ? " checked"
                : " ";
              return (
                '<label class="class-option">' +
                '<input type="checkbox" value="' +
                escapeAttr(cls) +
                '"' +
                checked +
                "><span>" +
                escapeHtml(cls) +
                "</span></label>"
              );
            })
            .join("") +
          "</div></div>",
      )
      .join("") +
    "</div></div>" +
    '<div class="designer-dialog-actions class-selector-actions">' +
    '<button class="class-popup-clear" data-sp-class-clear>전체해제</button>' +
    '<button class="primary" data-sp-class-apply>적용</button>' +
    "<button data-sp-class-cancel>취소</button>" +
    "</div></div>";

  popup.classList.remove("hidden");

  popup.querySelector("[data-sp-class-clear]").onclick = () => {
    popup.querySelectorAll('input[type="checkbox"]').forEach((item) => {
      item.checked = false;
    });
  };

  popup.querySelectorAll("[data-sp-class-cancel]").forEach((button) => {
    button.onclick = spCloseClassPopup;
  });
  popup.onclick = (event) => {
    if (event.target === popup) spCloseClassPopup();
  };

  popup.querySelector("[data-sp-class-apply]").onclick = () => {
    const selected = Array.from(
      popup.querySelectorAll('input[type="checkbox"]:checked'),
    ).map((input) => input.value);

    vscode.postMessage({
      type: "updateProperty",
      name,
      value: selected.join(" "),
    });

    spCloseClassPopup();
  };
}

function spCloseClassPopup() {
  document.getElementById("sp-class-popup")?.classList.add("hidden");
}

function spIsClassSelected(cls, currentClasses) {
  return cls.split(/\s+/).every((item) => currentClasses.includes(item));
}

function spClassGroupsByComponent(component) {
  if (!component) return spHtmlElementClassGroups();
  if (component.type === "Button") return spButtonClassGroups();
  if (["Input", "Checkbox", "Radio", "Select", "Toggle"].includes(component.type)) {
    return spInputClassGroups();
  }
  if (component.type === "Card") return spCardClassGroups();
  if (component.type === "CardSection") return spCardSectionClassGroups();
  if (component.type === "Table") return spTableClassGroups();
  if (component.type === "Page") return spPageClassGroups();
  return spHtmlElementClassGroups();
}

function spCommonSpacingGroups() {
  return [
    {
      title: "Padding",
      items: [
        "q-pa-none", "q-pa-xs", "q-pa-sm", "q-pa-md", "q-pa-lg", "q-pa-xl",
        "q-px-sm", "q-px-md", "q-py-sm", "q-py-md",
        "q-pt-md", "q-pr-md", "q-pb-md", "q-pl-md",
      ],
    },
    {
      title: "Margin",
      items: [
        "q-ma-none", "q-ma-xs", "q-ma-sm", "q-ma-md", "q-ma-lg", "q-ma-xl",
        "q-mx-md", "q-my-md",
        "q-mt-sm", "q-mt-md", "q-mt-lg",
        "q-mb-sm", "q-mb-md", "q-mb-lg",
        "q-ml-md", "q-mr-md",
      ],
    },
  ];
}

function spCommonTextGroups() {
  return [
    {
      title: "Text",
      items: [
        "text-left", "text-center", "text-right", "text-justify",
        "text-bold", "text-weight-medium",
        "text-caption", "text-body1", "text-body2",
        "text-h6", "text-h5", "text-h4",
        "ellipsis", "no-wrap",
      ],
    },
    {
      title: "Text Color",
      items: [
        "text-primary", "text-secondary", "text-positive", "text-negative",
        "text-warning", "text-info", "text-white", "text-black",
        "text-grey", "text-grey-7",
      ],
    },
  ];
}

function spCommonBackgroundGroups() {
  return [
    {
      title: "Background",
      items: [
        "bg-white", "bg-grey-1", "bg-grey-2", "bg-grey-3",
        "bg-primary", "bg-secondary", "bg-positive", "bg-negative",
        "bg-warning", "bg-info",
      ],
    },
  ];
}

function spCommonSizeGroups() {
  return [
    {
      title: "Size",
      items: [
        "full-width", "full-height", "fit", "window-width", "window-height",
        "col", "col-auto",
        "col-1", "col-2", "col-3", "col-4", "col-5", "col-6",
        "col-7", "col-8", "col-9", "col-10", "col-11", "col-12",
      ],
    },
  ];
}

function spHtmlElementClassGroups() {
  return [
    {
      title: "Display",
      items: [
        "row", "column", "flex", "inline", "block",
        "items-start", "items-center", "items-end", "items-baseline", "items-stretch",
        "justify-start", "justify-center", "justify-end",
        "justify-between", "justify-around", "justify-evenly",
        "items-center justify-center", "items-center justify-between", "items-center justify-around",
        "wrap", "no-wrap", "reverse-wrap",
      ],
    },
    {
      title: "Position",
      items: [
        "relative-position", "absolute", "fixed",
        "fixed-top", "fixed-right", "fixed-bottom", "fixed-left",
        "fullscreen",
        "absolute-top", "absolute-right", "absolute-bottom", "absolute-left", "absolute-center",
      ],
    },
    ...spCommonSizeGroups(),
    ...spCommonSpacingGroups(),
    ...spCommonTextGroups(),
    ...spCommonBackgroundGroups(),
    {
      title: "Border / Shadow",
      items: [
        "rounded", "rounded-borders", "bordered", "no-border",
        "shadow-1", "shadow-2", "shadow-4", "shadow-8",
      ],
    },
    {
      title: "Visibility",
      items: ["hidden", "invisible", "overflow-hidden", "scroll", "no-scroll"],
    },
    {
      title: "Cursor",
      items: ["cursor-pointer", "cursor-not-allowed", "cursor-inherit"],
    },
  ];
}

function spButtonClassGroups() {
  return [
    {
      title: "Button Layout",
      items: ["full-width", "q-mt-sm", "q-mt-md", "q-mb-sm", "q-mb-md", "q-ml-sm", "q-mr-sm"],
    },
    {
      title: "Button Shape",
      items: ["rounded-borders", "no-border", "shadow-1", "shadow-2", "shadow-4"],
    },
    {
      title: "Align",
      items: ["self-start", "self-center", "self-end"],
    },
    ...spCommonSpacingGroups(),
    ...spCommonTextGroups(),
    ...spCommonBackgroundGroups(),
  ];
}

function spInputClassGroups() {
  return [
    {
      title: "Input Layout",
      items: ["full-width", "q-mt-sm", "q-mt-md", "q-mb-sm", "q-mb-md"],
    },
    {
      title: "Input Size",
      items: ["col", "col-3", "col-4", "col-6", "col-12"],
    },
    ...spCommonSpacingGroups(),
    ...spCommonBackgroundGroups(),
  ];
}

function spCardClassGroups() {
  return [
    {
      title: "Card Layout",
      items: ["full-width", "fit", "q-mt-md", "q-mb-md"],
    },
    {
      title: "Card Style",
      items: [
        "rounded-borders", "no-border",
        "shadow-1", "shadow-2", "shadow-4", "shadow-8",
        "bg-white", "bg-grey-1", "bg-grey-2",
      ],
    },
    ...spCommonSpacingGroups(),
  ];
}

function spCardSectionClassGroups() {
  return [
    {
      title: "Section Layout",
      items: [
        "row", "column", "items-center", "justify-between",
        "items-center justify-between",
        "q-pa-sm", "q-pa-md", "q-pa-lg",
      ],
    },
    ...spCommonTextGroups(),
    ...spCommonBackgroundGroups(),
  ];
}

function spTableClassGroups() {
  return [
    {
      title: "Table Layout",
      items: ["full-width", "q-mt-md", "q-mb-md"],
    },
    {
      title: "Table Container",
      items: ["rounded-borders", "shadow-1", "shadow-2", "bg-white"],
    },
  ];
}

function spPageClassGroups() {
  return [
    {
      title: "Page Layout",
      items: [
        "q-pa-none", "q-pa-sm", "q-pa-md", "q-pa-lg",
        "bg-white", "bg-grey-1", "bg-grey-2",
        "column", "row",
      ],
    },
    ...spCommonBackgroundGroups(),
    ...spCommonSpacingGroups(),
  ];
}

// ---- Events ----

function spEventsSectionHtml() {
  if (!model) return '<div class="empty">No model loaded.</div>';

  const component = findComponent(model?.components || [], selectedId);
  if (!component) return '<div class="empty">Select a component.</div>';

  const events = component.events || {};
  const eventList = [
    ...new Set([...Object.keys(events), ...spEventsByComponent(component)]),
  ];

  return (
    '<div class="view-body">' +
    '<div class="event-section">' +
    '<div class="event-section-title">' +
    escapeHtml(component.type || "") +
    " Events</div>" +
    eventList
      .map((eventName) => spEventFieldHtml(eventName, events[eventName] || ""))
      .join("") +
    "</div></div>"
  );
}

function spEventFieldHtml(eventName, value) {
  return (
    '<div class="event-field">' +
    '<span class="event-label">@' + escapeHtml(eventName) + "</span>" +
    '<div class="event-input-wrap">' +
    '<input class="event-input" data-sp-event-name="' +
    escapeAttr(eventName) +
    '" value="' +
    escapeAttr(value) +
    '" placeholder="handler name">' +
    '<button class="event-method-button" data-sp-open-event="' +
    escapeAttr(eventName) +
    '" title="Create or open event method">...</button>' +
    "</div></div>"
  );
}

function spEventsByComponent(component) {
  if (!component) return [];

  if (component.type === "Button") {
    return ["click", "dblclick", "mouseover", "mouseleave", "focus", "blur"];
  }
  if (component.type === "Input") {
    return ["update:model-value", "change", "input", "focus", "blur", "clear"];
  }
  if (component.type === "Select") {
    return ["update:model-value", "filter", "input-value", "popup-show", "popup-hide", "focus", "blur", "clear"];
  }
  if (["Toggle", "Checkbox", "Radio"].includes(component.type)) {
    return ["update:model-value", "click", "focus", "blur"];
  }
  if (component.type === "Table") {
    return ["row-click", "row-dblclick", "selection", "request", "update:pagination"];
  }
  if (component.type === "Card" || component.type === "CardSection") {
    return ["click", "dblclick", "mouseover", "mouseleave"];
  }
  if (component.type === "Form") {
    return ["submit", "reset", "validation-success", "validation-error"];
  }
  if (component.type === "HtmlElement") {
    return ["click", "dblclick", "mouseover", "mouseleave", "mouseenter", "keydown", "keyup"];
  }
  return ["click", "dblclick", "focus", "blur"];
}

function spSetupEventsSection(panel) {
  panel.querySelectorAll("[data-sp-event-name]").forEach((input) => {
    input.addEventListener("change", () => {
      vscode.postMessage({
        type: "updateEvent",
        eventName: input.dataset.spEventName,
        value: input.value,
        openScriptTab: true,
      });
    });
  });

  panel.querySelectorAll("[data-sp-open-event]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = panel.querySelector(
        '[data-sp-event-name="' + button.dataset.spOpenEvent + '"]',
      );
      vscode.postMessage({
        type: "openEventMethod",
        eventName: button.dataset.spOpenEvent,
        value: input?.value || "",
      });
    });
  });
}

// ---- DataSet ----

function spDatasetSectionHtml() {
  if (!model) return '<div class="empty">Open a page JSON file.</div>';

  const dataset = model?.datasets?.[0] || { name: "defaultDataset", fields: [] };
  return (
    '<button class="primary" data-sp-add-field>Add Field</button>' +
    dataset.fields
      .map((field, index) => spDatasetFieldRowHtml(field, index))
      .join("")
  );
}

function spDatasetFieldRowHtml(field, index) {
  return (
    '<div class="dataset-row">' +
    '<input data-sp-field="name" data-sp-index="' + index + '" value="' + escapeAttr(field.name || "") + '">' +
    '<input data-sp-field="label" data-sp-index="' + index + '" value="' + escapeAttr(field.label || "") + '">' +
    '<select data-sp-field="type" data-sp-index="' + index + '">' +
    ["string", "number", "boolean", "date", "object"]
      .map(
        (type) =>
          '<option value="' + type + '"' + (field.type === type ? " selected" : "") + ">" + type + "</option>",
      )
      .join("") +
    "</select>" +
    '<label class="check"><input type="checkbox" data-sp-field="required" data-sp-index="' +
    index +
    '"' +
    (field.required ? " checked" : "") +
    "> required</label>" +
    '<button class="danger" data-sp-remove-field="' + index + '">Delete</button>' +
    "</div>"
  );
}

function spSetupDatasetSection(panel) {
  panel
    .querySelector("[data-sp-add-field]")
    ?.addEventListener("click", () => vscode.postMessage({ type: "addField" }));

  panel.querySelectorAll("[data-sp-field]").forEach((input) => {
    input.addEventListener("change", () =>
      vscode.postMessage({
        type: "updateField",
        index: Number(input.dataset.spIndex),
        name: input.dataset.spField,
        value: input.type === "checkbox" ? input.checked : input.value,
      }),
    );
  });

  panel.querySelectorAll("[data-sp-remove-field]").forEach((button) => {
    button.addEventListener("click", () =>
      vscode.postMessage({
        type: "removeField",
        index: Number(button.dataset.spRemoveField),
      }),
    );
  });
}

function getPaletteIcon(type, label) {
  if (type === "Page") return "▧";
  if (type === "FormTemplate") return "F";
  if (type === "Button") return "🔘";
  if (type === "Input") return "⌨️";
  if (type === "Checkbox") return "☑";
  if (type === "Radio") return "◉";
  if (type === "Toggle") return "⏼";
  if (type === "Select") return "▼";
  if (type === "HtmlElement" && label === "Label") return "L";
  if (type === "Card") return "▢";
  if (type === "CardSection") return "▤";
  if (type === "Form") return "📋";
  if (type === "GridTemplate") return "⊞";
  if (type === "Table") return "▦";

  if (type === "HtmlElement" && label === "Text") return "T";
  if (type === "HtmlElement" && label === "Row") return "↔";
  if (type === "HtmlElement" && label === "Column") return "↕";

  return "▣";
}

function getScreenSidePanelsStyles() {
  return `.screen-editor-workspace { grid-template-columns: var(--sp-panel-width, 280px) 5px minmax(0, 1fr) 5px var(--store-state-width, 300px); grid-template-rows: minmax(0, 1fr); height: 100%; min-height: 0; }
.screen-side-panels { min-width: 0; min-height: 0; overflow-y: auto; overflow-x: hidden; border-right: 1px solid var(--vscode-panel-border); color: var(--vscode-editor-foreground); background: var(--vscode-sideBar-background); }
.screen-editor-canvas { min-height: 0; }
.screen-side-panels-resizer { cursor: col-resize; touch-action: none; background: transparent; border-right: 1px solid var(--vscode-panel-border); }
.screen-side-panels-resizer:hover, .screen-side-panels-resizer.active { background: var(--vscode-focusBorder); border-color: var(--vscode-focusBorder); }
body.sp-panel-resizing, body.sp-panel-resizing * { cursor: col-resize !important; user-select: none !important; }
.sp-section { border-bottom: 1px solid var(--vscode-panel-border); }
.sp-section > summary { display: flex; min-height: 30px; padding: 4px 8px; gap: 7px; align-items: center; border-left: 3px solid var(--vscode-focusBorder); background: var(--vscode-sideBarSectionHeader-background, var(--vscode-sideBar-background)); font-size: 11px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; list-style: none; cursor: pointer; user-select: none; }
.sp-section > summary::-webkit-details-marker { display: none; }
.sp-section > summary::before { content: ""; flex: 0 0 7px; width: 7px; height: 7px; margin-left: 2px; border-right: 1.5px solid var(--vscode-icon-foreground); border-bottom: 1.5px solid var(--vscode-icon-foreground); transform: translateY(-2px) rotate(45deg); }
.sp-section:not([open]) > summary::before { transform: translateX(-1px) rotate(-45deg); }
.sp-section-body { min-width: 0; }
.sp-section-body .view-body { --label-width: 90px; padding: 8px; }
.sp-section-body .palette-grid { grid-template-columns: repeat(auto-fill, minmax(44px, 1fr)); gap: 4px; padding: 6px; }
.sp-section-body .palette-item { min-height: 37px; padding: 3px 2px; gap: 3px; border-radius: 4px; }
.sp-section-body .palette-icon { font-size: 9px; line-height: 10px; margin-bottom: 0; }
.sp-section-body .palette-label { font-size: 9px; line-height: 10px; }
.sp-section-body .tree-root { padding: 4px 6px; }
.sp-section-body .empty { padding: 10px; color: var(--vscode-descriptionForeground); }
.sp-section-body .primary { margin: 8px; }
.sp-section-body .prop-field { margin-bottom: 2px; border-radius: 3px; }
.sp-section-body .prop-label { min-height: 21px; padding: 0 6px; font-size: 11px; }
.sp-section-body .prop-input { min-height: 21px; padding: 1px 6px; font-size: 12px; }
.sp-section-body select.prop-input { padding: 0 2px; }
.sp-section-body .prop-button { width: 26px; min-width: 26px; min-height: 21px; }
.sp-section-body .table-prop-section { margin: 0 0 6px; padding: 0 0 6px; }
.sp-section-body .table-prop-section h3 { min-height: 22px; margin: 0 0 3px; padding: 2px 4px 2px 7px; }
.sp-section-body #sp-properties-body.view-body { padding: 6px; }
.screen-right-panel { display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
.screen-right-tabs { display: flex; flex: 0 0 auto; border-bottom: 1px solid var(--vscode-panel-border); background: var(--vscode-sideBar-background); }
.screen-right-tab { flex: 1; min-height: 30px; padding: 4px 8px; border: 0; border-bottom: 2px solid transparent; color: var(--vscode-descriptionForeground); background: transparent; font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
.screen-right-tab:hover { background: var(--vscode-toolbar-hoverBackground); }
.screen-right-tab.active { color: var(--vscode-editor-foreground); border-bottom-color: var(--vscode-focusBorder); background: var(--vscode-sideBarSectionHeader-background, var(--vscode-sideBar-background)); }
.screen-right-tab-body { flex: 1; min-height: 0; overflow: auto; }
.screen-right-panel .screen-store-state-title { display: none; }
.screen-right-page-tree .tree-root { padding: 4px 6px; }
.screen-right-page-tree .empty { padding: 10px; color: var(--vscode-descriptionForeground); }
.tree-row.drag-over-before { box-shadow: inset 0 3px 0 0 var(--vscode-focusBorder); background: var(--vscode-list-hoverBackground); }
.tree-row.drag-over-after { box-shadow: inset 0 -3px 0 0 var(--vscode-focusBorder); background: var(--vscode-list-hoverBackground); }
.class-selector-dialog { width: min(760px, calc(100vw - 32px)); max-height: min(720px, calc(100vh - 32px)); display: flex; flex-direction: column; }
.class-selector-body { min-height: 0; padding: 0; overflow: hidden; }
.class-popup-list { flex: 1; overflow: auto; padding: 12px; display: flex; flex-wrap: wrap; align-items: flex-start; gap: 12px; }
.class-group { width: calc(50% - 6px); border: 1px solid var(--vscode-panel-border); border-radius: 6px; overflow: visible; align-self: flex-start; background: var(--vscode-editor-background); }
.class-group-title { padding: 8px; font-weight: 700; font-size: 12px; background: var(--vscode-sideBar-background); border-bottom: 1px solid var(--vscode-panel-border); }
.class-group-items { padding: 4px; display: flex; flex-direction: column; gap: 4px; }
.class-option { min-height: 24px; padding: 8px; display: flex; align-items: center; gap: 8px; border: 1px solid var(--vscode-panel-border); border-radius: 4px; background: var(--vscode-input-background); }
.class-option:hover { border-color: var(--vscode-focusBorder); }
.class-option input { width: auto; min-height: auto; accent-color: var(--vscode-checkbox-background, #007acc); }
.class-selector-actions .class-popup-clear { margin-right: auto; color: var(--vscode-descriptionForeground); background: var(--vscode-editorWidget-background); border: 1px solid var(--vscode-panel-border); }
.class-popup-clear:hover { background: var(--vscode-list-hoverBackground); border-color: var(--vscode-focusBorder); }
.table-prop-section { margin: 0 0 8px; padding: 0 0 8px; border-bottom: 1px solid var(--vscode-panel-border); }
.table-prop-section h3 { min-height: 28px; margin: 0 0 5px; padding: 3px 5px 3px 8px; display: flex; align-items: center; justify-content: space-between; gap: 8px; border-left: 3px solid var(--vscode-focusBorder); font-size: 12px; background: var(--vscode-sideBarSectionHeader-background); }
.table-prop-section-action { width: 26px; min-width: 26px; min-height: 22px; padding: 0; border: 1px solid transparent; color: var(--vscode-icon-foreground); background: transparent; font-weight: 700; }
.table-prop-section-action:hover { border-color: var(--vscode-focusBorder); background: var(--vscode-toolbar-hoverBackground); }
.table-prop-check input[type="checkbox"] { width: auto; justify-self: start; }
.table-prop-columns { max-height: 150px; margin-bottom: 6px; overflow: auto; border: 1px solid var(--vscode-panel-border); }
.table-prop-columns > div { display: flex; justify-content: space-between; gap: 8px; padding: 5px 7px; border-bottom: 1px solid var(--vscode-panel-border); }
.table-prop-columns small { color: var(--vscode-descriptionForeground); }
@media (max-width: 900px) { .screen-editor-workspace { grid-template-columns: 1fr; grid-template-rows: none; height: auto; } .screen-side-panels { max-height: 320px; border-right: 0; border-bottom: 1px solid var(--vscode-panel-border); } .screen-side-panels-resizer { display: none; } .screen-right-panel { max-height: 320px; } }`;
}

module.exports = {
  getScreenSidePanelsScript,
  getScreenSidePanelsStyles,
};
