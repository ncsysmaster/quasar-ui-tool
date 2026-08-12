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
        path: 'intro',
        redirect: '/intro/overview'
      },
      {
        path: 'intro/overview',
        component: () => import('../pages/IntroOverviewPage.vue')
      },
      {
        path: 'intro/features',
        component: () => import('../pages/IntroFeaturesPage.vue')
      },
      {
        path: 'intro/interface',
        component: () => import('../pages/IntroInterfacePage.vue')
      },
      {
        path: 'intro/status',
        component: () => import('../pages/IntroStatusPage.vue')
      },
      {
        path: 'intro/:doc',
        redirect: '/intro/overview'
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
        path: 'qna',
        component: () => import('../pages/QnaPage.vue')
      },
      {
        path: 'suggestion',
        component: () => import('../pages/SuggestionPage.vue')
      },
      {
        path: 'license',
        component: () => import('../pages/LicensePage.vue')
      },
      {
        path: 'admin/menus',
        component: () => import('../pages/AdminMenuPage.vue')
      }
    ]
  }
]

export default routes
