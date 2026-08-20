<template>
  <div
    class="login-page admin-login-page"
    :class="{ 'compact-captcha': compactCaptcha }"
    :style="loginViewportStyle"
  >
    <div class="login-card">
      <div class="login-lock">
        <n-icon :component="LockClosedOutline" />
      </div>
      <h1 class="form-title">登录管理后台</h1>

      <n-form
        ref="formRef"
        :class="{ 'no-inline-captcha': !inlineCaptchaVisible }"
        :model="formData"
        :rules="rules"
        :show-require-mark="false"
        size="large"
      >
        <n-form-item path="username" label="用户名">
          <n-input v-model:value="formData.username" placeholder="请输入用户名" :maxlength="50" @keyup.enter="handleLogin" />
        </n-form-item>
        <n-form-item path="password" label="密码">
          <n-input v-model:value="formData.password" type="password" placeholder="请输入密码" show-password-on="click" :maxlength="50" @keyup.enter="handleLogin" />
        </n-form-item>
        <n-form-item v-if="captchaEnabled && captchaType === 'image'" path="code" label="验证码">
          <div class="captcha-row">
            <n-input v-model:value="formData.code" placeholder="请输入验证码" :maxlength="6" @keyup.enter="handleLogin" />
            <img v-if="captchaImg" :src="captchaImg" class="captcha-img" @click="loadCaptcha" title="点击刷新" />
            <div v-else class="captcha-loading"><n-spin :size="20" /></div>
          </div>
        </n-form-item>
        <template v-if="captchaEnabled && captchaType === 'sms'">
          <n-form-item label="手机号">
            <n-input v-model:value="smsPhone" placeholder="请输入手机号" :maxlength="11" />
          </n-form-item>
          <n-form-item path="code" label="验证码">
            <div class="sms-row">
              <n-input v-model:value="formData.code" placeholder="请输入验证码" :maxlength="6" @keyup.enter="handleLogin" />
              <n-button :disabled="smsCountdown > 0" :loading="smsSending" @click="sendSmsCode">
                {{ smsCountdown > 0 ? `${smsCountdown}s` : '获取验证码' }}
              </n-button>
            </div>
          </n-form-item>
        </template>
        <n-form-item v-if="rememberMeEnabled" class="login-options-item" :show-feedback="false" :show-label="false">
          <div class="login-options">
            <n-checkbox v-model:checked="formData.rememberMe">记住我</n-checkbox>
            <a v-if="registerEnabled" class="register-link" @click="goRegister">没有账号？立即注册</a>
          </div>
        </n-form-item>
        <n-form-item class="login-action-item" :show-feedback="false" :show-label="false">
          <n-button class="login-button" type="primary" block :loading="loading" @click="handleLogin">登录</n-button>
        </n-form-item>
      </n-form>
      <div v-if="siteCopyright" class="login-footer">{{ siteCopyright }}</div>
    </div>


    <!-- 滑块验证弹窗 -->
    <n-modal v-model:show="showSliderModal" :mask-closable="false" class="slider-modal">
      <div class="slider-puzzle-container">
        <div class="slider-puzzle-header">
          <span>请完成下列验证后继续:</span>
          <n-button text @click="closeSliderModal">
            <n-icon size="20"><CloseOutline /></n-icon>
          </n-button>
        </div>
        <div
          class="slider-puzzle-image"
          @mousemove="onSliderDragMove"
          @mouseup="onSliderDragEnd"
          @mouseleave="onSliderDragEnd"
          @touchmove="onSliderDragMove"
          @touchend="onSliderDragEnd"
        >
          <!-- 背景图片 -->
          <div class="puzzle-bg" :class="`puzzle-bg-${puzzleImageIndex}`"></div>
          <!-- 缺口位置 -->
          <div class="puzzle-slot" :style="{ left: sliderTargetX + 'px' }"></div>
          <!-- 拼图块 -->
          <div
            class="puzzle-piece"
            :class="{ verified: sliderVerified }"
            :style="{ left: sliderPuzzleX + 'px' }"
          >
            <div class="puzzle-piece-bg" :class="`puzzle-bg-${puzzleImageIndex}`" :style="{ backgroundPositionX: -sliderTargetX + 'px' }"></div>
          </div>
        </div>
        <div class="slider-puzzle-track">
          <div class="slider-track-bg">
            <div class="slider-track-progress" :style="{ width: sliderPuzzleX + 'px' }"></div>
          </div>
          <div
            class="slider-handle"
            :class="{ dragging: sliderDragging, verified: sliderVerified }"
            :style="{ left: sliderPuzzleX + 'px' }"
            @mousedown="onSliderDragStart"
            @touchstart="onSliderDragStart"
          >
            <n-icon v-if="!sliderVerified" size="18"><ArrowForwardOutline /></n-icon>
            <n-icon v-else size="18"><CheckmarkOutline /></n-icon>
          </div>
          <span class="slider-track-tip" v-if="sliderPuzzleX === 0">按住左边按钮拖动完成上方拼图</span>
        </div>
        <div class="slider-puzzle-footer">
          <n-button text size="small" @click="initSliderPuzzle">
            <n-icon><RefreshOutline /></n-icon>
            <span>换一张</span>
          </n-button>
        </div>
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMessage, type FormInst, type FormRules } from 'naive-ui'
import { LockClosedOutline, RefreshOutline, CloseOutline, ArrowForwardOutline, CheckmarkOutline } from '@vicons/ionicons5'
import { useUserStore } from '@/stores/user'
import { useSiteStore } from '@/stores/site'
import { authApi } from '@/api/auth'
import { configGroupApi } from '@/api/org'
import { authConfig } from '@/config/app'

