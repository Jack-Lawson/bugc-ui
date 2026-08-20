<template>
  <n-layout
    :has-sider="layoutConfig.siderPosition !== 'top'"
    class="layout"
    :class="[
      layoutConfig.siderPosition === 'top' ? 'layout-top' : '',
      isHiddenSiderMode ? 'layout-hidden-sider' : ''
    ]"
  >
    <!-- 侧边栏（左侧/右侧模式） -->
    <n-layout-sider
      v-if="layoutConfig.siderPosition !== 'top'"
      bordered
      collapse-mode="width"
      :collapsed-width="siderCollapsedWidth"
      :width="240"
      :collapsed="collapsed"
      :position="layoutConfig.siderPosition === 'right' ? 'right' : 'left'"
      @collapse="collapsed = true"
      @expand="collapsed = false"
      class="layout-sider"
      :class="[
        `theme-${layoutConfig.theme}`,
        layoutConfig.siderPosition === 'right' ? 'sider-right' : '',
        shouldFullyHideSider ? 'sider-hidden-mode' : ''
      ]"
    >
      <!-- Logo -->
      <div
        class="logo"
        :class="{
          'logo-collapsed': collapsed,
          'logo-primary': themeStore.headerUsePrimaryColor,
          'logo-clickable': shouldFullyHideSider
        }"
        :style="themeStore.headerUsePrimaryColor ? { background: themeStore.primaryColor, borderBottomColor: themeStore.primaryColor } : {}"
        :title="shouldFullyHideSider ? '隐藏菜单' : undefined"
        @click="shouldFullyHideSider && toggleSider()"
      >
        <img v-if="siteLogo" :src="siteLogo" class="logo-img" alt="Logo" />
        <div v-else class="logo-icon" :style="{ background: themeStore.headerUsePrimaryColor ? '#fff' : themeStore.primaryColor, color: themeStore.headerUsePrimaryColor ? themeStore.primaryColor : '#fff' }">{{ siteName.charAt(0) }}</div>
        <transition name="fade">
          <span v-if="!collapsed" class="logo-text">{{ siteName }}</span>
        </transition>
      </div>

      <!-- 菜单 -->
      <n-menu
        :collapsed="collapsed"
        :collapsed-width="siderCollapsedWidth"
        :collapsed-icon-size="22"
        :options="menuOptions"
        :value="activeMenu"
        @update:value="handleMenuClick"
        class="layout-menu"
      />
    </n-layout-sider>

    <button
      v-if="layoutConfig.siderPosition !== 'top' && (!isMobileSiderViewport || !collapsed)"
      class="layout-sider-toggle"
      type="button"
      :style="siderToggleStyle"
      :title="collapsed ? '展开菜单' : '隐藏菜单'"
      @click.stop="toggleSider"
    >
      <n-icon size="22">
        <component :is="siderToggleIcon" />
      </n-icon>
    </button>

    <!-- 主内容区 -->
    <n-layout class="layout-main">
      <!-- 顶部导航 -->
      <n-layout-header bordered class="layout-header" :class="[`theme-${layoutConfig.theme}`, { 'header-primary': themeStore.headerUsePrimaryColor }]" :style="headerStyle">
        <!-- 顶部菜单模式下的Logo -->
        <div v-if="layoutConfig.siderPosition === 'top'" class="header-logo">
          <img v-if="siteLogo" :src="siteLogo" class="logo-img" alt="Logo" />
          <div v-else class="logo-icon" :style="{ background: themeStore.headerUsePrimaryColor ? '#fff' : themeStore.primaryColor, color: themeStore.headerUsePrimaryColor ? themeStore.primaryColor : '#fff' }">{{ siteName.charAt(0) }}</div>
          <span class="logo-text">{{ siteName }}</span>
        </div>

        <!-- 顶部菜单模式下的菜单 -->
        <div v-if="layoutConfig.siderPosition === 'top'" class="header-menu">
          <n-menu
            mode="horizontal"
            :options="menuOptions"
            :value="activeMenu"
            @update:value="handleMenuClick"
          />
        </div>

        <div v-else-if="shouldFullyHideSider && collapsed" class="header-left">
          <button
            class="header-brand"
            type="button"
            :title="collapsed ? '展开菜单' : '隐藏菜单'"
            @click="toggleSider"
          >
            <img v-if="siteLogo" :src="siteLogo" class="header-brand-img" alt="Logo" />
            <span v-else class="header-brand-icon">{{ siteName.charAt(0) }}</span>
            <span class="header-brand-text">BugC</span>
          </button>
        </div>
        <div v-else class="header-left header-left-empty"></div>

        <div class="header-right">
          <!-- 消息通知 -->
          <n-popover trigger="click" placement="bottom-end" :width="360" @update:show="handleMessagePopoverShow">
            <template #trigger>
              <n-badge :value="messageStore.totalUnread()" :max="99" :show-zero="false">
                <div class="header-icon" title="消息通知">
                  <n-icon size="20"><NotificationsOutline /></n-icon>
                </div>
              </n-badge>
            </template>
            <div class="message-popover">
              <div class="message-tabs">
                <n-tabs v-model:value="messageTab" type="line" size="small" @update:value="handleTabChange" class="message-tabs-inner">
                  <n-tab-pane name="notice" tab="通知">
                    <template #tab>
                      <n-badge :value="messageStore.noticeCount" :max="99" :show-zero="false" :offset="[8, -2]">
                        <span class="tab-text">通知</span>
                      </n-badge>
                    </template>
                  </n-tab-pane>
                  <n-tab-pane name="chat" tab="消息">
                    <template #tab>
                      <n-badge :value="messageStore.chatCount" :max="99" :show-zero="false" :offset="[8, -2]">
                        <span class="tab-text">消息</span>
                      </n-badge>
                    </template>
                  </n-tab-pane>
                </n-tabs>
              </div>
              <div class="message-list" ref="messageListRef" @scroll="handleMessageScroll">
                <n-spin :show="messageLoading && messagePage === 1">
                  <!-- 通知列表 -->
                  <template v-if="messageTab === 'notice'">
                    <div v-for="item in recentNotices" :key="item.id" class="message-item" @click="handleNoticeClick(item)">
                      <div class="message-item-header">
                        <n-tag :type="item.noticeType === 1 ? 'info' : 'warning'" size="small">
                          {{ item.noticeType === 1 ? '通知' : '公告' }}
                        </n-tag>
                        <span class="message-time">{{ formatMessageTime(item.createTime) }}</span>
                      </div>
                      <div class="message-title">{{ item.title }}</div>
                      <div class="message-content">{{ stripHtml(item.content) }}</div>
                    </div>
                    <n-empty v-if="recentNotices.length === 0 && !messageLoading" description="暂无通知" size="small" style="padding: 30px 0" />
                  </template>
                  <!-- 聊天消息列表 -->
                  <template v-else>
                    <div v-for="item in recentChats" :key="item.senderId || item.id" class="message-item" @click="handleChatClick(item)">
                      <div class="message-item-row">
                        <n-avatar round size="small" :src="item.senderAvatar">
                          {{ item.senderName?.charAt(0) || 'U' }}
                        </n-avatar>
                        <div class="message-item-content">
                          <div class="message-item-header">
                            <span class="message-sender">{{ item.senderName || '用户' }}</span>
                            <span class="message-time">{{ formatMessageTime(item.sendTime) }}</span>
                          </div>
                          <div class="message-content">{{ item.content }}</div>
                        </div>
                      </div>
                    </div>
                    <n-empty v-if="recentChats.length === 0 && !messageLoading" description="暂无消息" size="small" style="padding: 30px 0" />
                  </template>
                </n-spin>
                <!-- 加载更多 -->
                <div v-if="messageLoading && messagePage > 1" class="message-loading">
                  <n-spin size="small" />
                </div>
                <div v-if="!hasMoreMessages && (recentNotices.length > 0 || recentChats.length > 0)" class="message-no-more">
                  没有更多了
                </div>
              </div>
              <div class="message-footer">
                <n-button v-if="messageStore.noticeCount > 0 && messageTab === 'notice'" text size="small" @click="handleMarkAllRead">
                  全部已读
                </n-button>
                <n-button text type="primary" @click="goToMessage">查看全部</n-button>
              </div>
            </div>
          </n-popover>

          <n-popover
            trigger="click"
            placement="bottom-end"
            :show-arrow="false"
            raw
            class="user-menu-popover-shell"
            content-class="user-menu-popover"
            v-model:show="userMenuVisible"
          >
            <template #trigger>
            <div class="user-info">
              <n-avatar
                round
                size="small"
                :src="userStore.avatar || undefined"
              >
                {{ userStore.nickname?.charAt(0) || 'U' }}
              </n-avatar>
              <span class="user-name">{{ userStore.nickname }}</span>
              <n-icon size="16">
                <ChevronDownOutline />
              </n-icon>
            </div>
            </template>
            <div class="user-menu-cascade">
              <div class="user-menu-panel">
                <button class="user-menu-item" type="button" @click="handleUserMenuCommand('profile')">
                  <n-icon size="18"><PersonOutline /></n-icon>
                  <span>个人中心</span>
                </button>
                <button class="user-menu-item" type="button" @click="handleUserMenuCommand('password')">
                  <n-icon size="18"><KeyOutline /></n-icon>
                  <span>修改密码</span>
                </button>

                <div v-if="userShortcutOptions.length > 0 || backendManagementOptions.length > 0" class="user-menu-divider"></div>

                <button
                  v-for="option in userShortcutOptions"
                  :key="option.key"
                  class="user-menu-item"
                  type="button"
                  @click="handleUserMenuCommand(String(option.key))"
                >
                  <n-icon v-if="getOptionIcon(option)" size="18">
                    <component :is="getOptionIcon(option)" />
                  </n-icon>
                  <span>{{ option.label }}</span>
                </button>

                <div v-if="userShortcutOptions.length > 0 && backendManagementOptions.length > 0" class="user-menu-divider"></div>

                <div
                  v-if="backendManagementOptions.length > 0"
                  class="user-menu-item user-menu-item--submenu"
                  :class="{ 'user-menu-item--active': activeBackendMenu }"
                  @click="toggleBackendMenu"
                >
                  <n-icon size="18"><CogOutline /></n-icon>
                  <span>后台管理</span>
                  <n-icon size="14" class="user-menu-arrow"><ChevronBackOutline /></n-icon>
                </div>

                <div class="user-menu-divider"></div>

                <button class="user-menu-item" type="button" @click="handleUserMenuCommand('logout')">
                  <n-icon size="18"><LogOutOutline /></n-icon>
                  <span>退出登录</span>
                </button>
              </div>

              <div v-if="activeBackendMenu" class="user-menu-panel user-menu-panel--submenu">
                <template v-for="option in backendManagementOptions" :key="option.key">
                  <button
                    v-if="!option.children"
                    class="user-menu-item"
                    type="button"
                    @click="handleUserMenuCommand(String(option.key))"
                  >
                    <n-icon v-if="getOptionIcon(option)" size="18">
                      <component :is="getOptionIcon(option)" />
                    </n-icon>
                    <span>{{ option.label }}</span>
                  </button>
                  <div
                    v-else
                    class="user-menu-item user-menu-item--submenu"
                    :class="{ 'user-menu-item--active': activeBackendGroupKey === String(option.key) }"
                    @click="toggleBackendGroup(String(option.key))"
                  >
                    <n-icon v-if="getOptionIcon(option)" size="18">
                      <component :is="getOptionIcon(option)" />
                    </n-icon>
                    <span>{{ option.label }}</span>
                    <n-icon size="14" class="user-menu-arrow"><ChevronBackOutline /></n-icon>
                  </div>
                </template>
              </div>

              <div v-if="activeBackendMenu && activeBackendGroupOption" class="user-menu-panel user-menu-panel--submenu">
                <button
                  v-for="option in activeBackendGroupOption.children"
                  :key="option.key"
                  class="user-menu-item"
                  type="button"
                  @click="handleUserMenuCommand(String(option.key))"
                >
                  <n-icon v-if="getOptionIcon(option)" size="18">
                    <component :is="getOptionIcon(option)" />
                  </n-icon>
                  <span>{{ option.label }}</span>
                </button>
              </div>
            </div>
          </n-popover>
        </div>
      </n-layout-header>

      <!-- 页签栏 -->
      <TabBar v-if="themeStore.showTabs" />

      <!-- 内容区 -->
      <n-layout-content class="layout-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </n-layout-content>
    </n-layout>

    <!-- 个人信息弹窗 -->
    <ProfileModal v-model:show="showProfileModal" />

    <!-- 修改密码弹窗 -->
    <PasswordModal v-model:show="showPasswordModal" />

    <!-- 消息通知弹窗 -->
    <MessageNotification />
  </n-layout>
