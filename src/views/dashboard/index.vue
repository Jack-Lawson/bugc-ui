<template>
  <div class="page-container dashboard-page">
    <section class="dashboard-header">
      <div class="dashboard-title-block">
        <div class="dashboard-kicker">控制台</div>
        <h1 class="dashboard-title">功能导航台</h1>
        <p class="dashboard-subtitle">按系统能力快速进入管理、监控、文件、消息和工具模块。</p>
      </div>
      <div class="operator-panel">
        <n-avatar round :size="42" :src="userStore.avatar || undefined">
          {{ userInitial }}
        </n-avatar>
        <div class="operator-meta">
          <strong>{{ userStore.nickname || '管理员' }}</strong>
          <span>{{ currentDate }}</span>
        </div>
      </div>
    </section>

    <section v-if="featuredModules.length" class="quick-section">
      <div class="section-heading">
        <div>
          <h2>常用操作</h2>
          <span>优先进入高频维护页面</span>
        </div>
      </div>
      <div class="featured-grid">
        <button
          v-for="module in featuredModules"
          :key="module.path"
          class="featured-card"
          type="button"
          @click="go(module.path)"
        >
          <span class="module-icon module-icon--large" :style="moduleIconStyle">
            <n-icon size="26">
              <component :is="module.icon" />
            </n-icon>
          </span>
          <span class="featured-card__body">
            <strong>{{ module.name }}</strong>
            <span>{{ module.description }}</span>
          </span>
          <n-icon class="featured-card__arrow" size="18">
            <ChevronForwardOutline />
          </n-icon>
        </button>
      </div>
    </section>

    <section class="module-board">
      <div
        v-for="group in visibleGroups"
        :key="group.name"
        class="module-section"
      >
        <div class="section-heading">
          <div>
            <h2>{{ group.name }}</h2>
            <span>{{ group.description }}</span>
          </div>
          <span class="section-count">{{ group.items.length }} 项</span>
        </div>
        <div class="module-grid">
          <button
            v-for="module in group.items"
            :key="module.path"
            class="module-card"
            :class="{ 'module-card--primary': module.primary }"
            type="button"
            @click="go(module.path)"
          >
            <span class="module-icon" :style="moduleIconStyle">
              <n-icon size="22">
                <component :is="module.icon" />
              </n-icon>
            </span>
            <span class="module-card__content">
              <strong>{{ module.name }}</strong>
              <span>{{ module.description }}</span>
            </span>
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, markRaw, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  BookOutline,
  ChatbubbleOutline,
  ChevronForwardOutline,
  CloudOutline,
  CodeSlashOutline,
  DesktopOutline,
  FolderOutline,
  ImageOutline,
  MenuOutline,
  NotificationsOutline,
  PeopleCircleOutline,
  PeopleOutline,
  PersonOutline,
  PieChartOutline,
  ServerOutline,
  SettingsOutline,
  SpeedometerOutline,
  StatsChartOutline,
  TerminalOutline,
  TimerOutline,
  VideocamOutline
} from '@vicons/ionicons5'
import { useUserStore } from '@/stores/user'
import type { MenuInfo } from '@/api/auth'

interface DashboardModule {
  name: string
  path: string
  description: string
  icon: any
  color: string
  bgColor: string
  primary?: boolean
}

interface ModuleGroup {
  name: string
  description: string
  items: DashboardModule[]
}

const router = useRouter()
const userStore = useUserStore()
const currentDate = ref('')
const moduleIconStyle = {
  color: 'var(--dashboard-primary)',
  background: 'var(--dashboard-primary-soft)'
}

const userInitial = computed(() => (userStore.nickname || userStore.user?.username || 'U').charAt(0).toUpperCase())

