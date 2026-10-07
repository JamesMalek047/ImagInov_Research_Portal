import { createRouter, createWebHistory } from 'vue-router'
import WelcomePage from '../Pages/WelcomePage.vue'
import ThoughtsPage from '../Pages/Thoughts.vue'
import ConnectorsPage from '../Pages/Connectors.vue'
import ResearchPage from '../Pages/Research.vue'
import LoginPage from '../Pages/LoginPage.vue'
import { supabase } from '../lib/supabase'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login',      component: LoginPage,      meta: { public: true } },
    { path: '/',           component: WelcomePage },
    { path: '/thoughts',   component: ThoughtsPage },
    { path: '/connectors', component: ConnectorsPage },
    { path: '/research',   component: ResearchPage },
  ],
})

router.beforeEach(async (to) => {
  const { data } = await supabase.auth.getSession()
  const loggedIn = !!data.session
  if (!to.meta.public && !loggedIn) return '/login'
  if (to.path === '/login' && loggedIn) return '/'
})

export default router