</template>

<script setup lang="ts">
import { ref, computed, h, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NIcon, useMessage, useDialog, type DropdownOption, type MenuOption } from 'naive-ui'
import {
  HomeOutline,
  SettingsOutline,
  PersonOutline,
  PeopleOutline,
  MenuOutline,
  LogOutOutline,
  KeyOutline,
  ChevronBackOutline,
  ChevronForwardOutline,
  ChevronDownOutline,
  BookOutline,
  BusinessOutline,
  GitNetworkOutline,
  IdCardOutline,
  DocumentTextOutline,
  ListOutline,
  LogInOutline,
  PulseOutline,
  StatsChartOutline,
  PeopleCircleOutline,
  TimerOutline,
  ServerOutline,
  DesktopOutline,
  SettingsSharp,
  FolderOpenOutline,
  DocumentOutline,
  CloudOutline,
  NotificationsOutline,
  ChatbubbleOutline,
  CogOutline,
  OptionsOutline
} from '@vicons/ionicons5'
import { useUserStore } from '@/stores/user'
import { useMessageStore } from '@/stores/message'
import { useSiteStore } from '@/stores/site'
import { useThemeStore } from '@/stores/theme'
import ProfileModal from '@/components/ProfileModal.vue'
import PasswordModal from '@/components/PasswordModal.vue'
import MessageNotification from '@/components/MessageNotification.vue'
import TabBar from '@/components/TabBar.vue'
import { noticeApi, chatApi, type SysNotice, type ChatMessage } from '@/api/message'
import { iconMap as externalIconMap } from '@/utils/icons'
import { siteDefaults } from '@/config/app'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const dialog = useDialog()
const userStore = useUserStore()
const messageStore = useMessageStore()
const siteStore = useSiteStore()
const themeStore = useThemeStore()

