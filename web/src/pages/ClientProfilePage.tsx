import { useCallback, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { api } from '../lib/api'
import type { ClientResponse, VisitStatusEnum } from '../api'
import { Button, Card, Col, Row, Select, Skeleton, Space, Typography } from 'antd'
import { fetchVisits, type VisitQueryParams } from '../api/visits'
import VisitsManager from '../components/visits/VisitsManager'

async function fetchClient(id: string): Promise<ClientResponse> {
    const res = await api.get<ClientResponse>(`/clients/${id}`)
    return res.data
}

type YearFilterValue = 'all' | number

export default function ClientProfilePage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    const { data: client, isLoading } = useQuery({
        queryKey: ['client', id],
        enabled: !!id,
        queryFn: () => fetchClient(id!),
    })

    const [selectedYear, setSelectedYear] = useState<YearFilterValue>('all')
    const yearOptions = useMemo(() => {
        const currentYear = dayjs().year()
        const years = Array.from({length: 10}, (_, idx) => currentYear - idx)
        return [
            {value: 'all' as YearFilterValue, label: 'За всё время'},
            ...years.map(year => ({value: year as YearFilterValue, label: String(year)})),
        ]
    }, [])

    const currencyFormatter = useMemo(
        () => new Intl.NumberFormat('ru-RU', {minimumFractionDigits: 0, maximumFractionDigits: 2}),
        [],
    )

    const {
        data: totalPaidRaw,
        isLoading: isTotalLoading,
        isFetching: isTotalFetching,
    } = useQuery({
        queryKey: ['client-total-paid', id, selectedYear],
        enabled: !!id,
        queryFn: async () => {
            if (!id) return 0
            const params: VisitQueryParams = {
                client_id: id,
                status: 'PAID' as VisitStatusEnum,
                limit: 1,
                offset: 0,
            }

            if (selectedYear !== 'all') {
                const start = dayjs().year(selectedYear).startOf('year').toISOString()
                const end = dayjs().year(selectedYear).endOf('year').toISOString()
                params.start_date = start
                params.end_date = end
            }

            const res = await fetchVisits(params)
            return res.total_cost ?? 0
        },
    })

    const handleTotalsChange = useCallback(() => {
        if (!id) return
        queryClient.invalidateQueries({queryKey: ['client-total-paid', id]})
    }, [queryClient, id])

    const totalPaid = totalPaidRaw ?? 0
    const totalPaidDisplay = (isTotalLoading && totalPaidRaw === undefined)
        ? 'Загрузка…'
        : `${currencyFormatter.format(totalPaid)} ₽${isTotalFetching && !isTotalLoading ? ' ⋯' : ''}`

    if (!id) return <div>Некорректный id</div>

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <Row gutter={[16, 16]} align="middle" style={{ marginBottom: 12 }}>
                <Col flex="none">
                    <Button onClick={() => navigate('/clients')}>← К списку</Button>
                </Col>
                <Col flex="auto">
                    <Typography.Title level={3} style={{ margin: 0 }}>
                        Профиль пациента
                    </Typography.Title>
                </Col>
            </Row>

            <Card style={{ marginBottom: 16 }}>
                {isLoading ? (
                    <Skeleton active />
                ) : (
                    <Row gutter={[16, 8]}>
                        <Col xs={24} md={8}><b>ФИО:</b> {client?.full_name}</Col>
                        <Col xs={24} md={8}><b>Телефон:</b> {client?.phone_number}</Col>
                        <Col xs={24} md={8}><b>Дата рождения:</b> {client?.date_of_birth}</Col>
                    </Row>
                )}
            </Card>

            <Card style={{ marginBottom: 16 }}>
                <Space direction="vertical" size="small">
                    <Typography.Text type="secondary">Оплачено</Typography.Text>
                    <Typography.Title level={4} style={{ margin: 0 }}>
                        {totalPaidDisplay}
                    </Typography.Title>
                    <Space size="small" wrap align="center">
                        <Typography.Text type="secondary">Период:</Typography.Text>
                        <Select
                            value={selectedYear}
                            options={yearOptions}
                            onChange={(value) => setSelectedYear(value as YearFilterValue)}
                            style={{ minWidth: 160 }}
                        />
                    </Space>
                </Space>
            </Card>

            <Typography.Title level={4} style={{ marginTop: 0 }}>Посещения</Typography.Title>

            <VisitsManager
                context={{ clientId: id }}
                onTotalsChange={handleTotalsChange}
                // можно тонко настраивать отображение:
                show={{
                    client: false,        // на странице пациента столбец «Пациент» не нужен
                    doctor: true,
                    date: true,
                    startTime: true,
                    endTime: true,
                    procedure: true,
                    status: true,
                    cabinet: false,
                    cost: true,
                    actions: true,
                }}
                defaultLimit={50}
            />
        </div>
    )
}
