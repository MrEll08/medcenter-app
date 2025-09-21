import { Form, Input } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import EntityManager from '../components/EntityManager'
import EntityLink from '../components/EntityLink'
import { api } from '../lib/api'
import type { DoctorCreateRequest, DoctorResponse, DoctorUpdateRequest } from '../api'

type DoctorForm = {
    full_name?: string
    speciality?: string
}

async function fetchDoctors(search: string): Promise<DoctorResponse[]> {
    const res = await api.get<DoctorResponse[]>('/doctors/', { params: { search_substr: search } })
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

const columns: ColumnsType<DoctorResponse> = [
    {
        title: 'ФИО',
        dataIndex: 'full_name',
        render: (_: unknown, row: DoctorResponse) => (
            <EntityLink kind="doctors" id={row.id} label={row.full_name} />
        ),
    },
    { title: 'Специализация', dataIndex: 'speciality' },
]

export default function DoctorsPage() {
    return (
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <h2>Доктора</h2>

            <EntityManager<DoctorResponse, DoctorCreateRequest, DoctorUpdateRequest, DoctorForm>
                title="доктор"
                queryKey={['doctors']}
                fetchList={fetchDoctors}
                createItem={createDoctor}
                updateItem={updateDoctor}
                columns={columns}
                searchPlaceholder="Поиск по ФИО/телефону"
                createButtonText="Новый доктор"
                renderForm={() => (
                    <>
                        <Form.Item name="full_name" label="ФИО" rules={[{ required: true, message: 'Укажите ФИО' }]}>
                            <Input />
                        </Form.Item>
                        <Form.Item name="speciality" label="Специализация" rules={[{ required: true, message: 'Укажите специализацию' }]}>
                            <Input />
                        </Form.Item>
                    </>
                )}
                toForm={(item) => ({
                    full_name: item.full_name,
                    speciality: item.speciality,
                })}
                toCreate={(v) => ({
                    full_name: v.full_name!,
                    speciality: v.speciality!,
                })}
                toUpdate={(v) => ({
                    full_name: v.full_name,
                    speciality: v.speciality,
                })}
            />
        </div>
    )
}
