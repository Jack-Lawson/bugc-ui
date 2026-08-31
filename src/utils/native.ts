import { Capacitor } from '@capacitor/core'
import type { Router } from 'vue-router'

export async function initializeNativeApp(router: Router) {
  if (!Capacitor.isNativePlatform()) return

  document.documentElement.classList.add('capacitor-native')

  const [{ App }, { SplashScreen }, { StatusBar, Style }] = await Promise.all([
    import('@capacitor/app'),
    import('@capacitor/splash-screen'),
    import('@capacitor/status-bar')
  ])

  await StatusBar.setOverlaysWebView({ overlay: false })
  await StatusBar.setStyle({ style: Style.Light })

  App.addListener('backButton', () => {
    const rootRoutes = ['/', '/dashboard', '/login']
    if (!rootRoutes.includes(router.currentRoute.value.path) && window.history.length > 1) {
      router.back()
      return
    }
    App.minimizeApp()
  })

  await SplashScreen.hide()
}
