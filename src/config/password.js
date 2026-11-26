export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 72

export const PASSWORD_RULES = [
    { key: 'length', test: (v) => v.length >= PASSWORD_MIN && v.length <= PASSWORD_MAX },
    { key: 'lower', test: (v) => /[a-z]/.test(v) },
    { key: 'upper', test: (v) => /[A-Z]/.test(v) },
    { key: 'number', test: (v) => /\d/.test(v) }
]

export const isStrongPassword = (value) => PASSWORD_RULES.every((rule) => rule.test(value || ''))
