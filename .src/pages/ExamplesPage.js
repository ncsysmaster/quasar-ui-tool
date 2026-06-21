

function onSearch() {
  console.log('onSearch', { ...search })
}

function resetSearch() {
  Object.assign(search, {
    class1: null,
    class2: null,
    requiredYn: false,
    useYn: false,
    name: ''
  })
}
