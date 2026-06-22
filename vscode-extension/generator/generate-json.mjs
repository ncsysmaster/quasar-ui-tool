import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, join, resolve } from 'node:path'
import { parse as parseJavaScript } from 'acorn'
import { parse as parseTemplate } from '@vue/compiler-dom'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { toNeutralType } = require('../src/componentTypes.js')

const workspaceRoot = process.cwd()
const defaultInputDir = 'src/pages'

main().catch((error) => {
  console.error(`[generate-json] ${error.message}`)
  process.exitCode = 1
})

async function main() {
  const inputPaths = await resolveInputPaths(process.argv.slice(2))

  if (inputPaths.length === 0) {
    throw new Error(`No Vue files found in ${defaultInputDir}`)
  }

  for (const inputPath of inputPaths) {
    const vueSource = await readFile(inputPath, 'utf8')
    const { definition, setupScript } = generateJson(vueSource, inputPath)
    const outputPath = resolveOutputPath(inputPath)
    const scriptOutputPath = outputPath.replace(/\.json$/i, '.js')

    await mkdir(dirname(outputPath), { recursive: true })
    await writeFile(outputPath, `${JSON.stringify(definition, null, 2)}\n`, 'utf8')
    await writeFile(scriptOutputPath, setupScript ? `${setupScript}\n` : '', 'utf8')

    console.log(`[generate-json] ${relativeToWorkspace(inputPath)} -> ${relativeToWorkspace(outputPath)}`)
    console.log(`[generate-json] Script -> ${relativeToWorkspace(scriptOutputPath)}`)
  }
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
    .filter((fileName) => extname(fileName).toLowerCase() === '.vue')
    .map((fileName) => join(sourceDir, fileName))
}

function generateJson(vueSource, inputPath) {
  const template = extractBlock(vueSource, 'template')
  const scriptSetup = extractScriptSetup(vueSource)

  if (template === null) {
    throw new Error(`${relativeToWorkspace(inputPath)} does not contain a <template> block`)
  }

  const templateAst = parseTemplate(template)
  const components = templateAst.children
    .filter((node) => node.type === 1)
    .map((node, index) => elementToComponent(node, index))

  const parsedScript = parseScriptSetup(scriptSetup)
  const data = parsedScript.data
  const dataExports = Object.keys(data)
  const pageId = getPageId(inputPath)
  const sourceVuePath = relativeToWorkspace(inputPath)
  const targetVuePath = sourceVuePath

  const definition = {
    schemaVersion: '0.1.0',
    tool: {
      name: 'quasar-tool',
      artifactType: 'page-definition',
      description: 'Vue 파일에서 역변환된 UI TOOL 페이지 결과물 JSON'
    },
    page: {
      id: pageId,
      name: pageId,
      route: pageId === 'IndexPage' ? '/' : `/${pageId}`,
      sourceVuePath,
      targetVuePath,
      framework: 'quasar',
      component: components[0]?.type || 'Page'
    },
    data,
    components,
    generation: {
      scriptSetup: {
        dataExports
      },
      notes: [
        '이 JSON은 Vue 파일을 기준으로 역변환된 결과물이다.',
        '복잡한 사용자 정의 JavaScript 표현식은 dynamicProps 또는 rawExpression 형태로 보존될 수 있다.',
        '이 역변환기는 UI TOOL 생성기가 만든 Vue 파일을 우선 대상으로 한다.'
      ]
    },
    script: {
      src: `${basename(inputPath, extname(inputPath))}.js`
    }
  }

  if (parsedScript.imports.length > 0) {
    definition.imports = parsedScript.imports
  }

  return { definition, setupScript: parsedScript.setup }
}

function extractBlock(source, tagName) {
  const match = source.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'))
  return match ? match[1].trim() : null
}

function extractScriptSetup(source) {
  const match = source.match(/<script\s+setup[^>]*>([\s\S]*?)<\/script>/i)
  return match?.[1]?.trim() || ''
}

