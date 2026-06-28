function getPropertiesHtml(webview, htmlShell, getNonce) {
  const nonce = getNonce();

  return htmlShell(
    webview,
    nonce,
    "Properties",
    `
    <div id="content" class="view-body"></div>
    <div id="classPopup" class="designer-dialog-backdrop hidden"></div>
    <style>
      .class-selector-dialog { width: min(760px, calc(100vw - 32px)); max-height: min(720px, calc(100vh - 32px)); display: flex; flex-direction: column; }
      .class-selector-body { min-height: 0; padding: 0; overflow: hidden; }
      .class-popup-list { flex: 1; overflow: auto; padding: 12px; display: flex; flex-wrap: wrap; align-items: flex-start; gap: 12px; }
      .class-group { width: calc(50% - 6px); border: 1px solid var(--vscode-panel-border); border-radius: 6px; overflow: visible; align-self: flex-start; background: var(--vscode-editor-background); }
      .class-group-title { padding: 8px; font-weight: 700; font-size: 12px; background: var(--vscode-sideBar-background); border-bottom: 1px solid var(--vscode-panel-border); }
      .class-group-items { padding: 4px; display: flex; flex-direction: column; gap: 4px; }
      .class-option { min-height: 24px; padding: 8px; display: flex; align-items: center; gap: 8px; border: 1px solid var(--vscode-panel-border); border-radius: 4px; background: var(--vscode-input-background); }
      .class-option:hover { border-color: var(--vscode-focusBorder); }
      .class-option input { width: auto; min-height: auto; accent-color: var(--vscode-checkbox-background, #007acc); }
      .class-selector-actions .class-popup-clear { margin-right: auto; color: var(--vscode-descriptionForeground); background: var(--vscode-editorWidget-background); border: 1px solid var(--vscode-panel-border); }
      .class-popup-clear:hover { background: var(--vscode-list-hoverBackground); border-color: var(--vscode-focusBorder); }
      .table-prop-section { margin: 0 0 8px; padding: 0 0 8px; border-bottom: 1px solid var(--vscode-panel-border); }
      .table-prop-section h3 { min-height: 28px; margin: 0 0 5px; padding: 3px 5px 3px 8px; display: flex; align-items: center; justify-content: space-between; gap: 8px; border-left: 3px solid var(--vscode-focusBorder); font-size: 12px; background: var(--vscode-sideBarSectionHeader-background); }
      .table-prop-section-action { width: 26px; min-width: 26px; min-height: 22px; padding: 0; border: 1px solid transparent; color: var(--vscode-icon-foreground); background: transparent; font-weight: 700; }
      .table-prop-section-action:hover { border-color: var(--vscode-focusBorder); background: var(--vscode-toolbar-hoverBackground); }
      .table-prop-check input[type="checkbox"] { width: auto; justify-self: start; }
      .table-prop-columns { max-height: 150px; margin-bottom: 6px; overflow: auto; border: 1px solid var(--vscode-panel-border); }
      .table-prop-columns > div { display: flex; justify-content: space-between; gap: 8px; padding: 5px 7px; border-bottom: 1px solid var(--vscode-panel-border); }
      .table-prop-columns small { color: var(--vscode-descriptionForeground); }
    </style>

    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi()
      let model = null
      let selectedId = ''

      function localEscapeHtml(value) {
        return String(value ?? '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
      }

      function localEscapeAttr(value) {
        return localEscapeHtml(value)
      }

      function localFindComponent(components, id) {
        for (const component of components || []) {
          if (component.id === id) return component

          const child = localFindComponent(component.children, id)
          if (child) return child
        }

        return null
      }

      window.addEventListener('message', (event) => {
        if (event.data.type !== 'state') return

        model = event.data.model
        selectedId = event.data.selectedId

        render()
      })

      window.addEventListener('keydown', (event) => {
        if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return
        if (event.key.toLowerCase() !== 's') return

        event.preventDefault()
        event.stopPropagation()
        vscode.postMessage({ type: 'saveScreen' })
      }, true)

      vscode.postMessage({ type: 'ready' })

      function render() {
        const content = document.getElementById('content')

        if (!model) {
          content.innerHTML = '<div class="empty">No model loaded.</div>'
          return
        }

        const component = localFindComponent(model.components || [], selectedId)

        if (!component) {
          content.innerHTML = '<div class="empty">Select a component.</div>'
          return
        }

        const props = component.props || {}
        const componentStyle = component.style || props.style || ''

        content.innerHTML = component.type === 'Table'
          ? renderTableProperties(component)
          :
          field('ID', 'id', component.id || '') +
          field('Type', 'type', component.type || '') +
          field('Tag', 'tag', component.tag || '') +
          field('Label/Text', 'text', component.text || component.label || props.label || '') +
          fieldWithButton(
            'Class',
            'class',
            component.class || component.props?.class || '',
            '...'
          ) +
          field('Style', 'style', componentStyle) +
          field('Width', 'style.width', getStyleDeclaration(componentStyle, 'width')) +
          field('Height', 'style.height', getStyleDeclaration(componentStyle, 'height')) +
          field('Color', 'prop.color', props.color || '') +
          field('Label Prop', 'prop.label', props.label || '') +
          field('Placeholder', 'prop.placeholder', props.placeholder || '')

          attachSplitter()

        content.querySelectorAll('[data-name]').forEach((input) => {
          input.addEventListener('change', () => {
            vscode.postMessage({
              type: 'updateProperty',
              name: input.dataset.name,
              value: input.type === 'checkbox' ? input.checked : input.value
            })
          })
        })

        content.querySelector('[data-edit-table-columns]')?.addEventListener('click', () => {
          vscode.postMessage({ type: 'editTableColumns', id: component.id })
        })

        content.querySelectorAll('[data-open]').forEach((button) => {
            button.onclick = () => {
                const currentClassValue = component.class || component.props?.class || ''
                openClassPopup(button.dataset.open, currentClassValue)
            }
        })     

      }

      function renderTableProperties(component) {
        const props = component.props || {}
        const table = component.table || {}
        const toolbar = table.toolbar || {}
        const pagination = table.pagination || {}
        const dynamicProps = component.dynamicProps || {}
        const models = component.models || {}
        const columns = component.columns || []
        const componentStyle = component.style || props.style || ''
        return propertySection('Basic',
          field('id', 'id', component.id || '') +
          field('title', 'table.title', table.title || component.label || '') +
          field('row-key', 'table.rowKey', table.rowKey || props.rowKey || 'id') +
          fieldWithButton('Class', 'class', component.class || props.class || '', '...') +
          field('Style', 'style', componentStyle) +
          field('Height', 'style.height', getStyleDeclaration(componentStyle, 'height')) +
          checkField('mode column', 'table.showModeColumn', table.showModeColumn !== false) +
          checkField('excel copy', 'table.excelCopy', table.excelCopy !== false)
        ) + propertySection('Data',
          field('rows binding', 'dynamic.rows', dynamicProps.rows || table.rowsBinding || '') +
          field('columns binding', 'dynamic.columns', dynamicProps.columns || '') +
          field('loading binding', 'dynamic.loading', dynamicProps.loading || table.loadingBinding || '') +
          field('error binding', 'table.errorBinding', table.errorBinding || '') +
          field('selected binding', 'model.selected', models.selected || '')
        ) + propertySectionWithAction('Columns',
          '<div class="table-prop-columns">' + columns.map((column, index) =>
            '<div><span>' + (index + 1) + '. ' + localEscapeHtml(column.label || column.name) + '</span><small>' + localEscapeHtml(column.type || 'text') + '</small></div>'
          ).join('') + '</div>',
          '<button type="button" class="table-prop-section-action" data-edit-table-columns title="컬럼 편집" aria-label="컬럼 편집">...</button>'
        ) + propertySection('Selection',
          selectField('selection', 'table.selection', table.selection || 'none', ['none', 'single', 'multiple']) +
          field('row-click event', 'event.row-click', component.events?.['row-click'] || '') +
          field('selectedRow binding', 'model.selected', models.selected || '')
        ) + propertySection('Toolbar',
          checkField('filter', 'table.toolbar.filter', toolbar.filter) +
          checkField('search button', 'table.toolbar.search', toolbar.search) +
          checkField('add button', 'table.toolbar.add', toolbar.add) +
          checkField('save button', 'table.toolbar.save', toolbar.save) +
          checkField('delete button', 'table.toolbar.delete', toolbar.delete) +
          checkField('excel button', 'table.toolbar.excel', toolbar.excel) +
          checkField('refresh button', 'table.toolbar.refresh', toolbar.refresh)
        ) + propertySection('Pagination',
          selectField('mode', 'table.pagination.mode', pagination.mode || 'client', ['client', 'server', 'none']) +
          field('rowsPerPage', 'table.pagination.rowsPerPage', pagination.rowsPerPage ?? 10) +
          field('rowsPerPageOptions', 'table.pagination.rowsPerPageOptions', (pagination.rowsPerPageOptions || [10, 20, 50, 0]).join(','))
        )
      }

      function propertySection(title, body) {
        return '<section class="table-prop-section"><h3>' + localEscapeHtml(title) + '</h3>' + body + '</section>'
      }

      function propertySectionWithAction(title, body, action) {
        return '<section class="table-prop-section"><h3><span>' + localEscapeHtml(title) + '</span>' + action + '</h3>' + body + '</section>'
      }

      function checkField(label, name, checked) {
        return '<label class="prop-field table-prop-check"><span class="prop-label">' + localEscapeHtml(label) + '</span><span class="prop-splitter"></span><input type="checkbox" data-name="' + localEscapeAttr(name) + '"' + (checked ? ' checked' : '') + '></label>'
      }

      function selectField(label, name, value, options) {
        return '<label class="prop-field"><span class="prop-label">' + localEscapeHtml(label) + '</span><span class="prop-splitter"></span><select class="prop-input" data-name="' + localEscapeAttr(name) + '">' + options.map((option) => '<option value="' + localEscapeAttr(option) + '"' + (String(value) === option ? ' selected' : '') + '>' + localEscapeHtml(option) + '</option>').join('') + '</select></label>'
      }

    function getStyleDeclaration(style, property) {
        const propertyName = String(property || '').trim().toLowerCase()
        const declaration = String(style || '')
            .split(';')
            .map((item) => item.trim())
            .filter(Boolean)
            .find((item) => {
                const separator = item.indexOf(':')
                return separator >= 0 &&
                    item.slice(0, separator).trim().toLowerCase() === propertyName
            })

        if (!declaration) return ''
        return declaration.slice(declaration.indexOf(':') + 1).trim()
    }

    function field(label, name, value) {
        return (
            '<label class="prop-field">' +

            '<span class="prop-label">' +
                localEscapeHtml(label) +
            '</span>' +

            '<span class="prop-splitter"></span>' +

            '<input class="prop-input"' +
            ' data-name="' +
            localEscapeAttr(name) +
            '" value="' +
            localEscapeAttr(value) +
            '">' +

            '</label>'
        )
    }

    function fieldWithButton(
        label,
        name,
        value,
        buttonLabel
        ) {
        return (
            '<label class="prop-field">' +

            '<span class="prop-label">' +
            localEscapeHtml(label) +
            '</span>' +

            '<span class="prop-splitter"></span>' +

            '<div class="prop-input-wrap">' +

                '<input ' +
                'class="prop-input" ' +
                'data-name="' +
                localEscapeAttr(name) +
                '" value="' +
                localEscapeAttr(value) +
                '">' +

                '<button ' +
                'class="prop-button" ' +
                'data-open="' +
                localEscapeAttr(name) +
                '">' +

                buttonLabel +

                '</button>' +

            '</div>' +

            '</label>'
        )
        }
    function attachSplitter() {
        document.querySelectorAll('.prop-splitter').forEach((splitter) => {
            splitter.onmousedown = (event) => {
            const panel = document.getElementById('content')
            const currentWidth = Number(
                getComputedStyle(panel)
                .getPropertyValue('--label-width')
                .replace('px', '')
            ) || 90

            const startX = event.clientX

            function move(e) {
                const width = Math.max(
                60,
                Math.min(220, currentWidth + (e.clientX - startX))
                )

                panel.style.setProperty('--label-width', width + 'px')
            }

            function up() {
                document.removeEventListener('mousemove', move)
                document.removeEventListener('mouseup', up)
            }

            document.addEventListener('mousemove', move)
            document.addEventListener('mouseup', up)
            }
        })
    }

    function openClassPopup(name, value) {
    
        const popup = document.getElementById('classPopup')

        const currentClasses = String(value || '')
            .split(/\\s+/)
            .filter(Boolean)

        const component = localFindComponent(model.components || [], selectedId)
        const classGroups = getClassGroupsByComponent(component)

        popup.innerHTML =
            '<div class="designer-dialog class-selector-dialog" role="dialog" aria-modal="true" aria-labelledby="class-selector-title">' +
            '<div class="designer-dialog-header">' +
                '<strong id="class-selector-title">Class 선택</strong>' +
                '<button class="designer-dialog-close" data-class-cancel title="닫기" aria-label="닫기">×</button>' +
            '</div>' +
            '<div class="designer-dialog-body class-selector-body">' +
              '<div class="class-popup-list">' +
                classGroups.map((group) => {
                    return (
                    '<div class="class-group">' +
                        '<div class="class-group-title">' +
                        localEscapeHtml(group.title) +
                        '</div>' +

                        '<div class="class-group-items">' +
                        group.items.map((cls) => {
                            const checked = isClassSelected(cls, currentClasses)
                            ? ' checked'
                            : ' '

                            return (
                            '<label class="class-option">' +
                                '<input type="checkbox" value="' +
                                localEscapeAttr(cls) +
                                '"' +
                                checked +
                                '>' +
                                '<span>' +
                                localEscapeHtml(cls) +
                                '</span>' +
                            '</label>'
                            )
                        }).join('') +
                        '</div>' +
                    '</div>'
                    )
                }).join('') +
              '</div>' +
            '</div>' +
            '<div class="designer-dialog-actions class-selector-actions">' +
                '<button class="class-popup-clear" data-class-clear>전체해제</button>' +
                '<button class="primary" data-class-apply>적용</button>' +
                '<button data-class-cancel>취소</button>' +
            '</div>' +
            '</div>'

        popup.classList.remove('hidden')

        popup.querySelector('[data-class-clear]').onclick = () => {

        popup.querySelectorAll('input[type="checkbox"]').forEach((item) => {
                item.checked = false
            })
        }

        popup.querySelectorAll('[data-class-cancel]').forEach((button) => {
            button.onclick = closeClassPopup
        })
        popup.onclick = (event) => {
            if (event.target === popup) closeClassPopup()
        }

        popup.querySelector('[data-class-apply]').onclick = () => {
            const selected = Array.from(
            popup.querySelectorAll('input[type="checkbox"]:checked')
            ).map((input) => input.value)

            vscode.postMessage({
            type: 'updateProperty',
            name,
            value: selected.join(' ')
            })

            closeClassPopup()
        }
    }

    function getClassGroupsByComponent(component) {
        if (!component) return htmlElementClassGroups()

        if (component.type === 'Button') {
            return buttonClassGroups()
        }

        if (component.type === 'Input') {
            return inputClassGroups()
        }

        if (component.type === 'Card') {
            return cardClassGroups()
        }

        if (component.type === 'CardSection') {
            return cardSectionClassGroups()
        }

        if (component.type === 'Table') {
            return tableClassGroups()
        }

        if (component.type === 'Page') {
            return pageClassGroups()
        }

        return htmlElementClassGroups()
        }

        function commonSpacingGroups() {
        return [
            {
            title: 'Padding',
            items: [
                'q-pa-none',
                'q-pa-xs',
                'q-pa-sm',
                'q-pa-md',
                'q-pa-lg',
                'q-pa-xl',
                'q-px-sm',
                'q-px-md',
                'q-py-sm',
                'q-py-md',
                'q-pt-md',
                'q-pr-md',
                'q-pb-md',
                'q-pl-md'
            ]
            },
            {
            title: 'Margin',
            items: [
                'q-ma-none',
                'q-ma-xs',
                'q-ma-sm',
                'q-ma-md',
                'q-ma-lg',
                'q-ma-xl',
                'q-mx-md',
                'q-my-md',
                'q-mt-sm',
                'q-mt-md',
                'q-mt-lg',
                'q-mb-sm',
                'q-mb-md',
                'q-mb-lg',
                'q-ml-md',
                'q-mr-md'
            ]
            }
        ]
        }

        function commonTextGroups() {
        return [
            {
            title: 'Text',
            items: [
                'text-left',
                'text-center',
                'text-right',
                'text-justify',
                'text-bold',
                'text-weight-medium',
                'text-caption',
                'text-body1',
                'text-body2',
                'text-h6',
                'text-h5',
                'text-h4',
                'ellipsis',
                'no-wrap'
            ]
            },
            {
            title: 'Text Color',
            items: [
                'text-primary',
                'text-secondary',
                'text-positive',
                'text-negative',
                'text-warning',
                'text-info',
                'text-white',
                'text-black',
                'text-grey',
                'text-grey-7'
            ]
            }
        ]
        }

        function commonBackgroundGroups() {
        return [
            {
            title: 'Background',
            items: [
                'bg-white',
                'bg-grey-1',
                'bg-grey-2',
                'bg-grey-3',
                'bg-primary',
                'bg-secondary',
                'bg-positive',
                'bg-negative',
                'bg-warning',
                'bg-info'
            ]
            }
        ]
        }

        function commonSizeGroups() {
        return [
            {
            title: 'Size',
            items: [
                'full-width',
                'full-height',
                'fit',
                'window-width',
                'window-height',
                'col',
                'col-auto',
                'col-1',
                'col-2',
                'col-3',
                'col-4',
                'col-5',
                'col-6',
                'col-7',
                'col-8',
                'col-9',
                'col-10',
                'col-11',
                'col-12'
            ]
            }
        ]
        }

        function htmlElementClassGroups() {
        return [
            {
            title: 'Display',
            items: [
                'row',
                'column',
                'flex',
                'inline',
                'block',
                'items-start',
                'items-center',
                'items-end',
                'items-baseline',
                'items-stretch',
                'justify-start',
                'justify-center',
                'justify-end',
                'justify-between',
                'justify-around',
                'justify-evenly',
                'items-center justify-center',
                'items-center justify-between',
                'items-center justify-around',
                'wrap',
                'no-wrap',
                'reverse-wrap'
            ]
            },
            {
            title: 'Position',
            items: [
                'relative-position',
                'absolute',
                'fixed',
                'fixed-top',
                'fixed-right',
                'fixed-bottom',
                'fixed-left',
                'fullscreen',
                'absolute-top',
                'absolute-right',
                'absolute-bottom',
                'absolute-left',
                'absolute-center'
            ]
            },
            ...commonSizeGroups(),
            ...commonSpacingGroups(),
            ...commonTextGroups(),
            ...commonBackgroundGroups(),
            {
            title: 'Border / Shadow',
            items: [
                'rounded',
                'rounded-borders',
                'bordered',
                'no-border',
                'shadow-1',
                'shadow-2',
                'shadow-4',
                'shadow-8'
            ]
            },
            {
            title: 'Visibility',
            items: [
                'hidden',
                'invisible',
                'overflow-hidden',
                'scroll',
                'no-scroll'
            ]
            },
            {
            title: 'Cursor',
            items: [
                'cursor-pointer',
                'cursor-not-allowed',
                'cursor-inherit'
            ]
            }
        ]
        }

        function buttonClassGroups() {
        return [
            {
            title: 'Button Layout',
            items: [
                'full-width',
                'q-mt-sm',
                'q-mt-md',
                'q-mb-sm',
                'q-mb-md',
                'q-ml-sm',
                'q-mr-sm'
            ]
            },
            {
            title: 'Button Shape',
            items: [
                'rounded-borders',
                'no-border',
                'shadow-1',
                'shadow-2',
                'shadow-4'
            ]
            },
            {
            title: 'Align',
            items: [
                'self-start',
                'self-center',
                'self-end'
            ]
            },
            ...commonSpacingGroups(),
            ...commonTextGroups(),
            ...commonBackgroundGroups()
        ]
        }

        function inputClassGroups() {
        return [
            {
            title: 'Input Layout',
            items: [
                'full-width',
                'q-mt-sm',
                'q-mt-md',
                'q-mb-sm',
                'q-mb-md'
            ]
            },
            {
            title: 'Input Size',
            items: [
                'col',
                'col-3',
                'col-4',
                'col-6',
                'col-12'
            ]
            },
            ...commonSpacingGroups(),
            ...commonBackgroundGroups()
        ]
        }

        function cardClassGroups() {
        return [
            {
            title: 'Card Layout',
            items: [
                'full-width',
                'fit',
                'q-mt-md',
                'q-mb-md'
            ]
            },
            {
            title: 'Card Style',
            items: [
                'rounded-borders',
                'no-border',
                'shadow-1',
                'shadow-2',
                'shadow-4',
                'shadow-8',
                'bg-white',
                'bg-grey-1',
                'bg-grey-2'
            ]
            },
            ...commonSpacingGroups()
        ]
        }

        function cardSectionClassGroups() {
        return [
            {
            title: 'Section Layout',
            items: [
                'row',
                'column',
                'items-center',
                'justify-between',
                'items-center justify-between',
                'q-pa-sm',
                'q-pa-md',
                'q-pa-lg'
            ]
            },
            ...commonTextGroups(),
            ...commonBackgroundGroups()
        ]
        }

        function tableClassGroups() {
        return [
            {
            title: 'Table Layout',
            items: [
                'full-width',
                'q-mt-md',
                'q-mb-md'
            ]
            },
            {
            title: 'Table Container',
            items: [
                'rounded-borders',
                'shadow-1',
                'shadow-2',
                'bg-white'
            ]
            }
        ]
        }

        function pageClassGroups() {
        return [
            {
            title: 'Page Layout',
            items: [
                'q-pa-none',
                'q-pa-sm',
                'q-pa-md',
                'q-pa-lg',
                'bg-white',
                'bg-grey-1',
                'bg-grey-2',
                'column',
                'row'
            ]
            },
            ...commonBackgroundGroups(),
            ...commonSpacingGroups()
        ]
        }
    function closeClassPopup() {
        document.getElementById('classPopup')?.classList.add('hidden')
    }

    function isClassSelected(cls, currentClasses) {
        return cls
            .split(/\\s+/)
            .every((item) => currentClasses.includes(item))
    }    
    </script>
  `,
  );
}

module.exports = {
  getPropertiesHtml,
};
