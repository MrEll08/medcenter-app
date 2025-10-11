import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { ClientResponse } from '../api'
import { Button, Card, Col, Row, Skeleton, Typography } from 'antd'
import VisitsManager from '../components/visits/VisitsManager'

async function fetchClient(id: string): Promise<ClientResponse> {
    const res = await api.get<ClientResponse>(`/clients/${id}`)
    return res.data
}

export default function ClientProfilePage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    if (!id) return <div>Некорректный id</div>

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { data: client, isLoading } = useQuery({
        queryKey: ['client', id],
        queryFn: () => fetchClient(id),
    })

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

            <Typography.Title level={4} style={{ marginTop: 0 }}>Посещения</Typography.Title>

            <VisitsManager
                context={{ clientId: id }}
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
