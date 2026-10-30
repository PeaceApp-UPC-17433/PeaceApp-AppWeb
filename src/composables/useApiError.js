import { useI18n } from 'vue-i18n'

// Traduce un ApiError a un texto para el usuario. Los mensajes del backend ya vienen en español.
export function useApiError() {
    const { t, te } = useI18n()

    function messageOf(err) {
        if (!err) return t('errors.generic')
        if (err.status === 0) return t('errors.network')
        if (err.errors && Object.keys(err.errors).length) return Object.values(err.errors).join('. ')
        if (err.status === 403) return t('errors.forbidden')
        if (err.status === 404) return t('errors.notFound')
        if (err.status >= 500) return t('errors.server')
        if (err.message && !err.message.startsWith('http_')) return err.message
        const key = `errors.http_${err.status}`
        return te(key) ? t(key) : t('errors.generic')
    }

    // Errores por campo: { email: 'texto' } para marcarlos en el formulario.
    const fieldErrors = (err) => err?.errors || {}

    return { messageOf, fieldErrors }
}
