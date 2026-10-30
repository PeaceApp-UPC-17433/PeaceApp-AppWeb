import { createI18n } from 'vue-i18n'
import es from './locales/es.json'
import en from './locales/en.json'

const saved = localStorage.getItem('language')
const locale = saved || (navigator.language?.startsWith('en') ? 'en' : 'es')
document.documentElement.lang = locale

export default createI18n({
    legacy: false,
    globalInjection: true,
    locale,
    fallbackLocale: 'es',
    messages: { es, en }
})
