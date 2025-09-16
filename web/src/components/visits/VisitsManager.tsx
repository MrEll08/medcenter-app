import { useMemo, useState } from 'react'
import { Button, DatePicker, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs, { Dayjs } from 'dayjs'
import { api } from '../../lib/api'
import type {
    VisitCreateRequest,
    VisitResponse,
    VisitStatusEnum,
    VisitUpdateRequest,
} from '../../api'
import { getErrorMessage } from '../../lib/errors'
import EntitySelect from '../EntitySelect'
import {Pencil, Trash2} from "lucide-react";

const { RangePicker } = DatePicker
const STATUS: VisitStatusEnum[] = ['UNCONFIRMED','CONFIRMED','IN_PROGRESS','COMPLETED','PAID']

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
    /** Страница клиента → фиксируем client_id и скрываем выбор клиента в формах */
    clientId?: string
    /** Страница врача → фиксируем doctor_id и скрываем выбор врача в формах */
    doctorId?: string
}

type Props = {
    context?: Context
    show?: ShowColumns
    /** дополнительно ограничить лимит в фильтрах по умолчанию */
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
    const res = await api.get<VisitResponse[]>('/visits/', { params })
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

export default function VisitsManager({ context, show, defaultLimit = 30 }: Props) {
    const qc = useQueryClient()

    // -------- Фильтры списка --------
    const [clientId, setClientId] = useState<string | undefined>(context?.clientId)
    const [doctorId, setDoctorId] = useState<string | undefined>(context?.doctorId)
    const [status, setStatus] = useState<VisitStatusEnum | undefined>()
    const [day, setDay] = useState<Dayjs | null>(null)
    const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null)
    const [cabinet, setCabinet] = useState<string | undefined>()
    const [procedure, setProcedure] = useState<string | undefined>()
    const [limit, setLimit] = useState<number>(defaultLimit)

    const params: VisitQueryParams = useMemo(() => {
        const p: VisitQueryParams = { search_limit: limit }
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

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['visits', params],
        queryFn: () => fetchVisits(params),
    })

    // -------- Модалка / форма --------
    const [open, setOpen] = useState(false)
    const [editing, setEditing] = useState<VisitResponse | null>(null)
    const [form] = Form.useForm<VisitFormValues>()

    const createMut = useMutation({
        mutationFn: (b: VisitCreateRequest) => createVisit(b),
        onSuccess: () => {
            message.success('Визит создан')
            qc.invalidateQueries({ queryKey: ['visits'] })
            setOpen(false); form.resetFields()
        },
        onError: (err: unknown) => message.error(getErrorMessage(err)),
    })

    const updateMut = useMutation({
        mutationFn: (b: VisitUpdateRequest) => updateVisit(editing!.id, b),
        onSuccess: () => {
            message.success('Сохранено')
            qc.invalidateQueries({ queryKey: ['visits'] })
            setOpen(false); setEditing(null); form.resetFields()
        },
        onError: (err: unknown) => message.error(getErrorMessage(err)),
    })

    const deleteMut = useMutation({
        mutationFn: (id: string) => deleteVisit(id),
        onSuccess: () => {
            message.success('Удалено')
            qc.invalidateQueries({ queryKey: ['visits'] })
        },
        onError: (err: unknown) => message.error(getErrorMessage(err)),
    })

    // -------- Колонки --------
    const columns: ColumnsType<VisitResponse> = []

    if (show?.date !== false) {
        columns.push({
            title: 'Дата',
            dataIndex: 'start_date',
            render: (iso: string) => dayjs(iso).format('YYYY-MM-DD'),
        })
    }
    if (show?.startTime !== false) {
        columns.push({
            title: 'Начало',
            dataIndex: 'start_date',
            render: (iso: string) => dayjs(iso).format('HH:mm'),
        })
    }
    if (show?.endTime !== false) {
        columns.push({
            title: 'Окончание',
            dataIndex: 'end_date',
            render: (iso: string) => dayjs(iso).format('HH:mm'),
        })
    }
    if (show?.client !== false && !context?.clientId) {
        columns.push({ title: 'Клиент', dataIndex: 'client_name' })
    }
    if (show?.doctor !== false && !context?.doctorId) {
        columns.push({ title: 'Доктор', dataIndex: 'doctor_name' })
    }
    if (show?.procedure !== false) {
        columns.push({ title: 'Процедура', dataIndex: 'procedure', render: (v?: string | null) => v ?? '—', ellipsis: true })
    }
    if (show?.cabinet !== false) {
        columns.push({ title: 'Кабинет', dataIndex: 'cabinet', render: (v?: string | null) => v ?? '—' })
    }
    if (show?.cost !== false) {
        columns.push({ title: 'Стоимость', dataIndex: 'cost', render: (v?: number | null) => v ?? '—' })
    }
    if (show?.status !== false) {
        columns.push({
            title: 'Статус',
            dataIndex: 'status',
            render: (s: VisitStatusEnum) => <Tag>{s}</Tag>,
        })
    }
    if (show?.actions !== false) {
        columns.push({
            title: 'Действия',
            width: 240,
            render: (_, row) => (
                <Space>
                    <Button
                        className="p-1 rounded-lg hover:bg-gray-100"
                        onClick={() => {
                            setEditing(row)
                            setOpen(true)
                            const start = dayjs(row.start_date)
                            const end = dayjs(row.end_date)
                            form.setFieldsValue({
                                client_id: context?.clientId ?? row.client_id,
                                doctor_id: context?.doctorId ?? row.doctor_id,
                                date: start,
                                time_start: start,
                                time_end: end,
                                procedure: row.procedure ?? undefined,
                                cabinet: row.cabinet ?? undefined,
                                cost: typeof row.cost === 'number' ? row.cost : undefined,
                                status: row.status,
                            })
                        }}
                    >
                        <Pencil size={16} className="text-blue-600" />
                    </Button>
                    <Button
                        danger
                        loading={deleteMut.isPending}
                        onClick={() => deleteMut.mutate(row.id)}
                        className="p-1 rounded-lg hover:bg-gray-100"
                    >
                        <Trash2 size={16} className="text-red-600" />
                    </Button>
                </Space>
            ),
        })
    }

    // -------- Сабмит формы --------
    const onSubmit = async () => {
        const v = await form.validateFields()

        // нормализуем start/end в ISO, визит в пределах одного дня
        const startISO =
            v.date && v.time_start ? combineDateAndTime(v.date, v.time_start) : undefined
        const endISO =
            v.date && v.time_end ? combineDateAndTime(v.date, v.time_end) : null

        if (startISO && endISO && dayjs(endISO).isBefore(dayjs(startISO))) {
            message.error('Окончание не может быть раньше начала')
            return
        }

        if (editing) {
            const body: VisitUpdateRequest = {
                client_id: context?.clientId ?? v.client_id,
                doctor_id: context?.doctorId ?? v.doctor_id,
                start_date: startISO,
                end_date: endISO ?? undefined, // в update null означает «очистить», undefined — «не менять»
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
                start_date: startISO!,                       // required
                end_date: endISO,                            // string | null
                procedure: v.procedure !== undefined ? v.procedure : null,
                cabinet:   v.cabinet   !== undefined ? v.cabinet   : null,
                cost:      v.cost      !== undefined ? v.cost      : null,
                // status не отправляем — его нет в Create
            }
            createMut.mutate(body)
        }
    }

    // -------- UI --------
    return (
        <div>
            {/* Фильтры */}
            <Space wrap style={{ marginBottom: 16 }}>
                {!context?.clientId && (
                    <EntitySelect entity="clients" value={clientId} onChange={setClientId} placeholder="Клиент" allowClear />
                )}
                {!context?.doctorId && (
                    <EntitySelect entity="doctors" value={doctorId} onChange={setDoctorId} placeholder="Доктор" allowClear />
                )}
                <Select
                    allowClear
                    placeholder="Статус"
                    value={status}
                    onChange={setStatus}
                    style={{ width: 220 }}
                    options={STATUS.map(s => ({ value: s, label: s }))}
                />
                <Input placeholder="Кабинет" value={cabinet} onChange={(e) => setCabinet(e.target.value || undefined)} />
                <Input placeholder="Процедура" value={procedure} onChange={(e) => setProcedure(e.target.value || undefined)} />
                <DatePicker
                    placeholder="День"
                    value={day ?? undefined}
                    onChange={(d) => { setDay(d ?? null); if (d) setRange(null) }}
                />
                <RangePicker
                    showTime
                    value={range ?? undefined}
                    onChange={(v) => { setRange(v && v[0] && v[1] ? [v[0], v[1]] as [Dayjs, Dayjs] : null); if (v && v[0] && v[1]) setDay(null) }}
                />
                <InputNumber
                    min={1}
                    max={500}
                    value={limit}
                    onChange={(v) => setLimit(typeof v === 'number' ? v : defaultLimit)}
                    placeholder="Лимит"
                />
                <Button onClick={() => refetch()}>Применить</Button>
                <Button
                    type="primary"
                    onClick={() => {
                        setEditing(null)
                        setOpen(true)
                        form.resetFields()
                        // проставим context ids в форму, чтобы не выбирать заново
                        form.setFieldsValue({
                            client_id: context?.clientId,
                            doctor_id: context?.doctorId,
                        })
                    }}
                >
                    Новый визит
                </Button>
            </Space>

            <Table<VisitResponse> rowKey="id" loading={isLoading} dataSource={data || []} columns={columns} />

            <Modal
                title={editing ? 'Редактировать визит' : 'Новый визит'}
                open={open}
                onCancel={() => { setOpen(false); setEditing(null) }}
                onOk={onSubmit}
                okText="Сохранить"
                cancelText="Отмена"
                confirmLoading={createMut.isPending || updateMut.isPending}
            >
                <Form form={form} layout="vertical">
                    {!context?.clientId && (
                        <Form.Item name="client_id" label="Клиент" rules={[{ required: !editing, message: 'Выберите клиента' }]}>
                            <EntitySelect entity="clients" />
                        </Form.Item>
                    )}
                    {!context?.doctorId && (
                        <Form.Item name="doctor_id" label="Доктор" rules={[{ required: !editing, message: 'Выберите доктора' }]}>
                            <EntitySelect entity="doctors" />
                        </Form.Item>
                    )}

                    <Form.Item name="date" label="Дата" rules={[{ required: !editing, message: 'Укажите дату' }]}>
                        <DatePicker style={{ width: '100%' }} />
                    </Form.Item>

                    <Space size="large">
                        <Form.Item name="time_start" label="Начало" rules={[{ required: !editing, message: 'Укажите время начала' }]}>
                            <DatePicker showTime format="HH:mm" picker="time" />
                        </Form.Item>
                        <Form.Item name="time_end" label="Окончание">
                            <DatePicker showTime format="HH:mm" picker="time" />
                        </Form.Item>
                    </Space>

                    <Form.Item name="procedure" label="Процедура">
                        <Input />
                    </Form.Item>
                    <Form.Item name="cabinet" label="Кабинет">
                        <Input />
                    </Form.Item>
                    <Form.Item name="cost" label="Стоимость">
                        <InputNumber style={{ width: '100%' }} min={0} step={50} />
                    </Form.Item>

                    {editing && (
                        <Form.Item name="status" label="Статус">
                            <Select allowClear options={STATUS.map(s => ({ value: s, label: s }))} />
                        </Form.Item>
                    )}
                </Form>
            </Modal>
        </div>
    )
}
