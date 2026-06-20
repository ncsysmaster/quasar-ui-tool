import { defineRouter } from '@quasar/app-vite'
import { createRouter, createWebHashHistory } from 'vue-router'
import routes from './routes'

export default defineRouter(function () {
  return createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createWebHashHistory()
  })
})
