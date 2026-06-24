function resolveValue(source) {
  if (!source) return undefined
  return typeof source.get === 'function' ? source.get() : source.value
}

function writeValue(source, value) {
  if (!source) return
  if (typeof source.set === 'function') {
    source.set(value)
    return
  }
  source.value = value
}

function resolveElement(componentRef) {
  const component = componentRef?.value ?? componentRef
  if (!component) return null
  if (component instanceof HTMLElement) return component
  return component.$el instanceof HTMLElement ? component.$el : null
}

function normalizeStyleValue(value) {
  if (value === null || value === undefined) return ''
  return String(value)
}

export function createBaseComponentApi(options = {}) {
  const { id = '', type = '', componentRef = null } = options

  const api = {
    id,
    type,
    ref: componentRef,
    getComponent() {
      return componentRef?.value ?? componentRef ?? null
    },
    getElement() {
      return resolveElement(componentRef)
    },
    focus() {
      const component = api.getComponent()
      if (typeof component?.focus === 'function') {
        component.focus()
        return true
      }
      const element = api.getElement()
      const focusable = element?.matches?.('input,textarea,select,button,[tabindex]')
        ? element
        : element?.querySelector?.('input,textarea,select,button,[tabindex]')
      focusable?.focus?.()
      return Boolean(focusable)
    },
    show(display = '') {
      const element = api.getElement()
      if (element) element.style.display = display
    },
    hide() {
      const element = api.getElement()
      if (element) element.style.display = 'none'
    },
    isVisible() {
      const element = api.getElement()
      return Boolean(element && element.style.display !== 'none')
    },
    enable() {
      api.setDisabled(false)
    },
    disable() {
      api.setDisabled(true)
    },
    setDisabled(disabled = true) {
      const element = api.getElement()
      if (!element) return
      element.toggleAttribute('aria-disabled', Boolean(disabled))
      element.classList.toggle('disabled', Boolean(disabled))
      element.querySelectorAll('input,textarea,select,button').forEach((target) => {
        target.disabled = Boolean(disabled)
      })
    },
    setClass(className = '') {
      const element = api.getElement()
      if (element) element.className = String(className)
    },
    addClass(className = '') {
      const element = api.getElement()
      if (element) element.classList.add(...String(className).split(/\s+/).filter(Boolean))
    },
    removeClass(className = '') {
      const element = api.getElement()
      if (element) element.classList.remove(...String(className).split(/\s+/).filter(Boolean))
    },
    toggleClass(className = '', force) {
      const element = api.getElement()
      if (!element) return false
      return element.classList.toggle(String(className), force)
    },
    setStyle(styleText = '') {
      const element = api.getElement()
      if (element) element.style.cssText = normalizeStyleValue(styleText)
    },
    setStyleValue(name, value) {
      const element = api.getElement()
      if (element && name) element.style.setProperty(String(name), normalizeStyleValue(value))
    },
  }

  return api
}

export { resolveElement, resolveValue, writeValue }