// 站点配置
const siteName = computed(() => siteStore.siteName || siteDefaults.name)
const siteLogo = computed(() => siteStore.siteLogo)

// 注册全局message
window.$message = message

const mobileSiderBreakpoint = 768
const collapsed = ref(false)
const isMobileSiderViewport = ref(
  typeof window !== 'undefined' ? window.innerWidth <= mobileSiderBreakpoint : false
)
let lastMobileSiderViewport = isMobileSiderViewport.value
const showProfileModal = ref(false)
const showPasswordModal = ref(false)
const messageTab = ref('notice')

// 消息相关
const messageLoading = ref(false)
const recentNotices = ref<SysNotice[]>([])
const recentChats = ref<ChatMessage[]>([])
const messagePage = ref(1)
const hasMoreMessages = ref(true)
const messageListRef = ref<HTMLElement | null>(null)

const userMenuVisible = ref(false)
const activeBackendMenu = ref(false)
const activeBackendGroupKey = ref('')

// 布局配置 - 使用 theme store
const layoutConfig = computed(() => ({
  siderPosition: themeStore.siderPosition,
  theme: themeStore.mode
}))

const isHiddenSiderMode = computed(() => themeStore.siderPosition === 'hidden')
const shouldFullyHideSider = computed(() => isHiddenSiderMode.value || isMobileSiderViewport.value)
const siderCollapsedWidth = computed(() => shouldFullyHideSider.value ? 0 : 64)

// 顶栏动态样式
const headerStyle = computed(() => {
  if (themeStore.headerUsePrimaryColor) {
    return {
      background: themeStore.primaryColor,
      borderBottomColor: themeStore.primaryColor
    }
  }
  return {}
})

function syncMobileSiderState(force = false) {
  const nextIsMobile = window.innerWidth <= mobileSiderBreakpoint
  const viewportChanged = nextIsMobile !== lastMobileSiderViewport
  isMobileSiderViewport.value = nextIsMobile
  lastMobileSiderViewport = nextIsMobile
  if (themeStore.siderPosition === 'top') {
    return
  }
  if (force || viewportChanged || !nextIsMobile) {
    collapsed.value = nextIsMobile
  }
}

// 初始化WebSocket和加载未读数
onMounted(() => {
  syncMobileSiderState(true)
  window.addEventListener('resize', syncMobileSiderState)
  messageStore.initWebSocket()
  loadUnreadCount()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncMobileSiderState)
})

watch(
  () => themeStore.siderPosition,
  () => {
    syncMobileSiderState()
  }
)

// 加载未读数量
async function loadUnreadCount() {
  try {
    const [noticeCount, chatCount] = await Promise.all([
      noticeApi.getUnreadCount(),
      chatApi.getUnreadCount()
    ])
    messageStore.setUnreadCount(noticeCount, chatCount)
  } catch (error) {
    // 忽略错误
  }
}

// 跳转到消息页面
function goToMessage() {
  if (messageTab.value === 'notice') {
    router.push('/message/notice')
  } else {
    router.push('/message/chat')
  }
}

// 消息弹窗显示时加载数据
async function handleMessagePopoverShow(show: boolean) {
  if (show) {
    loadUnreadCount()
    // 重置分页
    messagePage.value = 1
    hasMoreMessages.value = true
    if (messageTab.value === 'notice') {
      recentNotices.value = []
      await loadRecentNotices()
    } else {
      recentChats.value = []
      await loadRecentChats()
    }
  }
}

