import { readdir, readFile } from 'node:fs/promises'
import { extname, join, relative, resolve } from 'node:path'

const workspaceRoot = process.cwd()
const defaultInputDir = '.src/pages'

main().catch((error) => {
  console.error(`[validate-screens] ${error.message}`)
  process.exitCode = 1
})

async function main() {
  const inputPaths = await resolveInputPaths(process.argv.slice(2))

  if (inputPaths.length === 0) {
    throw new Error(`No page definition JSON files found in ${defaultInputDir}`)
  }

  let errorCount = 0

  for (const inputPath of inputPaths) {
    const errors = await validateFile(inputPath)

    if (errors.length === 0) {
      console.log(`[validate-screens] OK ${relativeToWorkspace(inputPath)}`)
      continue
    }

    errorCount += errors.length
    errors.forEach((error) => {
      console.error(`[validate-screens] ${relativeToWorkspace(inputPath)}: ${error}`)
    })
  }

  if (errorCount > 0) {
    throw new Error(`${errorCount} validation error(s) found`)
  }
}

async function resolveInputPaths(args) {
  if (args.length > 0) {
    return args.map((item) => resolve(workspaceRoot, item))
  }

  const sourceDir = resolve(workspaceRoot, defaultInputDir)
  const fileNames = await readdir(sourceDir).catch((error) => {
    if (error.code === 'ENOENT') return []
    throw error
  })

  return fileNames
    .filter((fileName) => extname(fileName).toLowerCase() === '.json')
    .sort()
    .map((fileName) => join(sourceDir, fileName))
}

async function validateFile(inputPath) {
  let definition

  try {
    definition = JSON.parse(await readFile(inputPath, 'utf8'))
  } catch (error) {
    return [`invalid JSON (${error.message})`]
  }

  const errors = []

  if (!isObject(definition)) {
    return ['root value must be an object']
  }

  if (!isObject(definition.page)) {
    errors.push('page must be an object')
  } else {
    if (!isNonEmptyString(definition.page.id)) errors.push('page.id must be a non-empty string')
    if (!isNonEmptyString(definition.page.targetVuePath)) {
      errors.push('page.targetVuePath must be a non-empty string')
    }
  }

  if (definition.components !== undefined && !Array.isArray(definition.components)) {
    errors.push('components must be an array when present')
  } else if (Array.isArray(definition.components)) {
    definition.components.forEach((component, index) => {
      validateComponent(component, `components[${index}]`, errors)
    })
  }

  if (definition.data !== undefined && !isObject(definition.data)) {
    errors.push('data must be an object when present')
  }

  if (definition.datasets !== undefined && !Array.isArray(definition.datasets)) {
    errors.push('datasets must be an array when present')
  }

  return errors
}

function validateComponent(component, path, errors) {
  if (!isObject(component)) {
    errors.push(`${path} must be an object`)
    return
  }

  if (!isNonEmptyString(component.id)) errors.push(`${path}.id must be a non-empty string`)
  if (!isNonEmptyString(component.type)) errors.push(`${path}.type must be a non-empty string`)

  if (component.type === 'HtmlElement' && !isNonEmptyString(component.tag)) {
    errors.push(`${path}.tag must be a non-empty string for HtmlElement`)
  }

  if (component.props !== undefined && !isObject(component.props)) {
    errors.push(`${path}.props must be an object when present`)
  }

  if (component.children !== undefined) {
    if (!Array.isArray(component.children)) {
      errors.push(`${path}.children must be an array when present`)
    } else {
      component.children.forEach((child, index) => {
        validateComponent(child, `${path}.children[${index}]`, errors)
      })
    }
  }
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function relativeToWorkspace(path) {
  return relative(workspaceRoot, path).replace(/\\/g, '/')
}
