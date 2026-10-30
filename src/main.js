import { createApp } from 'vue'
import 'primeicons/primeicons.css'
import './styles/base.css'
import App from './app.vue'
import router from './router/index.js'
import i18n from './i18n.js'

createApp(App).use(router).use(i18n).mount('#app')
