function parseModel(text) {
  try {
    return normalizeModel(JSON.parse(text || '{}'))
  } catch {
    return createEmptyModel()
  }
}

function normalizeModel(model) {
  const next = model && typeof model === 'object' ? model : createEmptyModel()
  next.schemaVersion ||= '0.1.0'
  next.tool ||= { name: 'quasar-tool', artifactType: 'page-definition' }
  next.page ||= { id: 'Page', name: 'Page', framework: 'quasar', component: 'QPage' }
  next.data ||= {}
  next.components ||= []
  migrateComponentStyles(next.components)
  next.script ||= { src: `${next.page.id || 'Page'}.js` }
  next.script.src ||= `${next.page.id || 'Page'}.js`
  next.datasets ||= inferDatasets(next)
  return next
}

function migrateComponentStyles(components) {
  for (const component of components || []) {
    if (component.style === undefined && component.props?.style !== undefined) {
      component.style = component.props.style
    }

    if (component.props?.style !== undefined) {
      delete component.props.style
      if (Object.keys(component.props).length === 0) delete component.props
    }

    migrateComponentStyles(component.children)
  }
}

function createEmptyModel() {
  return {
    schemaVersion: '0.1.0',
    tool: { name: 'quasar-tool', artifactType: 'page-definition' },
    page: { id: 'Page', name: 'Page', framework: 'quasar', component: 'QPage' },
    data: {},
    components: [{ id: 'page1', type: 'QPage', props: { padding: true }, children: [] }],
    script: { src: 'Page.js', setup: '' },
    datasets: [{ name: 'defaultDataset', fields: [] }]
  }
}

function stringifyModel(model) {
  const serializable = {
    ...model,
    script: {
      ...(model.script || {}),
      src: model.script?.src || `${model.page?.id || 'Page'}.js`
    }
  }
  delete serializable.script.setup
  return `${JSON.stringify(serializable, null, 2)}\n`
}

function inferDatasets(model) {
  const fields = Object.keys(model.data || {}).map((name) => ({
    name,
    label: name,
    type: Array.isArray(model.data[name]) ? 'object' : typeof model.data[name],
    required: false
  }))
  return [{ name: 'defaultDataset', fields }]
}

function ensureRootPage(model) {
  if (!model.components.length) {
    model.components.push({ id: 'page1', type: 'QPage', props: { padding: true }, children: [] })
  }
  return model.components[0]
}

function ensureDataset(model) {
  model.datasets ||= [{ name: 'defaultDataset', fields: [] }]
  model.datasets[0].fields ||= []
  return model.datasets[0]
}

function findComponent(components, id) {
  for (const component of components || []) {
    if (component.id === id) return component
    const child = findComponent(component.children, id)
    if (child) return child
  }
  return null
}

function removeComponent(components, id) {
  if (!Array.isArray(components)) return false
  const index = components.findIndex((component) => component.id === id)
  if (index >= 0) {
    components.splice(index, 1)
    return true
  }
  return components.some((component) => removeComponent(component.children, id))
}

function firstSelectableId(components) {
  return components?.[0]?.id || ''
}

function createComponentId(type) {
  const base = type.replace(/^Q/, '').replace(/[^A-Za-z0-9]/g, '').toLowerCase() || 'component'
  return `${base}${Date.now().toString(36).slice(-5)}`
}

function coerceValue(value) {
  if (value === 'true') return true
  if (value === 'false') return false
  if (value === '') return ''
  const numericValue = Number(value)
  if (!Number.isNaN(numericValue) && String(numericValue) === String(value)) return numericValue
  return value
}

module.exports = {
  coerceValue,
  createComponentId,
  createEmptyModel,
  ensureDataset,
  ensureRootPage,
  findComponent,
  firstSelectableId,
  parseModel,
  removeComponent,
  stringifyModel
}
