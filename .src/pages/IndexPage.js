function onSearch() {
  console.log('onSearch', { ...search })
  storeName.storeName = "on Search"
  console.log('storeName.storeName : ', storeName.storeName)
}

function resetSearch() {
  useStore.getList()
}