const router = useRouter()
const route = useRoute()
const message = useMessage()
const userStore = useUserStore()
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

// 登录配置
const captchaEnabled = ref(false)
const captchaType = ref('image') // image, slider, sms
const rememberMeEnabled = ref(true)
const registerEnabled = ref(true)
const stopLogin = ref(false)

// 验证码
const captchaImg = ref('')
const captchaUuid = ref('')
const captchaLoading = ref(false)

// 滑块验证码弹窗
const showSliderModal = ref(false)
const sliderPuzzleX = ref(0) // 拼图块当前位置
const sliderTargetX = ref(0) // 目标位置
const sliderDragging = ref(false)
const sliderVerified = ref(false)
const sliderStartX = ref(0)
const puzzleImageIndex = ref(0) // 使用的背景图片索引

// 短信验证码
const smsPhone = ref('')
const smsSending = ref(false)
const smsCountdown = ref(0)

// 加载配置
async function loadPublicConfig() {
  try {
    const config = await configGroupApi.getPublicConfig()
    const stopVerify = authConfig.stopVerify ?? config.login?.stopVerify !== false

    stopLogin.value = config.login?.stopLogin || false
    captchaEnabled.value = !stopLogin.value && stopVerify && (config.login?.captchaEnabled || false)
    captchaType.value = config.login?.captchaType || 'image'
    rememberMeEnabled.value = config.login?.rememberMe !== false
    registerEnabled.value = config.register?.enabled !== false

    // 如果启用图片验证码，加载验证码
    if (captchaEnabled.value && captchaType.value === 'image') {
      await loadCaptcha()
    }
  } catch (error) {
    console.error('加载配置失败', error)
  }
}

// 加载图片验证码
async function loadCaptcha() {
  captchaLoading.value = true
  try {
    const result = await authApi.getCaptcha()
    captchaImg.value = result.img
    captchaUuid.value = result.uuid
  } catch (error) {
    console.error('获取验证码失败', error)
  } finally {
    captchaLoading.value = false
  }
}

// 初始化滑块验证码
function initSliderPuzzle() {
  sliderPuzzleX.value = 0
  sliderVerified.value = false
  // 目标位置在 150-250 之间随机
  sliderTargetX.value = 150 + Math.floor(Math.random() * 100)
  // 随机选择一张背景图
  puzzleImageIndex.value = Math.floor(Math.random() * 3)
}

// 打开滑块验证弹窗
function openSliderModal() {
  initSliderPuzzle()
  showSliderModal.value = true
}

// 关闭滑块验证弹窗
function closeSliderModal() {
  showSliderModal.value = false
  sliderPuzzleX.value = 0
}

