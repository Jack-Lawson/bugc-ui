import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import naive from 'naive-ui'
import App from './App.vue'
import router from './router'
import './styles/index.scss'
import { fetchCryptoConfig } from './utils/request'
import { useSiteStore } from './stores/site'
import { initializeNativeApp } from './utils/native'

const app = createApp(App)

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

app.use(pinia)
app.use(router)
app.use(naive)

async function bootstrap() {
  const siteStore = useSiteStore()

  app.mount('#app')
  await initializeNativeApp(router)

  // 站点配置和加密配置异步加载，避免移动端网络异常时卡在原生启动屏。
  Promise.allSettled([
    fetchCryptoConfig(),
    siteStore.loadConfig()
  ]).then(() => {
    if (siteStore.disableDevtool) {
      import('disable-devtool').then((DisableDevtool) => {
        DisableDevtool.default()
      })
    }
  })
}

bootstrap()
