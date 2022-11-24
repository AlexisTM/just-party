import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import TestHost from '../views/Test/Host.vue'
import TestPlayer from '../views/Test/Player.vue'
import CadavreHost from '../views/Cadavre/Host.vue'
import CadavrePlayer from '../views/Cadavre/Player.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: LoginView
    },
    {
      path: '/test/host',
      name: 'test host',
      component: TestHost,
    },
    {
      path: '/test/player/:roomid',
      name: 'test player',
      component: TestPlayer,
    },
    {
      path: '/cadvrs/host',
      name: 'Cadavre Exquis host',
      component: CadavreHost,
    },
    {
      path: '/cadvrs/player/:roomid',
      name: 'Cadavre Exquis player',
      component: CadavrePlayer,
    }
  ]
})

export default router