// 滑块拖动开始
function onSliderDragStart(e: MouseEvent | TouchEvent) {
  if (sliderVerified.value) return
  sliderDragging.value = true
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  sliderStartX.value = clientX - sliderPuzzleX.value
}

// 滑块拖动中
function onSliderDragMove(e: MouseEvent | TouchEvent) {
  if (!sliderDragging.value || sliderVerified.value) return
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  let newX = clientX - sliderStartX.value
  // 限制范围 0-280
  newX = Math.max(0, Math.min(280, newX))
  sliderPuzzleX.value = newX
}

// 滑块拖动结束
function onSliderDragEnd() {
  if (!sliderDragging.value || sliderVerified.value) return
  sliderDragging.value = false

  // 检查是否在目标位置附近（误差 5px）
  if (Math.abs(sliderPuzzleX.value - sliderTargetX.value) < 8) {
    sliderVerified.value = true
    sliderPuzzleX.value = sliderTargetX.value // 对齐
    message.success('验证成功')

    // 延迟关闭弹窗并执行登录
    setTimeout(() => {
      closeSliderModal()
      doLogin()
    }, 500)
  } else {
    // 验证失败，重置
    message.warning('验证失败，请重试')
    setTimeout(() => {
      sliderPuzzleX.value = 0
    }, 300)
  }
}

// 发送短信验证码
async function sendSmsCode() {
  if (!smsPhone.value || !/^1[3-9]\d{9}$/.test(smsPhone.value)) {
    message.warning('请输入正确的手机号')
    return
  }

  smsSending.value = true
  try {
    await authApi.sendSmsCode(smsPhone.value)
    message.success('验证码已发送，请查看控制台')

    // 开始倒计时
    smsCountdown.value = 60
    const timer = setInterval(() => {
      smsCountdown.value--
      if (smsCountdown.value <= 0) {
        clearInterval(timer)
      }
    }, 1000)
  } catch (error: any) {
    message.error(error.message || '发送失败')
  } finally {
    smsSending.value = false
  }
}

const formRef = ref<FormInst | null>(null)
const loading = ref(false)

const formData = reactive({
  username: '',
  password: '',
  code: '',
  rememberMe: false
})

const rules = computed<FormRules>(() => ({
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  code: captchaEnabled.value ? [{ required: true, message: '请输入验证码', trigger: 'blur' }] : []
}))

const inlineCaptchaVisible = computed(() => captchaEnabled.value && ['image', 'sms'].includes(captchaType.value))
const compactCaptcha = computed(() => viewport.width < 430)
const siteCopyright = computed(() => siteStore.copyright?.trim() || '')

const loginScale = computed(() => {
  const baseWidth = viewport.width >= 768 ? getDesktopCardBaseWidth(viewport.width) : 360
  const availableWidth = Math.max(280, viewport.width - (viewport.width < 768 ? 28 : 48))
  const availableHeight = Math.max(360, viewport.height - (viewport.height < 700 ? 22 : 56))
  const contentHeight = inlineCaptchaVisible.value ? 540 : 450
  const fitScale = Math.min(availableWidth / baseWidth, availableHeight / contentHeight)

  if (viewport.width >= 768) {
    return clamp(0.86, Math.min(fitScale, 1), 1)
  }

  return clamp(viewport.width < 430 ? 0.68 : 0.72, Math.min(fitScale, 0.94), 0.94)
})

