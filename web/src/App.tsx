import { Layout, Menu } from 'antd'
import { Link, Outlet, useLocation } from 'react-router-dom'

const { Header, Content } = Layout

export default function App() {
    const loc = useLocation()
    const selected = loc.pathname === '/' ? ['/'] : [loc.pathname]

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Header style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ color: 'white', fontWeight: 700, marginRight: 24 }}>MedCenter</div>
                <Menu
                    theme="dark"
                    mode="horizontal"
                    selectedKeys={selected}
                    disabledOverflow
                    items={[
                        { key: '/doctors', label: <Link to="/doctors">Врачи</Link> },
                        { key: '/clients', label: <Link to="/clients">Пациенты</Link> },
                        { key: '/visits', label: <Link to="/visits">Посещения</Link> },
                    ]}
                />
            </Header>
            <Content style={{ padding: 24 }}>
                <Outlet />
            </Content>
        </Layout>
    )
}
