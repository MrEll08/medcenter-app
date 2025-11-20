import {useEffect, useMemo, useState} from 'react'
import {useNavigate, useParams} from 'react-router-dom'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {api} from '../lib/api'
import type {VisitResponse, VisitStatusEnum, VisitUpdateRequest} from '../api'
import {
    Button, Card, Col, DatePicker, Form, Input, InputNumber, Row, Select, Space, Spin, Tag, Typography, message,
    Popconfirm
} from 'antd'
import type {Dayjs} from 'dayjs'
import dayjs from 'dayjs'
import {getErrorMessage} from '../lib/errors'
import EntitySelect from '../components/EntitySelect'
import EntityLink from '../components/EntityLink'
import {Pencil, Trash2} from 'lucide-react'

type VisitForm = {
    client_id: string
    doctor_id: string
    date: Dayjs | null
    time_start: Dayjs | null
    time_end: Dayjs | null
    procedure: string | null
    cabinet: string | null
    cost: number | null
    status: VisitStatusEnum
}

const STATUS: VisitStatusEnum[] = ['UNCONFIRMED', 'CONFIRMED', 'PAID']

async function fetchVisit(id: string): Promise<VisitResponse> {
    const res = await api.get<VisitResponse>(`/visits/${id}`)
    return res.data
}

async function updateVisit(id: string, body: VisitUpdateRequest): Promise<VisitResponse> {
    const res = await api.patch<VisitResponse>(`/visits/${id}`, body)
    return res.data
}

async function deleteVisit(id: string): Promise<void> {
    await api.delete(`/visits/${id}`)
}

function combineDateAndTime(date: Dayjs, time: Dayjs): string {
    return date
        .hour(time.hour())
        .minute(time.minute())
        .second(0)
        .millisecond(0)
        .toISOString()
}

