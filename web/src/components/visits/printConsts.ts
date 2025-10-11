export type PrintColumnKey =
    | 'date'
    | 'time'
    | 'client'
    | 'doctor'
    | 'cabinet'
    | 'procedure'
    | 'status'
    | 'cost'

export const PRINT_HEADERS: Record<PrintColumnKey, string> = {
    date: 'Дата',
    time: 'Время',
    client: 'Пациент',
    doctor: 'Врач',
    cabinet: 'Кабинет',
    procedure: 'Услуга',
    status: 'Статус',
    cost: 'Стоимость',
}
