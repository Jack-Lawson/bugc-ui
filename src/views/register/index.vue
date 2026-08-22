<template>
  <div
    class="register-page"
    :class="{ 'compact-captcha': compactCaptcha }"
    :style="registerViewportStyle"
  >
    <div class="register-card">
      <div class="register-lock">
        <n-icon :component="PersonCircleOutline" />
      </div>
      <h1 class="form-title">用户注册</h1>

      <n-form ref="formRef" :model="formData" :rules="rules" :show-require-mark="false" size="large">
        <n-form-item path="username" label="用户名">
          <n-input v-model:value="formData.username" placeholder="4-20位字母数字下划线" :maxlength="20" />
        </n-form-item>
        <n-form-item path="password" label="密码">
          <n-input v-model:value="formData.password" type="password" placeholder="请输入密码" show-password-on="click" :maxlength="20" />
        </n-form-item>
        <n-form-item path="confirmPassword" label="确认密码">
          <n-input v-model:value="formData.confirmPassword" type="password" placeholder="请再次输入密码" show-password-on="click" :maxlength="20" />
        </n-form-item>
        <n-form-item path="nickname" label="昵称">
          <n-input v-model:value="formData.nickname" placeholder="请输入昵称（可选）" :maxlength="20" />
        </n-form-item>
        <n-form-item v-if="verifyEmail" path="email" label="邮箱">
          <n-input v-model:value="formData.email" placeholder="请输入邮箱" :maxlength="50" />
        </n-form-item>
        <n-form-item v-if="verifyPhone" path="phone" label="手机号">
          <n-input v-model:value="formData.phone" placeholder="请输入手机号" :maxlength="11" />
        </n-form-item>
        <n-form-item v-if="captchaEnabled" path="code" label="验证码">
          <div class="captcha-row">
            <n-input v-model:value="formData.code" placeholder="请输入验证码" :maxlength="6" />
            <img v-if="captchaImg" :src="captchaImg" class="captcha-img" @click="loadCaptcha" title="点击刷新" />
            <div v-else class="captcha-loading"><n-spin :size="20" /></div>
          </div>
        </n-form-item>
        <n-form-item class="register-options-item" :show-feedback="false" :show-label="false">
          <div class="form-actions">
            <n-checkbox v-model:checked="agreeTerms">
              <span class="terms-text">我已阅读并同意</span>
              <a class="link">《用户协议》</a>
              <span class="terms-text">和</span>
              <a class="link">《隐私政策》</a>
            </n-checkbox>
          </div>
        </n-form-item>
        <n-form-item class="register-action-item" :show-feedback="false" :show-label="false">
          <n-button class="register-button" type="primary" block :loading="loading" :disabled="!agreeTerms" @click="handleRegister">注册</n-button>
        </n-form-item>
      </n-form>

      <div class="register-footer">
        <span>已有账号？</span>
        <a class="login-link" @click="goLogin">立即登录</a>
      </div>
      <div v-if="siteCopyright" class="page-footer">{{ siteCopyright }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage, type FormInst, type FormRules } from 'naive-ui'
import { PersonCircleOutline } from '@vicons/ionicons5'
import { useSiteStore } from '@/stores/site'
import { authApi } from '@/api/auth'
import { configGroupApi } from '@/api/org'

const router = useRouter()
const message = useMessage()
const siteStore = useSiteStore()

const viewport = reactive({
  width: 1366,
  height: 768
})

function syncViewport() {
  if (typeof window === 'undefined') return
  viewport.width = window.innerWidth
  viewport.height = window.innerHeight
}

function clamp(min: number, value: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function px(value: number) {
  return `${Math.round(value)}px`
}

function getDesktopCardBaseWidth(width: number) {
  return width > 1080 ? 540 : 448
}

// 注册配置
const captchaEnabled = ref(false)
const captchaType = ref('image')
const verifyEmail = ref(false)
const verifyPhone = ref(false)
const agreeTerms = ref(false)

// 验证码
const captchaImg = ref('')
const captchaUuid = ref('')

// 加载配置
async function loadConfig() {
  try {
    const config = await configGroupApi.getPublicConfig()
    const stopLogin = config.login?.stopLogin || false

    captchaType.value = config.login?.captchaType || 'image'
    captchaEnabled.value = !stopLogin && captchaType.value === 'image' && (config.login?.captchaEnabled || false)
    verifyEmail.value = config.register?.verifyEmail || false
    verifyPhone.value = config.register?.verifyPhone || false

    if (!config.register?.enabled) {
      message.warning('系统暂未开放注册')
      router.push('/login')
      return
    }

    if (captchaEnabled.value) {
      await loadCaptcha()
    }
  } catch (error) {
    console.error('加载配置失败', error)
  }
}

// 加载验证码
async function loadCaptcha() {
  try {
    const result = await authApi.getCaptcha()
    captchaImg.value = result.img
    captchaUuid.value = result.uuid
  } catch (error) {
    console.error('获取验证码失败', error)
  }
}

onMounted(() => {
  syncViewport()
  window.addEventListener('resize', syncViewport, { passive: true })
  if (!siteStore.loaded) {
    siteStore.loadConfig()
  }
  loadConfig()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncViewport)
})

