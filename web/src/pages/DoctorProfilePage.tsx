import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { DoctorResponse } from '../api'
import { Button, Card, Col, Row, Skeleton, Typography } from 'antd'
import VisitsManager from '../components/visits/VisitsManager'

async function fetchDoctor(id: string): Promise<DoctorResponse> {
    const res = await api.get<DoctorResponse>(`/doctors/${id}`)
    return res.data
}

export default function DoctorProfilePage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    if (!id) return <div>Некорректный id</div>

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { data: doctor, isLoading } = useQuery({
        queryKey: ['doctor', id],
        queryFn: () => fetchDoctor(id),
    })

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <Row gutter={[16, 16]} align="middle" style={{ marginBottom: 12 }}>
                <Col flex="none">
                    <Button onClick={() => navigate('/doctors')}>← К списку</Button>
                </Col>
                <Col flex="auto">
                    <Typography.Title level={3} style={{ margin: 0 }}>
                        Профиль врача
                    </Typography.Title>
                </Col>
            </Row>

            <Card style={{ marginBottom: 16 }}>
                {isLoading ? (
                    <Skeleton active />
                ) : (
                    <Row gutter={[16, 8]}>
                        <Col xs={24} md={12}><b>ФИО:</b> {doctor?.full_name}</Col>
                        <Col xs={24} md={12}><b>Специализация:</b> {doctor?.speciality}</Col>
                    </Row>
                )}
            </Card>

            <Typography.Title level={4} style={{ marginTop: 0 }}>Посещения у этого врача</Typography.Title>

            <VisitsManager
                context={{ doctorId: id }}
                show={{
                    doctor: false,     // на странице врача столбец «Врач» не нужен
                    client: true,
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
