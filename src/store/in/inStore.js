import { defineStore } from 'pinia'

export const useInStore = defineStore('in', {
  state: () => ({
    rows: [],
    selectedRow: null,
    loading: false,
    error: null
  }),
  getters: {},
  actions: {}
})
