import { defineStore } from 'pinia'

export const useIndexPageStore = defineStore('indexPage', {
  state: () => ({
    rows: [],
    selectedRow: null,
    tableData: null,
    loading: false,
    error: null,
    entity: null
  }),
  getters: {},
  actions: {
    async getDetail() {
      const d = 1

      console.log
    },
    async getList() {

    }
  }
})