const formRef = ref<FormInst | null>(null)
const loading = ref(false)

const formData = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  nickname: '',
  email: '',
  phone: '',
  code: ''
})

const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_]{4,20}$/, message: '用户名只能包含字母、数字、下划线，长度4-20位', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度为6-20位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (_: any, value: string) => {
        if (value !== formData.password) {
          return new Error('两次输入的密码不一致')
        }
        return true
      },
      trigger: 'blur'
    }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ],
  code: [
    { required: true, message: '请输入验证码', trigger: 'blur' }
  ]
}

const compactCaptcha = computed(() => viewport.width < 430)
const siteCopyright = computed(() => siteStore.copyright?.trim() || '')

const registerScale = computed(() => {
  const baseWidth = viewport.width >= 768 ? getDesktopCardBaseWidth(viewport.width) : 360
  const availableWidth = Math.max(280, viewport.width - (viewport.width < 768 ? 28 : 48))
  const availableHeight = Math.max(420, viewport.height - (viewport.height < 700 ? 22 : 56))
  const contentHeight = 600 + (verifyEmail.value ? 72 : 0) + (verifyPhone.value ? 72 : 0) + (captchaEnabled.value ? 74 : 0)
  const fitScale = Math.min(availableWidth / baseWidth, availableHeight / contentHeight)

  if (viewport.width >= 768) {
    return clamp(0.76, Math.min(fitScale, 1), 1)
  }

  return clamp(viewport.width < 430 ? 0.68 : 0.72, Math.min(fitScale, 0.94), 0.94)
})

const registerViewportStyle = computed(() => {
  const scale = registerScale.value
  const availableWidth = Math.max(280, viewport.width - (viewport.width < 768 ? 28 : 48))
  const isLarge = viewport.width > 1080
  const isWide = viewport.width >= 768
  const isTiny = viewport.width < 430
  const cardBaseWidth = isWide ? getDesktopCardBaseWidth(viewport.width) : 360
  const cardWidth = Math.min(cardBaseWidth * scale, availableWidth)

  return {
    '--register-card-width': px(cardWidth),
    '--register-page-pad-x': px(clamp(12, 24 * scale, 24)),
    '--register-page-pad-y': px(clamp(10, 28 * scale, 28)),
    '--register-card-pad-x': px(clamp(16, (isLarge ? 46 : isWide ? 34 : 28) * scale, isLarge ? 46 : isWide ? 34 : 28)),
    '--register-card-pad-y': px(clamp(18, (isLarge ? 30 : isWide ? 30 : 26) * scale, isLarge ? 30 : isWide ? 30 : 26)),
    '--register-card-pad-bottom': px(clamp(16, (isLarge ? 28 : isWide ? 28 : 24) * scale, isLarge ? 28 : isWide ? 28 : 24)),
    '--register-lock-size': px(clamp(44, (isLarge ? 82 : isWide ? 72 : 66) * scale, isLarge ? 82 : isWide ? 72 : 66)),
    '--register-lock-font-size': px(clamp(22, (isLarge ? 38 : isWide ? 34 : 32) * scale, isLarge ? 38 : isWide ? 34 : 32)),
    '--register-lock-margin-bottom': px(clamp(9, (isLarge ? 20 : isWide ? 18 : 16) * scale, isLarge ? 20 : isWide ? 18 : 16)),
    '--register-title-font-size': px(clamp(isTiny ? 18 : 19, (isLarge ? 32 : isWide ? 28 : 24) * scale, isLarge ? 32 : isWide ? 28 : 24)),
    '--register-title-margin-bottom': px(clamp(13, (isLarge ? 24 : isWide ? 22 : 20) * scale, isLarge ? 24 : isWide ? 22 : 20)),
    '--register-form-item-gap': px(clamp(8, (isLarge ? 14 : isWide ? 13 : 12) * scale, isLarge ? 14 : isWide ? 13 : 12)),
    '--register-label-height': px(clamp(16, 20 * scale, 20)),
    '--register-label-padding-bottom': px(clamp(4, 6 * scale, 6)),
    '--register-label-font-size': px(clamp(isTiny ? 11 : 12, (isLarge ? 17 : isWide ? 15 : 14) * scale, isLarge ? 17 : isWide ? 15 : 14)),
    '--register-control-height': px(clamp(34, (isLarge ? 50 : isWide ? 46 : 44) * scale, isLarge ? 50 : isWide ? 46 : 44)),
    '--register-control-radius': px(clamp(6, 8 * scale, 8)),
    '--register-control-font-size': px(clamp(isTiny ? 11 : 12, (isLarge ? 17 : isWide ? 15 : 14) * scale, isLarge ? 17 : isWide ? 15 : 14)),
    '--register-captcha-width': px(clamp(82, (isLarge ? 136 : isWide ? 120 : 108) * scale, isLarge ? 136 : isWide ? 120 : 108)),
    '--register-captcha-height': px(clamp(36, (isLarge ? 54 : isWide ? 50 : 48) * scale, isLarge ? 54 : isWide ? 50 : 48)),
    '--register-field-gap': px(clamp(7, (isWide ? 10 : 9) * scale, isWide ? 10 : 9)),
    '--register-small-font-size': px(clamp(isTiny ? 10 : 11, (isLarge ? 16 : isWide ? 14 : 13) * scale, isLarge ? 16 : isWide ? 14 : 13)),
    '--register-footer-font-size': px(clamp(isTiny ? 9 : 10, (isLarge ? 13 : 12) * scale, isLarge ? 13 : 12)),
    '--register-footer-margin-top': px(clamp(6, 8 * scale, 8)),
    alignItems: viewport.width < 768 && viewport.height < 620 ? 'flex-start' : 'center'
  }
})

