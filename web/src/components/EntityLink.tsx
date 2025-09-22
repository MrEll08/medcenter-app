import { Link } from 'react-router-dom'

type Props = {
    id?: string | null
    label?: string | null
    kind: 'clients' | 'doctors' // путь: /clients/:id или /doctors/:id
    className?: string
}

/** Рендерит имя как ссылку на профиль сущности. Если id или label отсутствуют — просто текст без ссылки. */
export default function EntityLink({ id, label, kind, className }: Props) {
    if (!id || !label) return <span className={className}>{label ?? '—'}</span>
    return (
        <Link to={`/${kind}/${id}`} className={className} style={{ whiteSpace: 'nowrap' }}>
            {label}
        </Link>
    )
}