const loginViewportStyle = computed(() => {
  const scale = loginScale.value
  const availableWidth = Math.max(280, viewport.width - (viewport.width < 768 ? 28 : 48))
  const isLarge = viewport.width > 1080
  const isWide = viewport.width >= 768
  const isTiny = viewport.width < 430
  const cardBaseWidth = isWide ? getDesktopCardBaseWidth(viewport.width) : 360
  const cardWidth = Math.min(cardBaseWidth * scale, availableWidth)

  return {
    '--login-card-width': px(cardWidth),
    '--login-page-pad-x': px(clamp(12, 24 * scale, 24)),
    '--login-page-pad-y': px(clamp(10, 28 * scale, 28)),
    '--login-card-pad-x': px(clamp(16, (isLarge ? 46 : isWide ? 34 : 28) * scale, isLarge ? 46 : isWide ? 34 : 28)),
    '--login-card-pad-y': px(clamp(18, (isLarge ? 30 : isWide ? 30 : 26) * scale, isLarge ? 30 : isWide ? 30 : 26)),
    '--login-card-pad-bottom': px(clamp(16, (isLarge ? 28 : isWide ? 28 : 24) * scale, isLarge ? 28 : isWide ? 28 : 24)),
    '--login-lock-size': px(clamp(44, (isLarge ? 82 : isWide ? 72 : 66) * scale, isLarge ? 82 : isWide ? 72 : 66)),
    '--login-lock-font-size': px(clamp(22, (isLarge ? 38 : isWide ? 34 : 32) * scale, isLarge ? 38 : isWide ? 34 : 32)),
    '--login-lock-margin-bottom': px(clamp(9, (isLarge ? 22 : isWide ? 18 : 16) * scale, isLarge ? 22 : isWide ? 18 : 16)),
    '--login-title-font-size': px(clamp(isTiny ? 18 : 19, (isLarge ? 32 : isWide ? 28 : 24) * scale, isLarge ? 32 : isWide ? 28 : 24)),
    '--login-title-margin-bottom': px(clamp(13, (isLarge ? 28 : isWide ? 24 : 20) * scale, isLarge ? 28 : isWide ? 24 : 20)),
    '--login-form-item-gap': px(clamp(9, (isLarge ? 21 : isWide ? 18 : 16) * scale, isLarge ? 21 : isWide ? 18 : 16)),
    '--login-tight-item-gap': px(clamp(7, 10 * scale, 10)),
    '--login-label-height': px(clamp(16, 20 * scale, 20)),
    '--login-label-padding-bottom': px(clamp(4, 6 * scale, 6)),
    '--login-label-font-size': px(clamp(isTiny ? 11 : 12, (isLarge ? 17 : isWide ? 15 : 14) * scale, isLarge ? 17 : isWide ? 15 : 14)),
    '--login-control-height': px(clamp(34, (isLarge ? 50 : isWide ? 46 : 44) * scale, isLarge ? 50 : isWide ? 46 : 44)),
    '--login-control-radius': px(clamp(6, 8 * scale, 8)),
    '--login-control-font-size': px(clamp(isTiny ? 11 : 12, (isLarge ? 17 : isWide ? 15 : 14) * scale, isLarge ? 17 : isWide ? 15 : 14)),
    '--login-captcha-width': px(clamp(82, (isLarge ? 136 : isWide ? 120 : 108) * scale, isLarge ? 136 : isWide ? 120 : 108)),
    '--login-captcha-height': px(clamp(36, (isLarge ? 54 : isWide ? 50 : 48) * scale, isLarge ? 54 : isWide ? 50 : 48)),
    '--login-captcha-button-width': px(clamp(38, 48 * scale, 48)),
    '--login-field-gap': px(clamp(7, (isWide ? 10 : 9) * scale, isWide ? 10 : 9)),
    '--login-option-gap': px(clamp(8, 12 * scale, 12)),
    '--login-option-offset': px(clamp(-6, -6 * scale, -4)),
    '--login-small-font-size': px(clamp(isTiny ? 10 : 11, (isLarge ? 16 : isWide ? 14 : 13) * scale, isLarge ? 16 : isWide ? 14 : 13)),
    '--login-footer-font-size': px(clamp(isTiny ? 9 : 10, (isLarge ? 13 : 12) * scale, isLarge ? 13 : 12)),
    '--login-footer-margin-top': px(clamp(6, 8 * scale, 8)),
    alignItems: viewport.width < 768 && viewport.height < 620 ? 'flex-start' : 'center'
  }
})

// 加载站点配置
onMounted(() => {
  syncViewport()
  window.addEventListener('resize', syncViewport, { passive: true })
  if (!siteStore.loaded) {
    siteStore.loadConfig()
  }
  loadPublicConfig()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncViewport)
})

