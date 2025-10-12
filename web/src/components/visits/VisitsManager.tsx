import {useMemo, useState} from 'react'
import {Button, DatePicker, Form, Input, InputNumber, Modal, Select, Space, Table, message, Popconfirm, Tooltip, Dropdown} from 'antd'
import type {ColumnsType} from 'antd/es/table'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import dayjs, {Dayjs} from 'dayjs'
import {api} from '../../lib/api'
import type {VisitCreateRequest, VisitResponse, VisitStatusEnum, VisitUpdateRequest} from '../../api'
import {getErrorMessage} from '../../lib/errors'
import EntitySelect from '../EntitySelect'
import {Info, Pencil, Trash2} from 'lucide-react'
import {useNavigate} from 'react-router-dom'
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

type VisitFormValues = {
    // ids
    client_id?: string
    doctor_id?: string
    // дата/время для UI
    date?: Dayjs | null
    time_start?: Dayjs | null
    time_end?: Dayjs | null
    // прочие поля
    status?: VisitStatusEnum
    procedure?: string
    cabinet?: string
    cost?: number
}

type VisitQueryParams = {
    search_limit?: number
    client_id?: string
    doctor_id?: string
    start_date?: string
    end_date?: string
    cabinet?: string
    procedure?: string
    status?: VisitStatusEnum
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

async function fetchVisits(params: VisitQueryParams): Promise<VisitResponse[]> {
    const res = await api.get<VisitResponse[]>('/visits/', {params})
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

    // === Минимум/максимум времени из env ===
    const MIN_TIME = (import.meta.env.VITE_MIN_TIME as string) || '06:30'
    const MAX_TIME = (import.meta.env.VITE_MAX_TIME as string) || '21:30'

    function parseHHMM(s: string): { h: number; m: number } {
        const m = /^(\d{1,2}):(\d{2})$/.exec((s ?? '').trim())
        if (!m) return {h: 0, m: 0}
        return {h: Number(m[1]), m: Number(m[2])}
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
    function buildDayRows(day: Dayjs, visits: VisitResponse[], minTime: string, maxTime: string): RowData[] {
        const {h: minH, m: minM} = parseHHMM(minTime)
        const {h: maxH, m: maxM} = parseHHMM(maxTime)

        const dayMin = day.startOf('day').hour(minH).minute(minM).second(0).millisecond(0)
        const dayMax = day.startOf('day').hour(maxH).minute(maxM).second(0).millisecond(0)

        const sorted = [...(visits || [])].sort((a, b) =>
            dayjs(a.start_date).valueOf() - dayjs(b.start_date).valueOf()
        )

        // Если приёмов нет — одна белая строка min–max
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

            // Щель до приёма
            if (vs.isAfter(cursor)) {
                rows.push({
                    __gap: true,
                    id: `gap-${cursor.toISOString()}-${vs.toISOString()}`,
                    start_date: cursor.toISOString(),
                    end_date: vs.toISOString(),
                })
            }

            // Сам приём
            rows.push(v)

            // Сдвинуть курсор
            if (ve.isAfter(cursor)) cursor = ve
        }

        // Хвост до max
        if (dayMax.isAfter(cursor)) {
            rows.push({
                __gap: true,
                id: `gap-${cursor.toISOString()}-${dayMax.toISOString()}`,
                start_date: cursor.toISOString(),
                end_date: dayMax.toISOString(),
            })
        }

        return rows
    }

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
        const p: VisitQueryParams = {search_limit: limit}
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
    }, [clientId, doctorId, status, cabinet, procedure, day, range, limit])

    const {data, isLoading, refetch} = useQuery<VisitResponse[]>({
        queryKey: ['visits', params],
        queryFn: () => fetchVisits(params),
    })

    const tableData: RowData[] = useMemo(() => {
        if (!isDayMode) return (data || []) as RowData[]
        if (!day) return []
        return buildDayRows(day, data || [], MIN_TIME, MAX_TIME)
    }, [isDayMode, day, data])


    useEffect(() => {
        if (!printOpen || !data) return

        const uniqueClients = Array.from(new Set(data.map(v => v.client_id)))
        const uniqueDoctors = Array.from(new Set(data.map(v => v.doctor_id)))

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
            message.success('Приём добавлено')
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
            dataIndex: 'start_date',
            render: (iso: string, row: VisitResponse | GapRow) =>
                isGap(row)
                    ? {children: null, props: {colSpan: 0}}
                    : dayjs(iso).format('YYYY-MM-DD'),
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
            render: (v: string | null | undefined, row: VisitResponse | GapRow) =>
                isGap(row)
                    ? {children: null, props: {colSpan: 0}}
                    : (v ?? '—'),
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
            render: (v: number | null | undefined, row: VisitResponse | GapRow) =>
                isGap(row)
                    ? {children: null, props: {colSpan: 0}}
                    : (v ?? '—'),
        })
    }
    if (show?.status !== false) {
        columns.push({
            title: 'Статус',
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
            width: 240,
            render: (_: unknown, row: VisitResponse | GapRow) => {
                if (isGap(row)) return {children: null, props: {colSpan: 0}}

                const v = row as VisitResponse
                return (
                    <Space>
                        <Button
                            className="p-1 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600"
                            onClick={() => navigate(`/visits/${v.id}`)}
                            title="Информация о приёме"
                        >
                            <Info size={16} color="#2563eb"/>
                        </Button>

                        <Button
                            className="p-1 rounded-lg hover:bg-gray-100"
                            title="Редактировать"
                            onClick={() => {
                                setEditing(v)
                                setOpen(true)
                                const start = dayjs(v.start_date)
                                const end = dayjs(v.end_date)
                                form.setFieldsValue({
                                    client_id: context?.clientId ?? v.client_id,
                                    doctor_id: context?.doctorId ?? v.doctor_id,
                                    date: start,
                                    time_start: start,
                                    time_end: end,
                                    procedure: v.procedure ?? undefined,
                                    cabinet: v.cabinet ?? undefined,
                                    cost:
                                        typeof v.cost === 'number' ? v.cost : undefined,
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
        const endISO = v.date && v.time_end ? combineDateAndTime(v.date, v.time_end) : null

        if (startISO && endISO && dayjs(endISO).isBefore(dayjs(startISO))) {
            message.error('Окончание не может быть раньше начала')
            return
        }

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

    // -------- UI --------
    return (
        <div>
            {/* Фильтры */}
            <Space wrap style={{marginBottom: 16}}>
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
                    style={{width: 220}}
                    options={STATUS.map(s => ({value: s, label: `${STATUS_META[s].emoji} ${STATUS_META[s].label}`}))}
                />
                {show?.cabinet !== false && (
                    <Input placeholder="Кабинет" value={cabinet}
                           onChange={(e) => setCabinet(e.target.value || undefined)}/>
                )}
                {show?.procedure !== false && (
                    <Input placeholder="Услуга" value={procedure}
                           onChange={(e) => setProcedure(e.target.value || undefined)}/>
                )}
                <DatePicker
                    placeholder="День"
                    value={day ?? undefined}
                    onChange={(d) => {
                        setDay(d ?? null)
                        if (d) setRange(null)
                    }}
                />
                <RangePicker
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
                <InputNumber
                    min={1}
                    max={500}
                    value={limit}
                    onChange={(v) => setLimit(typeof v === 'number' ? v : defaultLimit)}
                    placeholder="Лимит"
                />
                <Button
                    onClick={() => setPrintOpen(true)}
                    className="p-1 rounded-lg hover:bg-gray-100"
                    title="Печать / PDF"
                >
                    <Printer size={16} className="text-blue-600"/>
                </Button>
                <Button onClick={() => refetch()}>Применить</Button>
                <Button
                    type="primary"
                    onClick={() => {
                        setEditing(null)
                        setOpen(true)
                        form.resetFields()
                        form.setFieldsValue({
                            client_id: context?.clientId,
                            doctor_id: context?.doctorId,
                        })
                    }}
                >
                    Новое приём
                </Button>
            </Space>

            <Table<VisitResponse | GapRow>
                rowKey={(r) => (isGap(r) ? r.id : (r as VisitResponse).id)}
                loading={isLoading}
                dataSource={tableData}
                columns={columns}
            />

            <Modal
                title={editing ? 'Редактировать приём' : 'Новое приём'}
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
                            <EntitySelect entity="clients"/>
                        </Form.Item>
                    )}
                    {!context?.doctorId && (
                        <Form.Item name="doctor_id" label="Врач"
                                   rules={[{required: !editing, message: 'Выберите врача'}]}>
                            <EntitySelect entity="doctors"/>
                        </Form.Item>
                    )}

                    <Form.Item name="date" label="Дата" rules={[{required: !editing, message: 'Укажите дату'}]}>
                        <DatePicker style={{width: '100%'}}/>
                    </Form.Item>

                    <Space size="large" wrap>
                        <Form.Item name="time_start" label="Начало"
                                   rules={[{required: !editing, message: 'Укажите время начала'}]}>
                            <TimePicker format="HH:mm"/>
                        </Form.Item>
                        <Form.Item name="time_end" label="Окончание">
                            <TimePicker format="HH:mm"/>
                        </Form.Item>
                    </Space>

                    <Form.Item name="procedure" label="Услуга">
                        <Input/>
                    </Form.Item>
                    <Form.Item name="cabinet" label="Кабинет">
                        <Input/>
                    </Form.Item>
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
                    data={data ?? []}
                    clientsMap={clientsMap}
                    doctorsMap={doctorsMap}
                />
            </div>
        </div>
    )
}
