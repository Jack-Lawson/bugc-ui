import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const devBackendUrl = env.VITE_DEV_BACKEND_URL || 'http://localhost:8080'
  const devBackendWsUrl = devBackendUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:')
  const configuredPort = Number(env.VITE_DEV_SERVER_PORT)
  const devServerPort = Number.isFinite(configuredPort) && configuredPort > 0 ? configuredPort : 3000
  const devApiTarget = env.VITE_DEV_API_TARGET || devBackendUrl
  const devWsTarget = env.VITE_DEV_WS_TARGET || devBackendWsUrl
  const buildOutDir = env.VITE_BUILD_OUT_DIR || 'dist'

  return {
    plugins: [vue()],
    base: '/',
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    },
    build: {
      outDir: resolve(__dirname, buildOutDir),
      emptyOutDir: true
    },
    server: {
      port: devServerPort,
      proxy: {
        '/api': {
          target: devApiTarget,
          changeOrigin: true
        },
        '/druid': {
          target: devApiTarget,
          changeOrigin: true
        },
        '/ws': {
          target: devWsTarget,
          ws: true,
          changeOrigin: true
        }
      }
    }
  }
})
