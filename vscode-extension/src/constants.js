const EDITOR_VIEW_TYPE = "quasarTool.pageEditor";

const VIEW_IDS = {
  palette: "quasarTool.paletteView",
  properties: "quasarTool.propertiesView",
  events: "quasarTool.eventsView",
  pageTree: "quasarTool.pageTreeView",
  dataset: "quasarTool.datasetView",
};

const PALETTE = [
  {
    type: "Page",
    label: "Page",
    props: { padding: true },
  },
  {
    type: "FormTemplate",
    label: "Form Search",
    template: "courseSearchForm",
  },
  {
    type: "Button",
    label: "Button",
    props: { color: "primary", unelevated: true },
  },
  {
    type: "Input",
    label: "Input",
    props: { outlined: true, dense: true, label: "Input" },
  },
  { type: "Card", label: "Card", props: { flat: true, bordered: true } },
  { type: "CardSection", label: "Card Section", props: {} },
  {
    type: "Table",
    label: "Table",
    props: { rows: [] },
  },
  {
    type: "HtmlElement",
    label: "Text",
    tag: "div",
    class: "text-body1",
    text: "Text",
  },
  {
    type: "HtmlElement",
    label: "Row",
    tag: "div",
    class: "row",
    style: "height: 100%",
  },
  {
    type: "HtmlElement",
    label: "Column",
    tag: "div",
    class: "col-12",
    style: "height: 100%",
  },
];

module.exports = {
  EDITOR_VIEW_TYPE,
  VIEW_IDS,
  PALETTE,
};