// Tab 切换时加载数据
async function handleTabChange(tab: string) {
  // 重置分页
  messagePage.value = 1
  hasMoreMessages.value = true
  if (tab === 'notice') {
    recentNotices.value = []
    await loadRecentNotices()
  } else {
    recentChats.value = []
    await loadRecentChats()
  }
}

// 加载最近通知
async function loadRecentNotices(append = false) {
  if (messageLoading.value) return
  try {
    messageLoading.value = true
    const res = await noticeApi.myNotices({ page: messagePage.value, pageSize: 10 })
    const list = res.list || []
    if (append) {
      recentNotices.value = [...recentNotices.value, ...list]
    } else {
      recentNotices.value = list
    }
    hasMoreMessages.value = list.length >= 10
  } catch (error) {
    // 忽略错误
  } finally {
    messageLoading.value = false
  }
}

// 加载最近聊天
async function loadRecentChats(append = false) {
  if (messageLoading.value) return
  try {
    messageLoading.value = true
    const res = await chatApi.getContacts()
    const list = res || []
    if (append) {
      recentChats.value = [...recentChats.value, ...list]
    } else {
      recentChats.value = list
    }
    // 聊天联系人一次性加载，不分页
    hasMoreMessages.value = false
  } catch (error) {
    // 忽略错误
  } finally {
    messageLoading.value = false
  }
}

// 滚动加载更多
function handleMessageScroll(e: Event) {
  const target = e.target as HTMLElement
  const { scrollTop, scrollHeight, clientHeight } = target
  
  // 距离底部 50px 时加载更多
  if (scrollHeight - scrollTop - clientHeight < 50 && hasMoreMessages.value && !messageLoading.value) {
    messagePage.value++
    if (messageTab.value === 'notice') {
      loadRecentNotices(true)
    }
    // 聊天不做分页
  }
}

// 标记全部已读
async function handleMarkAllRead() {
  try {
    await noticeApi.markAllAsRead()
    messageStore.clearNoticeCount()
    // 刷新列表
    messagePage.value = 1
    await loadRecentNotices()
    message.success('已全部标记为已读')
  } catch (error) {
    // 忽略
  }
}

// 格式化消息时间
function formatMessageTime(time: string | undefined): string {
  if (!time) return ''
  const date = new Date(time)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
  if (diff < 604800000) return Math.floor(diff / 86400000) + '天前'
  
  return `${date.getMonth() + 1}/${date.getDate()}`
}

// 去除 HTML 标签
function stripHtml(html: string | undefined): string {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, '').substring(0, 50)
}

// 点击通知
async function handleNoticeClick(item: SysNotice) {
  // 标记已读
  if (item.id) {
    try {
      await noticeApi.markAsRead(item.id)
      // 刷新未读数量
      loadUnreadCount()
    } catch (error) {
      // 忽略
    }
  }
  router.push({ path: '/message/notice', query: { id: item.id?.toString() } })
}

// 点击聊天
async function handleChatClick(item: ChatMessage) {
  // 标记已读
  if (item.senderId) {
    try {
      await chatApi.markAsRead(item.senderId)
      // 刷新未读数量
      loadUnreadCount()
    } catch (error) {
      // 忽略
    }
  }
  router.push({ path: '/message/chat', query: { userId: item.senderId?.toString() } })
}

// 获取图标名称
function getIconName(key: string): string {
  const iconMapping: Record<string, string> = {
    '/dashboard': 'HomeOutline',
    '/system/user': 'PersonOutline',
    '/system/role': 'PeopleOutline',
    '/system/menu': 'MenuOutline',
    '/system/dict': 'BookOutline',
    '/system/config': 'SettingsSharp',
    '/org/dept': 'GitNetworkOutline',
    '/org/post': 'IdCardOutline',
    '/log/operlog': 'ListOutline',
    '/log/loginlog': 'LogInOutline',
    '/monitor/api-access': 'StatsChartOutline',
    '/system/file': 'DocumentOutline',
    '/message/notice': 'NotificationsOutline',
    '/message/chat': 'ChatbubbleOutline',
    '/monitor/online': 'PeopleCircleOutline',
    '/monitor/job': 'TimerOutline',
    '/monitor/cache': 'ServerOutline',
    '/monitor/server': 'DesktopOutline',
    '/personal/service/manage': 'OptionsOutline',
    '/personal-service/manage': 'OptionsOutline'
  }
  return iconMapping[key] || 'MenuOutline'
}

function toggleSider() {
  collapsed.value = !collapsed.value
}

const siderToggleStyle = computed(() => {
  const edge = collapsed.value ? siderCollapsedWidth.value : 240
  const offset = `${Math.max(12, edge - 18)}px`

  return layoutConfig.siderPosition === 'right'
    ? { right: offset }
    : { left: offset }
})

const siderToggleIcon = computed(() => {
  const isRightSider = layoutConfig.siderPosition === 'right'
  if (isRightSider) {
    return collapsed.value ? ChevronBackOutline : ChevronForwardOutline
  }
  return collapsed.value ? ChevronForwardOutline : ChevronBackOutline
})

// 图标映射
const iconMap: Record<string, any> = {
  HomeOutline,
  SettingsOutline,
  PersonOutline,
  PeopleOutline,
  MenuOutline,
  BookOutline,
  BusinessOutline,
  GitNetworkOutline,
  IdCardOutline,
  DocumentTextOutline,
  ListOutline,
  LogInOutline,
  PulseOutline,
  StatsChartOutline,
  PeopleCircleOutline,
  TimerOutline,
  ServerOutline,
  DesktopOutline,
  SettingsSharp,
  FolderOpenOutline,
  DocumentOutline,
  CloudOutline,
  NotificationsOutline,
  ChatbubbleOutline,
  CogOutline,
  OptionsOutline
}

// 合并外部图标映射（已在顶部导入）
Object.assign(iconMap, externalIconMap)

