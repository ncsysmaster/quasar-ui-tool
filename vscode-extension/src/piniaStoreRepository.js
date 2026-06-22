const vscode = require("vscode");
const { toProjectRelativePath } = require("./projectRoot");

async function listPiniaStores(projectFolder, pageDocument) {
  const uris = await findJsonFiles(
    vscode.Uri.joinPath(projectFolder.uri, ".src", "store"),
  );
  const stores = [];

  for (const uri of uris) {
    try {
      const raw = await vscode.workspace.fs.readFile(uri);
      const definition = JSON.parse(new TextDecoder().decode(raw));
      stores.push({
        fsPath: uri.fsPath,
        relativePath: toProjectRelativePath(projectFolder, uri),
        fileName: definition.store?.fileName || uri.path.split("/").pop(),
        defineStoreId: definition.store?.defineStoreId || "",
        constName: definition.store?.constName || "",
        ownerPage: definition.store?.ownerPage || "",
        stateKeys: Object.keys(definition.state || {}),
        definition,
      });
    } catch {
      stores.push({
        fsPath: uri.fsPath,
        relativePath: toProjectRelativePath(projectFolder, uri),
        fileName: uri.path.split("/").pop(),
        defineStoreId: "invalid JSON",
        constName: "",
        ownerPage: "",
        stateKeys: [],
        definition: null,
      });
    }
  }

  const pageName = pageDocument?.uri?.fsPath
    ? pageDocument.uri.fsPath.split(/[\\/]/).pop().replace(/\.json$/i, "")
    : "";
  const pageDefinition = readPageDefinition(pageDocument);
  const storeImports = (Array.isArray(pageDefinition?.imports) ? pageDefinition.imports : [])
    .filter((item) => item?.type === "store" || item?.variableName);

  if (storeImports.length > 0) {
    return storeImports.map((item) => {
      const store = stores.find((candidate) =>
        candidate.definition?.store?.sourcePath === item.sourcePath ||
        normalizeImportPath(candidate.definition?.store?.importPath || candidate.definition?.store?.targetPath) === normalizeImportPath(item.from) ||
        candidate.constName === item.name,
      );
      return store ? { ...store, tabName: item.variableName || item.name, pageImport: item } : null;
    }).filter(Boolean);
  }

  return stores
    .filter((store) =>
      !pageName || store.ownerPage === pageName ||
      (!store.ownerPage && store.fileName === pageName),
    )
    .sort((left, right) =>
      left.relativePath.localeCompare(right.relativePath),
    )
    .map((store, index) => ({
      ...store,
      tabName: index === 0 ? "storeName" : `store${toPascalCase(store.defineStoreId || store.fileName)}`,
    }));
}

function readPageDefinition(pageDocument) {
  if (!pageDocument) return null;
  try {
    return JSON.parse(pageDocument.getText());
  } catch {
    return null;
  }
}

function normalizeImportPath(value) {
  return String(value || "").replace(/\\/g, "/").replace(/\.js$/i, "");
}

function toPascalCase(value) {
  return String(value || "")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

async function findJsonFiles(directoryUri) {
  let entries;
  try {
    entries = await vscode.workspace.fs.readDirectory(directoryUri);
  } catch {
    return [];
  }

  const files = [];
  for (const [name, fileType] of entries) {
    const entryUri = vscode.Uri.joinPath(directoryUri, name);
    if (fileType === vscode.FileType.Directory) {
      files.push(...await findJsonFiles(entryUri));
    } else if (fileType === vscode.FileType.File && name.toLowerCase().endsWith(".json")) {
      files.push(entryUri);
    }
  }
  return files;
}

module.exports = { listPiniaStores };
