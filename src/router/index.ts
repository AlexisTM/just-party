import { createRouter, createWebHashHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import CheckServiceView from '../views/CheckServiceView.vue'
import TestHost from '../views/Test/Host.vue'
import TestPlayer from '../views/Test/Player.vue'
import CadavreHost from '../views/Cadavre/Host.vue'
import CadavrePlayer from '../views/Cadavre/Player.vue'
import CadavreDrawHost from '../views/CadavreDraw/Host.vue'
import CadavreDrawPlayer from '../views/CadavreDraw/Player.vue'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: CheckServiceView
    },
    {
      path: '/login',
      name: 'login',
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
    },
    {
      path: '/cadvrd/host',
      name: 'Draw Cadavre Exquis host',
      component: CadavreDrawHost,
    },
    {
      path: '/cadvrd/player/:roomid',
      name: 'Draw Cadavre Exquis player',
      component: CadavreDrawPlayer,
    }
  ]
})

export default router
