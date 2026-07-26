const EDITOR_VIEW_TYPE = "quasarTool.pageEditor";

const PALETTE = [
  {
    type: "Page",
    label: "Page",
    props: { padding: true },
  },
  { type: "Card", label: "Card", props: { flat: true, bordered: true } },
  { type: "CardSection", label: "Card Section", props: {}, class: "q-pa-sm" },
  { type: "Form", label: "Form", props: {}, class: "q-gutter-sm" },
  {
    type: "GridTemplate",
    label: "Grid",
    template: "layoutGrid",
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
  {
    type: "Checkbox",
    label: "Check Box",
    props: { label: "Check Box", dense: true },
  },
  {
    type: "Radio",
    label: "Radio Button",
    props: { label: "Radio", val: "option1", dense: true },
  },
  {
    type: "Toggle",
    label: "Switch",
    props: { label: "Switch", dense: true },
  },
  {
    type: "Select",
    label: "Combo Box",
    props: {
      outlined: true,
      dense: true,
      label: "Combo Box",
      options: ["option1", "option2", "option3"],
    },
  },
  {
    type: "HtmlElement",
    label: "Label",
    tag: "label",
    class:
      "text-body2 bg-grey-4 row items-center q-px-md full-height rounded-borders overflow-hidden",
    text: "Label",
  },
  {
    type: "HtmlElement",
    label: "Text",
    tag: "div",
    class: "text-body1",
    text: "Text",
  },
  {
    type: "FormTemplate",
    label: "Form Search",
    template: "courseSearchForm",
  },
  {
    type: "Table",
    label: "dvTable",
    props: { rows: [] },
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
  PALETTE,
};
