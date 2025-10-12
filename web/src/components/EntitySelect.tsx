import {Select} from 'antd'
import {useQuery} from '@tanstack/react-query'
import {api} from '../lib/api'
import type {ClientResponse, DoctorResponse} from '../api'

type Props = {
    entity: 'clients' | 'doctors'
    value?: string
    onChange?: (v?: string) => void
    allowClear?: boolean
    placeholder?: string
    fullWidth?: boolean
}

type Option = { value: string; label: string }

async function fetchOptions(entity: 'clients' | 'doctors'): Promise<Option[]> {
    if (entity === 'clients') {
        const res = await api.get<ClientResponse[]>('/clients/', {params: {search_substr: ''}})
        return res.data.map(c => ({value: c.id, label: c.full_name}))
    }
    const res = await api.get<DoctorResponse[]>('/doctors/', {params: {search_substr: ''}})
    return res.data.map(d => ({value: d.id, label: d.full_name}))
}

export default function EntitySelect({entity, value, onChange, allowClear, placeholder, fullWidth = false}: Props) {
    const {data, isLoading} = useQuery({
        queryKey: [entity, 'options'],
        queryFn: () => fetchOptions(entity),
    })

    return (
        <Select
            showSearch
            loading={isLoading}
            value={value}
            onChange={onChange}
            allowClear={allowClear}
            placeholder={placeholder}
            optionFilterProp="label"
            style={{
                width: fullWidth ? '100%' : undefined,
                minWidth: 170,
                maxWidth: fullWidth ? '100%' : 250,
            }}
            options={data ?? []}
        />
    )
}
