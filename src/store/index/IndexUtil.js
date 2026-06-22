import { defineStore } from 'pinia'

export const useIndexUtilStore = defineStore('indexUtil', {
  state: () => ({
    rows: [],
    selectedRow: null,
    loading: false,
    error: null,
    state1: null,
    state2: null
  }),
  getters: {},
  actions: {}
})
