import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.bugc.admin',
  appName: 'BugC',
  webDir: 'dist-android',
  server: {
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#f3f4f6'
  },
  ios: {
    scheme: 'App',
    orientation: 'portrait'
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      launchShowDuration: 10000,
      backgroundColor: '#f3f4f6',
      showSpinner: false
    },
    StatusBar: {
      overlaysWebView: false,
      backgroundColor: '#f3f4f6',
      style: 'LIGHT'
    }
  }
}

export default config
