export const maskEmail = (email = '') => {
    const at = email.indexOf('@')
    if (at < 1) return email
    const local = email.slice(0, at)
    return `${local.slice(0, Math.min(2, local.length === 1 ? 1 : 2))}***${email.slice(at)}`
}
