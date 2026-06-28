export function escapeJavaScriptString(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

export function escapeAttribute(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function escapeTemplateText(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function toIdentifier(value) {
  return String(value || 'component')
    .replace(/[^A-Za-z0-9_$]/g, '_')
    .replace(/^(?=\d)/, '_')
}

export function isAssignableExpression(expression) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*$/.test(expression || '')
}