async function handleRegister() {
  if (!agreeTerms.value) {
    message.warning('请先同意用户协议和隐私政策')
    return
  }

  try {
    await formRef.value?.validate()
    loading.value = true

    const registerData: any = {
      username: formData.username,
      password: formData.password,
      nickname: formData.nickname || undefined,
      email: formData.email || undefined,
      phone: formData.phone || undefined
    }

    if (captchaEnabled.value) {
      registerData.uuid = captchaUuid.value
      registerData.code = formData.code
    }

    const result = await authApi.register(registerData)
    if (result === 'needAudit') {
      message.success('注册成功，请等待管理员审核通过后再登录')
    } else {
      message.success('注册成功，请登录')
    }
    router.push('/login')
  } catch (error: any) {
    if (captchaEnabled.value) {
      loadCaptcha()
    }
  } finally {
    loading.value = false
  }
}

function goLogin() {
  router.push('/login')
}
</script>

<style lang="scss" scoped>
.register-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  isolation: isolate;
  padding: var(--register-page-pad-y) var(--register-page-pad-x);
  overflow: auto;
  background:
    radial-gradient(circle at 34% 38%, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 34%),
    linear-gradient(135deg, #6c8cf1 0%, #7e82ed 48%, #a66ee2 100%);
}

.register-page::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0) 44%),
    radial-gradient(circle at 52% 50%, rgba(80, 101, 215, 0.12) 0%, rgba(80, 101, 215, 0) 42%);
}

.register-card {
  width: min(var(--register-card-width), 100%);
  box-sizing: border-box;
  padding: var(--register-card-pad-y) var(--register-card-pad-x) var(--register-card-pad-bottom);
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 24px 64px rgba(83, 75, 155, 0.22);
  color: #1f2937;
}

.register-lock {
  width: var(--register-lock-size);
  height: var(--register-lock-size);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--register-lock-margin-bottom);
  border-radius: 50%;
  color: #fff;
  font-size: var(--register-lock-font-size);
  background: linear-gradient(135deg, #6e82f4 0%, #9b70df 100%);
}

.form-title {
  margin: 0 0 var(--register-title-margin-bottom);
  color: #111827;
  font-size: var(--register-title-font-size);
  font-weight: 800;
  line-height: 1.3;
  text-align: center;
  letter-spacing: 0;
}

:deep(.n-form-item) {
  margin-bottom: var(--register-form-item-gap);
}

:deep(.n-form-item-label) {
  min-height: var(--register-label-height);
  padding: 0 0 var(--register-label-padding-bottom);
  color: #1f2937;
  font-size: var(--register-label-font-size);
  font-weight: 500;
}

:deep(.n-form-item-label__text) {
  color: #1f2937;
}

:deep(.n-form-item-feedback-wrapper) {
  min-height: 20px !important;
  line-height: 1.4 !important;
  overflow: visible;
}

:deep(.n-form-item-feedback) {
  display: block !important;
  color: #ef4444 !important;
  font-size: calc(var(--register-small-font-size) - 1px);
}

