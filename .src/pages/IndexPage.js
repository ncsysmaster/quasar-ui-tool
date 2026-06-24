function onSearch() {
  console.log('onSearch', { ...search })
  storeName.searchText = 'search text !!!!'
  console.log('storeName.storeName : ', storeName.storeName)
}

function resetSearch() {
  console.log('resetSearch storeName.storeName : ', storeName.storeName)
  storeName.selectList(storeName.loading)
  

  console.log('storeName.searchText : ', storeName.searchText)

}


function onRowClick_Table001(event, row) {
  console.log('row-click', row)

}


function onTableAdd_Table001() {
  console.log('table-add')
    const newRow = {
    rowSn: Date.now(),
    name: '홍길동',
    dtlDt: '혁신기획팀',
    actions : '',
    key: 'abdc'
  }
  Table001.addRow(newRow)

  
}


function onTableSave_Table001() {
  console.log('table-save')
}


function onTableDelete_Table001() {
  console.log('table-delete')
}


function onTableRefresh_Table001() {
  console.log('table-refresh')
}
