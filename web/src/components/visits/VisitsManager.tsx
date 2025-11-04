import {useCallback, useMemo, useState} from 'react'
import {
    Button,
    DatePicker,
    Form,
    Input,
    InputNumber,
    Modal,
    Select,
    Space,
    Table,
    message,
    Popconfirm,
    Tooltip,
    Dropdown
} from 'antd'
import type {ColumnsType} from 'antd/es/table'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import dayjs, {Dayjs} from 'dayjs'
import {api} from '../../lib/api'
import type {VisitCreateRequest, VisitResponse, VisitStatusEnum, VisitUpdateRequest} from '../../api'
import {getErrorMessage} from '../../lib/errors'
import EntitySelect from '../EntitySelect'
import {Info, Pencil, Trash2} from 'lucide-react'
import {useNavigate, useLocation} from 'react-router-dom'
import EntityLink from '../EntityLink'
import {TimePicker} from 'antd' // <- используем нормальный тайм-пикер

import {Modal as AntModal, Checkbox} from 'antd'
import type {CheckboxChangeEvent} from 'antd/es/checkbox'
import {Printer} from 'lucide-react'
import {useReactToPrint} from 'react-to-print'
import type {PrintColumnKey} from './printConsts'
import {PRINT_HEADERS} from './printConsts'

import {useEffect, useRef} from 'react'
import VisitsPrintSheet from "./VisitsPrintSheet.tsx";

type DoctorMini = { id: string; full_name: string; speciality: string }
type ClientMini = { id: string; full_name: string; phone_number?: string | null; date_of_birth?: string | null }

async function fetchDoctorMini(id: string): Promise<DoctorMini> {
    const r = await api.get<DoctorMini>(`/doctors/${id}`)
    return r.data
}

async function fetchClientMini(id: string): Promise<ClientMini> {
    const r = await api.get<ClientMini>(`/clients/${id}`)
    return r.data
}

const {RangePicker} = DatePicker
const STATUS: VisitStatusEnum[] = ['UNCONFIRMED', 'CONFIRMED', 'PAID']
const STATUS_META: Record<VisitStatusEnum, { emoji: string; label: string }> = {
    UNCONFIRMED: {emoji: '❌', label: 'Не подтверждён'},
    CONFIRMED: {emoji: '✅', label: 'Подтверждён'},
    PAID: {emoji: '💠', label: 'Оплачен'},
}
const DURATIONS = [5, 10, 15, 20, 25, 30, 40, 60] as const
type DurationMin = typeof DURATIONS[number]

type VisitFormValues = {
    // ids
    client_id?: string
    doctor_id?: string
    // дата/время для UI
    date?: Dayjs | null
    time_start?: Dayjs | null
    duration?: DurationMin | null
    // прочие поля
    status?: VisitStatusEnum
    procedure?: string
    cabinet?: string
    cost?: number
}

type VisitQueryParams = {
    limit?: number
    offset?: number
    search_limit?: number
    client_id?: string
    doctor_id?: string
    start_date?: string
    end_date?: string
    cabinet?: string
    procedure?: string
    status?: VisitStatusEnum
}

type Page<T> = {
    total: number
    limit: number
    offset: number
    items: T[]
}

type ShowColumns = Partial<{
    date: boolean
    startTime: boolean
    endTime: boolean
    client: boolean
    doctor: boolean
    procedure: boolean
    cabinet: boolean
    cost: boolean
    status: boolean
    actions: boolean
}>

type Context = {
    clientId?: string
    doctorId?: string
}

type Props = {
    context?: Context
    show?: ShowColumns
    defaultLimit?: number
}

function combineDateAndTime(date: Dayjs, time: Dayjs): string {
    return date
        .hour(time.hour())
        .minute(time.minute())
        .second(0)
        .millisecond(0)
        .toISOString()
}

async function fetchVisits(params: VisitQueryParams): Promise<Page<VisitResponse>> {
    const res = await api.get<Page<VisitResponse>>('/visits/', {params})
    return res.data
}

async function createVisit(body: VisitCreateRequest): Promise<VisitResponse> {
    const res = await api.post<VisitResponse>('/visits/', body)
    return res.data
}

async function updateVisit(id: string, body: VisitUpdateRequest): Promise<VisitResponse> {
    const res = await api.patch<VisitResponse>(`/visits/${id}`, body)
    return res.data
}

async function deleteVisit(id: string): Promise<void> {
    await api.delete(`/visits/${id}`)
}

