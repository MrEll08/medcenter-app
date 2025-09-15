import { useEffect, useMemo, useState } from 'react'
import { Button, Form, Input, Modal, Space, Table, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { DoctorCreateRequest, DoctorResponse, DoctorUpdateRequest } from '../api'
import { getErrorMessage } from '../lib/errors'

async function fetchDoctors(search_substr: string): Promise<DoctorResponse[]> {
    const res = await api.get<DoctorResponse[]>('/doctors/', { params: { search_substr } })
    return res.data
}
async function createDoctor(body: DoctorCreateRequest): Promise<DoctorResponse> {
    const res = await api.post<DoctorResponse>('/doctors/', body)
    return res.data
}
async function updateDoctor(id: string, body: DoctorUpdateRequest): Promise<DoctorResponse> {
    const res = await api.patch<DoctorResponse>(`/doctors/${id}`, body)
    return res.data
}

type DoctorFormValues = Partial<DoctorCreateRequest & DoctorUpdateRequest>

export default function DoctorsPage() {
    const qc = useQueryClient()
    const [search, setSearch] = useState('')
    const [debounced, setDebounced] = useState('')
    const [open, setOpen] = useState(false)
    const [editing, setEditing] = useState<DoctorResponse | null>(null)
    const [form] = Form.useForm<DoctorFormValues>()

    useEffect(() => {
        const t = setTimeout(() => setDebounced(search), 300)
        return () => clearTimeout(t)
    }, [search])

    const { data, isLoading } = useQuery({
        queryKey: ['doctors', debounced],
        queryFn: () => fetchDoctors(debounced),
    })

    const createMut = useMutation({
        mutationFn: (b: DoctorCreateRequest) => createDoctor(b),
        onSuccess: () => {
            message.success('Доктор создан')
            qc.invalidateQueries({ queryKey: ['doctors'] })
            setOpen(false); form.resetFields()
        },
        onError: (err: unknown) => message.error(getErrorMessage(err)),
    })

    const updateMut = useMutation({
        mutationFn: (b: DoctorUpdateRequest) => updateDoctor(editing!.id, b),
        onSuccess: () => {
            message.success('Сохранено')
            qc.invalidateQueries({ queryKey: ['doctors'] })
            setOpen(false); setEditing(null); form.resetFields()
        },
        onError: (err: unknown) => message.error(getErrorMessage(err)),
    })

    const onSubmit = async () => {
        const v = await form.validateFields()
        if (editing) {
            const payload: DoctorUpdateRequest = { full_name: v.full_name, speciality: v.speciality }
            updateMut.mutate(payload)
        } else {
            const payload: DoctorCreateRequest = { full_name: v.full_name!, speciality: v.speciality! }
            createMut.mutate(payload)
        }
    }

    const columns: ColumnsType<DoctorResponse> = useMemo(() => [
        { title: 'ФИО', dataIndex: 'full_name' },
        { title: 'Специализация', dataIndex: 'speciality' },
        {
            title: 'Действия',
            width: 160,
            render: (_, row) => (
                <Button onClick={() => { setEditing(row); setOpen(true); form.setFieldsValue({ full_name: row.full_name, speciality: row.speciality }) }}>
                    Редактировать
                </Button>
            ),
        },
    ], [form])

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <Space style={{ marginBottom: 16 }}>
                <Input placeholder="Поиск" value={search} onChange={(e) => setSearch(e.target.value)} allowClear />
                <Button type="primary" onClick={() => { setEditing(null); setOpen(true); form.resetFields() }}>
                    Новый доктор
                </Button>
            </Space>

            <Table rowKey="id" loading={isLoading} dataSource={data || []} columns={columns} />

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
                    <Form.Item name="full_name" label="ФИО" rules={[{ required: !editing, message: 'Укажите ФИО' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="speciality" label="Специализация" rules={[{ required: !editing, message: 'Укажите специализацию' }]}>
                        <Input />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    )
}