const moduleGroups: ModuleGroup[] = [
  {
    name: '系统管理',
    description: '账号、角色、菜单和基础配置',
    items: [
      createModule('用户管理', '/system/user', '维护后台用户、角色关系和账号状态', PersonOutline, '#2563eb', '#dbeafe'),
      createModule('角色管理', '/system/role', '配置角色权限和授权范围', PeopleOutline, '#059669', '#d1fae5'),
      createModule('菜单管理', '/system/menu', '维护路由菜单和权限标识', MenuOutline, '#7c3aed', '#ede9fe'),
      createModule('字典管理', '/system/dict', '管理系统字典和枚举数据', BookOutline, '#b45309', '#fef3c7'),
      createModule('系统配置', '/system/config', '调整站点、登录和第三方配置', SettingsOutline, '#0f766e', '#ccfbf1')
    ]
  },
  {
    name: '文件管理',
    description: '文件资产、媒体资源和存储配置',
    items: [
      createModule('文件列表', '/system/file', '上传、预览、移动和管理文件', FolderOutline, '#2563eb', '#dbeafe', true),
      createModule('图片管理', '/system/image', '筛选和管理图片资源', ImageOutline, '#db2777', '#fce7f3'),
      createModule('视频管理', '/system/video', '维护视频文件和预览内容', VideocamOutline, '#9333ea', '#f3e8ff'),
      createModule('文件配置', '/system/file-config', '配置本地和对象存储策略', CloudOutline, '#0891b2', '#cffafe')
    ]
  },
  {
    name: '系统监控',
    description: '服务状态、任务、缓存和运行指标',
    items: [
      createModule('服务监控', '/monitor/server', '查看主机状态、资源使用和趋势', DesktopOutline, '#2563eb', '#dbeafe', true),
      createModule('服务器管理', '/monitor/server-manager', '维护服务器资产和连接状态', ServerOutline, '#0f766e', '#ccfbf1', true),
      createModule('缓存监控', '/monitor/cache', '查看 Redis 内存、连接和命中情况', SpeedometerOutline, '#d97706', '#fef3c7'),
      createModule('定时任务', '/monitor/job', '管理调度任务和执行日志', TimerOutline, '#dc2626', '#fee2e2'),
      createModule('SQL监控', '/monitor/druid', '查看数据库连接池和 SQL 指标', PieChartOutline, '#4f46e5', '#e0e7ff'),
      createModule('在线用户', '/monitor/online', '查看当前在线会话和登录状态', PeopleCircleOutline, '#16a34a', '#dcfce7')
    ]
  },
  {
    name: '消息中心',
    description: '通知发布和实时沟通',
    items: [
      createModule('系统通知', '/message/notice', '发布通知并跟踪触达结果', NotificationsOutline, '#ea580c', '#ffedd5'),
      createModule('即时聊天', '/message/chat', '处理用户私聊和群组消息', ChatbubbleOutline, '#0284c7', '#e0f2fe')
    ]
  },
  {
    name: '工具箱',
    description: '开发辅助和扩展入口',
    items: [
      createModule('代码生成', '/tool/gen', '基于表结构生成后端和前端代码', CodeSlashOutline, '#475569', '#f1f5f9'),
      createModule('个人服务', '/personal-service/manage', '维护自定义服务入口和内嵌页面', TerminalOutline, '#7c2d12', '#ffedd5'),
      createModule('路由器管理', '/server/router', '进入网络设备管理面板', StatsChartOutline, '#0e7490', '#cffafe')
    ]
  }
]

const allowedPaths = computed(() => {
  const paths = collectMenuPaths(userStore.menus)
  return paths.size > 0 ? paths : null
})

const visibleGroups = computed(() => moduleGroups
  .map(group => ({
    ...group,
    items: group.items.filter(item => canShow(item.path))
  }))
  .filter(group => group.items.length > 0)
)

const featuredModules = computed(() => visibleGroups.value
  .flatMap(group => group.items)
  .filter(item => item.primary)
  .slice(0, 4)
)

function createModule(
  name: string,
  path: string,
  description: string,
  icon: any,
  color: string,
  bgColor: string,
  primary = false
): DashboardModule {
  return {
    name,
    path,
    description,
    icon: markRaw(icon),
    color,
    bgColor,
    primary
  }
}

function canShow(path: string) {
  return !allowedPaths.value || allowedPaths.value.has(path)
}

function collectMenuPaths(menus: MenuInfo[] = [], result = new Set<string>()) {
  menus.forEach(menu => {
    const path = normalizePath(menu.path)
    if (path && menu.visible === 1 && menu.status === 1) {
      result.add(path)
    }
    if (menu.children?.length) {
      collectMenuPaths(menu.children, result)
    }
  })
  return result
}