export default function VisitsManager({context, show, defaultLimit = 30}: Props) {
    const qc = useQueryClient()
    const navigate = useNavigate()
    const location = useLocation()
    const didHydrateFromUrl = useRef(false)

    // -------- Фильтры списка --------
    const [clientId, setClientId] = useState<string | undefined>(context?.clientId)
    const [doctorId, setDoctorId] = useState<string | undefined>(context?.doctorId)
    const [status, setStatus] = useState<VisitStatusEnum | undefined>()
    const [day, setDay] = useState<Dayjs | null>(null)
    const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null)
    const [cabinet, setCabinet] = useState<string | undefined>()
    const [procedure, setProcedure] = useState<string | undefined>()
    const [limit, setLimit] = useState<number>(defaultLimit)
    const isDayMode = !!day && !range
    const effDoctorId = context?.doctorId ?? doctorId
    const isDoctorDayMode = isDayMode && !!effDoctorId

    const [page, setPage] = useState<number>(1)
    const [pageSize, setPageSize] = useState<number>(defaultLimit)

    useEffect(() => {
        if (didHydrateFromUrl.current) return
        const sp = new URLSearchParams(location.search)

        const qClient = sp.get('client_id') || undefined
        const qDoctor = sp.get('doctor_id') || undefined
        const qStatus = sp.get('status') as VisitStatusEnum | null
        const qCab = sp.get('cabinet') || undefined
        const qProc = sp.get('procedure') || undefined
        const qPage = sp.get('page')
        const qLimit = sp.get('limit')
        const qDay = sp.get('day')
        const qStart = sp.get('start')
        const qEnd = sp.get('end')

        if (!context?.clientId && qClient) setClientId(qClient)
        if (!context?.doctorId && qDoctor) setDoctorId(qDoctor)
        if (qStatus && ['UNCONFIRMED', 'CONFIRMED', 'PAID'].includes(qStatus)) setStatus(qStatus)
        if (qCab) setCabinet(qCab)
        if (qProc) setProcedure(qProc)
        if (qLimit && !Number.isNaN(Number(qLimit))) setLimit(Number(qLimit))

        if (qPage && !Number.isNaN(Number(qPage))) setPage(Math.max(1, Number(qPage)))
        if (qLimit && !Number.isNaN(Number(qLimit))) {
            setLimit(Number(qLimit))
            setPageSize(Number(qLimit))
        }

        if (qDay) {
            const d = dayjs(qDay, 'YYYY-MM-DD', true)
            if (d.isValid()) {
                setDay(d)
                setRange(null)
            }
        } else if (qStart && qEnd) {
            const s = dayjs(qStart)
            const e = dayjs(qEnd)
            if (s.isValid() && e.isValid()) {
                setRange([s, e])
                setDay(null)
            }
        }

        didHydrateFromUrl.current = true
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])


    // === Минимум/максимум времени из env ===
    const MIN_TIME = (import.meta.env.VITE_MIN_TIME as string) || '06:30'
    const MAX_TIME = (import.meta.env.VITE_MAX_TIME as string) || '21:30'

    const parseHHMM = useCallback((s: string): { h: number; m: number } => {
        const m = /^(\d{1,2}):(\d{2})$/.exec((s ?? '').trim())
        if (!m) return {h: 0, m: 0}
        return {h: Number(m[1]), m: Number(m[2])}
    }, [])

    function disabledHoursForWorkday() {
        const arr: number[] = []
        for (let h = 0; h < 24; h++) {
            if (h < 6 || h > 22) arr.push(h) // разрешаем 6..22 включительно
        }
        return arr
    }

    // === Типы для «белых» строк ===
    type GapRow = {
        __gap: true
        id: string
        start_date: string
        end_date: string
    }
    type RowData = VisitResponse | GapRow

    function isGap(row: unknown): row is GapRow {
        return typeof row === 'object' && row !== null && '__gap' in row && (row as GapRow).__gap
    }


    // === Построение строк дня с «щелями» ===
    const buildDayRows = useCallback((day: Dayjs, visits: VisitResponse[], minTime: string, maxTime: string): RowData[] => {
        const {h: minH, m: minM} = parseHHMM(minTime)
        const {h: maxH, m: maxM} = parseHHMM(maxTime)

        const dayMin = day.startOf('day').hour(minH).minute(minM).second(0).millisecond(0)
        const dayMax = day.startOf('day').hour(maxH).minute(maxM).second(0).millisecond(0)

        const sorted = [...(visits || [])].sort((a, b) =>
            dayjs(a.start_date).valueOf() - dayjs(b.start_date).valueOf()
        )

        if (sorted.length === 0) {
            return [{
                __gap: true,
                id: `gap-${dayMin.toISOString()}-${dayMax.toISOString()}`,
                start_date: dayMin.toISOString(),
                end_date: dayMax.toISOString(),
            }]
        }

        const rows: RowData[] = []
        let cursor = dayMin
        for (const v of sorted) {
            const vs = dayjs(v.start_date)
            const ve = v.end_date ? dayjs(v.end_date) : vs
            if (vs.isAfter(cursor)) {
                rows.push({
                    __gap: true,
                    id: `gap-${cursor.toISOString()}-${vs.toISOString()}`,
                    start_date: cursor.toISOString(),
                    end_date: vs.toISOString(),
                })
            }
            rows.push(v)
            if (ve.isAfter(cursor)) cursor = ve
        }
        if (dayMax.isAfter(cursor)) {
            rows.push({
                __gap: true,
                id: `gap-${cursor.toISOString()}-${dayMax.toISOString()}`,
                start_date: cursor.toISOString(),
                end_date: dayMax.toISOString(),
            })
        }
        return rows
    }, [parseHHMM])

    type EditableField = 'procedure' | 'cost'

    const [editingCell, setEditingCell] = useState<{ id: string; field: EditableField } | null>(null)
    const [draftValue, setDraftValue] = useState<string | number | null>(null)

    function beginEdit(v: VisitResponse, field: EditableField) {
        setEditingCell({id: v.id, field})
        if (field === 'cost') {
            setDraftValue(typeof v.cost === 'number' ? v.cost : null)
        } else {
            setDraftValue(v.procedure ?? '')
        }
    }

    function cancelEdit() {
        setEditingCell(null)
        setDraftValue(null)
    }

    function saveEdit(v: VisitResponse) {
        if (!editingCell) return
        const body: Partial<VisitUpdateRequest> =
            editingCell.field === 'cost'
                ? {cost: draftValue === '' || draftValue === null ? null : Number(draftValue)}
                : {procedure: draftValue === '' ? null : String(draftValue)}

        updateInlineMutate.mutate({id: v.id, body})
    }

    const updateInlineMutate = useMutation({
        mutationFn: ({id, body}: { id: string; body: Partial<VisitUpdateRequest> }) =>
            updateVisit(id, body as VisitUpdateRequest),
        onSuccess: () => {
            message.success('Сохранено')
            qc.invalidateQueries({queryKey: ['visits']})
            cancelEdit()
        },
        onError: (err: unknown) => message.error(getErrorMessage(err)),
    })

    const [printOpen, setPrintOpen] = useState(false)
    const [printCols, setPrintCols] = useState<PrintColumnKey[]>(
        context?.doctorId
            ? ['time', 'client', 'cabinet', 'procedure']      // дефолт для врача
            : context?.clientId
                ? ['date', 'time', 'doctor', 'cabinet', 'procedure'] // дефолт для пациента
                : ['date', 'time', 'client', 'doctor', 'cabinet', 'procedure', 'status', 'cost'] // общий
    )

    const [clientsMap, setClientsMap] = useState<Record<string, ClientMini>>({})
    const [doctorsMap, setDoctorsMap] = useState<Record<string, DoctorMini>>({})

    const printRef = useRef<HTMLDivElement>(null)

    const params: VisitQueryParams = useMemo(() => {
        const p: VisitQueryParams = {}
        if (isDoctorDayMode) {
            p.limit = 10000
            p.offset = 0
        } else {
            p.limit = pageSize
            p.offset = (page - 1) * pageSize
        }
        if (clientId) p.client_id = clientId
        if (doctorId) p.doctor_id = doctorId
        if (status) p.status = status
        if (cabinet) p.cabinet = cabinet
        if (procedure) p.procedure = procedure
        if (day) {
            p.start_date = day.startOf('day').toISOString()
            p.end_date = day.endOf('day').toISOString()
        } else if (range) {
            p.start_date = range[0].toISOString()
            p.end_date = range[1].toISOString()
        }
        return p
    }, [isDoctorDayMode, clientId, doctorId, status, cabinet, procedure, day, range, pageSize, page])

    const {data, isLoading} = useQuery<Page<VisitResponse>>({
        queryKey: ['visits', params],
        queryFn: () => fetchVisits(params),
    })

    const tableData: RowData[] = useMemo(() => {
        const items = data?.items ?? []
        if (!isDayMode) return items as RowData[]
        if (!day) return []
        return buildDayRows(day, items, MIN_TIME, MAX_TIME)
    }, [isDayMode, data, day, buildDayRows, MIN_TIME, MAX_TIME])

    useEffect(() => {
        setPage(1)
    }, [clientId, doctorId, status, cabinet, procedure, day, range])

    useEffect(() => {
        if (!didHydrateFromUrl.current) return

        const sp = new URLSearchParams()

        if (!context?.clientId && clientId) sp.set('client_id', clientId)
        if (!context?.doctorId && doctorId) sp.set('doctor_id', doctorId)
        if (status) sp.set('status', status)
        if (cabinet) sp.set('cabinet', cabinet)
        if (procedure) sp.set('procedure', procedure)
        if (limit !== defaultLimit) sp.set('limit', String(limit))
        if (page !== 1) sp.set('page', String(page))
        if (pageSize !== defaultLimit) sp.set('limit', String(pageSize))

        if (day) {
            sp.set('day', day.format('YYYY-MM-DD'))
        } else if (range) {
            sp.set('start', range[0].toISOString())
            sp.set('end', range[1].toISOString())
        }

        const search = sp.toString()
        navigate({search: search ? `?${search}` : ''}, {replace: true})
    }, [clientId, doctorId, status, cabinet, procedure, day, range, limit, defaultLimit, navigate, context?.clientId, context?.doctorId, page, pageSize])

    useEffect(() => {
        if (!printOpen || !data) return

        const uniqueClients = Array.from(new Set(data.items.map(v => v.client_id)))
        const uniqueDoctors = Array.from(new Set(data.items.map(v => v.doctor_id)))

        ;(async () => {
            try {
                const [cPairs, dPairs] = await Promise.all([
                    Promise.all(uniqueClients.map(async (id) => [id, await fetchClientMini(id)] as const)),
                    Promise.all(uniqueDoctors.map(async (id) => [id, await fetchDoctorMini(id)] as const)),
                ])
                setClientsMap(Object.fromEntries(cPairs))
                setDoctorsMap(Object.fromEntries(dPairs))
            } catch {
                // тихо игнорируем — печать всё равно пройдёт с базовыми полями
            }
        })()
    }, [printOpen, data])

    const printTitle =
        context?.doctorId ? (doctorsMap[context.doctorId!]?.full_name ?? 'Врач') :
            context?.clientId ? (clientsMap[context.clientId!]?.full_name ?? 'Пациент') :
                'Все приёмы'

    const printSubtitle =
        context?.doctorId ? (doctorsMap[context.doctorId!]?.speciality ?? '') :
            context?.clientId ? (() => {
                const c = clientsMap[context.clientId!]
                if (!c) return ''
                const dob = c.date_of_birth ? dayjs(c.date_of_birth).format('YYYY-MM-DD') : undefined
                const age = c.date_of_birth ? (() => {
                    const birth = dayjs(c.date_of_birth)
                    const a = dayjs().diff(birth, 'year')
                    return `${a} лет`
                })() : undefined
                return [c.phone_number || undefined, dob && `рожд. ${dob}`, age].filter(Boolean).join(' · ')
            })() : ''

    const printNote = (() => {
        const parts: string[] = []
        if (day) parts.push(`День: ${day.format('YYYY-MM-DD')}`)
        else if (range) parts.push(`Период: ${range[0].format('YYYY-MM-DD HH:mm')} – ${range[1].format('YYYY-MM-DD HH:mm')}`)
        if (status) parts.push(`Статус: ${status}`)
        if (cabinet) parts.push(`Кабинет: ${cabinet}`)
        if (procedure) parts.push(`Услуга: ${procedure}`)
        return parts.join(' · ')
    })()

    const doPrint = useReactToPrint({
        contentRef: printRef,                               // ✅ вместо content
        documentTitle: `${printTitle} — приёмы`,
        pageStyle: '@page { size: auto; margin: 20mm; }',
        onAfterPrint: () => console.log('Печать завершена'),
        // preserveAfterPrint: false, // по умолчанию и так false
    })

    // -------- Модалка / форма --------
    const [open, setOpen] = useState(false)
    const [editing, setEditing] = useState<VisitResponse | null>(null)
    const [form] = Form.useForm<VisitFormValues>()

    const createMut = useMutation({
        mutationFn: (b: VisitCreateRequest) => createVisit(b),
        onSuccess: () => {
            message.success('Приём добавлен')
            qc.invalidateQueries({queryKey: ['visits']})
            setOpen(false)
            form.resetFields()
        },
        onError: (err: unknown) => message.error(getErrorMessage(err)),
    })

    const updateMut = useMutation({
        mutationFn: (b: VisitUpdateRequest) => updateVisit(editing!.id, b),
        onSuccess: () => {
            message.success('Сохранено')
            qc.invalidateQueries({queryKey: ['visits']})
            setOpen(false)
            setEditing(null)
            form.resetFields()
        },
        onError: (err: unknown) => message.error(getErrorMessage(err)),
    })

    const deleteMut = useMutation({
        mutationFn: (id: string) => deleteVisit(id),
        onSuccess: () => {
            message.success('Удалено')
            qc.invalidateQueries({queryKey: ['visits']})
        },
        onError: (err: unknown) => message.error(getErrorMessage(err)),
    })

    const updateStatusMut = useMutation({
        mutationFn: ({id, status}: { id: string; status: VisitStatusEnum }) =>
            updateVisit(id, {status}),
        onSuccess: () => {
            message.success('Статус обновлён')
            qc.invalidateQueries({queryKey: ['visits']})
        },
        onError: (err: unknown) => message.error(getErrorMessage(err)),
    })

    // -------- Колонки --------
    let totalCols = 0
    const columns: ColumnsType<VisitResponse | GapRow> = []
    if (!isDayMode && show?.date !== false) {
        columns.push({
            title: 'Дата',
            width: 110,
            dataIndex: 'start_date',
            render: (iso: string, row: VisitResponse | GapRow) =>
                isGap(row)
                    ? {children: null, props: {colSpan: 0}}
                    : dayjs(iso).format('DD.MM.YYYY'),
        })
    }
    columns.push({
        title: 'Время',
        key: 'time',
        width: 140,
        render: (row: VisitResponse | GapRow) => {
            const start = dayjs(row.start_date).format('HH:mm')
            const end = row.end_date ? dayjs(row.end_date).format('HH:mm') : ''
            const label = end ? `${start}–${end}` : start

            if (isGap(row)) {
                return {
                    children: (
                        <div
                            style={{
                                // textAlign: 'center',
                                // color: '#8c8c8c',
                                color: 'black',
                                background: 'pink',
                                // fontStyle: 'italic',
                                padding: 4,
                            }}
                        >
                            {label}
                        </div>
                    ),
                    props: {colSpan: totalCols || 1},
                }
            }
            return label
        },
    })
    if (show?.client !== false && !context?.clientId) {
        columns.push({
            title: 'Пациент',
            key: 'client',
            render: (_: unknown, row: VisitResponse | GapRow) => {
                if (isGap(row)) {
                    return {children: null, props: {colSpan: 0}}
                }

                const v = row as VisitResponse
                return (
                    <div style={{display: 'flex', flexDirection: 'column', lineHeight: 1.3}}>
                        <EntityLink kind="clients" id={v.client_id} label={v.client_name}/>
                        {v.client_phone_number && (
                            <span style={{color: '#8c8c8c', fontSize: 12}}>
                                {v.client_phone_number}
                            </span>
                        )}
                    </div>
                )
            },
        })
    }
    if (show?.doctor !== false && !context?.doctorId) {
        columns.push({
            title: 'Врач',
            key: 'doctor',
            render: (_: unknown, row: VisitResponse | GapRow) =>
                isGap(row)
                    ? {children: null, props: {colSpan: 0}}
                    : (
                        <EntityLink
                            kind="doctors"
                            id={(row as VisitResponse).doctor_id}
                            label={(row as VisitResponse).doctor_name}
                        />
                    ),
        })
    }
    if (show?.procedure !== false) {
        columns.push({
            title: 'Услуга',
            dataIndex: 'procedure',
            ellipsis: true,
            onCell: () => ({style: {cursor: 'text'}}),
            render: (_: string | null | undefined, row: VisitResponse | GapRow) => {
                if (isGap(row)) return {children: null, props: {colSpan: 0}}
                const v = row as VisitResponse

                const isEditing = editingCell?.id === v.id && editingCell.field === 'procedure'
                if (isEditing) {
                    return (
                        <Input
                            autoFocus
                            value={typeof draftValue === 'string' ? draftValue : ''}
                            onChange={(e) => setDraftValue(e.target.value)}
                            onPressEnter={() => saveEdit(v)}
                            onBlur={() => saveEdit(v)}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') cancelEdit()
                            }}
                            disabled={updateInlineMutate.isPending}
                            placeholder="Услуга"
                        />
                    )
                }

                return (
                    <span
                        onClick={() => beginEdit(v, 'procedure')}
                        title="Нажмите, чтобы редактировать"
                    >
                        {v.procedure ?? '—'}
                    </span>
                )
            },
        })
    }
    if (show?.cabinet !== false) {
        columns.push({
            title: 'Кабинет',
            dataIndex: 'cabinet',
            render: (v: string | null | undefined, row: VisitResponse | GapRow) =>
                isGap(row)
                    ? {children: null, props: {colSpan: 0}}
                    : (v ?? '—'),
        })
    }
    if (show?.cost !== false) {
        columns.push({
            title: 'Стоимость',
            dataIndex: 'cost',
            width: 110,
            align: 'right',
            onCell: () => ({style: {cursor: 'text'}}),
            render: (_: number | null | undefined, row: VisitResponse | GapRow) => {
                if (isGap(row)) return {children: null, props: {colSpan: 0}}
                const v = row as VisitResponse

                const isEditing = editingCell?.id === v.id && editingCell.field === 'cost'
                if (isEditing) {
                    return (
                        <InputNumber
                            autoFocus
                            style={{width: '100%'}}
                            value={typeof draftValue === 'number' ? draftValue : null}
                            onChange={(val) => setDraftValue(typeof val === 'number' ? val : null)}
                            onPressEnter={() => saveEdit(v)}
                            onBlur={() => saveEdit(v)}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') cancelEdit()
                            }}
                            min={0}
                            step={50}
                            stringMode={false}
                            disabled={updateInlineMutate.isPending}
                            placeholder="Стоимость"
                        />
                    )
                }
                return (
                    <span
                        onClick={() => beginEdit(v, 'cost')}
                        title="Нажмите, чтобы редактировать"
                    >
                        {typeof v.cost === 'number' ? v.cost : '—'}
                    </span>
                )
            },
        })
    }
    if (show?.status !== false) {
        columns.push({
            title: 'Ст.',
            dataIndex: 'status',
            width: 56,
            align: 'center',
            render: (s: VisitStatusEnum, row: VisitResponse | GapRow) => {
                if (isGap(row)) return {children: null, props: {colSpan: 0}}

                const v = row as VisitResponse
                return (
                    <Dropdown
                        trigger={['click']}
                        menu={{
                            items: STATUS.map(st => ({
                                key: st,
                                label: `${STATUS_META[st].emoji} ${STATUS_META[st].label}`,
                            })),
                            onClick: ({key}) =>
                                updateStatusMut.mutate({id: v.id, status: key as VisitStatusEnum}),
                        }}
                    >
                        <Tooltip title={STATUS_META[s].label}>
                            <Button
                                type="text"
                                loading={updateStatusMut.isPending}
                                style={{padding: 0, lineHeight: 1}}
                            >
                                {STATUS_META[s].emoji}
                            </Button>
                        </Tooltip>
                    </Dropdown>
                )
            },
        })
    }
    if (show?.actions !== false) {
        columns.push({
            title: 'Действия',
            width: 150,
            render: (_: unknown, row: VisitResponse | GapRow) => {
                if (isGap(row)) return {children: null, props: {colSpan: 0}}

                const v = row as VisitResponse
                return (
                    <Space>
                        <Button
                            size="small"
                            className="p-1 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600"
                            onClick={() => navigate(`/visits/${v.id}`)}
                            title="Информация о приёме"
                        >
                            <Info size={16} color="#2563eb"/>
                        </Button>

                        <Button
                            className="p-1 rounded-lg hover:bg-gray-100"
                            size="small"
                            title="Редактировать"
                            onClick={() => {
                                setEditing(v)
                                setOpen(true)
                                const start = dayjs(v.start_date)
                                const end = dayjs(v.end_date)
                                const rawDuration = v.end_date ? end.diff(start, 'minute') : undefined
                                const duration = (rawDuration && DURATIONS.includes(rawDuration as DurationMin))
                                    ? (rawDuration as DurationMin)
                                    : undefined
                                form.setFieldsValue({
                                    client_id: context?.clientId ?? v.client_id,
                                    doctor_id: context?.doctorId ?? v.doctor_id,
                                    date: start,
                                    time_start: start,
                                    duration,                         // <--- вот это новое
                                    procedure: v.procedure ?? undefined,
                                    cabinet: v.cabinet ?? undefined,
                                    cost: typeof v.cost === 'number' ? v.cost : undefined,
                                    status: v.status,
                                })

                            }}
                        >
                            <Pencil size={16} className="text-blue-600"/>
                        </Button>

                        <Popconfirm
                            title="Удалить приём?"
                            okText="Удалить"
                            cancelText="Отмена"
                            okButtonProps={{
                                danger: true,
                                loading: deleteMut.isPending,
                            }}
                            onConfirm={(e) => {
                                e?.stopPropagation?.()
                                deleteMut.mutate(v.id)
                            }}
                            onCancel={(e) => e?.stopPropagation?.()}
                        >
                            <Button
                                size="small"
                                danger
                                loading={deleteMut.isPending}
                                onClick={(e) => e.stopPropagation()}
                                className="p-1 rounded-lg hover:bg-gray-100"
                                title="Удалить"
                            >
                                <Trash2 size={16} className="text-red-600"/>
                            </Button>
                        </Popconfirm>
                    </Space>
                )
            },
        })
    }
    totalCols = columns.length


    // -------- Сабмит формы --------
    const onSubmit = async () => {
        const v = await form.validateFields()

        const startISO = v.date && v.time_start ? combineDateAndTime(v.date, v.time_start) : undefined
        const endISO =
            startISO && v.duration
                ? dayjs(startISO).add(v.duration, 'minute').toISOString()
                : null

        // больше не сравниваем start/end — end вычисляется из duration

        if (editing) {
            const body: VisitUpdateRequest = {
                client_id: context?.clientId ?? v.client_id,
                doctor_id: context?.doctorId ?? v.doctor_id,
                start_date: startISO,
                end_date: endISO ?? undefined,
                status: v.status,
                procedure: v.procedure,
                cabinet: v.cabinet,
                cost: v.cost,
            }
            updateMut.mutate(body)
        } else {
            const body: VisitCreateRequest = {
                client_id: (context?.clientId ?? v.client_id)!,
                doctor_id: (context?.doctorId ?? v.doctor_id)!,
                start_date: startISO!,            // required
                end_date: endISO,                 // string | null
                procedure: v.procedure ?? null,
                cabinet: v.cabinet ?? null,
                cost: v.cost ?? null,
            }
            createMut.mutate(body)
        }
    }

    function resetFilters() {
        setClientId(context?.clientId)
        setDoctorId(context?.doctorId)
        setStatus(undefined)
        setCabinet(undefined)
        setProcedure(undefined)

        setDay(null)
        setRange(null)

        setLimit(defaultLimit)
    }

    // -------- UI --------
    return (
        <div>
            {/* Фильтры */}
            <Space wrap style={{marginBottom: 16}}>
                <Button
                    type="primary"
                    onClick={() => {
                        setEditing(null)
                        setOpen(true)
                        form.resetFields()
                        form.setFieldsValue({
                            client_id: context?.clientId,
                            doctor_id: context?.doctorId,
                            date: day ?? undefined,
                            duration: 10,
                        })
                    }}
                >
                    Новый приём
                </Button>
                <Button onClick={resetFilters} danger ghost>
                    Сбросить
                </Button>

                {!context?.clientId && (
                    <EntitySelect entity="clients" value={clientId} onChange={setClientId} placeholder="Пациент"
                                  allowClear/>
                )}
                {!context?.doctorId && (
                    <EntitySelect entity="doctors" value={doctorId} onChange={setDoctorId} placeholder="Врач"
                                  allowClear/>
                )}
                <Select
                    allowClear
                    placeholder="Статус"
                    value={status}
                    onChange={setStatus}
                    style={{width: 170}}
                    options={STATUS.map(s => ({value: s, label: `${STATUS_META[s].emoji} ${STATUS_META[s].label}`}))}
                />
                {show?.cabinet !== false && (
                    <Input placeholder="Кабинет" value={cabinet}
                           onChange={(e) => setCabinet(e.target.value || undefined)}/>
                )}
                {/*{show?.procedure !== false && (
                    <Input placeholder="Услуга" value={procedure}
                           onChange={(e) => setProcedure(e.target.value || undefined)}/>
                )}*/}
                <DatePicker
                    placeholder="День"
                    format="DD.MM.YYYY"
                    value={day ?? undefined}
                    onChange={(d) => {
                        setDay(d ?? null)
                        if (d) setRange(null)
                    }}
                />
                <RangePicker
                    format="DD.MM.YYYY"
                    value={range ?? undefined}
                    onChange={(v) => {
                        if (v && v[0] && v[1]) {
                            const start = v[0].startOf('day')
                            const end = v[1].endOf('day')   // включительно до конца дня
                            setRange([start, end])
                            setDay(null)
                        } else {
                            setRange(null)
                        }
                    }}
                />
                {!isDoctorDayMode && (
                    <InputNumber
                        min={1}
                        max={500}
                        value={pageSize}
                        onChange={(v) => {
                            const ps = typeof v === 'number' ? v : defaultLimit
                            setPageSize(ps)
                            setLimit(ps)
                            setPage(1)
                        }}
                        placeholder="Лимит"
                    />
                )}
                <Button
                    onClick={() => setPrintOpen(true)}
                    className="p-1 rounded-lg hover:bg-gray-100"
                    title="Печать / PDF"
                >
                    <Printer size={16} className="text-blue-600"/>
                </Button>
            </Space>

            <Table<VisitResponse | GapRow>
                rowKey={(r) => (isGap(r) ? r.id : (r as VisitResponse).id)}
                loading={isLoading}
                dataSource={tableData}
                columns={columns}
                pagination={
                    isDoctorDayMode
                        ? false
                        : {
                            current: page,
                            pageSize: pageSize,
                            total: data?.total ?? 0,
                            showSizeChanger: true,
                            pageSizeOptions: [1, 10, 20, 30, 50, 100],
                            locale: {
                                items_per_page: 'на странице',
                                jump_to: 'Перейти к',
                                page: 'стр.',
                                jump_to_confirm: 'ОК',
                                prev_page: 'Предыдущая страница',
                                next_page: 'Следующая страница',
                            },
                            onChange: (p, ps) => {
                                setPage(p)
                                setPageSize(ps)
                            },
                        }
                }
            />

            <Modal
                title={editing ? 'Редактировать приём' : 'Новый приём'}
                open={open}
                onCancel={() => {
                    setOpen(false);
                    setEditing(null)
                }}
                onOk={onSubmit}
                okText="Сохранить"
                cancelText="Отмена"
                confirmLoading={createMut.isPending || updateMut.isPending}
            >
                <Form form={form} layout="vertical">
                    {!context?.clientId && (
                        <Form.Item name="client_id" label="Пациент"
                                   rules={[{required: !editing, message: 'Выберите пациента'}]}>
                            <EntitySelect entity="clients" fullWidth/>
                        </Form.Item>
                    )}
                    {!context?.doctorId && (
                        <Form.Item name="doctor_id" label="Врач"
                                   rules={[{required: !editing, message: 'Выберите врача'}]}>
                            <EntitySelect entity="doctors" fullWidth/>
                        </Form.Item>
                    )}

                    <Form.Item name="date" label="Дата" rules={[{required: !editing, message: 'Укажите дату'}]}>
                        <DatePicker format="DD.MM.YYYY" style={{width: '100%'}}/>
                    </Form.Item>

                    <Space size="large" wrap>
                        <Form.Item
                            name="time_start"
                            label="Начало"
                            rules={[{required: !editing, message: 'Укажите время начала'}]}
                        >
                            <TimePicker
                                format="HH:mm"
                                minuteStep={5}                 // только минуты кратные 5
                                disabledHours={disabledHoursForWorkday} // часы только 6..22
                                hideDisabledOptions
                                inputReadOnly
                                needConfirm={false}
                                showNow={false}
                            />
                        </Form.Item>

                        <Form.Item
                            name="duration"
                            label="Длительность"
                            rules={[{required: !editing, message: 'Укажите длительность'}]}
                        >
                            <Select
                                placeholder="Минуты"
                                style={{width: 140}}
                                options={DURATIONS.map((m) => ({value: m, label: `${m} мин`}))}
                            />
                        </Form.Item>
                    </Space>

                    <Form.Item name="procedure" label="Услуга">
                        <Input/>
                    </Form.Item>
                    {/*<Form.Item name="cabinet" label="Кабинет">
                        <Input/>
                    </Form.Item>*/}
                    <Form.Item name="cost" label="Стоимость">
                        <InputNumber style={{width: '100%'}} min={0} step={50}/>
                    </Form.Item>

                    {editing && (
                        <Form.Item name="status" label="Статус">
                            <Select
                                allowClear
                                options={STATUS.map(s => ({
                                    value: s,
                                    label: `${STATUS_META[s].emoji} ${STATUS_META[s].label}`
                                }))}
                            />
                        </Form.Item>
                    )}
                </Form>
            </Modal>
            <AntModal
                title="Печать / PDF"
                open={printOpen}
                onCancel={() => setPrintOpen(false)}
                okText="Печать"
                cancelText="Отмена"
                onOk={() => {
                    setPrintOpen(false);
                    setTimeout(() => doPrint(), 0)
                }}
            >
                <p>Выберите колонки для печати:</p>
                {(Object.keys(PRINT_HEADERS) as PrintColumnKey[]).map((col) => (
                    <div key={col} style={{marginBottom: 8}}>
                        <Checkbox
                            checked={printCols.includes(col)}
                            onChange={(e: CheckboxChangeEvent) => {
                                setPrintCols(prev => e.target.checked ? [...prev, col] : prev.filter(c => c !== col))
                            }}
                        >
                            {PRINT_HEADERS[col]}
                        </Checkbox>
                    </div>
                ))}
            </AntModal>

            {/* Скрытая область для печати */}
            <div style={{position: 'fixed', left: -9999, top: -9999}}>
                <VisitsPrintSheet
                    ref={printRef}
                    title={printTitle}
                    subtitle={printSubtitle}
                    note={printNote}
                    columns={printCols}
                    data={data?.items ?? []}
                    clientsMap={clientsMap}
                    doctorsMap={doctorsMap}
                />
            </div>
        </div>
    )
}
