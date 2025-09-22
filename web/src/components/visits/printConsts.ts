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
    client: 'Клиент',
    doctor: 'Врач',
    cabinet: 'Кабинет',
    procedure: 'Процедура',
    status: 'Статус',
    cost: 'Стоимость',
}
