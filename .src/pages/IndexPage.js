function onSearch() {
  console.log('onSearch', { ...search })
}

function resetSearch() {
  useStore.getList()
}