// 渲染图标
function renderIcon(iconName?: string) {
  if (!iconName) return undefined
  const icon = iconMap[iconName]
  if (!icon) return undefined
  return () => h(NIcon, null, { default: () => h(icon) })
}

function normalizeMenuPath(menu: typeof userStore.menus[number]): string {
  let menuPath = menu.path || `/menu-${menu.id}`
  if (menuPath && !menuPath.startsWith('/') && menu.type === 2) {
    menuPath = '/' + menuPath
  }
  return menuPath
}

function getMenuKey(menu: typeof userStore.menus[number]): string {
  const isExternal = menu.isFrame === 1 && menu.component
  if (isExternal && menu.type !== 2) {
    return `external:${menu.component}`
  }
  return normalizeMenuPath(menu)
}

function isSettingMenu(menu: typeof userStore.menus[number]): boolean {
  const path = normalizeMenuPath(menu)
  return (
    menu.name === '系统管理' ||
    menu.name === '组织管理' ||
    menu.name === '系统日志' ||
    menu.name === '消息中心' ||
    menu.name === '在线用户' ||
    menu.name === '接口日志' ||
    menu.name === 'API访问统计' ||
    path === 'system' ||
    path === 'org' ||
    path === 'log' ||
    path === 'message' ||
    path === '/monitor/online' ||
    path === '/monitor/api-access' ||
    path === '/system' ||
    path === '/org' ||
    path === '/log' ||
    path === '/message'
  )
}

const userShortcutMenuOrder = [
  '/message/notice'
]

const systemLogMenuOrder = [
  '/monitor/api-access',
  '/log/operlog',
  '/log/loginlog'
]

const systemManagementMenuOrder = [
  '/system/user',
  '/monitor/online',
  '/system/role',
  '/system/dict',
  '/system/menu'
]

const orgManagementMenuOrder = [
  '/org/dept',
  '/org/post'
]

const systemConfigMenuOrder = [
  '/system/config'
]

// 将后台菜单数据转换为 Naive UI 菜单格式
function convertMenus(menus: typeof userStore.menus, options: { hideSettingMenus?: boolean } = {}): MenuOption[] {
  if (!menus || !Array.isArray(menus)) {
    return []
  }
  return menus
    .filter(menu => menu.visible === 1 && menu.type !== 3) // 过滤隐藏菜单和按钮
    .filter(menu => !options.hideSettingMenus || !isSettingMenu(menu))
    .slice()
    .sort((a, b) => a.sort - b.sort) // 按排序字段排序
    .map(menu => {
      // 外链菜单（目录或菜单类型）使用特殊的 key 格式：external:url
      const isExternal = menu.isFrame === 1 && menu.component
      const menuKey = getMenuKey(menu)
      
      const option: MenuOption = {
        label: menu.name,
        key: menuKey,
        icon: renderIcon(menu.icon)
      }
      
      // 非外链菜单才处理子菜单
      if (!isExternal && menu.children && menu.children.length > 0) {
        const children = convertMenus(menu.children, options)
        if (children.length > 0) {
          option.children = children
        }
      }
      return option
    })
}

function collectMenus(menus: typeof userStore.menus): typeof userStore.menus {
  if (!menus || !Array.isArray(menus)) {
    return []
  }

  return menus.flatMap(menu => [menu, ...collectMenus(menu.children || [])])
}

function convertMenuToDropdown(menu: typeof userStore.menus[number]): DropdownOption {
  return {
    label: menu.name,
    key: getMenuKey(menu),
    icon: renderIcon(menu.icon),
    iconName: menu.icon
  }
}

const systemManagementOptions = computed<DropdownOption[]>(() => {
  return getDropdownOptionsByPath(systemManagementMenuOrder)
})

const orgManagementOptions = computed<DropdownOption[]>(() => {
  return getDropdownOptionsByPath(orgManagementMenuOrder)
})

const userShortcutOptions = computed<DropdownOption[]>(() => {
  return getDropdownOptionsByPath(userShortcutMenuOrder)
})

const systemConfigOptions = computed<DropdownOption[]>(() => {
  return getDropdownOptionsByPath(systemConfigMenuOrder)
})

const systemLogOptions = computed<DropdownOption[]>(() => {
  return getDropdownOptionsByPath(systemLogMenuOrder)
})

const backendManagementOptions = computed<DropdownOption[]>(() => {
  const options: DropdownOption[] = []

  if (systemLogOptions.value.length > 0) {
    options.push({
      label: '系统日志',
      key: 'backend-system-logs',
      leftIcon: DocumentTextOutline,
      iconName: 'DocumentTextOutline',
      children: systemLogOptions.value
    })
  }

  if (orgManagementOptions.value.length > 0) {
    options.push({
      label: '组织管理',
      key: 'backend-org-management',
      leftIcon: BusinessOutline,
      iconName: 'BusinessOutline',
      children: orgManagementOptions.value
    })
  }

  if (systemManagementOptions.value.length > 0) {
    options.push({
      label: '系统管理',
      key: 'backend-system-management',
      leftIcon: SettingsOutline,
      iconName: 'SettingsOutline',
      children: systemManagementOptions.value
    })
  }

  options.push(...systemConfigOptions.value)

  return options
})

function getDropdownOptionsByPath(paths: string[]): DropdownOption[] {
  const visibleMenus = collectMenus(userStore.menus)
    .filter(menu => menu.visible === 1 && menu.type !== 3)
  const menuMap = new Map(visibleMenus.map(menu => [getMenuKey(menu), menu]))

  return paths
    .map(path => menuMap.get(path))
    .filter((menu): menu is typeof userStore.menus[number] => !!menu)
    .map(convertMenuToDropdown)
}

const activeBackendGroupOption = computed<DropdownOption | undefined>(() => {
  return backendManagementOptions.value.find(option => option.key === activeBackendGroupKey.value)
})