function normalizePath(path?: string) {
  if (!path) return ''
  return path.startsWith('/') ? path : `/${path}`
}

function go(path: string) {
  router.push(path)
}

function updateDate() {
  currentDate.value = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  })
}

let timer: number

onMounted(() => {
  updateDate()
  timer = window.setInterval(updateDate, 60 * 1000)
})

onUnmounted(() => {
  clearInterval(timer)
})
</script>

<style lang="scss" scoped>
.dashboard-page {
  --dashboard-primary: var(--primary-color, #2E5CF6);
  --dashboard-primary-soft: color-mix(in srgb, var(--dashboard-primary) 10%, #ffffff);
  --dashboard-primary-soft-strong: color-mix(in srgb, var(--dashboard-primary) 14%, #ffffff);
  --dashboard-primary-border: color-mix(in srgb, var(--dashboard-primary) 28%, #e2e8f0);
  --dashboard-primary-hover-border: color-mix(in srgb, var(--dashboard-primary) 50%, #e2e8f0);
  --dashboard-primary-shadow: color-mix(in srgb, var(--dashboard-primary) 14%, transparent);
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 20px 22px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, .08);
}

.dashboard-title-block {
  min-width: 0;
}

.dashboard-kicker {
  color: var(--dashboard-primary);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
}

.dashboard-title {
  margin: 4px 0 6px;
  color: #0f172a;
  font-size: 24px;
  font-weight: 800;
  line-height: 1.25;
}

.dashboard-subtitle {
  margin: 0;
  color: #64748b;
  font-size: 14px;
  line-height: 1.5;
}

.operator-panel {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 0 0 auto;
  min-width: 220px;
  padding: 10px 12px;
  border: 1px solid #edf2f7;
  border-radius: 8px;
  background: #f8fafc;
}

.operator-meta {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.operator-meta strong {
  overflow: hidden;
  color: #0f172a;
  font-size: 14px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.operator-meta span {
  color: #64748b;
  font-size: 12px;
  line-height: 1.4;
}

.quick-section,
.module-section {
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, .08);
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.section-heading h2 {
  margin: 0;
  color: #0f172a;
  font-size: 16px;
  font-weight: 800;
  line-height: 1.35;
}

.section-heading span {
  display: block;
  margin-top: 2px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.45;
}

.section-count {
  flex: 0 0 auto;
  padding: 3px 8px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #475569 !important;
  font-weight: 600;
}

.featured-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.featured-card,
.module-card {
  width: 100%;
  min-width: 0;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  text-align: left;
  cursor: pointer;
  transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease;
}

.featured-card:hover,
.module-card:hover {
  transform: translateY(-1px);
  border-color: var(--dashboard-primary-hover-border);
  box-shadow: 0 10px 22px var(--dashboard-primary-shadow);
}

.featured-card {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 94px;
  padding: 14px;
}

.featured-card__body,
.module-card__content {
  display: grid;
  min-width: 0;
  gap: 5px;
}

.featured-card__body {
  flex: 1;
}

.featured-card__body strong,
.module-card__content strong {
  overflow: hidden;
  color: #0f172a;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.featured-card__body span,
.module-card__content span {
  display: -webkit-box;
  overflow: hidden;
  color: #64748b;
  font-size: 12px;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.featured-card__arrow {
  flex: 0 0 auto;
  color: #94a3b8;
}

.module-board {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.module-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.module-card {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  min-height: 86px;
  padding: 13px;
}

.module-card--primary {
  background: var(--dashboard-primary-soft);
  border-color: var(--dashboard-primary-border);
}

.module-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  border-radius: 8px;
}

.module-icon--large {
  width: 48px;
  height: 48px;
  flex-basis: 48px;
}

@media (max-width: 1280px) {
  .featured-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .module-board {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .dashboard-header {
    align-items: stretch;
    flex-direction: column;
    padding: 16px;
  }

  .dashboard-title {
    font-size: 22px;
  }

  .operator-panel {
    min-width: 0;
  }

  .featured-grid,
  .module-grid {
    grid-template-columns: 1fr;
  }

  .featured-card,
  .module-card {
    min-height: 0;
  }
}
</style>
