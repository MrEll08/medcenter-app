import {defineConfig, loadEnv} from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({mode}) => {
    const env = loadEnv(mode, process.cwd(), '')
    const APP_HOST = env.APP_HOST || '0.0.0.0'
    const APP_PORT = Number(env.APP_PORT || 5173)
    const API_HOST = env.API_HOST || 'api'
    const API_PORT = Number(env.API_PORT || 8000)
    const VITE_API_URL = env.VITE_API_URL || `http://${API_HOST}:${API_PORT}`

    return {
        plugins: [react()],
        server: {
            host: APP_HOST,
            port: APP_PORT,
            proxy: {
                '/api': {
                    target: VITE_API_URL,
                    changeOrigin: true,
                },
            },
        },
    }
})
