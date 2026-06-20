import { existsSync } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const workspaceRoot = process.cwd()
const watchDir = resolve(workspaceRoot, process.argv[2] || '.src/pages')
const intervalMs = Number(process.env.QUASAR_TOOL_WATCH_INTERVAL || 500)
const debounceMs = 250
const generatorPath = join(dirname(fileURLToPath(import.meta.url)), 'generate-vue.mjs')

const snapshots = new Map()
const timers = new Map()
const running = new Set()
const pending = new Set()

if (!existsSync(watchDir)) {
  console.error(`[watch-vue] Watch directory does not exist: ${relativeToWorkspace(watchDir)}`)
  process.exit(1)
}

console.log(`[watch-vue] Watching ${relativeToWorkspace(watchDir)}/*.{json,js}`)
console.log('[watch-vue] Save a page JSON or its matching JS file to generate Vue.')

await initializeSnapshots()
setInterval(scanChangedFiles, intervalMs)

async function initializeSnapshots() {
  const files = await listSourceFiles()

  for (const filePath of files) {
    snapshots.set(filePath, await getSnapshot(filePath))
  }
}

async function scanChangedFiles() {
  const files = await listSourceFiles()
  const currentFiles = new Set(files)

  for (const filePath of snapshots.keys()) {
    if (!currentFiles.has(filePath)) {
      snapshots.delete(filePath)
    }
  }

  for (const filePath of files) {
    const previous = snapshots.get(filePath)
    const next = await getSnapshot(filePath)

    if (!previous) {
      snapshots.set(filePath, next)
      scheduleGenerate(toJsonPath(filePath))
      continue
    }

    if (previous.mtimeMs !== next.mtimeMs || previous.size !== next.size) {
      snapshots.set(filePath, next)
      scheduleGenerate(toJsonPath(filePath))
    }
  }
}

async function listSourceFiles() {
  const entries = await readdir(watchDir, { withFileTypes: true }).catch((error) => {
    console.error(`[watch-vue] Failed to read ${relativeToWorkspace(watchDir)}: ${error.message}`)
    return []
  })

  return entries
    .filter((entry) => entry.isFile() && ['.json', '.js'].includes(extname(entry.name).toLowerCase()))
    .map((entry) => join(watchDir, entry.name))
    .filter((filePath) => extname(filePath).toLowerCase() !== '.js' || existsSync(toJsonPath(filePath)))
}

function toJsonPath(filePath) {
  return extname(filePath).toLowerCase() === '.js'
    ? filePath.replace(/\.js$/i, '.json')
    : filePath
}

async function getSnapshot(filePath) {
  const info = await stat(filePath)

  return {
    mtimeMs: info.mtimeMs,
    size: info.size
  }
}

function scheduleGenerate(inputPath) {
  clearTimeout(timers.get(inputPath))

  timers.set(
    inputPath,
    setTimeout(() => {
      timers.delete(inputPath)
      generateChangedFile(inputPath)
    }, debounceMs)
  )
}

function generateChangedFile(inputPath) {
  if (running.has(inputPath)) {
    pending.add(inputPath)
    return
  }

  running.add(inputPath)
  console.log(`[watch-vue] Changed: ${relativeToWorkspace(inputPath)}`)

  const child = spawn(process.execPath, [generatorPath, inputPath], {
    cwd: workspaceRoot,
    stdio: 'inherit'
  })

  child.on('exit', () => {
    running.delete(inputPath)

    if (pending.delete(inputPath)) {
      scheduleGenerate(inputPath)
    }
  })
}

function relativeToWorkspace(path) {
  return path.replace(workspaceRoot, '').replace(/^[/\\]/, '').replaceAll('\\', '/')
}
