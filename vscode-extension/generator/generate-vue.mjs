import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, join, resolve } from 'node:path'
import { createRequire } from 'node:module'
import {
  escapeAttribute,
  escapeJavaScriptString,
  escapeTemplateText,
  isAssignableExpression,
} from './render-utils.mjs'
import {
  getComponentApiName,
  getComponentRefName,
  getRenderableTableColumns,
  getTableHeaderRows,
  getTableRowRows,
  getTableColumnsVariableName,
  getTableRowKey,
  getTableRowsExpression,
  getTableRowsVariableName,
  renderTableColumnsExpression,
  renderTableComponent,
} from './table-renderer.mjs'

const require = createRequire(import.meta.url)
const { toQuasarType } = require('../src/componentTypes.js')

const workspaceRoot = process.cwd()
const defaultInputDir = '.src/pages'

main().catch((error) => {
  console.error(`[generate-vue] ${error.message}`)
  process.exitCode = 1
})

async function main() {
  const inputPaths = await resolveInputPaths(process.argv.slice(2))

  if (inputPaths.length === 0) {
    throw new Error(`No page definition JSON files found in ${defaultInputDir}`)
  }

  for (const inputPath of inputPaths) {
    const definition = await readJson(inputPath)
    const setupScript = await readOrCreateSetupScript(definition, inputPath)
    const vue = generateVue(definition, inputPath, setupScript)
    const outputPath = resolveOutputPath(definition, inputPath)

    await mkdir(dirname(outputPath), { recursive: true })
    await writeFile(outputPath, vue, 'utf8')

    console.log(`[generate-vue] ${relativeToWorkspace(inputPath)} -> ${relativeToWorkspace(outputPath)}`)
  }
}

async function readOrCreateSetupScript(definition, inputPath) {
  const scriptPath = inputPath.replace(/\.json$/i, '.js')
  const legacySetup = typeof definition.script?.setup === 'string'
    ? definition.script.setup.trim()
    : ''
  let setupScript

  try {
    setupScript = await readFile(scriptPath, 'utf8')
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    setupScript = legacySetup
    await writeFile(scriptPath, setupScript ? `${setupScript}\n` : '', 'utf8')
    console.log(`[generate-vue] Created ${relativeToWorkspace(scriptPath)}`)
  }

  const scriptFileName = `${basename(inputPath, extname(inputPath))}.js`
  if (definition.script?.src !== scriptFileName || definition.script?.setup !== undefined) {
    definition.script = { ...(definition.script || {}), src: scriptFileName }
    delete definition.script.setup
    await writeFile(inputPath, `${JSON.stringify(definition, null, 2)}\n`, 'utf8')
    console.log(`[generate-vue] Migrated script reference in ${relativeToWorkspace(inputPath)}`)
  }

  return setupScript.trim()
}

async function resolveInputPaths(args) {
  if (args.length > 0) {
    return args.map((item) => resolve(workspaceRoot, item))
  }

  const sourceDir = resolve(workspaceRoot, defaultInputDir)
  const fileNames = await readdir(sourceDir).catch((error) => {
    if (error.code === 'ENOENT') {
      return []
    }
    throw error
  })

  return fileNames
    .filter((fileName) => extname(fileName).toLowerCase() === '.json')
    .map((fileName) => join(sourceDir, fileName))
}

async function readJson(inputPath) {
  const raw = await readFile(inputPath, 'utf8')

  try {
    return JSON.parse(raw)
  } catch (error) {
    throw new Error(`${relativeToWorkspace(inputPath)} is not valid JSON: ${error.message}`)
  }
}

function generateVue(definition, inputPath, setupScript) {
  assertPageDefinition(definition, inputPath)

  const components = definition.components || []
  apiSourceComponents = buildApiSourceComponentMap(components)
  const storeImports = resolveStoreImports(definition)
  if (components.length === 0 && storeImports.length === 0) {
    return '<template></template>\n'
  }

  const template = renderTemplate(components)
  const scriptSetup = renderScriptSetup(
    definition.data || {},
    definition.generation?.scriptSetup,
    setupScript,
    storeImports,
    collectModelBindings(components),
    collectTableColumnDefinitions(components),
    collectTableLocalRefs(components),
    collectComponentApiDefinitions(components)
  )

  const templateSource = components.length === 0
    ? '<template></template>'
    : `<template>\n${template}\n</template>`
  return `${templateSource}\n\n${scriptSetup}`
}

