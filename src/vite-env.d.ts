/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_API_TIMEOUT?: string
  readonly VITE_WS_BASE_URL?: string
  readonly VITE_DEV_BACKEND_URL?: string
  readonly VITE_DEV_SSH_WS_BASE_URL?: string
  readonly VITE_DEFAULT_STORAGE_DOMAIN?: string
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface Window {
  $message: import('naive-ui').MessageApi
  $dialog: import('naive-ui').DialogApi
  $loadingBar: import('naive-ui').LoadingBarApi
}
