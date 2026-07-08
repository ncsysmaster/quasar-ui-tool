function getAgGridPreviewRenderersScript() {
  return [
    createAgGridPreviewGroupRowCellRenderer,
    createAgGridPreviewBodyLayoutCellRenderer,
  ]
    .map((fn) => fn.toString())
    .join("\n\n")
}


      function createAgGridPreviewGroupRowCellRenderer(options) {
        return (params) => {
          const data = params.data || {}
          const children = Array.isArray(options.children) ? options.children : []
          const stop = (event) => event.stopPropagation()
          let modeRefreshTimer = null
          const scheduleModeRefresh = () => {
            if (modeRefreshTimer || !params.api || !params.node) return
            modeRefreshTimer = setTimeout(() => {
              modeRefreshTimer = null
              params.api?.refreshCells?.({ rowNodes: [params.node], columns: ['mode'], force: false })
            }, 0)
          }
          const setValue = (field, value) => {
            if (!field || !params.data) return
            const previousMode = params.data.mode
            params.data[field] = value
            if (params.data.mode !== 'C' && params.data.mode !== 'D') params.data.mode = 'U'
            if (params.data.mode !== previousMode) scheduleModeRefresh()
          }
          const isTextEditMode = (input) => input?.dataset?.qtAgTextEditMode === 'true'
          const setTextEditMode = (input, enabled) => {
            if (!input || input.dataset.qtAgEditable !== 'true') return false
            input.dataset.qtAgTextEditMode = enabled ? 'true' : 'false'
            input.readOnly = !enabled
            if (enabled) {
              setTimeout(() => {
                input.focus?.()
                input.select?.()
              }, 0)
            }
            return true
          }
          const handleKeydown = (event, input) => {
            if (event.key === 'F2') {
              event.preventDefault()
              event.stopPropagation()
              setTextEditMode(input, true)
              return
            }
            if (event.key === 'Escape' && isTextEditMode(input)) {
              event.preventDefault()
              event.stopPropagation()
              setTextEditMode(input, false)
              return
            }
            if (event.key === 'Enter' && event.shiftKey) {
              event.preventDefault()
              event.stopPropagation()
              setValue(input.dataset.qtAgGroupField || '', input.value)
              setTextEditMode(input, false)
              return
            }
          }
          const createInput = (field, label, className, editable = true, inputIndex = 0) => {
            const input = document.createElement('input')
            input.className = className
            input.dataset.qtAgGroupInputIndex = String(inputIndex)
            input.dataset.qtAgGroupField = field || ''
            input.dataset.qtAgEditable = editable === false ? 'false' : 'true'
            input.dataset.qtAgTextEditMode = 'false'
            input.value = data[field] == null ? '' : String(data[field])
            input.placeholder = label || field || ''
            input.readOnly = true
            input.addEventListener('mousedown', stop)
            input.addEventListener('click', stop)
            input.addEventListener('dblclick', (event) => {
              event.stopPropagation()
              setTextEditMode(input, true)
            })
            input.addEventListener('keydown', (event) => handleKeydown(event, input))
            input.addEventListener('change', () => setValue(field, input.value))
            input.addEventListener('blur', () => {
              setValue(field, input.value)
              setTextEditMode(input, false)
            })
            return input
          }
          const root = document.createElement('div')
          root.className = 'qt-ag-group-row-editor'
          root.style.setProperty('--qt-group-child-count', String(Math.max(1, children.length)))
          root.addEventListener('mousedown', stop)
          root.addEventListener('click', stop)
          root.addEventListener('dblclick', stop)
          root.appendChild(createInput(options.groupField, options.groupLabel, 'qt-ag-group-input qt-ag-group-main', true, 0))
          const childWrap = document.createElement('div')
          childWrap.className = 'qt-ag-group-children'
          children.forEach((child, index) => {
            childWrap.appendChild(createInput(child.field, child.label, 'qt-ag-group-input', child.editable, index + 1))
          })
          root.appendChild(childWrap)
          return root
        }
      }


      function createAgGridPreviewBodyLayoutCellRenderer(region) {
        return (params) => {
          const data = params.data || {}
          const stop = (event) => event.stopPropagation()
          let modeRefreshTimer = null
          const scheduleModeRefresh = () => {
            if (modeRefreshTimer || !params.api || !params.node) return
            modeRefreshTimer = setTimeout(() => {
              modeRefreshTimer = null
              params.api?.refreshCells?.({ rowNodes: [params.node], columns: ['mode'], force: false })
            }, 0)
          }
          const setValue = (field, value) => {
            if (!field || !params.data) return
            const previousMode = params.data.mode
            params.data[field] = value
            if (params.data.mode !== 'C' && params.data.mode !== 'D') params.data.mode = 'U'
            if (params.data.mode !== previousMode) scheduleModeRefresh()
          }
          const isTextEditMode = (input) => input?.dataset?.qtAgTextEditMode === 'true'
          const setTextEditMode = (input, enabled) => {
            if (!input || input.dataset.qtAgEditable !== 'true') return false
            input.dataset.qtAgTextEditMode = enabled ? 'true' : 'false'
            input.readOnly = !enabled
            if (enabled) {
              setTimeout(() => {
                input.focus?.()
                input.select?.()
              }, 0)
            }
            return true
          }
          const createInput = (cell) => {
            const input = document.createElement('input')
            input.className = 'qt-ag-layout-input'
            input.dataset.qtAgLayoutInputIndex = String(cell.inputIndex || 0)
            input.dataset.qtAgLayoutCellId = cell.cellId || ''
            input.dataset.qtAgLayoutField = cell.field || ''
            input.dataset.qtAgLayoutRowStart = String(Math.max(0, Number(cell.rowIndex || 0)))
            input.dataset.qtAgLayoutRowEnd = String(Math.max(0, Number(cell.rowIndex || 0)) + Math.max(1, Number(cell.rowspan || 1)) - 1)
            input.dataset.qtAgLayoutColStart = String(Math.max(0, Number(cell.localStart || 0)))
            input.dataset.qtAgLayoutColEnd = String(Math.max(0, Number(cell.localStart || 0)) + Math.max(1, Number(cell.span || 1)) - 1)
            input.value = data[cell.field] == null ? '' : String(data[cell.field])
            input.placeholder = cell.label || cell.field || ''
            input.style.gridColumn = String((cell.localStart || 0) + 1) + ' / span ' + String(Math.max(1, cell.span || 1))
            input.style.gridRow = String((cell.rowIndex || 0) + 1) + ' / span ' + String(Math.max(1, cell.rowspan || 1))
            input.dataset.qtAgEditable = cell.editable === false ? 'false' : 'true'
            input.dataset.qtAgTextEditMode = 'false'
            input.readOnly = true
            input.addEventListener('mousedown', stop)
            input.addEventListener('click', stop)
            input.addEventListener('dblclick', (event) => {
              event.stopPropagation()
              setTextEditMode(input, true)
            })
            input.addEventListener('keydown', (event) => {
              if (event.key === 'F2') {
                event.preventDefault()
                event.stopPropagation()
                setTextEditMode(input, true)
                return
              }
              if (event.key === 'Escape' && isTextEditMode(input)) {
                event.preventDefault()
                event.stopPropagation()
                setTextEditMode(input, false)
                return
              }
              if (event.key === 'Enter' && event.shiftKey) {
                event.preventDefault()
                event.stopPropagation()
                setValue(input.dataset.qtAgLayoutField || '', input.value)
                setTextEditMode(input, false)
                return
              }
            })
            input.addEventListener('change', () => setValue(cell.field, input.value))
            input.addEventListener('blur', () => {
              setValue(cell.field, input.value)
              setTextEditMode(input, false)
            })
            return input
          }
          const root = document.createElement('div')
          root.className = 'qt-ag-layout-row-editor'
          root.style.setProperty('--qt-layout-column-count', String(Math.max(1, region.span || 1)))
          root.style.setProperty('--qt-layout-row-count', String(Math.max(1, region.rowCount || 1)))
          root.addEventListener('mousedown', stop)
          root.addEventListener('click', stop)
          root.addEventListener('dblclick', stop)
          ;(region.cells || []).forEach((cell) => root.appendChild(createInput(cell)))
          return root
        }
      }

module.exports = {
  getAgGridPreviewRenderersScript,
}
