import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi, type LoginParams, type UserInfo, type MenuInfo } from '@/api/auth'
import router, { resetRouter } from '@/router'
import { normalizeApiAssetUrl, storageKeys } from '@/config/app'
import { userApi } from '@/api/system'

export const useUserStore = defineStore('user', () => {
  function readStoredToken() {
    try {
      return localStorage.getItem(storageKeys.userToken) || sessionStorage.getItem(storageKeys.userToken)
    } catch (error) {
      return null
    }
  }

  function persistToken(value: string, rememberMe?: boolean) {
    try {
      localStorage.removeItem(storageKeys.userToken)
      sessionStorage.removeItem(storageKeys.userToken)
      const storage = rememberMe ? localStorage : sessionStorage
      storage.setItem(storageKeys.userToken, value)
    } catch (error) {
      // 存储不可用时，仍保留内存登录态
    }
  }

  function clearStoredToken() {
    try {
      localStorage.removeItem(storageKeys.userToken)
      sessionStorage.removeItem(storageKeys.userToken)
    } catch (error) {
      // 忽略清理错误
    }
  }

  // 状态
  const token = ref<string | null>(readStoredToken())
  const user = ref<UserInfo | null>(null)
  const roles = ref<string[]>([])
  const permissions = ref<string[]>([])
  const menus = ref<MenuInfo[]>([])
  
  // 计算属性
  const isLogin = computed(() => !!token.value)
  const nickname = computed(() => user.value?.nickname || user.value?.username || '')
  const avatar = computed(() => normalizeApiAssetUrl(user.value?.avatar))
  
  // 登录
  async function login(params: LoginParams) {
    const res = await authApi.login(params)
    token.value = res.token
    persistToken(res.token, params.rememberMe)
    user.value = res.user
    // 登录成功后立即获取用户信息（包含菜单、权限等）
    await getInfo()
    return res
  }
  
  // 获取用户信息
  async function getInfo() {
    const res = await authApi.getInfo()
    user.value = await fillUserAvatar(res.user)
    roles.value = res.roles
    permissions.value = res.permissions
    menus.value = res.menus
    return res
  }

  async function fillUserAvatar(currentUser: UserInfo): Promise<UserInfo> {
    if (currentUser.avatar || !currentUser.id) {
      return currentUser
    }
    try {
      const detail = await userApi.detail(currentUser.id)
      return {
        ...currentUser,
        avatar: detail.user.avatar || currentUser.avatar
      }
    } catch (error) {
      return currentUser
    }
  }
  
  // 退出登录
  async function logout() {
    // 先清除本地状态，再发送请求（避免 logout 请求带过期 token 触发 401 循环）
    const hadToken = !!token.value
    token.value = null
    user.value = null
    roles.value = []
    permissions.value = []
    menus.value = []
    clearStoredToken()
    
    // 重置路由
    resetRouter()
    
    // 只有之前有 token 时才发送 logout 请求
    if (hadToken) {
      try {
        await authApi.logout()
      } catch (error) {
        // 忽略错误
      }
    }
    
    router.push('/login')
  }
  
  // 检查权限。权限列表已经由后端按菜单状态过滤，前端不再对 admin 做无条件放行。
  function hasPermission(permission: string): boolean {
    if (!permissions.value) return false
    return permissions.value.includes(permission)
  }
  
  // 检查角色
  function hasRole(role: string): boolean {
    if (!roles.value) return false
    return roles.value.includes(role)
  }
  
  return {
    token,
    user,
    roles,
    permissions,
    menus,
    isLogin,
    nickname,
    avatar,
    login,
    getInfo,
    logout,
    hasPermission,
    hasRole
  }
})
