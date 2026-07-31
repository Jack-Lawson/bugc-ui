import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { darkTheme, type GlobalTheme } from 'naive-ui'
import { storageKeys, themeDefaults } from '@/config/app'

// 预设主题色
export const themeColors = [
  { name: '深邃黑', color: '#111827' },
  { name: '科技蓝', color: '#2E5CF6' },
  { name: '薄暮红', color: '#F5222D' },
  { name: '火山橙', color: '#FA541C' },
  { name: '日暮黄', color: '#FAAD14' },
  { name: '极光绿', color: '#52C41A' },
  { name: '明青', color: '#13C2C2' },
  { name: '极客蓝', color: '#2F54EB' },
  { name: '酱紫', color: '#722ED1' },
  { name: '玫红', color: '#EB2F96' },
  { name: '天空蓝', color: '#0EA5E9' },
  { name: '薰衣草', color: '#8B5CF6' },
  { name: '珊瑚粉', color: '#F472B6' },
  { name: '薄荷绿', color: '#10B981' },
  { name: '琥珀金', color: '#F59E0B' },
  { name: '罗兰紫', color: '#A855F7' },
  { name: '玫瑰红', color: '#E11D48' },
  { name: '海洋蓝', color: '#0891B2' },
  { name: '翡翠绿', color: '#059669' },
  { name: '暮光橙', color: '#EA580C' },
]

export const useThemeStore = defineStore('theme', () => {
  const getStoredBoolean = (key: string, defaultValue: boolean) => {
    const value = localStorage.getItem(key)
    return value == null ? defaultValue : value === 'true'
  }

  // 主题模式: dark / light
  const mode = ref<'dark' | 'light'>(
    (localStorage.getItem(storageKeys.layoutTheme) as 'dark' | 'light') || themeDefaults.mode
  )

  // 菜单位置
  const siderPosition = ref<'left' | 'right' | 'top'>(
    (localStorage.getItem(storageKeys.layoutPosition) as 'left' | 'right' | 'top') || themeDefaults.siderPosition
  )

  // 是否显示页签
  const showTabs = ref<boolean>(
    getStoredBoolean(storageKeys.layoutShowTabs, themeDefaults.showTabs)
  )

  // 主题色
  const primaryColor = ref<string>(
    localStorage.getItem(storageKeys.layoutPrimaryColor) || themeDefaults.primaryColor
  )

  // 顶栏是否应用主题色
  const headerUsePrimaryColor = ref<boolean>(
    getStoredBoolean(storageKeys.layoutHeaderPrimary, themeDefaults.headerUsePrimaryColor)
  )

  // 是否是暗色主题
  const isDark = computed(() => mode.value === 'dark')

  // Naive UI 主题
  const naiveTheme = computed<GlobalTheme | null>(() => {
    return isDark.value ? darkTheme : null
  })

  // 设置主题
  function setMode(newMode: 'dark' | 'light') {
    mode.value = newMode
    localStorage.setItem(storageKeys.layoutTheme, newMode)
    // 更新 body 类名
    updateBodyClass()
  }

  // 设置菜单位置
  function setSiderPosition(position: 'left' | 'right' | 'top') {
    siderPosition.value = position
    localStorage.setItem(storageKeys.layoutPosition, position)
  }

  // 设置是否显示页签
  function setShowTabs(show: boolean) {
    showTabs.value = show
    localStorage.setItem(storageKeys.layoutShowTabs, String(show))
  }

  // 设置主题色
  function setPrimaryColor(color: string) {
    primaryColor.value = color
    localStorage.setItem(storageKeys.layoutPrimaryColor, color)
    // 设置 CSS 变量，用于顶栏主题色
    document.documentElement.style.setProperty('--primary-color', color)
  }

  // 设置顶栏是否应用主题色
  function setHeaderUsePrimaryColor(use: boolean) {
    headerUsePrimaryColor.value = use
    localStorage.setItem(storageKeys.layoutHeaderPrimary, String(use))
  }

  // 更新 body 类名
  function updateBodyClass() {
    if (isDark.value) {
      document.body.classList.add('dark-theme')
      document.body.classList.remove('light-theme')
    } else {
      document.body.classList.add('light-theme')
      document.body.classList.remove('dark-theme')
    }
  }

  // 初始化时更新 body 类名
  updateBodyClass()
  // 初始化时设置 CSS 变量
  document.documentElement.style.setProperty('--primary-color', primaryColor.value)

  return {
    mode,
    siderPosition,
    showTabs,
    primaryColor,
    headerUsePrimaryColor,
    isDark,
    naiveTheme,
    setMode,
    setSiderPosition,
    setShowTabs,
    setPrimaryColor,
    setHeaderUsePrimaryColor,
    updateBodyClass
  }
}, {
  persist: false // 使用 localStorage 手动管理
})