export default function VisitDetailPage() {
    const {id} = useParams<{ id: string }>()
    const navigate = useNavigate()
    const qc = useQueryClient()

    const {data: visit, isLoading, refetch} = useQuery({
        queryKey: ['visit', id],
        queryFn: () => fetchVisit(id!),
        enabled: !!id,
    })

    const [form] = Form.useForm<VisitForm>()
    const [editing, setEditing] = useState(false)

    const updateMut = useMutation({
        mutationFn: (body: VisitUpdateRequest) => updateVisit(id!, body),
        onSuccess: (v) => {
            message.success('Изменения сохранены')
            qc.setQueryData(['visit', id], v)
            setEditing(false)
            refetch()
        },
        onError: (err: unknown) => message.error(getErrorMessage(err)),
    })

    const deleteMut = useMutation({
        mutationFn: () => deleteVisit(id!),
        onSuccess: () => {
            message.success('Приём удален')
            // Можно вернуть на список приёмов
            navigate('/visits')
        },
        onError: (err: unknown) => message.error(getErrorMessage(err)),
    })

    // Инициализируем форму при загрузке приёма
    useEffect(() => {
        if (!visit) return
        const start = dayjs(visit.start_date)
        const end = dayjs(visit.end_date)
        form.setFieldsValue({
            client_id: visit.client_id,
            doctor_id: visit.doctor_id,
            date: start,
            time_start: start,
            time_end: end,
            procedure: visit.procedure ?? null,
            cabinet: visit.cabinet ?? null,
            cost: visit.cost ?? null,
            status: visit.status,
        })
    }, [visit, form])

    const headerDate = useMemo(() => visit ? dayjs(visit.start_date).format('DD.MM.YYYY') : '', [visit])

    const onSave = async () => {
        const v = await form.validateFields()

        // Соберём ISO-даты
        let startISO: string | undefined
        let endISO: string | null | undefined

        if (v.date && v.time_start) {
            startISO = combineDateAndTime(v.date, v.time_start)
        }
        if (v.date && v.time_end) {
            endISO = combineDateAndTime(v.date, v.time_end)
        } else {
            endISO = null // если время окончания не выбрано — считаем как null
        }

        if (startISO && endISO && dayjs(endISO).isBefore(dayjs(startISO))) {
            message.error('Окончание не может быть раньше начала')
            return
        }

        const body: VisitUpdateRequest = {
            client_id: v.client_id,
            doctor_id: v.doctor_id,
            start_date: startISO,
            end_date: endISO,
            procedure: v.procedure ?? null,
            cabinet: v.cabinet ?? null,
            cost: v.cost ?? null,
            status: v.status,
        }

        updateMut.mutate(body)
    }

    if (isLoading || !visit) return <Spin/>

    return (
        <div style={{maxWidth: 1100, margin: '0 auto'}}>
            <Row gutter={[16, 16]} align="middle" style={{marginBottom: 8}}>
                <Col flex="none">
                    <Button onClick={() => navigate(-1)}>← Назад</Button>
                </Col>
                <Col flex="auto">
                    <Typography.Title level={3} style={{margin: 0}}>
                        Приём от {headerDate}
                    </Typography.Title>
                </Col>
                <Col flex="none">
                    <Space>
                        <Button onClick={() => setEditing((e) => !e)} title="Редактировать">
                            <Pencil size={16} className="text-blue-600"/>
                        </Button>

                        <Popconfirm
                            title="Удалить приём?"
                            okText="Удалить"
                            cancelText="Отмена"
                            okButtonProps={{danger: true, loading: deleteMut.isPending}}
                            onConfirm={(e) => {
                                e?.stopPropagation?.()
                                deleteMut.mutate()         // ← реально удаляем здесь
                            }}
                            onCancel={(e) => e?.stopPropagation?.()}
                        >
                            <Button
                                danger
                                loading={deleteMut.isPending}
                                onClick={(e) => e.stopPropagation()} // чтобы не всплывало на родителя
                                htmlType="button"
                                title="Удалить"
                            >
                                <Trash2 size={16} className="text-red-600"/>
                            </Button>
                        </Popconfirm>
                    </Space>
                </Col>
            </Row>

            <Card style={{marginBottom: 16}}>
                <Row gutter={[16, 8]}>
                    <Col xs={24} md={12}>
                        <div><b>Пациент:</b> <EntityLink kind="clients" id={visit.client_id} label={visit.client_name}/>
                        </div>
                    </Col>
                    <Col xs={24} md={12}>
                        <div><b>Врач:</b> <EntityLink kind="doctors" id={visit.doctor_id} label={visit.doctor_name}/>
                        </div>
                    </Col>
                    <Col xs={24} md={8}>
                        <div><b>Дата:</b> {dayjs(visit.start_date).format('DD.MM.YYYY')}</div>
                    </Col>
                    <Col xs={24} md={8}>
                        <div><b>Начало:</b> {dayjs(visit.start_date).format('HH:mm')}</div>
                    </Col>
                    <Col xs={24} md={8}>
                        <div><b>Окончание:</b> {dayjs(visit.end_date).format('HH:mm')}</div>
                    </Col>
                    <Col xs={24} md={8}>
                        <div><b>Статус:</b> <Tag>{visit.status}</Tag></div>
                    </Col>
                    <Col xs={24} md={8}>
                        <div><b>Кабинет:</b> {visit.cabinet ?? '—'}</div>
                    </Col>
                    <Col xs={24} md={8}>
                        <div><b>Стоимость:</b> {visit.cost ?? '—'}</div>
                    </Col>
                    <Col xs={24}>
                        <div><b>Услуга:</b> {visit.procedure ?? '—'}</div>
                    </Col>
                </Row>
            </Card>

            <Typography.Title level={4} style={{marginTop: 0}}>Редактирование</Typography.Title>

            <Form form={form} layout="vertical" disabled={!editing}>
                <Row gutter={[16, 0]}>
                    <Col xs={24} md={12}>
                        <Form.Item name="client_id" label="Пациент"
                                   rules={[{required: true, message: 'Выберите пациента'}]}>
                            <EntitySelect entity="clients"/>
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                        <Form.Item name="doctor_id" label="Врач" rules={[{required: true, message: 'Выберите врача'}]}>
                            <EntitySelect entity="doctors"/>
                        </Form.Item>
                    </Col>

                    <Col xs={24} md={8}>
                        <Form.Item name="date" label="Дата" rules={[{required: true, message: 'Укажите дату'}]}>
                            <DatePicker style={{width: '100%'}} format="DD.MM.YYYY" />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item name="time_start" label="Начало"
                                   rules={[{required: true, message: 'Укажите время начала'}]}>
                            <DatePicker showTime format="HH:mm" picker="time"/>
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item name="time_end" label="Окончание">
                            <DatePicker showTime format="HH:mm" picker="time"/>
                        </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                        <Form.Item name="procedure" label="Услуга">
                            <Input/>
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                        <Form.Item name="cabinet" label="Кабинет">
                            <Input/>
                        </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                        <Form.Item name="cost" label="Стоимость">
                            <InputNumber style={{width: '100%'}} min={0} step={50}/>
                        </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                        <Form.Item name="status" label="Статус" rules={[{required: true, message: 'Выберите статус'}]}>
                            <Select options={STATUS.map(s => ({value: s, label: s}))}/>
                        </Form.Item>
                    </Col>
                </Row>

                {editing && (
                    <Space style={{marginTop: 12}}>
                        <Button type="primary" onClick={onSave} loading={updateMut.isPending}>
                            Сохранить
                        </Button>
                        <Button onClick={() => {
                            setEditing(false);
                            form.resetFields(); /* вернуть текущие значения из visit */
                            if (visit) {
                                const start = dayjs(visit.start_date)
                                const end = dayjs(visit.end_date)
                                form.setFieldsValue({
                                    client_id: visit.client_id,
                                    doctor_id: visit.doctor_id,
                                    date: start,
                                    time_start: start,
                                    time_end: end,
                                    procedure: visit.procedure ?? null,
                                    cabinet: visit.cabinet ?? null,
                                    cost: visit.cost ?? null,
                                    status: visit.status,
                                })
                            }
                        }}>
                            Отмена
                        </Button>
                    </Space>
                )}
            </Form>
        </div>
    )
}
