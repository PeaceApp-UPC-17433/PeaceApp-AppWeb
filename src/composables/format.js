import { useI18n } from 'vue-i18n'

export function useFormat() {
    const { locale } = useI18n()

    const dateTime = (value) =>
        value
            ? new Date(value).toLocaleString(locale.value, { dateStyle: 'medium', timeStyle: 'short' })
            : ''

    const date = (value) => (value ? new Date(value).toLocaleDateString(locale.value, { dateStyle: 'medium' }) : '')

    const distance = (meters) =>
        meters == null ? '' : meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`

    // "hace 5 min" en el idioma activo.
    const relative = (value) => {
        if (!value) return ''
        const diff = (new Date(value).getTime() - Date.now()) / 1000
        const rtf = new Intl.RelativeTimeFormat(locale.value, { numeric: 'auto' })
        const steps = [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60]]
        for (const [unit, secs] of steps) {
            if (Math.abs(diff) >= secs) return rtf.format(Math.round(diff / secs), unit)
        }
        return rtf.format(Math.round(diff), 'second')
    }

    return { dateTime, date, distance, relative }
}