function elementToComponent(node, siblingIndex) {
  const component = {
    id: buildComponentId(node.tag, siblingIndex),
    type: getComponentType(node.tag)
  }

  if (component.type === 'HtmlElement') {
    component.tag = node.tag
  }

  const props = {}
  const dynamicProps = {}

  for (const prop of node.props || []) {
    applyProp(component, props, dynamicProps, prop)
  }

  if (Object.keys(props).length > 0) {
    component.props = props
  }

  if (Object.keys(dynamicProps).length > 0) {
    component.dynamicProps = dynamicProps
  }

  const elementChildren = (node.children || []).filter((child) => child.type === 1)
  const meaningfulTextNodes = (node.children || []).filter((child) => isMeaningfulTextNode(child))

  if (elementChildren.length > 0) {
    component.children = elementChildren.map((child, index) => elementToComponent(child, index))
    if (meaningfulTextNodes.length > 0) {
      component.text = meaningfulTextNodes.map((child) => textNodeToString(child)).join('').trim()
    }
  } else if (meaningfulTextNodes.length === 1) {
    applyText(component, meaningfulTextNodes[0])
  } else if (meaningfulTextNodes.length > 1) {
    component.text = meaningfulTextNodes.map((child) => textNodeToString(child)).join('')
  }

  return component
}

function applyProp(component, props, dynamicProps, prop) {
  if (prop.type === 6) {
    if (prop.name === 'class') {
      component.class = prop.value?.content || ''
      return
    }

    if (prop.name === 'style') {
      component.style = prop.value?.content || ''
      return
    }

    props[camelCase(prop.name)] = prop.value ? prop.value.content : true
    return
  }

  if (prop.type !== 7) {
    return
  }

  if (prop.name === 'for') {
    const parsed = prop.forParseResult
    component.repeat = {
      source: parsed?.source?.content || '',
      itemName: parsed?.value?.content || 'item'
    }
    return
  }

  if (prop.name === 'bind') {
    const arg = prop.arg?.content
    const expression = prop.exp?.content || ''

    if (arg === 'key' && component.repeat) {
      component.repeat.key = expression
      return
    }

    if (arg) {
      dynamicProps[camelCase(arg)] = expression
    }
    return
  }

  if (prop.name === 'model') {
    const modelName = camelCase(prop.arg?.content || 'model-value')
    component.models ||= {}
    component.models[modelName] = prop.exp?.content || ''
    return
  }

  if (prop.name === 'on') {
    component.events ||= {}
    component.events[camelCase(prop.arg?.content || 'event')] = prop.exp?.content || ''
  }
}

function applyText(component, node) {
  if (node.type === 2) {
    component.text = node.content.trim()
    return
  }

  if (node.type === 5) {
    component.textBinding = node.content?.content || ''
  }
}

function isMeaningfulTextNode(node) {
  if (node.type === 2) {
    return node.content.trim().length > 0
  }

  return node.type === 5
}

function textNodeToString(node) {
  if (node.type === 2) {
    return node.content
  }

  if (node.type === 5) {
    return `{{ ${node.content?.content || ''} }}`
  }

  return ''
}

function parseScriptSetup(scriptSetup) {
  const data = {}
  const imports = []

  if (!scriptSetup.trim()) {
    return { data, imports, setup: '' }
  }

  let ast
  try {
    ast = parseJavaScript(scriptSetup, {
      ecmaVersion: 'latest',
      sourceType: 'module'
    })
  } catch {
    return { data, imports, setup: scriptSetup.trim() }
  }

  const dataStatementRanges = []
  const namedImports = []
  let vueRefImportRange = null

  for (const statement of ast.body) {
    if (statement.type !== 'ImportDeclaration') continue
    const source = String(statement.source?.value || '')
    const names = statement.specifiers
      .filter((specifier) => specifier.type === 'ImportSpecifier')
      .map((specifier) => specifier.imported?.name || specifier.local?.name)
      .filter(Boolean)
    if (source === 'vue' && names.length === 1 && names[0] === 'ref') {
      vueRefImportRange = [statement.start, statement.end]
      continue
    }
    names.forEach((name) => namedImports.push({
      name,
      from: source,
      range: [statement.start, statement.end]
    }))
  }
  const availableNamedImports = [...namedImports]

  for (const statement of ast.body) {
    if (statement.type !== 'VariableDeclaration' || statement.kind !== 'const') {
      continue
    }

    const parsedDeclarations = []
    const storeDeclarations = []

    for (const declaration of statement.declarations) {
      if (declaration.id?.type !== 'Identifier' || !declaration.init) {
        break
      }

      if (declaration.init.type === 'CallExpression' &&
          declaration.init.callee?.type === 'Identifier' &&
          declaration.init.callee.name === 'ref' &&
          declaration.init.arguments?.[0]?.type === 'Literal') {
        storeDeclarations.push({
          variableName: declaration.id.name,
          value: String(declaration.init.arguments[0].value ?? '')
        })
        continue
      }

      const value = evaluateLiteralNode(declaration.init)
      if (value === unsupportedLiteral) {
        break
      }

      parsedDeclarations.push([declaration.id.name, value])
    }

    if (storeDeclarations.length === statement.declarations.length) {
      storeDeclarations.forEach((binding, index) => {
        let importIndex = availableNamedImports.findIndex((item) => item.name === binding.value)
        if (importIndex < 0) importIndex = 0
        const imported = availableNamedImports.splice(importIndex, 1)[0]
        if (!imported) return
        imports.push({
          type: 'store',
          name: imported.name,
          from: imported.from,
          ...binding
        })
        dataStatementRanges.push(imported.range)
      })
      dataStatementRanges.push([statement.start, statement.end])
      continue
    }

    if (parsedDeclarations.length !== statement.declarations.length) {
      continue
    }

    parsedDeclarations.forEach(([name, value]) => {
      data[name] = value
    })
    dataStatementRanges.push([statement.start, statement.end])
  }

  if (imports.length > 0 && vueRefImportRange) {
    dataStatementRanges.push(vueRefImportRange)
  }

  const setup = removeSourceRanges(scriptSetup, dataStatementRanges).trim()
  return { data, imports, setup }
}

