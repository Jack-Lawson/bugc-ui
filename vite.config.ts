import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { existsSync, mkdirSync, copyFileSync } from 'fs'
import { resolve } from 'path'

const staticHistoryFallbackRoutes = [
  'login',
  'register',
  'dashboard',
  'profile',
  'personal-service/manage',
  'personal/service/manage',
  'server/router',
  'system/user',
  'system/role',
  'system/menu',
  'system/dict',
  'system/config',
  'system/file',
  'system/image',
  'system/video',
  'system/customer',
  'message/notice',
  'message/chat',
  'org/dept',
  'org/post',
  'log/operlog',
  'log/loginlog',
  'monitor/online',
  'monitor/job',
  'monitor/cache',
  'monitor/api-access',
  'monitor/server',
  'monitor/server-manager',
  'test/test',
  'tool/gen',
  'tools/hb'
]

function createHistoryRouteEntrypoints(outDir: string) {
  return {
    name: 'bugc-history-route-entrypoints',
    closeBundle() {
      const rootIndex = resolve(outDir, 'index.html')
      if (!existsSync(rootIndex)) return

      for (const route of staticHistoryFallbackRoutes) {
        const routeDir = resolve(outDir, route)
        mkdirSync(routeDir, { recursive: true })
        copyFileSync(rootIndex, resolve(routeDir, 'index.html'))
      }
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const appApiBaseUrl = env.VITE_API_BASE_URL || process.env.VITE_API_BASE_URL
  const appWsBaseUrl = env.VITE_WS_BASE_URL || process.env.VITE_WS_BASE_URL
  if (mode === 'android' || mode === 'ios') {
    if (!appApiBaseUrl?.startsWith('https://')) {
      throw new Error(`${mode} builds require an HTTPS VITE_API_BASE_URL`)
    }
    if (!appWsBaseUrl?.startsWith('wss://')) {
      throw new Error(`${mode} builds require a WSS VITE_WS_BASE_URL`)
    }
  }
  const devBackendUrl = env.VITE_DEV_BACKEND_URL || 'http://localhost:8080'
  const devBackendWsUrl = devBackendUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:')
  const configuredPort = Number(env.VITE_DEV_SERVER_PORT)
  const devServerPort = Number.isFinite(configuredPort) && configuredPort > 0 ? configuredPort : 3000
  const devApiTarget = env.VITE_DEV_API_TARGET || devBackendUrl
  const devWsTarget = env.VITE_DEV_WS_TARGET || devBackendWsUrl
  const buildOutDir = mode === 'ios' ? 'dist-ios' : (mode === 'android' ? 'dist-android' : (env.VITE_BUILD_OUT_DIR || 'dist'))

  return {
    plugins: [vue(), createHistoryRouteEntrypoints(resolve(__dirname, buildOutDir))],
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