function assertPageDefinition(definition, inputPath) {
  if (!definition || typeof definition !== 'object') {
    throw new Error(`${relativeToWorkspace(inputPath)} must contain a JSON object`)
  }

  if (definition.components !== undefined && !Array.isArray(definition.components)) {
    throw new Error(`${relativeToWorkspace(inputPath)} components must be an array when present`)
  }
}

function renderTemplate(components) {
  return components.map((component) => renderComponent(component, 1)).join('\n')
}

function renderComponent(component, depth) {
  if (component.type === 'Table') {
    return renderTableComponent(component, depth)
  }
  const tagName = getTagName(component)
  const attributes = renderAttributes(component)
  const openTag = attributes.length > 0 ? `<${tagName} ${attributes}>` : `<${tagName}>`
  const closeTag = `</${tagName}>`
  const indent = '  '.repeat(depth)
  const children = Array.isArray(component.children) ? component.children : []
  const text = component.textBinding
    ? `{{ ${component.textBinding} }}`
    : component.text

  if (children.length === 0 && text === undefined) {
    return `${indent}<${tagName}${attributes.length > 0 ? ` ${attributes}` : ''} />`
  }

  if (children.length === 0) {
    return `${indent}${openTag}${escapeTemplateText(String(text))}${closeTag}`
  }

  const content = []
  if (text !== undefined) {
    content.push(`${'  '.repeat(depth + 1)}${escapeTemplateText(String(text))}`)
  }
  content.push(...children.map((child) => renderComponent(child, depth + 1)))
  return `${indent}${openTag}\n${content.join('\n')}\n${indent}${closeTag}`
}

function getTagName(component) {
  if (component.type === 'HtmlElement') {
    return component.tag || 'div'
  }

  return pascalToKebab(toQuasarType(component.type))
}

function renderAttributes(component) {
  const attributes = []

  if (component.class) {
    attributes.push(`class="${escapeAttribute(component.class)}"`)
  }

  const style = component.style ?? component.props?.style
  if (style !== undefined && style !== '') {
    attributes.push(renderProp('style', style))
  }

  if (component.repeat) {
    const itemName = component.repeat.itemName || 'item'
    const source = component.repeat.source
    const key = component.repeat.key

    if (!source) {
      throw new Error(`Component "${component.id || component.type}" has repeat without source`)
    }

    attributes.push(`v-for="${itemName} in ${source}"`)
    if (key) {
      attributes.push(`:key="${key}"`)
    }
  }

  if (component.label && component.type !== 'HtmlElement' && component.props?.label === undefined) {
    attributes.push(`label="${escapeAttribute(String(component.label))}"`)
  }

  Object.entries(component.models || {}).forEach(([name, expression]) => {
    const directive = name === 'modelValue' ? 'v-model' : `v-model:${kebabCase(name)}`
    attributes.push(`${directive}="${escapeAttribute(String(expression))}"`)
  })

  Object.entries(component.dynamicProps || {}).forEach(([name, expression]) => {
    attributes.push(`:${kebabCase(name)}="${escapeAttribute(String(expression))}"`)
  })

  Object.entries(component.props || {}).forEach(([name, value]) => {
    if (name === 'style') return
    if (Object.prototype.hasOwnProperty.call(component.dynamicProps || {}, name)) return
    attributes.push(renderProp(name, value))
  })

  Object.entries(component.events || {}).forEach(([name, handler]) => {
    attributes.push(`@${kebabCase(name)}="${escapeAttribute(String(handler))}"`)
  })

  return attributes.join(' ')
}

function renderProp(name, value) {
  const propName = kebabCase(name)

  if (value === true) {
    return propName
  }

  if (value === false) {
    return `:${propName}="false"`
  }

  if (typeof value === 'number') {
    return `:${propName}="${value}"`
  }

  if (value === null) {
    return `:${propName}="null"`
  }

  if (Array.isArray(value) || typeof value === 'object') {
    return `:${propName}='${escapeAttribute(JSON.stringify(value))}'`
  }

  return `${propName}="${escapeAttribute(String(value))}"`
}