function removeSourceRanges(source, ranges) {
  return [...new Map(ranges.map((range) => [`${range[0]}:${range[1]}`, range])).values()]
    .slice()
    .sort((left, right) => right[0] - left[0])
    .reduce((result, [start, end]) => `${result.slice(0, start)}${result.slice(end)}`, source)
}

const unsupportedLiteral = Symbol('unsupportedLiteral')

function evaluateLiteralNode(node) {
  if (!node) {
    return unsupportedLiteral
  }

  if (node.type === 'Literal') {
    return node.value
  }

  if (node.type === 'ArrayExpression') {
    const values = []

    for (const element of node.elements) {
      const value = evaluateLiteralNode(element)
      if (value === unsupportedLiteral) {
        return unsupportedLiteral
      }
      values.push(value)
    }

    return values
  }

  if (node.type === 'ObjectExpression') {
    const value = {}

    for (const property of node.properties) {
      if (property.type !== 'Property' || property.kind !== 'init' || property.computed) {
        return unsupportedLiteral
      }

      const key = getObjectKey(property.key)
      const propertyValue = evaluateLiteralNode(property.value)
      if (!key || propertyValue === unsupportedLiteral) {
        return unsupportedLiteral
      }

      value[key] = propertyValue
    }

    return value
  }

  if (node.type === 'UnaryExpression' && ['+', '-'].includes(node.operator)) {
    const argument = evaluateLiteralNode(node.argument)
    if (typeof argument !== 'number') {
      return unsupportedLiteral
    }

    return node.operator === '-' ? -argument : argument
  }

  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis.map((quasi) => quasi.value.cooked).join('')
  }

  return unsupportedLiteral
}

function getObjectKey(node) {
  if (node.type === 'Identifier') {
    return node.name
  }

  if (node.type === 'Literal') {
    return String(node.value)
  }

  return ''
}

function getComponentType(tagName) {
  if (!tagName.includes('-')) {
    return 'HtmlElement'
  }

  const componentType = tagName
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
  return toNeutralType(componentType)
}

function buildComponentId(tagName, siblingIndex) {
  const base = tagName
    .replace(/^q-/, '')
    .replace(/-([a-z])/g, (_, char) => char.toUpperCase())
    .replace(/^[a-z]/, (char) => char.toLowerCase())

  return `${base || 'component'}${siblingIndex + 1}`
}

function resolveOutputPath(inputPath) {
  const fileName = inputPath.split(/[\\/]/).pop().replace(/\.vue$/i, '.json')
  return resolve(workspaceRoot, '.src/pages', fileName)
}

function getPageId(inputPath) {
  return inputPath.split(/[\\/]/).pop().replace(/\.vue$/i, '')
}

function camelCase(value) {
  return value.replace(/-([a-z])/g, (_, char) => char.toUpperCase())
}

function relativeToWorkspace(path) {
  return path.replace(workspaceRoot, '').replace(/^[/\\]/, '').replaceAll('\\', '/')
}
