import { createRouter, createWebHistory } from 'vue-router'
import WelcomePage from './Pages/WelcomePage.vue' // Your other file

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: WelcomePage
    }
  ]
})

export default router
