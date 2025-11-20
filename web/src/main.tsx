import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import ruRU from 'antd/locale/ru_RU'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import App from './App'
import DoctorsPage from './pages/DoctorsPage'
import 'antd/dist/reset.css'
import ClientsPage from "./pages/ClientsPage.tsx";
import VisitsPage from "./pages/VisitsPage.tsx";
import ClientProfilePage from "./pages/ClientProfilePage.tsx";
import DoctorProfilePage from "./pages/DoctorProfilePage.tsx";
import VisitDetailPage from "./pages/VisitDetailPage.tsx";

dayjs.locale('ru')

const qc = new QueryClient()

const router = createBrowserRouter([
    {
        path: '/',
        element: <App />,
        children: [
            { path: 'doctors', element: <DoctorsPage /> },
            { path: 'doctors/:id', element: <DoctorProfilePage /> },
            { path: 'clients', element: <ClientsPage /> },
            { path: 'clients/:id', element: <ClientProfilePage /> },
            { path: 'visits', element: <VisitsPage /> },
            { path: 'visits/:id', element: <VisitDetailPage /> },
        ],
    },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ConfigProvider locale={ruRU}>
            <QueryClientProvider client={qc}>
                <RouterProvider router={router} />
            </QueryClientProvider>
        </ConfigProvider>
    </React.StrictMode>,
)