async function handleLogin() {
  try {
    // 短信验证码校验
    if (captchaEnabled.value && captchaType.value === 'sms' && !smsPhone.value) {
      message.warning('请输入手机号')
      return
    }

    await formRef.value?.validate()

    // 如果是滑块验证码，先弹出验证弹窗
    if (captchaEnabled.value && captchaType.value === 'slider') {
      openSliderModal()
      return
    }

    // 其他类型直接登录
    await doLogin()
  } catch (error: any) {
    // 表单验证失败
  }
}

// 执行实际登录
async function doLogin() {
  loading.value = true
  try {
    const loginData: any = {
      username: formData.username,
      password: formData.password
    }

    // 根据验证码类型传递不同参数
    if (captchaEnabled.value) {
      if (captchaType.value === 'image') {
        loginData.uuid = captchaUuid.value
        loginData.code = formData.code
      } else if (captchaType.value === 'slider') {
        loginData.code = 'slider_verified'
      } else if (captchaType.value === 'sms') {
        loginData.phone = smsPhone.value
        loginData.code = formData.code
      }
    }

    // 如果启用记住我
    if (rememberMeEnabled.value) {
      loginData.rememberMe = formData.rememberMe
    }

    await userStore.login(loginData)
    message.success('登录成功')
    const redirect = route.query.redirect as string
    router.push(redirect || '/')
  } catch (error: any) {
    // 刷新验证码
    if (captchaEnabled.value && captchaType.value === 'image') {
      loadCaptcha()
    } else if (captchaEnabled.value && captchaType.value === 'slider') {
      sliderVerified.value = false
    }
  } finally {
    loading.value = false
  }
}

function goRegister() {
  router.push('/register')
}

</script>

<style lang="scss" scoped>
/* 滑块验证弹窗 */
.slider-puzzle-container {
  width: 380px;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

.slider-puzzle-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  font-size: 15px;
  color: #1f2937;
  border-bottom: 1px solid #f0f0f0;
}

.slider-puzzle-image {
  position: relative;
  width: 100%;
  height: 200px;
  overflow: hidden;
  user-select: none;
}

.puzzle-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;

  &.puzzle-bg-0 {
    background-image: url('https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=400&h=200&fit=crop');
  }

  &.puzzle-bg-1 {
    background-image: url('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=200&fit=crop');
  }

  &.puzzle-bg-2 {
    background-image: url('https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&h=200&fit=crop');
  }
}

.puzzle-slot {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 50px;
  height: 50px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.3);

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: -8px;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 50%;
  }
}

.puzzle-piece {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 50px;
  height: 50px;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  transition: box-shadow 0.2s;

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: -8px;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    background: inherit;
    border-radius: 50%;
    overflow: hidden;
  }

  &.verified {
    box-shadow: 0 0 0 3px #22c55e, 0 2px 10px rgba(0, 0, 0, 0.3);
  }
}

.puzzle-piece-bg {
  width: 380px;
  height: 200px;
  background-size: cover;
  background-position: center;
  position: absolute;
  top: -75px;
  left: 0;

  &.puzzle-bg-0 {
    background-image: url('https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=400&h=200&fit=crop');
  }

  &.puzzle-bg-1 {
    background-image: url('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=200&fit=crop');
  }

  &.puzzle-bg-2 {
    background-image: url('https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&h=200&fit=crop');
  }
}

.slider-puzzle-track {
  position: relative;
  height: 50px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  background: #f5f7fa;
}