function getOptionIcon(option: DropdownOption): any {
  const customIcon = (option as DropdownOption & { leftIcon?: any }).leftIcon
  if (customIcon) {
    return customIcon
  }
  const iconName = (option as DropdownOption & { iconName?: string }).iconName || getIconName(String(option.key))
  return iconMap[iconName] || MenuOutline
}

function toggleBackendMenu() {
  activeBackendMenu.value = !activeBackendMenu.value
  activeBackendGroupKey.value = ''
}

function toggleBackendGroup(key: string) {
  activeBackendGroupKey.value = activeBackendGroupKey.value === key ? '' : key
}

function handleUserMenuCommand(key: string) {
  handleUserAction(key)
  userMenuVisible.value = false
  activeBackendMenu.value = false
  activeBackendGroupKey.value = ''
}

// 菜单配置 - 从后台动态获取
const menuOptions = computed<MenuOption[]>(() => {
  // 添加首页菜单
  const homeMenu: MenuOption = {
    label: '首页',
    key: '/dashboard',
    icon: renderIcon('HomeOutline')
  }
  
  // 从 userStore 获取动态菜单
  const dynamicMenus = convertMenus(userStore.menus, { hideSettingMenus: true })
  
  return [homeMenu, ...dynamicMenus]
})

// 当前激活菜单
const activeMenu = computed(() => route.path)

// 面包屑
const breadcrumbs = computed(() => {
  const items: Array<{ path: string; title: string }> = []
  if (route.path === '/dashboard') {
    items.push({ path: '/dashboard', title: '首页' })
  } else if (route.path.startsWith('/system')) {
    items.push({ path: '/system', title: '系统管理' })
    if (route.path === '/system/user') {
      items.push({ path: '/system/user', title: '用户管理' })
    } else if (route.path === '/system/role') {
      items.push({ path: '/system/role', title: '角色管理' })
    } else if (route.path === '/system/menu') {
      items.push({ path: '/system/menu', title: '菜单管理' })
    } else if (route.path === '/system/dict') {
      items.push({ path: '/system/dict', title: '字典管理' })
    } else if (route.path === '/system/config') {
      items.push({ path: '/system/config', title: '系统配置' })
    } else if (route.path === '/system/image') {
      items.push({ path: '/system/image', title: '图片管理' })
    } else if (route.path === '/system/video') {
      items.push({ path: '/system/video', title: '视频管理' })
    } else if (route.path === '/system/file') {
      items.push({ path: '/system/file', title: '文件列表' })
    } else if (route.path === '/system/file-config') {
      items.push({ path: '/system/file-config', title: '文件配置' })
    }
  } else if (route.path.startsWith('/org')) {
    items.push({ path: '/org', title: '组织管理' })
    if (route.path === '/org/dept') {
      items.push({ path: '/org/dept', title: '部门管理' })
    } else if (route.path === '/org/post') {
      items.push({ path: '/org/post', title: '岗位管理' })
    }
  } else if (route.path.startsWith('/log')) {
    items.push({ path: '/log', title: '系统日志' })
    if (route.path === '/log/operlog') {
      items.push({ path: '/log/operlog', title: '操作日志' })
    } else if (route.path === '/log/loginlog') {
      items.push({ path: '/log/loginlog', title: '登录日志' })
    }
  } else if (route.path.startsWith('/message')) {
    items.push({ path: '/message', title: '消息中心' })
    if (route.path === '/message/notice') {
      items.push({ path: '/message/notice', title: '系统通知' })
    } else if (route.path === '/message/chat') {
      items.push({ path: '/message/chat', title: '即时聊天' })
    }
  }
  return items
})

// 菜单点击
function handleMenuClick(key: string) {
  navigateByKey(key)
}

function navigateByKey(key: string) {
  // 判断是否是外链目录
  if (key.startsWith('external:')) {
    const url = key.replace('external:', '')
    window.open(url, '_blank')
    return
  }

  router.push(key)
}

// 用户操作
function handleUserAction(key: string) {
  if (key === 'logout') {
    dialog.warning({
      title: '提示',
      content: '确定要退出登录吗？',
      positiveText: '确定',
      negativeText: '取消',
      onPositiveClick: () => {
        userStore.logout()
        message.success('已退出登录')
      }
    })
  } else if (key === 'profile') {
    router.push('/profile')
  } else if (key === 'password') {
    showPasswordModal.value = true
  } else if (key.startsWith('external:')) {
    navigateByKey(key)
  } else if (key.startsWith('/')) {
    navigateByKey(key)
  }
}
</script>

<style lang="scss" scoped>
.layout {
  min-height: 100dvh;
}

.layout-main {
  min-width: 0;
}

