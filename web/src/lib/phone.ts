const cleanDigits = (value: string): string => value.replace(/\D/g, '')

const ensureSevenPrefix = (digits: string): string => {
    if (!digits) return ''
    if (digits.startsWith('8')) return `7${digits.slice(1)}`
    if (digits.startsWith('7')) return digits
    return `7${digits}`
}

export function formatPhoneNumber(value?: string | null): string {
    const normalized = ensureSevenPrefix(cleanDigits(value ?? '')).slice(0, 11)
    if (!normalized) return ''

    let result = '+7'

    if (normalized.length > 1) {
        result += ' (' + normalized.slice(1, 4)
        if (normalized.length >= 4) result += ')'
    }

    if (normalized.length > 4) result += ' ' + normalized.slice(4, 7)
    if (normalized.length > 7) result += '-' + normalized.slice(7, 9)
    if (normalized.length > 9) result += '-' + normalized.slice(9, 11)

    return result
}

export function normalizePhoneNumber(value?: string | null): string | undefined {
    const normalized = ensureSevenPrefix(cleanDigits(value ?? ''))
    if (!normalized) return undefined
    return `+${normalized.slice(0, 11)}`
}