function renderScriptSetup(
  data,
  scriptSetup = {},
  customSetup = '',
  storeImports = [],
  modelBindings = new Set(),
  tableColumnDefinitions = [],
  tableLocalRefs = [],
  componentApiDefinitions = []
) {
  const exportedNames = Array.isArray(scriptSetup.dataExports)
    ? scriptSetup.dataExports
    : Object.keys(data)

  const statements = exportedNames
    .filter((name) => Object.prototype.hasOwnProperty.call(data, name))
    .map((name) => modelBindings.has(name)
      ? `const ${name} = ref(${JSON.stringify(data[name], null, 2)})`
      : `const ${name} = ${JSON.stringify(data[name], null, 2)}`)

  const storeStatements = storeImports
    .filter((item) => item?.variableName && item?.name)
    .map((item) => `const ${item.variableName} = ${item.name}()`)
  const setupCode = typeof customSetup === 'string' ? customSetup.trim() : ''
  const tableColumnStatements = tableColumnDefinitions.map(
    ({ name, columns, headerRows, rowRows, headerLayout, bodyRows }) =>
      `const ${name} = ${renderTableColumnsExpression(columns, headerRows, rowRows, headerLayout, bodyRows)}`
  )
  const tableLocalRefStatements = tableLocalRefs.map(
    ({ name, value }) => `const ${name} = ref(${JSON.stringify(value, null, 2)})`
  )
  const componentRefStatements = componentApiDefinitions.map(
    ({ refName }) => `const ${refName} = ref(null)`
  )
  const componentApiStatements = componentApiDefinitions.map((definition) =>
    renderComponentApiStatement(definition, modelBindings, tableLocalRefs)
  )
  const blocks = [
    ...storeStatements,
    ...statements,
    ...tableColumnStatements,
    ...tableLocalRefStatements,
    ...componentRefStatements,
    ...componentApiStatements,
  ]
  if (setupCode) blocks.push(setupCode)

  if (blocks.length === 0) {
    return '<script setup>\n</script>\n'
  }

  const importLines = storeImports
    .filter((item) => item?.name && item?.from)
    .map((item) => `import { ${item.name} } from '${escapeJavaScriptString(item.from)}'`)
  const needsRef = blocks.some((statement) => statement.includes(' = ref('))
  if (needsRef && !/import\s*\{[^}]*\bref\b[^}]*\}\s*from\s*['"]vue['"]/.test(setupCode)) {
    importLines.unshift("import { ref } from 'vue'")
  }
  const apiFactoryNames = [...new Set(componentApiDefinitions.map((definition) => definition.factoryName))]
  if (apiFactoryNames.length > 0) {
    importLines.push(`import { ${apiFactoryNames.sort().join(', ')} } from 'src/component/quasar-ui-api'`)
  }
  if (componentApiDefinitions.some((definition) => definition.type === 'Table')) {
    importLines.push("import { AgGridVue } from 'ag-grid-vue3'")
    importLines.push("import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'")
    blocks.unshift('ModuleRegistry.registerModules([AllCommunityModule])')
  }
  const imports = importLines.length > 0 ? `${[...new Set(importLines)].join('\n')}\n\n` : ''
  return `<script setup>\n${imports}${blocks.join('\n\n')}\n</script>\n`
}

function collectModelBindings(components, result = new Set()) {
  ;(components || []).forEach((component) => {
    Object.values(component.models || {}).forEach((expression) => {
      if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(expression || '')) result.add(expression)
    })
    const filterBinding = component.table?.filterBinding
    if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(filterBinding || '')) result.add(filterBinding)
    collectModelBindings(component.children, result)
  })
  return result
}

function collectTableColumnDefinitions(components, result = []) {
  ;(components || []).forEach((component) => {
    if (
      component.type === 'Table' &&
      Array.isArray(component.columns) &&
      !component.dynamicProps?.columns
    ) {
      result.push({
        name: getTableColumnsVariableName(component),
        headerRows: getTableHeaderRows(component),
        rowRows: getTableRowRows(component),
        columns: getRenderableTableColumns(component),
        headerLayout: component.headerRows,
        bodyRows: component.bodyRows
      })
    }
    collectTableColumnDefinitions(component.children, result)
  })
  return result
}

function collectTableLocalRefs(components, result = []) {
  ;(components || []).forEach((component) => {
    if (
      component.type === 'Table' &&
      !component.table?.rowsBinding &&
      !component.dynamicProps?.rows
    ) {
      result.push({
        name: getTableRowsVariableName(component),
        value: Array.isArray(component.props?.rows) ? component.props.rows : []
      })
    }
    collectTableLocalRefs(component.children, result)
  })
  return result
}

