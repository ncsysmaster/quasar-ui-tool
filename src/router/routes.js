const routes = [
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        component: () => import('../pages/IndexPage.vue')
      },
      {
        path: 'intro/:doc?',
        component: () => import('../pages/IntroDocPage.vue')
      },
      {
        path: 'guide',
        component: () => import('../pages/GuidePage.vue')
      },
      {
        path: 'examples/:type?',
        component: () => import('../pages/ExamplesPage.vue')
      },
      {
        path: 'license',
        component: () => import('../pages/LicensePage.vue')
      }
    ]
  }
]

export default routes
