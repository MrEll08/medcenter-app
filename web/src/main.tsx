import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App'
import DoctorsPage from './pages/DoctorsPage'
import 'antd/dist/reset.css'

const qc = new QueryClient()

const router = createBrowserRouter([
    {
        path: '/',
        element: <App />,
        children: [
            { index: true, element: <DoctorsPage /> },
            // позже добавлю:
            // { path: 'clients', element: <ClientsPage /> },
            // { path: 'visits', element: <VisitsPage /> },
        ],
    },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <QueryClientProvider client={qc}>
            <RouterProvider router={router} />
        </QueryClientProvider>
    </React.StrictMode>,
)