function collectComponentApiDefinitions(components, result = []) {
  ;(components || []).forEach((component) => {
    if (component?.id && component.type === 'Table') {
      result.push({
        id: String(component.id),
        type: String(component.type || 'HtmlElement'),
        apiName: getComponentApiName(component),
        refName: getComponentRefName(component),
        factoryName: getComponentApiFactoryName(component)
      })
    }
    collectComponentApiDefinitions(component.children, result)
  })
  return dedupeApiDefinitions(result)
}

function dedupeApiDefinitions(definitions) {
  const seen = new Set()
  return definitions.filter((definition) => {
    if (seen.has(definition.apiName)) return false
    seen.add(definition.apiName)
    return true
  })
}

function renderComponentApiStatement(definition, modelBindings, tableLocalRefs) {
  const options = [
    `id: ${JSON.stringify(definition.id)}`,
    `type: ${JSON.stringify(definition.type)}`,
    `componentRef: ${definition.refName}`
  ]
  const component = findApiSourceComponent(definition.id)

  if (component?.type === 'Table') {
    options.push(`rowKey: ${JSON.stringify(getTableRowKey(component))}`)
    options.push(`excelCopy: ${component.table?.excelCopy !== false}`)
    options.push(`rows: ${renderAccessor(getTableRowsExpression(component), modelBindings, tableLocalRefs)}`)
    options.push(`columns: { get: () => ${getTableColumnsVariableName(component)} }`)
    if (isAssignableExpression(component.models?.selected)) {
      options.push(`selected: ${renderAccessor(component.models.selected, modelBindings)}`)
    }
    if (isAssignableExpression(component.models?.pagination)) {
      options.push(`pagination: ${renderAccessor(component.models.pagination, modelBindings)}`)
    }
    if (isAssignableExpression(component.table?.loadingBinding)) {
      options.push(`loading: ${renderAccessor(component.table.loadingBinding, modelBindings)}`)
    }
  }

  return `const ${definition.apiName} = ${definition.factoryName}({\n  ${options.join(',\n  ')}\n})`
}

let apiSourceComponents = null

function findApiSourceComponent(id) {
  return apiSourceComponents?.get(id) || null
}

function buildApiSourceComponentMap(components, map = new Map()) {
  ;(components || []).forEach((component) => {
    if (component?.id) map.set(String(component.id), component)
    buildApiSourceComponentMap(component.children, map)
  })
  return map
}

function getComponentApiFactoryName(component) {
  if (component.type === 'Table') return 'createTableApi'
  return 'createBaseComponentApi'
}

function renderAccessor(expression, modelBindings, tableLocalRefs = []) {
  return `{ get: () => ${renderReadExpression(expression, modelBindings, tableLocalRefs)}, set: (value) => { ${renderWriteExpression(expression, modelBindings, 'value', tableLocalRefs)} } }`
}

function renderReadExpression(expression, modelBindings, tableLocalRefs = []) {
  return needsValueAccess(expression, modelBindings, tableLocalRefs) ? `${expression}.value` : expression
}

function renderWriteExpression(expression, modelBindings, valueExpression, tableLocalRefs = []) {
  return needsValueAccess(expression, modelBindings, tableLocalRefs)
    ? `${expression}.value = ${valueExpression}`
    : `${expression} = ${valueExpression}`
}

function needsValueAccess(expression, modelBindings, tableLocalRefs = []) {
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(expression || '')) return false
  if (modelBindings.has(expression)) return true
  return tableLocalRefs.some((item) => item.name === expression)
}

function resolveStoreImports(definition) {
  const imports = Array.isArray(definition.imports)
    ? definition.imports.filter((item) => item?.type === 'store' || item?.variableName)
    : []
  if (imports.length > 0) return imports

  return (Array.isArray(definition.stores) ? definition.stores : []).map((store) => ({
    type: 'store',
    name: store.constName,
    from: store.from || store.importPath || '',
    variableName: store.variableName,
    value: store.value || store.constName,
    sourcePath: store.sourcePath,
    defineStoreId: store.defineStoreId
  }))
}

function resolveOutputPath(definition, inputPath) {
  const targetVuePath = definition.page?.targetVuePath

  if (targetVuePath) {
    return resolve(workspaceRoot, targetVuePath)
  }

  const fileName = inputPath.split(/[\\/]/).pop().replace(/\.json$/i, '.vue')
  return resolve(workspaceRoot, 'src/pages', fileName)
}

function pascalToKebab(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase()
}

function kebabCase(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase()
}

function relativeToWorkspace(path) {
  return path.replace(workspaceRoot, '').replace(/^[/\\]/, '').replaceAll('\\', '/')
}
