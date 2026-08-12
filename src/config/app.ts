const devBackendUrl = import.meta.env.VITE_DEV_BACKEND_URL || 'http://localhost:8080'

function parsePositiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function parseOptionalBoolean(value: string | undefined) {
  if (value === undefined || value === '') return undefined
  return value.toLowerCase() === 'true'
}

function toWebSocketUrl(url: string) {
  return url.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:')
}

export const apiConfig = {
  baseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: parsePositiveNumber(import.meta.env.VITE_API_TIMEOUT, 30000),
  cryptoConfigPath: '/crypto/config'
}

export const websocketConfig = {
  messagePath: '/ws/message',
  sshPath: '/ws/ssh',
  baseUrl: import.meta.env.VITE_WS_BASE_URL || '',
  devSshBaseUrl: import.meta.env.VITE_DEV_SSH_WS_BASE_URL || toWebSocketUrl(devBackendUrl)
}

export const siteDefaults = {
  name: 'Bugc Admin',
  description: 'BugC. 一站式综合管理系统',
  logo: '',
  copyright: '',
  icp: '',
  watermarkEnabled: true,
  watermarkType: 'username',
  watermarkCustomText: '',
  watermarkOpacity: 0.1,
  disableDevtool: false
}

export const authConfig = {
  stopVerify: parseOptionalBoolean(import.meta.env.VITE_STOP_VERIFY)
}

export const defaultSystemConfigs = {
  system: {
    siteName: '',
    siteDescription: '',
    siteLogo: '',
    copyright: '',
    icp: '',
    watermarkEnabled: siteDefaults.watermarkEnabled,
    watermarkType: siteDefaults.watermarkType,
    watermarkCustomText: siteDefaults.watermarkCustomText,
    watermarkOpacity: siteDefaults.watermarkOpacity
  },
  register: { enabled: true, verifyEmail: false, verifyPhone: false, defaultRole: 'user', needAudit: false },
  login: { captchaEnabled: false, captchaType: 'image', maxRetryCount: 5, lockTime: 30, rememberMe: true, singleLogin: false },
  password: { minLength: 6, maxLength: 20, requireUppercase: false, requireLowercase: false, requireNumber: false, requireSpecial: false, expireDays: 0 },
  email: { host: '', port: 465, username: '', password: '', fromName: '', ssl: true, enabled: false },
  emailTemplate: { verifyCode: '', resetPassword: '', welcome: '' },
  sms: { provider: 'aliyun', accessKeyId: '', accessKeySecret: '', signName: '', tencentAppId: '', templateVerifyCode: '', templateResetPassword: '', templateNotice: '', enabled: false },
  smsTemplate: { verifyCode: '', resetPassword: '', notification: '' },
  storage: {
    provider: 'local',
    domain: import.meta.env.VITE_DEFAULT_STORAGE_DOMAIN || devBackendUrl,
    localPath: './uploads',
    maxSize: 10,
    allowTypes: 'jpg,jpeg,png,gif,webp,pdf,doc,docx,xls,xlsx,ppt,pptx,txt,md,mp4,avi,mov,wmv,flv,mkv,mp3,wav,ogg,zip,rar,7z',
    minioEndpoint: '',
    minioAccessKey: '',
    minioSecretKey: '',
    minioBucket: '',
    aliyunEndpoint: '',
    aliyunAccessKey: '',
    aliyunSecretKey: '',
    aliyunBucket: '',
    tencentSecretId: '',
    tencentSecretKey: '',
    tencentBucket: '',
    tencentRegion: '',
    rustfsEndpoint: '',
    rustfsAccessKey: '',
    rustfsSecretKey: '',
    rustfsBucket: ''
  },
  push: {
    dingtalk: { signName: '', tokenId: '' },
    feishu: { signName: '', tokenId: '' },
    wechat_work: { signName: '', tokenId: '' }
  },
  thirdParty: {
    wechat: { enabled: false, appId: '', appSecret: '' },
    alipay: { enabled: false, appId: '', privateKey: '', publicKey: '' },
    github: { enabled: false, clientId: '', clientSecret: '' }
  },
  wechatMiniProgram: {
    enabled: false,
    appId: '',
    appSecret: ''
  },
  wechatMp: {
    enabled: false,
    appId: '',
    appSecret: '',
    token: '',
    aesKey: '',
    callbackUrl: '',
    oauthRedirectUrl: '',
    menuConfig: ''
  },
  payment: {
    wechatPay: { enabled: false, mchId: '', appId: '', apiV3Key: '', privateKey: '', certSerialNo: '', notifyUrl: '' },
    alipay: { enabled: false, appId: '', privateKey: '', publicKey: '', signType: 'RSA2', gatewayUrl: 'https://openapi.alipay.com/gateway.do', notifyUrl: '', returnUrl: '' }
  },
  security: {
    encryptEnabled: false,
    encryptScope: 'partial',
    encryptPublicKey: '',
    encryptPrivateKey: '',
    xssFilter: true,
    sqlInject: true,
    disableDevtool: siteDefaults.disableDevtool,
    tokenName: 'Authorization',
    tokenTimeout: 86400,
    tokenActiveTimeout: 86400,
    tokenIsConcurrent: true,
    tokenIsShare: true,
    tokenStyle: 'uuid',
    tokenIsLog: false,
    tokenIsReadBody: false,
    tokenIsReadCookie: false,
    tokenIsReadHeader: true,
    tokenIsPrint: true,
    tokenIsWriteHeader: false
  },
  other: {}
}

export function createDefaultSystemConfigs(): Record<string, any> {
  return JSON.parse(JSON.stringify(defaultSystemConfigs))
}

export const themeDefaults = {
  mode: 'light',
  siderPosition: 'hidden',
  showTabs: false,
  primaryColor: '#2E5CF6',
  headerUsePrimaryColor: false
} as const

export const storageKeys = {
  user: 'mars-user',
  userToken: 'mars-user-token',
  layoutTheme: 'layout-theme',
  layoutPosition: 'layout-position',
  layoutShowTabs: 'layout-show-tabs',
  layoutPrimaryColor: 'layout-primary-color',
  layoutHeaderPrimary: 'layout-header-primary',
  loginStyle: 'login-style',
  chatSidebarWidth: 'chat-sidebar-width',
  chatCardWidth: 'chat-card-width',
  chatCardHeight: 'chat-card-height',
  chatQuickReplies: 'chat-quick-replies'
} as const

export function joinUrl(baseUrl: string, path: string) {
  const base = baseUrl.replace(/\/+$/, '')
  const suffix = path.replace(/^\/+/, '')
  if (!base) return `/${suffix}`
  return `${base}/${suffix}`
}

export function buildApiUrl(path: string) {
  return joinUrl(apiConfig.baseUrl, path)
}

export function getWebSocketBaseUrl() {
  if (websocketConfig.baseUrl) return websocketConfig.baseUrl

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}`
}

export function buildWebSocketUrl(path: string, params?: Record<string, string | null | undefined>, baseUrl = getWebSocketBaseUrl()) {
  const rawUrl = joinUrl(baseUrl, path)
  const normalizedUrl = /^wss?:\/\//.test(rawUrl)
    ? rawUrl
    : toWebSocketUrl(new URL(rawUrl, window.location.origin).toString())
  const url = new URL(normalizedUrl)
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value)
  })
  return url.toString()
}
