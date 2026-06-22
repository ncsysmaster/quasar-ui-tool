function setupStoreStateTableResize(content) {
  const table = content.querySelector(".store-state-table");
  if (!table) return;
  const defaultRatios = [1.2, 0.8, 1, 1.2];
  const minimumWidths = [90, 72, 90, 110];
  const deleteWidth = 44;
  const availableWidth = Math.max(
    minimumWidths.reduce((sum, width) => sum + width, 0),
    (table.clientWidth || 620) - deleteWidth,
  );
  const savedRatios = vscode.getState()?.storeStateColumnRatios;
  let ratios =
    Array.isArray(savedRatios) &&
    savedRatios.length === 4 &&
    savedRatios.every((value) => Number.isFinite(value) && value > 0)
      ? savedRatios
      : defaultRatios;
  const ratioTotal = ratios.reduce((sum, value) => sum + value, 0);
  let widths = ratios.map((ratio) => (availableWidth * ratio) / ratioTotal);

  const applyWidths = () => {
    const total = widths.reduce((sum, width) => sum + width, 0);
    table.style.setProperty(
      "--store-state-column-widths",
      widths
        .map(
          (width, index) =>
            "minmax(" +
            minimumWidths[index] +
            "px, " +
            width / total +
            "fr)",
        )
        .join(" ") +
        " " +
        deleteWidth +
        "px",
    );
  };
  const syncWidthsFromLayout = () => {
    const cells = [
      ...table.querySelectorAll(".store-state-table-head > span"),
    ].slice(0, 4);
    const measuredWidths = cells.map(
      (cell) => cell.getBoundingClientRect().width,
    );
    if (
      measuredWidths.length === 4 &&
      measuredWidths.every((width) => Number.isFinite(width) && width > 0)
    )
      widths = measuredWidths;
  };
  const saveWidths = () => {
    const total = widths.reduce((sum, width) => sum + width, 0);
    vscode.setState({
      ...(vscode.getState() || {}),
      storeStateColumnRatios: widths.map((width) => width / total),
    });
  };
  const resizePair = (index, delta) => {
    const left = widths[index];
    const right = widths[index + 1];
    const nextLeft = Math.max(
      minimumWidths[index],
      Math.min(left + right - minimumWidths[index + 1], left + delta),
    );
    widths[index] = nextLeft;
    widths[index + 1] = left + right - nextLeft;
    applyWidths();
  };

  applyWidths();
  content.querySelectorAll("[data-state-column-resize]").forEach((handle) => {
    const index = Number(handle.dataset.stateColumnResize);
    handle.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      syncWidthsFromLayout();
      const startX = event.clientX;
      const startWidths = [...widths];
      handle.setPointerCapture(event.pointerId);
      document.body.classList.add("store-column-resizing");
      const move = (moveEvent) => {
        widths = [...startWidths];
        resizePair(index, moveEvent.clientX - startX);
      };
      const stop = () => {
        handle.removeEventListener("pointermove", move);
        handle.removeEventListener("pointerup", stop);
        handle.removeEventListener("pointercancel", stop);
        document.body.classList.remove("store-column-resizing");
        saveWidths();
      };
      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", stop);
      handle.addEventListener("pointercancel", stop);
    });
    handle.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      syncWidthsFromLayout();
      resizePair(index, event.key === "ArrowLeft" ? -10 : 10);
      saveWidths();
    });
    handle.addEventListener("dblclick", (event) => {
      event.preventDefault();
      widths = [...defaultRatios];
      applyWidths();
      saveWidths();
    });
  });
}

function setupStorePanelSplitter(content) {
  const layout = content.querySelector(".store-editor-layout");
  const splitter = content.querySelector(".store-panel-splitter");
  if (!layout || !splitter) return;

  const savedWidth = Number(vscode.getState()?.storeSidebarWidth);
  if (Number.isFinite(savedWidth) && savedWidth > 0) {
    setStoreSidebarWidth(layout, splitter, savedWidth);
  }

  const updateWidth = (clientX) => {
    const bounds = layout.getBoundingClientRect();
    setStoreSidebarWidth(layout, splitter, clientX - bounds.left);
  };

  splitter.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    splitter.setPointerCapture(event.pointerId);
    document.body.classList.add("store-panel-resizing");
    updateWidth(event.clientX);

    const move = (moveEvent) => updateWidth(moveEvent.clientX);
    const stop = () => {
      splitter.removeEventListener("pointermove", move);
      splitter.removeEventListener("pointerup", stop);
      splitter.removeEventListener("pointercancel", stop);
      document.body.classList.remove("store-panel-resizing");
      const width = Number.parseFloat(
        layout.style.getPropertyValue("--store-sidebar-width"),
      );
      vscode.setState({
        ...(vscode.getState() || {}),
        storeSidebarWidth: width,
      });
    };
    splitter.addEventListener("pointermove", move);
    splitter.addEventListener("pointerup", stop);
    splitter.addEventListener("pointercancel", stop);
  });

  splitter.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const current =
      Number.parseFloat(
        layout.style.getPropertyValue("--store-sidebar-width"),
      ) || layout.clientWidth * 0.42;
    const requested = current + (event.key === "ArrowLeft" ? -20 : 20);
    const width = setStoreSidebarWidth(layout, splitter, requested);
    vscode.setState({
      ...(vscode.getState() || {}),
      storeSidebarWidth: width,
    });
  });

  splitter.addEventListener("dblclick", () => {
    const width = setStoreSidebarWidth(
      layout,
      splitter,
      layout.clientWidth * 0.42,
    );
    vscode.setState({
      ...(vscode.getState() || {}),
      storeSidebarWidth: width,
    });
  });
}

function setStoreSidebarWidth(layout, splitter, requestedWidth) {
  const splitterWidth = splitter.getBoundingClientRect().width || 7;
  const minimumLeft = Math.min(300, layout.clientWidth * 0.45);
  const minimumRight = Math.min(420, layout.clientWidth * 0.5);
  const maximumLeft = Math.max(
    minimumLeft,
    layout.clientWidth - minimumRight - splitterWidth,
  );
  const width = Math.max(
    minimumLeft,
    Math.min(maximumLeft, requestedWidth),
  );
  layout.style.setProperty("--store-sidebar-width", width + "px");
  splitter.setAttribute("aria-valuenow", String(Math.round(width)));
  splitter.setAttribute("aria-valuemin", String(Math.round(minimumLeft)));
  splitter.setAttribute("aria-valuemax", String(Math.round(maximumLeft)));
  return width;
}

const storeLayoutFunctions = [
  setupStoreStateTableResize,
  setupStorePanelSplitter,
  setStoreSidebarWidth,
];

module.exports = { storeLayoutFunctions };
