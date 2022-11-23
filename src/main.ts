import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

import './assets/main.scss'
import 'bulma/css/bulma.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

import {decode,encode} from 'cborg'

Window.decode = decode;
Window.encode = encode;
