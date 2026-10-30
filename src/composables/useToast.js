import { reactive } from 'vue'

const toasts = reactive([])
let seq = 0

function push(type, message, ms = 4500) {
    const id = ++seq
    toasts.push({ id, type, message })
    setTimeout(() => dismiss(id), ms)
}

function dismiss(id) {
    const i = toasts.findIndex((t) => t.id === id)
    if (i >= 0) toasts.splice(i, 1)
}

export function useToast() {
    return {
        toasts,
        dismiss,
        success: (m) => push('success', m),
        error: (m) => push('error', m, 6500),
        info: (m) => push('info', m)
    }
}
