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

  assertPiniaDefinition(definition)
  return definition
}

export function generatePiniaSource(definition) {
  assertPiniaDefinition(definition)

  const { defineStoreId, constName } = definition.store
  const state = renderState(definition.state || {})
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

function renderState(state) {
  const entries = Object.entries(state)
  if (entries.length === 0) return ''

  return entries
    .map(([name, value], index) => {
      if (!IDENTIFIER_PATTERN.test(name)) {
        throw new Error(`state key "${name}" must be a valid JavaScript identifier`)
      }
      const suffix = index === entries.length - 1 ? '' : ','
      return `    ${name}: ${JSON.stringify(value, null, 2).replace(/\n/g, '\n    ')}${suffix}`
    })
    .join('\n')
}

function renderGetters(getters) {
  return getters
    .map((getter, index) => {
      const params = Array.isArray(getter.params) && getter.params.length > 0
        ? getter.params.join(', ')
        : 'state'
      const body = indentBody(getter.body || 'return undefined', 6)
      const suffix = index === getters.length - 1 ? '' : ','
      return `    ${getter.name}: (${params}) => {\n${body}\n    }${suffix}`
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
      return `    ${asyncPrefix}${action.name}(${params}) {\n${body}\n    }${suffix}`
    })
    .join('\n')
}

function indentBody(body, spaces) {
  const indent = ' '.repeat(spaces)
  return String(body)
    .split(/\r?\n/)
    .map((line) => `${indent}${line}`)
    .join('\n')
}

function escapeSingleQuote(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}
