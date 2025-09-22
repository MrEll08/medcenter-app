import { AxiosError } from 'axios'

type FastAPIValidationItem = { loc: Array<string | number>; msg: string; type: string }
type FastAPIErrorShape = { detail?: string | FastAPIValidationItem[] }

export function getErrorMessage(err: unknown): string {
    const ax = err as AxiosError<FastAPIErrorShape> | undefined
    const data = ax?.response?.data
    if (data?.detail) {
        if (typeof data.detail === 'string') return data.detail
        if (Array.isArray(data.detail) && data.detail.length) return data.detail.map(d => d.msg).join('; ')
    }
    if (ax?.message) return ax.message
    if (err instanceof Error) return err.message
    try { return JSON.stringify(err) } catch { return 'Неизвестная ошибка' }
}
