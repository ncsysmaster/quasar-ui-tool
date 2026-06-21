import { defineStore } from 'pinia'

export const useExampleStore = defineStore('example', {
  state: () => ({
    rows: [],
    selectedRow: null,
    loading: false,
    error: null
  }),
  getters: {},
  actions: {}
})
