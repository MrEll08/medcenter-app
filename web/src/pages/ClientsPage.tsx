import { useEffect, useMemo, useState } from 'react'
import { Button, DatePicker, Form, Input, Modal, Space, Table, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs, { Dayjs } from 'dayjs'
import { api } from '../lib/api'
import type { ClientCreateRequest, ClientResponse, ClientUpdateRequest } from '../api'
import { getErrorMessage } from '../lib/errors'

async function fetchClients(search_substr: string): Promise<ClientResponse[]> {
    const res = await api.get<ClientResponse[]>('/clients/', { params: { search_substr } })
    return res.data
}
async function createClient(body: ClientCreateRequest): Promise<ClientResponse> {
    const res = await api.post<ClientResponse>('/clients/', body)
    return res.data
}
async function updateClient(id: string, body: ClientUpdateRequest): Promise<ClientResponse> {
    const res = await api.patch<ClientResponse>(`/clients/${id}`, body)
    return res.data
}

type ClientFormValues = Partial<ClientCreateRequest & ClientUpdateRequest> & {
    date_of_birth?: string | Dayjs
}

export default function ClientsPage() {
    const qc = useQueryClient()
    const [search, setSearch] = useState('')
    const [debounced, setDebounced] = useState('')
    const [open, setOpen] = useState(false)
    const [editing, setEditing] = useState<ClientResponse | null>(null)
    const [form] = Form.useForm<ClientFormValues>()

    useEffect(() => {
        const t = setTimeout(() => setDebounced(search), 300)
        return () => clearTimeout(t)
    }, [search])

    const { data, isLoading } = useQuery({
        queryKey: ['clients', debounced],
        queryFn: () => fetchClients(debounced),
    })

    const createMut = useMutation({
        mutationFn: (b: ClientCreateRequest) => createClient(b),
        onSuccess: () => {
            message.success('Клиент создан')
            qc.invalidateQueries({ queryKey: ['clients'] })
            setOpen(false); form.resetFields()
        },
        onError: (err: unknown) => message.error(getErrorMessage(err)),
    })

    const updateMut = useMutation({
        mutationFn: (b: ClientUpdateRequest) => updateClient(editing!.id, b),
        onSuccess: () => {
            message.success('Сохранено')
            qc.invalidateQueries({ queryKey: ['clients'] })
            setOpen(false); setEditing(null); form.resetFields()
        },
        onError: (err: unknown) => message.error(getErrorMessage(err)),
    })

    const columns: ColumnsType<ClientResponse> = useMemo(() => [
        { title: 'ФИО', dataIndex: 'full_name' },
        { title: 'Телефон', dataIndex: 'phone_number' },
        { title: 'Дата рождения', dataIndex: 'date_of_birth', render: (v: string) => v || '—' },
        {
            title: 'Действия',
            width: 160,
            render: (_, row) => (
                <Button onClick={() => {
                    setEditing(row); setOpen(true)
                    form.setFieldsValue({
                        full_name: row.full_name,
                        phone_number: row.phone_number,
                        date_of_birth: row.date_of_birth ? dayjs(row.date_of_birth) : undefined,
                    })
                }}>
                    Редактировать
                </Button>
            ),
        },
    ], [form])

    const onSubmit = async () => {
        const v = await form.validateFields()
        const dob = dayjs.isDayjs(v.date_of_birth) ? v.date_of_birth.format('YYYY-MM-DD') : v.date_of_birth

        if (editing) {
            const payload: ClientUpdateRequest = {
                full_name: v.full_name,
                phone_number: v.phone_number,
                date_of_birth: dob,
            }
            updateMut.mutate(payload)
        } else {
            const payload: ClientCreateRequest = {
                full_name: v.full_name!, // required на создании
                phone_number: v.phone_number!,
                date_of_birth: dob!,     // required на создании
            }
            createMut.mutate(payload)
        }
    }

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <Space style={{ marginBottom: 16 }}>
                <Input placeholder="Поиск по ФИО/телефону" value={search} onChange={(e) => setSearch(e.target.value)} allowClear />
                <Button type="primary" onClick={() => { setEditing(null); setOpen(true); form.resetFields() }}>
                    Новый клиент
                </Button>
            </Space>

            <Table rowKey="id" loading={isLoading} dataSource={data || []} columns={columns} />

            <Modal
                title={editing ? 'Редактировать клиента' : 'Новый клиент'}
                open={open}
                onCancel={() => { setOpen(false); setEditing(null) }}
                onOk={onSubmit}
                confirmLoading={createMut.isPending || updateMut.isPending}
                okText="Сохранить"
                cancelText="Отмена"
            >
                <Form form={form} layout="vertical">
                    <Form.Item name="full_name" label="ФИО" rules={[{ required: !editing, message: 'Укажи ФИО' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="phone_number" label="Телефон" rules={[{ required: !editing, message: 'Укажи телефон' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="date_of_birth" label="Дата рождения" rules={[{ required: !editing, message: 'Укажи дату рождения' }]}>
                        <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    )
}
