import { defineStore } from 'pinia'

export const useIndexPageStore = defineStore('indexPage', {
  state: () => ({
    rows: [],
    selectedRow: null,
    tableData2: [],
    loading: false,
    error: null
  }),
  getters: {},
  actions: {}
})