.layout-sider {
  background: #FFFFFF;
  transition: background-color 0.3s;

  :deep(.n-layout-sider-scroll-container) {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
}

.sider-hidden-mode {
  :deep(.n-layout-sider__border) {
    display: none;
  }

}

.layout-sider-toggle {
  position: fixed;
  top: 50%;
  z-index: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  padding: 0;
  color: #64748b;
  cursor: pointer;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 50%;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.16);
  transform: translateY(-50%);
  transition: color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.layout-sider-toggle:hover {
  color: var(--primary-color, #2563eb);
  border-color: var(--primary-color, #2563eb);
  box-shadow: 0 10px 28px rgba(37, 99, 235, 0.18);
}

.layout-sider-toggle:active {
  transform: translateY(-50%) scale(0.96);
}

body.dark-theme .layout-sider {
  background: #18181c;
}

body.dark-theme .layout-sider-toggle {
  color: #a1a1aa;
  background: #18181c;
  border-color: #3f3f46;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 12px;
  border-bottom: 1px solid #E5E7EB;
  transition: all 0.3s;

  &.logo-clickable {
    cursor: pointer;
  }

  &.logo-clickable:hover {
    background: #F9FAFB;
  }

  &.logo-collapsed {
    padding: 0 16px;
    justify-content: center;
  }
}

body.dark-theme .logo {
  border-bottom-color: #3f3f46;

  &.logo-clickable:hover {
    background: #27272a;
  }
}

// 侧边栏logo区域应用主题色时的样式
.logo.logo-primary {
  .logo-text {
    color: #fff;
  }

  .logo-icon {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }
}

.logo-img {
  width: 32px;
  height: 32px;
  object-fit: contain;
  border-radius: 8px;
  flex-shrink: 0;
}

.logo-icon {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #111827 0%, #374151 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FFFFFF;
  font-size: 18px;
  font-weight: 700;
  flex-shrink: 0;
}

.logo-text {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
  white-space: nowrap;
  transition: color 0.3s;
}

body.dark-theme .logo-text {
  color: #ffffffd1;
}

.layout-menu {
  flex: 1;
  padding: 12px 8px;
  overflow-y: auto;
}

.layout-header {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 18px;
  background: #FFFFFF;
  border-bottom: 1px solid #e8e8e8;
  transition: background-color 0.3s;
  gap: 20px;
}

body.dark-theme .layout-header {
  background: #18181c;
  border-bottom: 1px solid #3f3f46;
}

// 顶栏应用主题色时的样式
.layout-header.header-primary {
  background: var(--primary-color) !important;
  border-bottom-color: var(--primary-color) !important;

  .header-icon {
    color: #fff;

    &:hover {
      background: rgba(255, 255, 255, 0.15);
    }
  }

  .user-info {
    &:hover {
      background: rgba(255, 255, 255, 0.15);
    }
  }

  .user-name {
    color: #fff;
  }

  :deep(.n-breadcrumb-item__link),
  :deep(.n-breadcrumb-item__separator) {
    color: rgba(255, 255, 255, 0.85) !important;
  }

  // 顶部菜单模式下的 logo 文字颜色
  .header-logo .logo-text {
    color: #fff;
  }
}

.header-left {
  display: flex;
  align-items: center;
  width: 220px;
  flex-shrink: 0;
}

.header-left-empty {
  width: 0;
}

.header-brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  height: 44px;
  padding: 0 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #111827;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;

  &:hover {
    background: #F3F4F6;
  }
}

.header-brand-img,
.header-brand-icon {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
}

.header-brand-img {
  object-fit: contain;
  border-radius: 8px;
}

.header-brand-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: #111827;
  color: #fff;
  font-size: 18px;
  font-weight: 700;
}

.header-brand-text {
  font-size: 18px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
}

body.dark-theme .header-brand {
  color: #ffffffd1;

  &:hover {
    background: #3f3f46;
  }
}

body.dark-theme .header-brand-icon {
  background: #27272a;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 320px;
  min-width: 0;
  flex-shrink: 0;
  justify-content: flex-end;
}

.header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #F3F4F6;
  }
}

body.dark-theme .header-icon {
  &:hover {
    background: #3f3f46;
  }
}

.message-popover {
  margin: -12px;
}

.message-tabs {
  padding: 0 12px;
  border-bottom: 1px solid #e8e8e8;
}

.tab-text {
  display: inline-block;
  padding-top: 4px;
}

.message-list {
  max-height: 300px;
  overflow-y: auto;
  padding: 8px 0;
}

.message-list .message-item {
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: #f5f5f5;
  }
}

.message-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.message-item-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.message-item-content {
  flex: 1;
  min-width: 0;
}

.message-sender {
  font-size: 13px;
  font-weight: 500;
  color: #333;
}

.message-time {
  font-size: 11px;
  color: #999;
}

.message-list .message-title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.message-list .message-content {
  font-size: 12px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.5;
}

.message-loading {
  padding: 12px;
  text-align: center;
}

.message-no-more {
  padding: 12px;
  text-align: center;
  font-size: 12px;
  color: #999;
}

.message-footer {
  padding: 12px 16px;
  text-align: center;
  border-top: 1px solid #e8e8e8;
  display: flex;
  justify-content: center;
  gap: 16px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 8px;
  transition: background 0.2s;

  &:hover {
    background: #F3F4F6;
  }
}

body.dark-theme .user-info {
  &:hover {
    background: #3f3f46;
  }
}

.user-menu-cascade {
  display: flex;
  flex-direction: row-reverse;
  align-items: flex-start;
  gap: 8px;
}

:global(.user-menu-popover) {
  padding: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}

:global(.user-menu-popover-shell.n-popover) {
  background: transparent !important;
  box-shadow: none !important;
}

.user-menu-panel {
  width: 148px;
  padding: 4px;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
}

body.dark-theme .user-menu-panel {
  background: #27272a;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.32);
}

.user-menu-panel--submenu {
  width: 148px;
}

.user-menu-item {
  width: 100%;
  height: 38px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #1f2937;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s, color 0.2s;

  &:hover {
    background: #f3f4f6;
  }

  .n-icon {
    flex-shrink: 0;
  }
}

body.dark-theme .user-menu-item {
  color: #ffffffd1;

  &:hover {
    background: #3f3f46;
  }
}

.user-menu-item--active {
  background: #e5e7eb;
  color: #111827;
}

body.dark-theme .user-menu-item--active {
  background: #3f3f46;
  color: #ffffff;
}

.user-menu-item--submenu {
  cursor: pointer;
}

.user-menu-arrow {
  margin-left: auto;
}

.user-menu-divider {
  height: 1px;
  margin: 4px 0;
  background: #e5e7eb;
}

body.dark-theme .user-menu-divider {
  background: #3f3f46;
}

.user-name {
  font-size: 14px;
  color: #1F2937;
  font-weight: 500;
}

body.dark-theme .user-name {
  color: #ffffffd1;
}

@media (max-width: 720px) {
  .layout-header {
    padding: 0 12px;
    gap: 8px;
  }

  .header-left {
    width: auto;
    min-width: 0;
  }

  .header-left-empty {
    display: none;
  }

  .header-brand {
    gap: 8px;
    padding: 0 4px;
  }

  .header-right {
    width: auto;
    gap: 6px;
    flex: 0 1 auto;
  }

  .user-info {
    gap: 6px;
    padding: 6px;
  }

  .user-name,
  .user-info .n-icon {
    display: none;
  }
}

