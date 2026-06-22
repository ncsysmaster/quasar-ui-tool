const IDENTIFIER_PATTERN = /^[A-Za-z_$][A-Za-z0-9_$]*$/

export function createPiniaDefinition(options) {
  const definition = {
    schemaVersion: '0.1.0',
    tool: {
      name: 'quasar-tool',
      artifactType: 'pinia-store-definition'
    },
    store: {
      fileName: options.fileName,
      defineStoreId: options.defineStoreId,
      constName: options.constName,
      sourcePath: options.sourcePath,
      targetPath: options.targetPath
    },
    state: {
      rows: [],
      selectedRow: null,
      loading: false,
      error: null
    },
    getters: [],
    actions: []
  }

  if (options.ownerPage) {
    definition.store.ownerPage = options.ownerPage
  }
  if (options.importPath) {
    definition.store.importPath = options.importPath
  }
  if (options.importName) {
    definition.store.importName = options.importName
  }

  assertPiniaDefinition(definition)
  return definition
}

export function generatePiniaSource(definition) {
  assertPiniaDefinition(definition)

  const { defineStoreId, constName } = definition.store
  const state = renderState(
    definition.state || {},
    definition.designer?.stateNotes || {}
  )
  const getters = renderGetters(definition.getters || [])
  const actions = renderActions(definition.actions || [])

  return [
    "import { defineStore } from 'pinia'",
    '',
    `export const ${constName} = defineStore('${escapeSingleQuote(defineStoreId)}', {`,
    '  state: () => ({',
    state,
    '  }),',
    getters ? `  getters: {\n${getters}\n  },` : '  getters: {},',
    actions ? `  actions: {\n${actions}\n  }` : '  actions: {}',
    '})',
    ''
  ].join('\n')
}

export function assertPiniaDefinition(definition) {
  if (!definition || typeof definition !== 'object' || Array.isArray(definition)) {
    throw new Error('Pinia definition must be a JSON object')
  }

  if (!definition.store || typeof definition.store !== 'object') {
    throw new Error('store settings are required')
  }

  if (!String(definition.store.defineStoreId || '').trim()) {
    throw new Error('store.defineStoreId is required')
  }

  if (!IDENTIFIER_PATTERN.test(String(definition.store.constName || ''))) {
    throw new Error('store.constName must be a valid JavaScript identifier')
  }

  if (definition.store.importName !== undefined &&
      !IDENTIFIER_PATTERN.test(String(definition.store.importName || ''))) {
    throw new Error('store.importName must be a valid JavaScript identifier')
  }

  if (definition.state !== undefined && (!definition.state || typeof definition.state !== 'object' || Array.isArray(definition.state))) {
    throw new Error('state must be a JSON object')
  }

  if (definition.getters !== undefined && !Array.isArray(definition.getters)) {
    throw new Error('getters must be an array')
  }

  if (definition.actions !== undefined && !Array.isArray(definition.actions)) {
    throw new Error('actions must be an array')
  }

  for (const getter of definition.getters || []) {
    assertMemberName(getter, 'getter')
    assertParams(getter, 'getter')
  }

  for (const action of definition.actions || []) {
    assertMemberName(action, 'action')
    assertParams(action, 'action')
  }
}

function assertMemberName(member, kind) {
  if (!member || !IDENTIFIER_PATTERN.test(String(member.name || ''))) {
    throw new Error(`${kind} name must be a valid JavaScript identifier`)
  }
}

function assertParams(member, kind) {
  if (member.params !== undefined && !Array.isArray(member.params)) {
    throw new Error(`${kind} ${member.name} params must be an array`)
  }

  for (const param of member.params || []) {
    if (!IDENTIFIER_PATTERN.test(String(param))) {
      throw new Error(`${kind} ${member.name} contains an invalid parameter name`)
    }
  }
}

function renderState(state, notes) {
  return renderStateEntries(state, notes, [], 4)
}

function renderStateEntries(state, notes, parentPath, indentSize) {
  const entries = Object.entries(state)
  return entries
    .map(([name, value], index) => {
      const path = [...parentPath, name]
      const indent = ' '.repeat(indentSize)
      const comment = renderComment(notes[path.join('.')], indentSize)
      const suffix = index === entries.length - 1 ? '' : ','
      const property = `${indent}${renderPropertyName(name)}: ${renderStateValue(
        value,
        notes,
        path,
        indentSize
      )}${suffix}`
      return comment ? `${comment}\n${property}` : property
    })
    .join('\n')
}

function renderStateValue(value, notes, path, indentSize) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const entries = renderStateEntries(value, notes, path, indentSize + 2)
    if (!entries) return '{}'
    return `{\n${entries}\n${' '.repeat(indentSize)}}`
  }

  const serialized = JSON.stringify(value, null, 2)
  return String(serialized).replace(/\n/g, `\n${' '.repeat(indentSize)}`)
}

function renderPropertyName(name) {
  return IDENTIFIER_PATTERN.test(name) ? name : JSON.stringify(name)
}

function renderGetters(getters) {
  return getters
    .map((getter, index) => {
      const params = Array.isArray(getter.params) && getter.params.length > 0
        ? getter.params.join(', ')
        : 'state'
      const body = indentBody(getter.body || 'return undefined', 6)
      const suffix = index === getters.length - 1 ? '' : ','
      const comment = renderComment(getter.description, 4)
      const source = `    ${getter.name}: (${params}) => {\n${body}\n    }${suffix}`
      return comment ? `${comment}\n${source}` : source
    })
    .join('\n')
}

function renderActions(actions) {
  return actions
    .map((action, index) => {
      const params = (action.params || []).join(', ')
      const asyncPrefix = action.async === false ? '' : 'async '
      const body = indentBody(action.body || '', 6)
      const suffix = index === actions.length - 1 ? '' : ','
      const comment = renderComment(action.description, 4)
      const source = `    ${asyncPrefix}${action.name}(${params}) {\n${body}\n    }${suffix}`
      return comment ? `${comment}\n${source}` : source
    })
    .join('\n')
}

function indentBody(body, spaces) {
  const indent = ' '.repeat(spaces)
  return String(body)
    .split(/\r?\n/)
    .map((line) => line ? `${indent}${line}` : '')
    .join('\n')
}

function renderComment(value, spaces) {
  const lines = String(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length === 0) return ''
  const indent = ' '.repeat(spaces)
  return lines.map((line) => `${indent}// ${line}`).join('\n')
}

function escapeSingleQuote(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}
