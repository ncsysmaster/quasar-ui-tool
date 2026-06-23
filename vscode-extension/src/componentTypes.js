const NEUTRAL_TO_QUASAR = Object.freeze({
  Page: "QPage",
  Layout: "QLayout",
  PageContainer: "QPageContainer",
  Button: "QBtn",
  Input: "QInput",
  Select: "QSelect",
  Toggle: "QToggle",
  Card: "QCard",
  CardSection: "QCardSection",
  Table: "QTable",
  TableCell: "QTd",
  List: "QList",
  ListItem: "QItem",
  ListItemSection: "QItemSection",
  Separator: "QSeparator",
});

const QUASAR_TO_NEUTRAL = Object.freeze(
  Object.fromEntries(
    Object.entries(NEUTRAL_TO_QUASAR).map(([neutral, quasar]) => [
      quasar,
      neutral,
    ]),
  ),
);

function toQuasarType(type) {
  return NEUTRAL_TO_QUASAR[type] || type;
}

function toNeutralType(type) {
  const normalized = kebabToPascal(String(type || ""));
  return QUASAR_TO_NEUTRAL[normalized] || type;
}

function kebabToPascal(value) {
  if (!value.includes("-")) return value;
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

module.exports = {
  NEUTRAL_TO_QUASAR,
  QUASAR_TO_NEUTRAL,
  toNeutralType,
  toQuasarType,
};
