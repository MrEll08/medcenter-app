import { Typography } from 'antd'
import VisitsManager from '../components/visits/VisitsManager'

export default function VisitsPage() {
    return (
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <Typography.Title level={3} style={{ marginBottom: 16 }}>
                Все посещения
            </Typography.Title>

            <VisitsManager
                // без контекста — показываем всё, включая столбцы «Пациент» и «Врач»
                context={undefined}
                show={{
                    // можно явно зафиксировать нужные колонки (все true по умолчанию)
                    date: true,
                    startTime: true,
                    endTime: true,
                    client: true,
                    doctor: true,
                    procedure: false,
                    cabinet: false,
                    cost: false,
                    status: true,
                    actions: true,
                }}
                defaultLimit={50}
            />
        </div>
    )
}
