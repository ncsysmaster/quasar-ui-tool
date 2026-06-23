import { defineStore } from 'pinia'

export const useIndexUtilStore = defineStore('indexUtil', {
  state: () => ({
    // 참고사항은 주석으로 처리
    rows: {
      state1: {
        state1: null,
        state2: null,
        state3: null
      },
      state2: {
        state1: null,
        state2: null
      }
    },
    // 테이블 선택한 항목
    selectedRow: null,
    loading: false,
    entity: {
      id: null,
      name: null
    },
    searchText: null,
    list: []
  }),
  getters: {
    getRows: (state) => {
      return undefined
    }
  },
  actions: {
    async selectList(loading) {
      this.entity.id = 'adf'
      this.entity.name = 'en Name'

      console.log('selectList')


    }
  }
})
