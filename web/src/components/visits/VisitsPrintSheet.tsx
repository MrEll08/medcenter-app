import { forwardRef } from 'react'
import dayjs from 'dayjs'
import type { VisitResponse } from '../../api'
import type { PrintColumnKey } from './printConsts'
import { PRINT_HEADERS } from './printConsts'


type ClientExtra = { full_name: string; phone_number?: string | null; date_of_birth?: string | null }
type DoctorExtra = { full_name: string; speciality?: string | null }

type Props = {
    title?: string
    subtitle?: string
    note?: string
    columns: PrintColumnKey[]
    data: VisitResponse[]
    clientsMap?: Record<string, ClientExtra>   // key = client_id
    doctorsMap?: Record<string, DoctorExtra>   // key = doctor_id
}

function ageYears(iso?: string | null): string | undefined {
    if (!iso) return undefined
    const birth = dayjs(iso)
    if (!birth.isValid()) return undefined
    // const now = dayjs()
    // let age = now.year() - birth.year()
    // if (now.dayOfYear() < birth.dayOfYear()) age -= 1
    const age = dayjs().diff(birth, 'year')
    return String(age)
}

function clientCell(v: VisitResponse, extra?: ClientExtra): string {
    if (!extra) return v.client_name
    const tail: string[] = []
    if (extra.phone_number) tail.push(extra.phone_number)
    const age = ageYears(extra.date_of_birth)
    if (age) tail.push(`${age} лет`)
    return tail.length ? `${extra.full_name} ${tail.join(' ')}` : extra.full_name
}

function doctorCell(v: VisitResponse, extra?: DoctorExtra): string {
    if (!extra) return v.doctor_name
    return extra.speciality ? `${extra.full_name} — ${extra.speciality}` : extra.full_name
}

function cell(
    col: PrintColumnKey,
    v: VisitResponse,
    clientsMap?: Record<string, ClientExtra>,
    doctorsMap?: Record<string, DoctorExtra>
): string {
    switch (col) {
        case 'date': return dayjs(v.start_date).format('DD.MM.YYYY')
        case 'time': return `${dayjs(v.start_date).format('HH:mm')}–${dayjs(v.end_date).format('HH:mm')}`
        case 'client': return clientCell(v, clientsMap?.[v.client_id])
        case 'doctor': return doctorCell(v, doctorsMap?.[v.doctor_id])
        case 'cabinet': return v.cabinet ?? '—'
        case 'procedure': return v.procedure ?? '—'
        case 'status': return v.status
        case 'cost': return v.cost != null ? String(v.cost) : '—'
    }
}

const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 12 }
const thtd: React.CSSProperties = { border: '1px solid #ccc', padding: '6px 8px', textAlign: 'left' }
const titleStyle: React.CSSProperties = { fontSize: 18, fontWeight: 700, margin: 0 }
const subtitleStyle: React.CSSProperties = { fontSize: 14, margin: '2px 0 8px 0' }
const noteStyle: React.CSSProperties = { fontSize: 12, color: '#555', margin: '0 0 12px 0' }

const VisitsPrintSheet = forwardRef<HTMLDivElement, Props>(({ title, subtitle, note, columns, data, clientsMap, doctorsMap }, ref) => {
    return (
        <div ref={ref} style={{ padding: 16, color: '#000', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif' }}>
            {title && <h1 style={titleStyle}>{title}</h1>}
            {subtitle && <p style={subtitleStyle}>{subtitle}</p>}
            {note && <p style={noteStyle}>{note}</p>}

            <table style={tableStyle}>
                <thead>
                <tr>
                    {columns.map(c => <th key={c} style={thtd}>{PRINT_HEADERS[c]}</th>)}
                </tr>
                </thead>
                <tbody>
                {data.map(row => (
                    <tr key={row.id}>
                        {columns.map(c => (
                            <td key={c} style={thtd}>
                                {cell(c, row, clientsMap, doctorsMap)}
                            </td>
                        ))}
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    )
})

export default VisitsPrintSheet
