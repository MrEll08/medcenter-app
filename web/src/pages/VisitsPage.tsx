import { useMemo, useState } from 'react'
import { Button, DatePicker, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs, { Dayjs } from 'dayjs'
import { api } from '../lib/api'
import type { VisitCreateRequest, VisitResponse, VisitStatusEnum, VisitUpdateRequest } from '../api'
import { getErrorMessage } from '../lib/errors'
import EntitySelect from '../components/EntitySelect'

const { RangePicker } = DatePicker
const STATUS: VisitStatusEnum[] = ['UNCONFIRMED','CONFIRMED','IN_PROGRESS','COMPLETED','PAID']

type VisitFormValues = Partial<VisitCreateRequest & VisitUpdateRequest> & {
    start_date?: string | Dayjs
    end_date?: string | Dayjs
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

export default function VisitsPage() {
    const qc = useQueryClient()

    // фильтры
    const [clientId, setClientId] = useState<string | undefined>()
    const [doctorId, setDoctorId] = useState<string | undefined>()
    const [status, setStatus] = useState<VisitStatusEnum | undefined>()
    const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null)
    const [cabinet, setCabinet] = useState<string | undefined>()
    const [procedure, setProcedure] = useState<string | undefined>()
    const [limit, setLimit] = useState<number>(30)

    const params: VisitQueryParams = useMemo(() => {
        const p: VisitQueryParams = { search_limit: limit }
        if (clientId) p.client_id = clientId
        if (doctorId) p.doctor_id = doctorId
        if (status) p.status = status
        if (cabinet) p.cabinet = cabinet
        if (procedure) p.procedure = procedure
        if (range) {
            p.start_date = range[0].toISOString()
            p.end_date = range[1].toISOString()
        }
        return p
    }, [clientId, doctorId, status, cabinet, procedure, range, limit])

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['visits', params],
        queryFn: () => fetchVisits(params),
    })

    // CRUD модалка
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

    const columns: ColumnsType<VisitResponse> = [
        { title: 'Начало', dataIndex: 'start_date', render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm') },
        { title: 'Окончание', dataIndex: 'end_date', render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm') },
        { title: 'Статус', dataIndex: 'status', render: (s: VisitStatusEnum) => <Tag>{s}</Tag> },
        { title: 'Кабинет', dataIndex: 'cabinet', render: (v?: string | null) => v ?? '—' },
        { title: 'Процедура', dataIndex: 'procedure', ellipsis: true, render: (v?: string | null) => v ?? '—' },
        { title: 'Стоимость', dataIndex: 'cost', render: (v?: number | null) => (v ?? '—') },
        { title: 'Клиент', dataIndex: 'client_name' },
        { title: 'Доктор', dataIndex: 'doctor_name' },
        {
            title: 'Действия',
            width: 240,
            render: (_, row) => (
                <Space>
                    <Button onClick={() => {
                        setEditing(row); setOpen(true)
                        form.setFieldsValue({
                            client_id: row.client_id,
                            doctor_id: row.doctor_id,
                            start_date: dayjs(row.start_date),
                            end_date: dayjs(row.end_date),
                            status: row.status,
                            procedure: row.procedure ?? undefined,
                            cabinet: row.cabinet ?? undefined,
                            cost: row.cost ?? undefined,
                        })
                    }}>Редактировать</Button>
                    <Button danger loading={deleteMut.isPending} onClick={() => deleteMut.mutate(row.id)}>
                        Удалить
                    </Button>
                </Space>
            ),
        },
    ]

    const onSubmit = async () => {
        const v = await form.validateFields()
        const startISO = dayjs.isDayjs(v.start_date) ? v.start_date.toISOString() : v.start_date
        const endISO = dayjs.isDayjs(v.end_date) ? v.end_date.toISOString() : v.end_date

        if (editing) {
            const payload: VisitUpdateRequest = {
                client_id: v.client_id,
                doctor_id: v.doctor_id,
                start_date: startISO,
                end_date: endISO,
                status: v.status,
                procedure: v.procedure,
                cabinet: v.cabinet,
                cost: v.cost,
            }
            updateMut.mutate(payload)
        } else {
            const payload: VisitCreateRequest = {
                client_id: v.client_id!,
                doctor_id: v.doctor_id!,
                start_date: startISO!, // required
                end_date: endISO,
                status: v.status,
                procedure: v.procedure,
                cabinet: v.cabinet,
                cost: v.cost,
            }
            createMut.mutate(payload)
        }
    }

    return (
        <div style={{ maxWidth: 1250, margin: '0 auto' }}>
            <Space wrap style={{ marginBottom: 16 }}>
                <EntitySelect entity="clients" value={clientId} onChange={setClientId} placeholder="Клиент" allowClear />
                <EntitySelect entity="doctors" value={doctorId} onChange={setDoctorId} placeholder="Доктор" allowClear />
                <Select allowClear placeholder="Статус" value={status} onChange={setStatus} style={{ width: 220 }}
                        options={STATUS.map(s => ({ value: s, label: s }))} />
                <Input placeholder="Кабинет" value={cabinet} onChange={(e) => setCabinet(e.target.value || undefined)} />
                <Input placeholder="Процедура" value={procedure} onChange={(e) => setProcedure(e.target.value || undefined)} />
                <RangePicker showTime value={range ?? undefined} onChange={(v) => setRange((v && v[0] && v[1]) ? [v[0], v[1]] : null)} />
                <InputNumber min={1} max={500} value={limit} onChange={(v) => setLimit(typeof v === 'number' ? v : 30)} placeholder="Лимит" />
                <Button onClick={() => refetch()}>Применить</Button>
                <Button type="primary" onClick={() => { setEditing(null); setOpen(true); form.resetFields() }}>
                    Новый визит
                </Button>
            </Space>

            <Table rowKey="id" loading={isLoading} dataSource={data || []} columns={columns} />

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
                    <Form.Item name="client_id" label="Клиент" rules={[{ required: !editing, message: 'Выберите клиента' }]}>
                        <EntitySelect entity="clients" />
                    </Form.Item>
                    <Form.Item name="doctor_id" label="Доктор" rules={[{ required: !editing, message: 'Выберите доктора' }]}>
                        <EntitySelect entity="doctors" />
                    </Form.Item>
                    <Form.Item name="start_date" label="Начало" rules={[{ required: !editing, message: 'Укажите дату и время' }]}>
                        <DatePicker showTime style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="end_date" label="Окончание">
                        <DatePicker showTime style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="status" label="Статус">
                        <Select allowClear options={STATUS.map(s => ({ value: s, label: s }))} />
                    </Form.Item>
                    <Form.Item name="procedure" label="Процедура"><Input /></Form.Item>
                    <Form.Item name="cabinet" label="Кабинет"><Input /></Form.Item>
                    <Form.Item name="cost" label="Стоимость"><InputNumber style={{ width: '100%' }} min={0} step={50} /></Form.Item>
                </Form>
            </Modal>
        </div>
    )
}
