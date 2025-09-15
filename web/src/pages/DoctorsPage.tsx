import { useEffect, useMemo, useState } from 'react'
import { Button, Form, Input, Modal, Space, Table, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

// Типы — подгони под свои реальные поля модели доктора
type Doctor = {
    id: number
    first_name: string
    last_name: string
    phone?: string
    specialty?: string
}

async function fetchDoctors(q: string): Promise<Doctor[]> {
    const res = await api.get(`/doctors`, { params: q ? { q } : {} })
    return res.data
}
async function createDoctor(body: Partial<Doctor>): Promise<Doctor> {
    const res = await api.post(`/doctors`, body)
    return res.data
}
async function updateDoctor(id: number, body: Partial<Doctor>): Promise<Doctor> {
    const res = await api.patch(`/doctors/${id}`, body)
    return res.data
}

export default function DoctorsPage() {
    const qc = useQueryClient()
    const [search, setSearch] = useState('')
    const [debounced, setDebounced] = useState('')
    const [open, setOpen] = useState(false)
    const [editing, setEditing] = useState<Doctor | null>(null)
    const [form] = Form.useForm<Partial<Doctor>>()

    // Дебаунс поиска (просто и достат.)
    useEffect(() => {
        const t = setTimeout(() => setDebounced(search), 300)
        return () => clearTimeout(t)
    }, [search])

    const { data, isLoading } = useQuery({
        queryKey: ['doctors', debounced],
        queryFn: () => fetchDoctors(debounced),
    })

    const createMut = useMutation({
        mutationFn: (b: Partial<Doctor>) => createDoctor(b),
        onSuccess: () => {
            message.success('Доктор создан')
            qc.invalidateQueries({ queryKey: ['doctors'] })
            setOpen(false)
            form.resetFields()
        },
    })

    const updateMut = useMutation({
        mutationFn: (b: Partial<Doctor>) => updateDoctor(editing!.id, b),
        onSuccess: () => {
            message.success('Сохранено')
            qc.invalidateQueries({ queryKey: ['doctors'] })
            setOpen(false)
            setEditing(null)
            form.resetFields()
        },
    })

    const onSubmit = async () => {
        const values = await form.validateFields()
        // PATCH — можно послать только заполненные поля
        if (editing) {
            updateMut.mutate(values)
        } else {
            createMut.mutate(values)
        }
    }

    const columns: ColumnsType<Doctor> = useMemo(() => [
        { title: 'ID', dataIndex: 'id', width: 80 },
        { title: 'Имя', dataIndex: 'first_name' },
        { title: 'Фамилия', dataIndex: 'last_name' },
        { title: 'Телефон', dataIndex: 'phone' },
        { title: 'Специализация', dataIndex: 'specialty' },
        {
            title: 'Действия',
            render: (_, row) => (
                <Space>
                    <Button
                        onClick={() => {
                            setEditing(row)
                            setOpen(true)
                            form.setFieldsValue(row)
                        }}
                    >
                        Редактировать
                    </Button>
                </Space>
            ),
        },
    ], [form])

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <Space style={{ marginBottom: 16 }}>
                <Input
                    placeholder="Поиск по имени/телефону"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    allowClear
                />
                <Button type="primary" onClick={() => { setEditing(null); setOpen(true); form.resetFields() }}>
                    Новый доктор
                </Button>
            </Space>

            <Table
                rowKey="id"
                loading={isLoading}
                dataSource={data || []}
                columns={columns}
            />

            <Modal
                title={editing ? 'Редактировать доктора' : 'Новый доктор'}
                open={open}
                onCancel={() => { setOpen(false); setEditing(null) }}
                onOk={onSubmit}
                confirmLoading={createMut.isPending || updateMut.isPending}
                okText="Сохранить"
                cancelText="Отмена"
            >
                <Form form={form} layout="vertical">
                    <Form.Item name="first_name" label="Имя" rules={[{ required: true, message: 'Укажите имя' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="last_name" label="Фамилия" rules={[{ required: true, message: 'Укажите фамилию' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="phone" label="Телефон">
                        <Input />
                    </Form.Item>
                    <Form.Item name="specialty" label="Специализация">
                        <Input />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    )
}
