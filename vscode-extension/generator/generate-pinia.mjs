import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, extname, join, relative, resolve, sep } from 'node:path'
import { generatePiniaSource } from './pinia-store.mjs'

const workspaceRoot = process.cwd()
const sourceRoot = resolve(workspaceRoot, '.src/store')
const targetRoot = resolve(workspaceRoot, 'src/store')

main().catch((error) => {
  console.error(`[generate-pinia] ${error.message}`)
  process.exitCode = 1
})

async function main() {
  const inputPaths = process.argv.length > 2
    ? process.argv.slice(2).map((item) => resolve(workspaceRoot, item))
    : await findJsonFiles(sourceRoot)

  if (inputPaths.length === 0) {
    throw new Error('No Pinia definition JSON files found in .src/store')
  }

  for (const inputPath of inputPaths) {
    assertInsideSourceRoot(inputPath)
    const definition = await readDefinition(inputPath)
    const relativePath = relative(sourceRoot, inputPath)
    const outputPath = definition.store?.targetPath
      ? resolve(workspaceRoot, definition.store.targetPath)
      : resolve(targetRoot, relativePath).replace(/\.json$/i, '.js')
    assertInsideStoreTarget(outputPath)
    const source = generatePiniaSource(definition)

    await mkdir(dirname(outputPath), { recursive: true })
    await writeFile(outputPath, source, 'utf8')
    console.log(`[generate-pinia] ${relative(workspaceRoot, inputPath)} -> ${relative(workspaceRoot, outputPath)}`)
  }
}

function assertInsideStoreTarget(outputPath) {
  const pathFromRoot = relative(targetRoot, outputPath)
  const isAllowed = pathFromRoot !== '..' && !pathFromRoot.startsWith(`..${sep}`)
  if (!isAllowed || extname(outputPath).toLowerCase() !== '.js') {
    throw new Error('store.targetPath must mirror .src/store inside src/store and use .js')
  }
}

async function findJsonFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true }).catch((error) => {
    if (error.code === 'ENOENT') return []
    throw error
  })
  const files = []

  for (const entry of entries) {
    const entryPath = join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...await findJsonFiles(entryPath))
    } else if (entry.isFile() && extname(entry.name).toLowerCase() === '.json') {
      files.push(entryPath)
    }
  }

  return files
}

async function readDefinition(inputPath) {
  const raw = await readFile(inputPath, 'utf8')
  try {
    return JSON.parse(raw)
  } catch (error) {
    throw new Error(`${relative(workspaceRoot, inputPath)} is not valid JSON: ${error.message}`)
  }
}

function assertInsideSourceRoot(inputPath) {
  const pathFromSource = relative(sourceRoot, inputPath)
  if (pathFromSource.startsWith('..') || resolve(sourceRoot, pathFromSource) !== resolve(inputPath)) {
    throw new Error(`${relative(workspaceRoot, inputPath)} must be inside .src/store`)
  }
}