:deep(.n-input) {
  --n-height: var(--register-control-height);
  --n-border-radius: var(--register-control-radius);
  --n-color: #fff !important;
  --n-color-focus: #fff !important;
  --n-color-disabled: #fff !important;
  --n-color-focus-error: #fff !important;
  --n-color-disabled-error: #fff !important;
  --n-text-color: #111827 !important;
  --n-text-color-disabled: #111827 !important;
  --n-caret-color: #111827 !important;
  --n-placeholder-color: #8a8f98 !important;
  --n-placeholder-color-disabled: #8a8f98 !important;
  --n-icon-color: #8a8f98 !important;
  --n-icon-color-hover: #6c82f4 !important;
  --n-border: 1px solid #d7dbe3 !important;
  --n-border-hover: 1px solid #b8c2dd !important;
  --n-border-focus: 1px solid #8a91f2 !important;
  --n-border-disabled: 1px solid #d7dbe3 !important;
  --n-border-error: 1px solid #ef4444 !important;
  --n-border-hover-error: 1px solid #ef4444 !important;
  --n-border-focus-error: 1px solid #ef4444 !important;
  --n-box-shadow-focus: 0 0 0 2px rgba(124, 130, 246, 0.12) !important;
  --n-box-shadow-focus-error: 0 0 0 2px rgba(239, 68, 68, 0.12) !important;
  font-size: var(--register-control-font-size);
}

:deep(.n-input .n-input-wrapper),
:deep(.n-input .n-input__input),
:deep(.n-input .n-input__input-el),
:deep(.n-input .n-input__placeholder),
:deep(.n-input .n-input__suffix),
:deep(.n-input .n-input__prefix) {
  background: #fff !important;
  color: #111827 !important;
}

:deep(.n-input .n-input__placeholder),
:deep(.n-input input::placeholder) {
  color: #8a8f98 !important;
}

:deep(.n-input input:-webkit-autofill),
:deep(.n-input input:-webkit-autofill:hover),
:deep(.n-input input:-webkit-autofill:focus) {
  -webkit-text-fill-color: #111827 !important;
  box-shadow: 0 0 0 1000px #fff inset !important;
  transition: background-color 9999s ease-out;
}

:deep(.n-button) {
  --n-height: var(--register-control-height);
  --n-border-radius: var(--register-control-radius);
  --n-text-color: #fff;
  --n-text-color-hover: #fff;
  --n-text-color-pressed: #fff;
  --n-text-color-focus: #fff;
  font-size: var(--register-control-font-size);
  font-weight: 700;
}

.captcha-row {
  display: grid;
  grid-template-columns: 1fr var(--register-captcha-width);
  gap: var(--register-field-gap);
  width: 100%;
}

.captcha-img,
.captcha-loading {
  width: var(--register-captcha-width);
  height: var(--register-captcha-height);
  border: 0;
  border-radius: var(--register-control-radius);
  background: #f1f4ff;
}

.captcha-img {
  object-fit: cover;
  cursor: pointer;
}

.captcha-loading {
  display: flex;
  align-items: center;
  justify-content: center;
}

.form-actions {
  width: 100%;
  margin-top: calc(var(--register-form-item-gap) * -0.25);
  font-size: var(--register-small-font-size);

  .link {
    color: #7085ff;
    cursor: pointer;
    text-decoration: none;

    &:hover { text-decoration: underline; }
  }
}

:deep(.n-checkbox) {
  --n-text-color: #4b5563;
  --n-color-checked: #7c82f6;
  --n-border-checked: 1px solid #7c82f6;
  --n-border-focus: 1px solid #7c82f6;
  --n-check-mark-color: #fff;
  --n-box-shadow-focus: 0 0 0 2px rgba(124, 130, 246, 0.16);
  font-size: var(--register-small-font-size);
}

:deep(.n-checkbox .n-checkbox__label) {
  color: #4b5563 !important;
}

.terms-text {
  color: #4b5563;
}

.register-action-item {
  margin-top: 0;
  margin-bottom: calc(var(--register-form-item-gap) * 0.55) !important;
}

.register-button {
  --n-color: transparent !important;
  --n-color-hover: transparent !important;
  --n-color-pressed: transparent !important;
  --n-text-color: #fff !important;
  --n-text-color-hover: #fff !important;
  --n-text-color-pressed: #fff !important;
  --n-text-color-focus: #fff !important;
  --n-border: 0 !important;
  --n-border-hover: 0 !important;
  --n-border-pressed: 0 !important;
  --n-border-focus: 0 !important;
  height: var(--register-control-height);
  color: #fff !important;
  background: linear-gradient(90deg, #6d82f4 0%, #a36fe2 100%) !important;
  box-shadow: none !important;
}

.register-button:disabled {
  opacity: 0.55;
}

.register-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin-top: var(--register-footer-margin-top);
  color: #667085;
  font-size: var(--register-small-font-size);
}

.login-link {
  color: #7085ff;
  cursor: pointer;
  font-weight: 500;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

.page-footer {
  margin-top: var(--register-footer-margin-top);
  text-align: center;
  color: #667085;
  font-size: var(--register-footer-font-size);
  line-height: 1.5;
}

.compact-captcha {
  .captcha-row {
    grid-template-columns: 1fr var(--register-captcha-width);
  }
}
</style>
