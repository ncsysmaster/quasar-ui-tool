const { getAgGridPreviewCoreScript } = require("./agGridPreviewCore");
const { getAgGridPreviewLayoutScript } = require("./agGridPreviewLayout");
const { getAgGridPreviewRenderersScript } = require("./agGridPreviewRenderers");
const { getTablePreviewSelectionScript } = require("./tablePreviewSelection");

function getAgGridPreviewScript() {
  return [
    getAgGridPreviewCoreScript(),
    getAgGridPreviewLayoutScript(),
    getAgGridPreviewRenderersScript(),
    getTablePreviewSelectionScript(),
  ]
    .filter(Boolean)
    .join("\n\n")
}

module.exports = {
  getAgGridPreviewScript,
}
