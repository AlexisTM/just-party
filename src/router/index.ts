import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import TestHostView from '../views/TestHostView.vue'
import TestPlayerView from '../views/TestPlayerView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: LoginView
    },
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/LoginView.vue')
    },
    {
      path: '/test/host',
      name: 'test host',
      component: TestHostView,
    },
    {
      path: '/test/player',
      name: 'test player',
      component: TestPlayerView,
    }
  ]
})

export default router