@media (max-width: 520px) {
  .header-brand-text {
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

// 头部固定
.layout-header {
  position: sticky;
  top: 0;
  z-index: 100;
}

// 页签栏固定（紧跟在头部下方）
:deep(.tab-bar) {
  position: sticky;
  top: 60px; // header高度
  z-index: 99;
}

.layout-content {
  background: #F3F4F6;
  transition: background-color 0.3s;

  :deep(.n-layout-scroll-container) {
    -webkit-overflow-scrolling: touch;
    touch-action: pan-y;
  }
}

body.dark-theme .layout-content {
  background: #101014;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 主题设置面板 */
.theme-panel {
  margin: -12px;
  padding: 16px;
}

.theme-section {
  margin-bottom: 20px;

  &:last-child {
    margin-bottom: 0;
  }
}

.theme-title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 12px;
}

body.dark-theme .theme-title {
  color: #ffffffd1;
}

.layout-options {
  display: flex;
  gap: 12px;
}

.layout-option {
  flex: 1;
  text-align: center;
  cursor: pointer;

  span {
    display: block;
    font-size: 12px;
    color: #666;
    margin-top: 8px;
  }

  &.active span {
    color: #18a058;
  }
}

.layout-preview {
  height: 48px;
  border: 2px solid #e8e8e8;
  border-radius: 4px;
  display: flex;
  overflow: hidden;

  .layout-option.active & {
    border-color: #60a5fa;
  }
}

body.dark-theme .layout-preview {
  border-color: #3f3f46;
  
  .layout-option.active & {
    border-color: #60a5fa;
  }
}

.layout-left {
  .preview-sider {
    width: 30%;
    background: #001529;
  }
  .preview-main {
    flex: 1;
    background: #f5f5f5;
  }
}

.layout-right {
  .preview-main {
    flex: 1;
    background: #f5f5f5;
  }
  .preview-sider {
    width: 30%;
    background: #001529;
  }
}

.layout-top {
  flex-direction: column;

  .preview-header {
    height: 30%;
    background: #001529;
  }
  .preview-content {
    flex: 1;
    background: #f5f5f5;
  }
}

.theme-switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.theme-modes {
  display: flex;
  gap: 16px;
}

.color-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.color-option {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  border: 2px solid transparent;

  &:hover {
    transform: scale(1.1);
  }

  &.active {
    border-color: #fff;
    box-shadow: 0 0 0 2px currentColor;
  }

  :deep(.n-icon) {
    font-size: 14px;
  }
}

.theme-mode {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;

  span {
    font-size: 12px;
    color: #666;
    margin-top: 8px;
  }

  &.active span {
    color: #18a058;
    font-weight: 500;
  }
}

.theme-mode-preview {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #e8e8e8;
  transition: all 0.2s;

  .theme-mode:hover & {
    transform: scale(1.05);
  }

  .theme-mode.active & {
    border-color: #60a5fa;
  }
}

body.dark-theme .theme-mode-preview {
  border-color: #3f3f46;
  
  .theme-mode.active & {
    border-color: #60a5fa;
  }
}

body.dark-theme .theme-mode span {
  color: #ffffffa6;
}

body.dark-theme .theme-mode.active span {
  color: #60a5fa;
}

/* 右侧菜单样式 */
.sider-right {
  order: 1;
}

/* 顶部布局样式 */
.layout-top {
  flex-direction: column;

  .layout-header {
    flex-wrap: nowrap;
  }
}

.header-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-right: 24px;

  .logo-icon {
    width: 32px;
    height: 32px;
    background: linear-gradient(135deg, #111827 0%, #374151 100%);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #FFFFFF;
    font-size: 18px;
    font-weight: 700;
  }

  .logo-text {
    font-size: 18px;
    font-weight: 700;
    color: #111827;
    white-space: nowrap;
  }
}

.header-menu {
  flex: 1;
  overflow: hidden;

  :deep(.n-menu) {
    background: transparent;
  }
}

/* 主题风格 */
.theme-dark {
  background: #001529 !important;

  .logo-text {
    color: #fff;
  }

  :deep(.n-menu) {
    background: #001529;
    --n-item-text-color: rgba(255, 255, 255, 0.65);
    --n-item-text-color-hover: #fff;
    --n-item-text-color-active: #fff;
    --n-item-icon-color: rgba(255, 255, 255, 0.65);
    --n-item-icon-color-hover: #fff;
    --n-item-icon-color-active: #fff;
    --n-item-color-active: #18a058;
  }
}

.theme-light {
  background: #fff !important;
  border-right: 1px solid #e8e8e8;

  .logo-text {
    color: #333;
  }

  :deep(.n-menu) {
    background: #fff;
  }
}

// 暗色主题下的侧边栏样式覆盖
body.dark-theme .layout-sider {
  background: #18181c !important;
  border-right-color: #3f3f46 !important;
}

body.dark-theme .theme-light {
  background: #18181c !important;
  border-right: 1px solid #3f3f46;

  .logo-text {
    color: #ffffffd1;
  }

  .logo-icon {
    background: linear-gradient(135deg, #3f3f46 0%, #52525b 100%);
    color: #fff;
  }

  :deep(.n-menu) {
    background: #18181c;
    --n-item-text-color: rgba(255, 255, 255, 0.65);
    --n-item-text-color-hover: #fff;
    --n-item-text-color-active: #fff;
    --n-item-icon-color: rgba(255, 255, 255, 0.65);
    --n-item-icon-color-hover: #fff;
    --n-item-icon-color-active: #fff;
    --n-item-color-hover: #27272a;
    --n-item-color-active: #27272a;
    --n-item-color-active-hover: #3f3f46;
    --n-arrow-color: rgba(255, 255, 255, 0.5);
    --n-arrow-color-hover: rgba(255, 255, 255, 0.8);
    --n-arrow-color-active: rgba(255, 255, 255, 0.8);
  }
}

body.dark-theme .theme-dark {
  background: #101014 !important;

  :deep(.n-menu) {
    background: #101014;
  }
}

</style>