.slider-track-bg {
  position: absolute;
  left: 20px;
  right: 20px;
  height: 36px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.slider-track-progress {
  height: 100%;
  background: linear-gradient(90deg, #22c55e 0%, #16a34a 100%);
  transition: width 0.05s linear;
}

.slider-handle {
  position: absolute;
  left: 20px;
  width: 50px;
  height: 36px;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  z-index: 1;
  transition: background 0.2s, box-shadow 0.2s;
  color: #6b7280;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  &.dragging {
    cursor: grabbing;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  }

  &.verified {
    background: #22c55e;
    color: #fff;
  }
}

.slider-track-tip {
  position: absolute;
  left: 80px;
  right: 20px;
  text-align: center;
  font-size: 13px;
  color: #9ca3af;
  pointer-events: none;
}

.slider-puzzle-footer {
  padding: 12px 20px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: flex-start;

  .n-button {
    display: flex;
    align-items: center;
    gap: 4px;
    color: #6b7280;

    &:hover {
      color: #111827;
    }
  }
}

/* ==================== 安全验证登录卡片 ==================== */
.login-page {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  padding: var(--login-page-pad-y) var(--login-page-pad-x);
  overflow: auto;
  background: linear-gradient(135deg, #6c8df2 0%, #a66be2 100%);
}

.login-card {
  width: min(var(--login-card-width), 100%);
  padding: var(--login-card-pad-y) var(--login-card-pad-x) var(--login-card-pad-bottom);
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 24px 60px rgba(59, 72, 132, 0.24);
  color: #1f2937;
}

.login-lock {
  width: var(--login-lock-size);
  height: var(--login-lock-size);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--login-lock-margin-bottom);
  border-radius: 50%;
  color: #fff;
  font-size: var(--login-lock-font-size);
  background: linear-gradient(135deg, #6c82f4 0%, #9f71dd 100%);
}

.form-title {
  margin: 0 0 var(--login-title-margin-bottom);
  color: #111827;
  font-size: var(--login-title-font-size);
  font-weight: 800;
  line-height: 1.3;
  text-align: center;
  letter-spacing: 0;
}

:deep(.n-form-item) {
  margin-bottom: var(--login-form-item-gap);
}

:deep(.n-form-item-label) {
  min-height: var(--login-label-height);
  padding: 0 0 var(--login-label-padding-bottom);
  color: #1f2937;
  font-size: var(--login-label-font-size);
  font-weight: 500;
}

:deep(.n-form-item-label__text) {
  color: #1f2937;
}

:deep(.n-form-item-feedback-wrapper) {
  min-height: 0 !important;
  height: 0 !important;
  line-height: 0 !important;
  overflow: hidden !important;
}

:deep(.n-form-item-feedback) {
  display: none !important;
}

:deep(.n-input) {
  --n-height: var(--login-control-height);
  --n-border-radius: var(--login-control-radius);
  --n-color: #fff;
  --n-color-focus: #fff;
  --n-text-color: #111827;
  --n-caret-color: #111827;
  --n-placeholder-color: #8a8f98;
  --n-icon-color: #8a8f98;
  --n-icon-color-hover: #6c82f4;
  --n-border: 1px solid #d9dce3;
  --n-border-hover: 1px solid #8aa0f7;
  --n-border-focus: 1px solid #7c8ff3;
  --n-box-shadow-focus: 0 0 0 2px rgba(124, 143, 243, 0.14);
  font-size: var(--login-control-font-size);
}

:deep(.n-button) {
  --n-height: var(--login-control-height);
  --n-border-radius: var(--login-control-radius);
  --n-text-color: #fff;
  --n-text-color-hover: #fff;
  --n-text-color-pressed: #fff;
  --n-text-color-focus: #fff;
  font-size: var(--login-control-font-size);
  font-weight: 700;
}

.captcha-row {
  display: grid;
  grid-template-columns: 1fr var(--login-captcha-width);
  gap: var(--login-field-gap);
  width: 100%;
}

.captcha-img,
.captcha-loading {
  width: var(--login-captcha-width);
  height: var(--login-captcha-height);
  border: 0;
  border-radius: var(--login-control-radius);
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

.captcha-refresh {
  --n-text-color: #6c82f4;
  --n-text-color-hover: #5c70ea;
  --n-text-color-pressed: #5265db;
  --n-text-color-focus: #5c70ea;
  width: var(--login-captcha-button-width);
  color: #6c82f4;
  background: #f1f4ff;
  border: 0;

  &:hover {
    color: #5c70ea;
    background: #e8edff;
  }
}

.sms-row {
  display: grid;
  grid-template-columns: 1fr var(--login-captcha-width);
  gap: var(--login-field-gap);
  width: 100%;
}

.login-options {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--login-option-gap);
  margin-top: var(--login-option-offset);
}

.login-action-item {
  margin-top: calc(var(--login-form-item-gap) * -0.45);
}

:deep(.n-checkbox) {
  --n-text-color: #4b5563;
  --n-color-checked: #7c82f6;
  --n-border-checked: 1px solid #7c82f6;
  --n-border-focus: 1px solid #7c82f6;
  --n-box-shadow-focus: 0 0 0 2px rgba(124, 130, 246, 0.16);
  font-size: var(--login-small-font-size);
}

.no-inline-captcha {
  :deep(.n-form-item:nth-child(2)) {
    margin-bottom: var(--login-tight-item-gap);
  }

  .login-options-item {
    margin-bottom: var(--login-tight-item-gap);
  }

  .login-action-item {
    margin-top: calc(var(--login-tight-item-gap) * -0.5);
    margin-bottom: var(--login-tight-item-gap);
  }
}

.register-link {
  color: #7b70f0;
  font-size: var(--login-small-font-size);
  text-decoration: none;
  cursor: pointer;

  &:hover {
    color: #6b6feb;
    text-decoration: underline;
  }
}

.login-button {
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
  height: var(--login-control-height);
  background: linear-gradient(90deg, #6c82f4 0%, #a66be2 100%) !important;
  box-shadow: 0 8px 18px rgba(124, 130, 246, 0.24);
}

.compact-captcha {
  .captcha-row {
    grid-template-columns: 1fr var(--login-captcha-width);
  }

  .sms-row {
    grid-template-columns: 1fr;
  }
}

/* 当前登录页最终视觉对齐，覆盖旧登录样式和全局暗色主题 */
.login-page {
  align-items: center !important;
  min-height: 100vh !important;
  isolation: isolate;
  background:
    radial-gradient(circle at 34% 38%, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 34%),
    linear-gradient(135deg, #6c8cf1 0%, #7e82ed 48%, #a66ee2 100%) !important;
}

.login-page::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0) 44%),
    radial-gradient(circle at 52% 50%, rgba(80, 101, 215, 0.12) 0%, rgba(80, 101, 215, 0) 42%);
}

.admin-login-page > :not(.login-card):not(.slider-modal) {
  display: none !important;
}

.login-card {
  border-radius: 12px !important;
  background: #fff !important;
  box-sizing: border-box !important;
  box-shadow: 0 24px 64px rgba(83, 75, 155, 0.22) !important;
}

.login-lock {
  background: linear-gradient(135deg, #6e82f4 0%, #9b70df 100%) !important;
}

.form-title {
  color: #111827 !important;
  font-weight: 800 !important;
}

:deep(.n-form-item-label),
:deep(.n-form-item-label__text) {
  color: #1f2937 !important;
}

:deep(.n-input) {
  --n-color: #fff !important;
  --n-color-focus: #fff !important;
  --n-color-disabled: #fff !important;
  --n-text-color: #111827 !important;
  --n-text-color-disabled: #111827 !important;
  --n-placeholder-color: #8a8f98 !important;
  --n-border: 1px solid #d7dbe3 !important;
  --n-border-hover: 1px solid #b8c2dd !important;
  --n-border-focus: 1px solid #8a91f2 !important;
  --n-box-shadow-focus: 0 0 0 2px rgba(124, 130, 246, 0.12) !important;
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

:deep(.n-checkbox) {
  --n-text-color: #4b5563 !important;
  --n-color-checked: #7c82f6 !important;
  --n-border-checked: 1px solid #7c82f6 !important;
  --n-check-mark-color: #fff !important;
}

.register-link,
.captcha-refresh {
  color: #7085ff !important;
}

.login-button {
  color: #fff !important;
  background: linear-gradient(90deg, #6d82f4 0%, #a36fe2 100%) !important;
  box-shadow: none !important;
}

.login-footer {
  margin-top: var(--login-footer-margin-top);
  color: #667085 !important;
  font-size: var(--login-footer-font-size);
  line-height: 1.5;
  text-align: center;
}

.login-options-item {
  margin-bottom: calc(var(--login-form-item-gap) * 0.35) !important;
}

.login-action-item {
  margin-top: 0 !important;
  margin-bottom: calc(var(--login-form-item-gap) * 0.7) !important;
}

</style>
