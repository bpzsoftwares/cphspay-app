import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'br.com.cphssoftwares.cphspay',
  appName: 'CphsPay',
  webDir: 'dist',
  server: {
    // URL da API em produção — app faz requisições direto aqui
    url: 'http://mc.elylphosting.com.br:25597',
    cleartext: true, // permite HTTP (sem HTTPS)
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0a0b14',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
  },
}

export default config
