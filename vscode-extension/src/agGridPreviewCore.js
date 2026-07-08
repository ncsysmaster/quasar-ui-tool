function getAgGridPreviewCoreScript() {
  return [
    buildAgGridPreviewProps,
    usesTablePreviewExpandedBodyRows,
    createAgGridPreviewSampleRow,
    createAgGridPreviewDisplayRows,
    getAgGridPreviewDisplayRowClass,
    getAgGridPreviewLogicalRowSpan,
    getAgGridPreviewLogicalCellClass,
    getAgGridPreviewLogicalCellToneClass,
    normalizeTablePreviewRows,
    getAgGridPreviewStyle,
    findStyleDeclarationValue,
    toAgGridPreviewColumnDef,
    buildTablePreviewColumnDefs,
    countTablePreviewLeafColumns,
    buildTablePreviewColumnGroups,
    buildTablePreviewGroupBodyChildren,
    mergeAgGridPreviewCellClass,
    shouldRenderPreviewColumnLeafAtDepth,
    hasPreviewColumnGroupHeaderBelow,
    prepareTablePreviewColumnsForHeaderRows,
    getTablePreviewExistingColumnHeaders,
    getTableColumnDisplayText,
    isTablePreviewModeColumn,
    isTablePreviewSelectionColumn,
    isTablePreviewUtilityColumn,
    getTablePreviewColumnGroupName,
    getTablePreviewColumnGroupFieldName,
    getTableHeaderRows,
    getTableRowRows,
    getTablePreviewColumns,
    getAgGridPreviewColumnSizing,
  ]
    .map((fn) => fn.toString())
    .join("\n\n")
}

      function buildAgGridPreviewProps(component, scope) {
        const pagination = component.table?.pagination || {}
        const selection = component.table?.selection || component.props?.selection || 'none'
        const rows = resolveValue(component.dynamicProps?.rows || component.table?.rowsBinding, scope)
        const rowData = Array.isArray(rows) ? rows : (Array.isArray(component.props?.rows) ? component.props.rows : [])
        const previewRows = rowData.length > 0 ? rowData : [createAgGridPreviewSampleRow(component)]
        const rowKey = component.table?.rowKey || component.props?.rowKey || 'id'
        const headerRows = getTableHeaderRows(component)
        const headerHeight = headerRows > 1 ? 32 : 48
        const rowRows = getTableRowRows(component)
        const expandedBodyRows = usesTablePreviewExpandedBodyRows(component)
        const rowHeight = expandedBodyRows ? 42 : 42 * rowRows
        const props = {
          class: 'qt-ag-grid',
          style: getAgGridPreviewStyle(component),
          rowData: expandedBodyRows
            ? createAgGridPreviewDisplayRows(normalizeTablePreviewRows(previewRows), rowRows, rowKey)
            : normalizeTablePreviewRows(previewRows),
          columnDefs: buildTablePreviewColumnDefs(component),
          defaultColDef: {
            resizable: true,
            sortable: true,
            filter: true,
            minWidth: 70
          },
          headerHeight,
          rowHeight,
          animateRows: true,
          singleClickEdit: false,
          getRowId: (params) => String(params.data?.__qtDisplayRowId ?? params.data?.__qtRowId ?? params.data?.[rowKey] ?? params.node?.rowIndex ?? ''),
          onRowClicked: (event) => {
            event.event?.stopPropagation?.()
            if (component.id !== selectedId) vscode.postMessage({ type: 'select', id: component.id })
          }
        }
        if (headerRows > 1) props.groupHeaderHeight = 32
        if (expandedBodyRows) {
          props.suppressRowTransform = true
          props.enableCellSpan = true
          props.getRowClass = getAgGridPreviewDisplayRowClass
        }

        if (pagination.mode !== 'none') {
          props.pagination = true
          props.paginationPageSize = Number(pagination.rowsPerPage) || 10
          props.paginationPageSizeSelector = Array.isArray(pagination.rowsPerPageOptions)
            ? pagination.rowsPerPageOptions
            : [10, 20, 50, 0]
        }

        if (selection === 'single' || selection === 'multiple') {
          props.rowSelection = {
            mode: selection === 'multiple' ? 'multiRow' : 'singleRow',
            checkboxes: false,
            headerCheckbox: false,
            enableClickSelection: false
          }
          props.onSelectionChanged = (event) => {
            if (component.models?.selected) {
              setResolvedValue(component.models.selected, event.api.getSelectedRows(), scope)
            }
          }
        }

        if (component.table?.loadingBinding) {
          props.loading = Boolean(resolveValue(component.table.loadingBinding, scope))
        }

        return props
      }


      function usesTablePreviewExpandedBodyRows(component) {
        return getTableRowRows(component) > 1 && Array.isArray(component?.bodyRows)
      }


      function createAgGridPreviewSampleRow(component) {
        const row = {
          __qtPreviewSampleRow: true,
          __qtRowId: '__qt_preview_sample__',
          mode: 'R'
        }
        ;(Array.isArray(component?.columns) ? component.columns : []).forEach((column) => {
          const field = String(column?.field || column?.name || '').trim()
          if (!field || field === 'mode' || field === '__qtSelection') return
          row[field] = String(column?.label || column?.name || field || '')
        })
        return row
      }


      function createAgGridPreviewDisplayRows(rows, rowRows, rowKey) {
        const sourceRows = Array.isArray(rows) ? rows : []
        const count = Math.min(3, Math.max(1, Math.round(Number(rowRows) || 1)))
        if (count <= 1) return sourceRows
        return sourceRows.flatMap((row, sourceIndex) => {
          const source = row && typeof row === 'object' ? row : {}
          const sourceKey = source.__qtRowId ?? (rowKey ? source[rowKey] : undefined) ?? sourceIndex
          return Array.from({ length: count }, (_, rowIndex) => ({
            ...source,
            rowIdx: rowIndex + 1,
            __qtSourceRowIndex: sourceIndex,
            __qtDisplayRowId: String(sourceKey) + '_' + String(rowIndex + 1),
            __qtDisplayRowCount: count
          }))
        })
      }


      function getAgGridPreviewDisplayRowClass(params) {
        const data = params?.data || {}
        const sourceIndex = Number.isInteger(Number(data.__qtSourceRowIndex))
          ? Number(data.__qtSourceRowIndex)
          : Number(params?.node?.rowIndex || 0)
        const rowIdx = Number(data.rowIdx || 1)
        const rowCount = Math.max(1, Number(data.__qtDisplayRowCount || 1))
        return [
          sourceIndex % 2 === 0 ? 'qt-ag-logical-row-even' : 'qt-ag-logical-row-odd',
          rowIdx <= 1 ? 'qt-ag-logical-row-start' : 'qt-ag-logical-row-continuation',
          rowIdx < rowCount ? 'qt-ag-logical-row-not-last' : 'qt-ag-logical-row-last'
        ].join(' ')
      }


      function getAgGridPreviewLogicalRowSpan(params) {
        if (params?.node?.rowPinned) return 1
        const rowIdx = Math.max(1, Number(params?.data?.rowIdx || 1))
        if (rowIdx > 1) return 1
        return Math.max(1, Number(params?.data?.__qtDisplayRowCount || 1))
      }


      function getAgGridPreviewLogicalCellClass(params, baseClass) {
        const classes = [baseClass, 'qt-ag-rowspan-cell', getAgGridPreviewLogicalCellToneClass(params)].filter(Boolean)
        const rowIdx = Math.max(1, Number(params?.data?.rowIdx || 1))
        if (rowIdx > 1) classes.push('qt-ag-covered-cell')
        return classes.join(' ')
      }


      function getAgGridPreviewLogicalCellToneClass(params) {
        const data = params?.data || {}
        const sourceIndex = Number.isInteger(Number(data.__qtSourceRowIndex))
          ? Number(data.__qtSourceRowIndex)
          : Number(params?.node?.rowIndex || 0)
        return sourceIndex % 2 === 0 ? 'qt-ag-logical-cell-even' : 'qt-ag-logical-cell-odd'
      }


      function normalizeTablePreviewRows(rows) {
        return (Array.isArray(rows) ? rows : []).map((row) => {
          if (!row || typeof row !== 'object') return row
          if (!['R', 'C', 'U', 'D'].includes(String(row.mode || '').toUpperCase())) row.mode = 'R'
          return row
        })
      }


      function getAgGridPreviewStyle(component) {
        const declarations = String(component.style || '')
          .split(';')
          .map((item) => item.trim())
          .filter(Boolean)
        const width = findStyleDeclarationValue(declarations, 'width') || '100%'
        const height = findStyleDeclarationValue(declarations, 'height') || '360px'
        const rest = declarations.filter((item) => {
          const property = item.slice(0, item.indexOf(':')).trim().toLowerCase()
          return property !== 'width' && property !== 'height'
        })
        return ['width: ' + width, 'height: ' + height].concat(rest).join('; ')
      }


      function findStyleDeclarationValue(declarations, propertyName) {
        const target = String(propertyName || '').trim().toLowerCase()
        const declaration = declarations.find((item) => {
          const separator = item.indexOf(':')
          return separator >= 0 && item.slice(0, separator).trim().toLowerCase() === target
        })
        return declaration ? declaration.slice(declaration.indexOf(':') + 1).trim() : ''
      }


      function toAgGridPreviewColumnDef(column, options = {}) {
        const sizing = getAgGridPreviewColumnSizing(column)
        const align = ['left', 'center', 'right'].includes(column?.align) ? column.align : ''
        const type = column?.type || 'text'
        const groupRowCell = options.groupRowCell || null
        const bodyRegion = options.bodyRegion || null
        const bodyConfig = options.bodyConfig || null
        const logicalRowSpan = Boolean(options.logicalRowSpan)
        const modeColumn = isTablePreviewModeColumn(column)
        const selectionColumn = isTablePreviewSelectionColumn(column)
        const def = {
          colId: String(column?.name || column?.field || 'column'),
          headerName: String(column?.label || column?.name || column?.field || 'Column'),
          field: String(column?.field || column?.name || 'column'),
          sortable: Boolean(column?.sortable),
          resizable: true,
          editable: Boolean(column?.editable),
          ...sizing,
          ...(align ? { cellStyle: { textAlign: align } } : {}),
          ...(modeColumn ? {
            cellClass: 'qt-table-mode-cell',
            editable: false,
            headerName: '',
            minWidth: 42,
            maxWidth: 52
          } : {}),
          ...(selectionColumn ? {
            checkboxSelection: (params) => !params.node?.rowPinned && Number(params.data?.rowIdx || 1) <= 1,
            headerCheckboxSelection: column?.selectionMode === 'multiple',
            showDisabledCheckboxes: false,
            cellClass: 'qt-ag-selection-span-cell',
            editable: false,
            headerName: '',
            sortable: false,
            filter: false,
            resizable: false,
            suppressMovable: true,
            lockPosition: 'left',
            minWidth: 44,
            maxWidth: 58
          } : {})
        }
        if (type === 'number') def.type = 'numericColumn'
        if (type === 'checkbox') def.cellRenderer = 'agCheckboxCellRenderer'
        if (type === 'actions') {
          def.cellRenderer = () => '<button type="button" class="qt-ag-action-btn">편집</button><button type="button" class="qt-ag-action-btn qt-ag-action-danger">삭제</button>'
          def.sortable = false
          def.filter = false
        }
        if (selectionColumn) {
          delete def.cellRenderer
        }
        if (logicalRowSpan && selectionColumn) {
          def.rowSpan = (params) => getAgGridPreviewLogicalRowSpan(params)
          def.cellClass = (params) => getAgGridPreviewLogicalCellClass(params, 'qt-ag-selection-span-cell')
        } else if (logicalRowSpan && modeColumn) {
          def.rowSpan = (params) => getAgGridPreviewLogicalRowSpan(params)
          def.cellClass = (params) => getAgGridPreviewLogicalCellClass(params, 'qt-table-mode-cell')
        }
        if (groupRowCell) {
          delete def.cellRenderer
          def.editable = false
          def.qtGroupRowCell = true
          def.cellClass = mergeAgGridPreviewCellClass(def.cellClass, 'qt-ag-group-row-cell')
          def.colSpan = (params) => params.node?.rowPinned ? 1 : groupRowCell.span
          def.cellRenderer = createAgGridPreviewGroupRowCellRenderer(groupRowCell)
        }
        if (bodyRegion) {
          delete def.cellRenderer
          def.editable = false
          def.qtGroupRowCell = true
          def.cellClass = mergeAgGridPreviewCellClass(def.cellClass, 'qt-ag-group-row-cell')
          def.colSpan = (params) => params.node?.rowPinned ? 1 : bodyRegion.span
          def.cellRenderer = createAgGridPreviewBodyLayoutCellRenderer(bodyRegion)
        }
        if (bodyConfig) {
          def.qtBodyConfig = bodyConfig
          def.editable = (params) => Boolean(column?.editable) && isAgGridPreviewBodyCellEditable(params, bodyConfig)
          def.suppressNavigable = (params) => !getAgGridPreviewBodyCellConfig(params, bodyConfig)
          def.valueGetter = (params) => getAgGridPreviewBodyCellValue(params, bodyConfig)
          def.valueSetter = (params) => setAgGridPreviewBodyCellValue(params, bodyConfig)
          def.colSpan = (params) => getAgGridPreviewBodyCellSpan(params, bodyConfig, 'colspan')
          def.rowSpan = (params) => getAgGridPreviewBodyCellSpan(params, bodyConfig, 'rowspan')
          def.cellClass = (params) => getAgGridPreviewBodyCellClass(params, bodyConfig)
        }
        return def
      }


      function buildTablePreviewColumnDefs(component) {
        const groupDepth = getTableHeaderRows(component) - 1
        const sourceColumns = Array.isArray(component?.headerRows) || Array.isArray(component?.bodyRows)
          ? applyTablePreviewHeaderLayoutToColumns(getTablePreviewColumns(component), component.headerRows, getTableHeaderRows(component))
          : getTablePreviewColumns(component)
        const useExpandedBodyRows = usesTablePreviewExpandedBodyRows(component)
        const logicalRowSpan = getTableRowRows(component) > 1
        const bodyRegions = useExpandedBodyRows ? new Map() : createTablePreviewBodyLayoutRegions(sourceColumns, component.bodyRows, getTableRowRows(component))
        const bodyConfigs = useExpandedBodyRows ? createTablePreviewBodyLayoutColumnConfigs(sourceColumns, component.bodyRows, getTableRowRows(component)) : new Map()
        const columns = groupDepth > 0
          ? prepareTablePreviewColumnsForHeaderRows(sourceColumns, groupDepth)
          : sourceColumns
        const rowRows = getTableRowRows(component)
        if (groupDepth <= 0) {
          return columns.map((column, index) =>
            toAgGridPreviewColumnDef(column, {
              bodyRegion: bodyRegions.get(getTablePreviewColumnKey(column)) || bodyRegions.get(index),
              bodyConfig: bodyConfigs.get(getTablePreviewColumnKey(column)) || bodyConfigs.get(index),
              logicalRowSpan
            })
          )
        }
        return buildTablePreviewColumnGroups(columns, groupDepth, 0, rowRows, bodyRegions, 0, bodyConfigs, logicalRowSpan)
      }


      function countTablePreviewLeafColumns(columns) {
        return (Array.isArray(columns) ? columns : []).reduce(
          (count, column) => count + (Array.isArray(column?.columns) ? countTablePreviewLeafColumns(column.columns) : 1),
          0
        )
      }


      function buildTablePreviewColumnGroups(columns, groupDepth, depth, rowRows, bodyRegions = new Map(), startIndex = 0, bodyConfigs = new Map(), logicalRowSpan = false) {
        if (depth >= groupDepth) {
          return columns.map((column, index) => {
            const globalIndex = startIndex + index
            return toAgGridPreviewColumnDef(column, {
              bodyRegion: bodyRegions.get(getTablePreviewColumnKey(column)) || bodyRegions.get(globalIndex),
              bodyConfig: bodyConfigs.get(getTablePreviewColumnKey(column)) || bodyConfigs.get(globalIndex),
              logicalRowSpan
            })
          })
        }
        const groups = []
        let index = 0
        while (index < (columns || []).length) {
          if (shouldRenderPreviewColumnLeafAtDepth(columns, index, depth, groupDepth)) {
            groups.push({ leaf: columns[index] })
            index += 1
            continue
          }
          const column = columns[index]
          const headerName = getTablePreviewColumnGroupName(column, depth)
          const key = headerName || '__blank_' + depth + '_' + index
          const groupColumns = [column]
          index += 1
          while (
            index < columns.length &&
            !shouldRenderPreviewColumnLeafAtDepth(columns, index, depth, groupDepth) &&
            getTablePreviewColumnGroupName(columns[index], depth) === headerName
          ) {
            groupColumns.push(columns[index])
            index += 1
          }
          groups.push({ key, headerName, columns: groupColumns })
        }
        let leafOffset = startIndex
        return groups.map((group) => {
          const groupStartIndex = leafOffset
          const groupLeafCount = group.leaf ? 1 : countTablePreviewLeafColumns(group.columns)
          leafOffset += groupLeafCount
          if (group.leaf) {
            return toAgGridPreviewColumnDef(group.leaf, {
              bodyRegion: bodyRegions.get(getTablePreviewColumnKey(group.leaf)) || bodyRegions.get(groupStartIndex),
              bodyConfig: bodyConfigs.get(getTablePreviewColumnKey(group.leaf)) || bodyConfigs.get(groupStartIndex),
              logicalRowSpan
            })
          }
          const shouldRenderGroupBodyCell = bodyRegions.size === 0 && bodyConfigs.size === 0 && rowRows > 1 && depth === groupDepth - 1 && group.columns.length > 0
          return {
            headerName: group.headerName,
            marryChildren: true,
            children: shouldRenderGroupBodyCell
              ? buildTablePreviewGroupBodyChildren(group, depth, logicalRowSpan)
              : buildTablePreviewColumnGroups(group.columns, groupDepth, depth + 1, rowRows, bodyRegions, groupStartIndex, bodyConfigs, logicalRowSpan)
          }
        })
      }


      function buildTablePreviewGroupBodyChildren(group, depth, logicalRowSpan = false) {
        const groupField = getTablePreviewColumnGroupFieldName(group.columns[0], depth, group.headerName)
        const children = group.columns.map((column) => ({
          field: String(column?.field || column?.name || 'column'),
          label: String(column?.label || column?.name || column?.field || 'Column'),
          editable: column?.editable !== false
        }))
        return group.columns.map((column, index) => toAgGridPreviewColumnDef(
          column,
          index === 0
            ? {
                groupRowCell: {
                  span: group.columns.length,
                  groupField,
                groupLabel: group.headerName,
                children
                },
                logicalRowSpan
              }
            : { logicalRowSpan }
        ))
      }


      function mergeAgGridPreviewCellClass(currentClass, nextClass) {
        if (!currentClass) return nextClass
        if (typeof currentClass === 'string') return currentClass + ' ' + nextClass
        if (Array.isArray(currentClass)) return currentClass.concat(nextClass)
        return currentClass
      }


      function shouldRenderPreviewColumnLeafAtDepth(columns, index, depth, groupDepth) {
        const column = columns[index]
        if (column?.__qtHeaderLeafDepth === depth) return true
        const headerName = getTablePreviewColumnGroupName(column, depth)
        if (!headerName) return true
        if (column?.__qtForceHeaderRows) return false
        if (Array.isArray(column?.__qtGeneratedHeaders) && column.__qtGeneratedHeaders[depth]) return false
        const displayName = getTableColumnDisplayText(column)
        const hasAdjacentSameHeader =
          getTablePreviewColumnGroupName(columns[index - 1], depth) === headerName ||
          getTablePreviewColumnGroupName(columns[index + 1], depth) === headerName
        const hasDeeperHeader = hasPreviewColumnGroupHeaderBelow(column, depth, groupDepth)
        return !hasAdjacentSameHeader && !hasDeeperHeader && headerName === displayName
      }


      function hasPreviewColumnGroupHeaderBelow(column, depth, groupDepth) {
        for (let index = depth + 1; index < groupDepth; index += 1) {
          if (getTablePreviewColumnGroupName(column, index)) return true
        }
        return false
      }


      function prepareTablePreviewColumnsForHeaderRows(columns, groupDepth) {
        return (Array.isArray(columns) ? columns : []).map((column) => {
          const next = { ...column }
          const headers = getTablePreviewExistingColumnHeaders(next).slice(0, groupDepth)
          const generatedHeaders = []

          for (let index = 0; index < groupDepth; index += 1) {
            if (!String(headers[index] || '').trim() && !isTablePreviewUtilityColumn(next)) {
              headers[index] = getTableColumnDisplayText(next)
              generatedHeaders[index] = true
            } else {
              headers[index] = String(headers[index] || '').trim()
              generatedHeaders[index] = false
            }
          }

          if (headers.some(Boolean)) next.headers = headers
          if (generatedHeaders.some(Boolean)) next.__qtGeneratedHeaders = generatedHeaders
          return next
        })
      }


      function getTablePreviewExistingColumnHeaders(column) {
        if (Array.isArray(column?.headers)) return column.headers.slice()
        return [
          column?.header1 ?? column?.headerGroup ?? column?.group ?? '',
          column?.header2 ?? column?.headerSubGroup ?? ''
        ]
      }


      function getTableColumnDisplayText(column) {
        return String(column?.label || column?.name || column?.field || 'Column')
      }


      function isTablePreviewModeColumn(column) {
        return column?.modeColumn === true || column?.field === 'mode' || column?.name === 'mode'
      }


      function isTablePreviewSelectionColumn(column) {
        return column?.selectColumn === true || column?.field === '__qtSelection' || column?.name === '__qtSelection'
      }


      function isTablePreviewUtilityColumn(column) {
        return isTablePreviewModeColumn(column) || isTablePreviewSelectionColumn(column)
      }


      function getTablePreviewColumnGroupName(column, index) {
        if (Array.isArray(column?.headers)) return String(column.headers[index] || '')
        if (index === 0) return String(column?.header1 || column?.headerGroup || column?.group || '')
        if (index === 1) return String(column?.header2 || column?.headerSubGroup || '')
        return ''
      }


      function getTablePreviewColumnGroupFieldName(column, index, fallback) {
        if (Array.isArray(column?.headerFields)) return String(column.headerFields[index] || fallback || '')
        if (Array.isArray(column?.groupFields)) return String(column.groupFields[index] || fallback || '')
        if (index === 0) return String(column?.headerField || column?.groupField || fallback || '')
        return String(fallback || '')
      }


      function getTableHeaderRows(component) {
        const number = Number(component?.table?.headerRows ?? 1)
        if (!Number.isFinite(number)) return 1
        return Math.min(3, Math.max(1, Math.round(number)))
      }


      function getTableRowRows(component) {
        const number = Number(component?.table?.rowRows ?? 1)
        if (!Number.isFinite(number)) return 1
        return Math.min(3, Math.max(1, Math.round(number)))
      }


      function getTablePreviewColumns(component) {
        const columns = Array.isArray(component?.columns) ? component.columns : []
        const selection = component?.table?.selection || component?.props?.selection || 'none'
        const utilityColumns = []
        if ((selection === 'single' || selection === 'multiple') && !columns.some(isTablePreviewSelectionColumn)) {
          utilityColumns.push({
            name: '__qtSelection',
            label: '',
            field: '__qtSelection',
            type: 'selection',
            align: 'center',
            width: '50px',
            sortable: false,
            editable: false,
            selectColumn: true,
            selectionMode: selection
          })
        }
        if (component?.table?.showModeColumn !== false && !columns.some(isTablePreviewModeColumn)) {
          utilityColumns.push({
            name: 'mode',
            label: '',
            field: 'mode',
            type: 'text',
            align: 'center',
            width: '46px',
            sortable: true,
            editable: false,
            modeColumn: true
          })
        }
        return [...utilityColumns, ...columns]
      }


      function getAgGridPreviewColumnSizing(column) {
        const rawWidth = String(column?.width || '').trim()
        if (!rawWidth) return { flex: 1 }

        const percentMatch = rawWidth.match(/^([0-9]+(?:\.[0-9]+)?)%$/)
        if (percentMatch) {
          return { flex: Math.max(0.1, Number.parseFloat(percentMatch[1])), minWidth: 70 }
        }

        const flexMatch = rawWidth.match(/^([0-9]+(?:\.[0-9]+)?)fr$/i)
        if (flexMatch) {
          return { flex: Math.max(0.1, Number.parseFloat(flexMatch[1])), minWidth: 70 }
        }

        const pixelMatch = rawWidth.match(/^([0-9]+(?:\.[0-9]+)?)(px)?$/i)
        if (pixelMatch) {
          return { width: Math.max(40, Math.round(Number.parseFloat(pixelMatch[1]))) }
        }

        return { flex: 1, minWidth: 70 }
      }

module.exports = {
  getAgGridPreviewCoreScript,
}
