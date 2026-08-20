<template>
  <div class="page-container server-monitor-page">
    <n-spin :show="dashboardLoading">
      <n-alert v-if="errorText" class="status-alert" type="error" :show-icon="false">
        {{ errorText }}
      </n-alert>
      <n-alert v-else-if="dashboard?.stale" class="status-alert" type="warning" :show-icon="false">
        暂无实时采集数据，请确认服务器监控采集任务已启动。
      </n-alert>

      <div class="monitor-workspace">
        <n-card class="target-panel">
          <div class="target-panel__head">
            <div>
              <div class="target-panel__title">监控目标</div>
              <div class="target-panel__count">{{ targets.length }} 台</div>
            </div>
            <n-button size="small" secondary @click="openAddMonitor">
              <template #icon><n-icon><AddCircleOutline /></n-icon></template>
              添加
            </n-button>
          </div>
          <n-spin :show="targetsLoading">
            <div class="target-list">
              <div
                v-for="target in targets"
                :key="target.targetKey"
                class="monitor-target-card"
                role="button"
                tabindex="0"
                :class="[targetCardClass(target), { 'monitor-target-card--selected': target.targetKey === selectedTargetKey }]"
                @click="selectTarget(target.targetKey)"
                @keyup.enter="selectTarget(target.targetKey)"
              >
                <div class="monitor-target-card__top">
                  <div class="monitor-target-card__icon" :class="{ 'monitor-target-card__icon--local': target.targetType === 'local' }">
                    <n-icon size="22">
                      <DesktopOutline v-if="target.targetType === 'local'" />
                      <ServerOutline v-else />
                    </n-icon>
                  </div>
                  <div class="monitor-target-card__main">
                    <div class="monitor-target-card__name">{{ target.name }}</div>
                    <div class="monitor-target-card__address">{{ targetSubtitle(target) }}</div>
                  </div>
                  <n-tag
                    :type="targetTagType(target)"
                    size="small"
                    class="monitor-target-card__status"
                    @click.stop="selectTarget(target.targetKey)"
                  >
                    {{ targetStatusText(target) }}
                  </n-tag>
                </div>
                <div class="monitor-target-card__stats" v-if="target.targetType === 'local'">
                  <div><span>CPU</span><strong>{{ formatPercent(target.summary?.cpuPercent) }}</strong></div>
                  <div><span>内存</span><strong>{{ formatPercent(target.summary?.memoryPercent) }}</strong></div>
                </div>
                <div class="monitor-target-card__disabled" v-else-if="isTargetDisabled(target)">
                  请在服务器管理启用
                </div>
                <div class="monitor-target-card__stats" v-else>
                  <div><span>用户</span><strong>{{ target.username || '-' }}</strong></div>
                  <div><span>采集</span><strong>{{ formatCompactTime(target.lastCollectTime) }}</strong></div>
                </div>
                <span
                  v-if="target.targetType !== 'local'"
                  class="remove-monitor"
                  @click.stop="removeMonitorTarget(target)"
                >
                  移除监控
                </span>
              </div>
            </div>
          </n-spin>
        </n-card>

        <div class="monitor-main">
          <n-card class="server-overview-card">
            <div class="server-overview">
              <div
                class="server-overview__hero"
              >
                <div class="host-summary__main">
                  <div class="host-summary__icon" :class="{ 'host-summary__icon--local': isLocalTarget }">
                    <n-icon size="28">
                      <DesktopOutline v-if="isLocalTarget" />
                      <ServerOutline v-else />
                    </n-icon>
                  </div>
                  <div class="host-summary__body">
                    <div class="host-summary__title-row">
                      <div class="host-summary__title">{{ profile.displayName || dashboard?.target?.name || currentTarget?.name || '-' }}</div>
                      <n-tag :type="targetTagType(dashboard?.target || currentTarget || {})" size="small">
                        {{ targetStatusText(dashboard?.target || currentTarget || {}) }}
                      </n-tag>
                    </div>
                    <div class="host-summary__subtitle">
                      {{ profile.osName || currentTargetSubtitle }}
                      <span v-if="profile.osVersion">· {{ profile.osVersion }}</span>
                    </div>
                    <div class="host-summary__meta">
                      <span>主机 {{ profile.hostName || '-' }}</span>
                      <span>网卡 {{ profile.primaryNetwork || '-' }}</span>
                      <span>最近采集 {{ formatTime(profile.lastCollectTime) }}</span>
                      <span>{{ targets.length }} 台目标</span>
                    </div>
                  </div>
                  <div class="host-summary__actions">
                    <n-button size="small" type="primary" :loading="profileRefreshing || targetsLoading" @click.stop="refreshMonitor">
                      <template #icon><n-icon><RefreshOutline /></n-icon></template>
                      刷新
                    </n-button>
                    <n-button size="small" secondary @click.stop="showProfileDialog = true">
                      <template #icon><n-icon><EllipsisHorizontalOutline /></n-icon></template>
                      更多
                    </n-button>
                  </div>
                </div>
                <div class="host-summary__facts">
                  <div v-for="item in hostSummaryItems" :key="item.label" class="host-fact">
                    <span>{{ item.label }}</span>
                    <strong>{{ item.value }}</strong>
                  </div>
                </div>
              </div>
            </div>
          </n-card>

          <div class="overview-grid">
            <n-card v-for="metric in overviewMetrics" :key="metric.key" class="metric-card">
              <div class="metric-head">
                <n-icon size="22" :class="metric.className">
                  <component :is="metric.icon" />
                </n-icon>
                <span>{{ metric.label }}</span>
              </div>
              <div class="metric-value">{{ metric.value }}</div>
              <n-progress
                v-if="metric.percent != null"
                type="line"
                :percentage="metric.percent"
                :show-indicator="false"
                :processing="metric.percent >= 80"
              />
              <div class="metric-extra">{{ metric.extra }}</div>
            </n-card>
          </div>

          <section class="trend-section">
            <div class="section-header trend-header">
              <span>实时趋势</span>
              <span class="muted">最近 {{ dashboard?.series?.length || 0 }} 个采样点</span>
            </div>
            <div class="chart-card-grid">
              <n-card class="chart-card chart-card--primary">
                <div ref="cpuChartRef" class="chart"></div>
              </n-card>
              <n-card class="chart-card">
                <div ref="memoryChartRef" class="chart"></div>
              </n-card>
              <n-card class="chart-card chart-card--wide">
                <div ref="networkChartRef" class="chart chart--network"></div>
              </n-card>
            </div>
          </section>
        </div>
      </div>

    </n-spin>

    <n-modal v-model:show="showProfileDialog" preset="card" title="服务器档案" class="profile-dialog" style="width: min(980px, 94vw)">
      <template #header-extra>
        <span class="muted">分组详情</span>
      </template>
      <n-tabs type="segment" animated class="profile-tabs">
        <n-tab-pane v-for="group in profileDetailGroups" :key="group.name" :name="group.name" :tab="group.tab">
          <div class="profile-group-grid">
            <section v-for="section in group.sections" :key="section.title" class="profile-section">
              <div class="profile-section__title">{{ section.title }}</div>
              <div class="detail-grid">
                <div v-for="item in section.items" :key="item.label" class="detail-item">
                  <span class="detail-label">{{ item.label }}</span>
                  <span class="detail-value" :title="item.value">{{ item.value }}</span>
                </div>
              </div>
            </section>
          </div>
          <div v-if="group.note" class="profile-dialog__note">
            {{ group.note }}
          </div>
        </n-tab-pane>
      </n-tabs>
    </n-modal>

    <n-modal v-model:show="showAddMonitorModal" preset="card" title="添加监控" style="width: 460px">
      <n-select
        v-model:value="selectedAddServerId"
        :options="availableServerOptions"
        :loading="availableServersLoading"
        clearable
        filterable
        placeholder="选择要加入监控的服务器"
      >
      </n-select>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showAddMonitorModal = false">取消</n-button>
          <n-button type="primary" :loading="addMonitorLoading" :disabled="!selectedAddServerId" @click="enableSelectedServer">
            添加
          </n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import {
  AddCircleOutline,
  AnalyticsOutline,
  DesktopOutline,
  EllipsisHorizontalOutline,
  HardwareChipOutline,
  RefreshOutline,
  ServerOutline,
  SpeedometerOutline
} from '@vicons/ionicons5'
import {
  serverMonitorApi,
  type ServerMonitorAvailableServer,
  type ServerMonitorDashboard,
  type ServerMonitorTarget
} from '@/api/monitor'
import { serverApi as serverManagerApi } from '@/api/server'

const route = useRoute()
const router = useRouter()
const message = useMessage()

const targets = ref<ServerMonitorTarget[]>([])
const availableServers = ref<ServerMonitorAvailableServer[]>([])
const serverStatusMap = ref<Map<number, number>>(new Map())
const selectedTargetKey = ref<string>((route.query.targetKey as string) || (route.query.serverId ? `server:${route.query.serverId}` : 'local'))
const selectedAddServerId = ref<number | null>(null)
const dashboard = ref<ServerMonitorDashboard | null>(null)
const targetsLoading = ref(false)
const availableServersLoading = ref(false)
const dashboardLoading = ref(false)
const profileRefreshing = ref(false)
const addMonitorLoading = ref(false)
const removingTargetKey = ref('')
const showProfileDialog = ref(false)
const showAddMonitorModal = ref(false)
const errorText = ref('')

const cpuChartRef = ref<HTMLElement | null>(null)
const memoryChartRef = ref<HTMLElement | null>(null)
const networkChartRef = ref<HTMLElement | null>(null)
const echartsModule = shallowRef<any>(null)
let cpuChart: any = null
let memoryChart: any = null
let networkChart: any = null
let timer: ReturnType<typeof setInterval> | null = null
let chartResizeObserver: ResizeObserver | null = null
let chartResizeFrame = 0

const profile = computed(() => dashboard.value?.profile || {})
const latest = computed(() => dashboard.value?.latest || {})
const summary = computed(() => dashboard.value?.summary || {})
const isLocalTarget = computed(() => dashboard.value?.target?.targetType === 'local')
const currentTarget = computed(() => targets.value.find((target) => target.targetKey === selectedTargetKey.value) || dashboard.value?.target || null)
const currentTargetSubtitle = computed(() => {
  if (!currentTarget.value) return '-'
  if (currentTarget.value.targetType === 'local') {
    return profile.value.osName || currentTarget.value.primaryAddress || '本机采集'
  }
  return currentTarget.value.entryIp || currentTarget.value.primaryAddress || currentTarget.value.primaryNetwork || '远程服务器'
})

const availableServerOptions = computed(() => availableServers.value.map((server) => ({
  label: `${server.name}${server.username ? ` · ${server.username}` : ''}`,
  value: server.id
})))

const overviewMetrics = computed(() => [
  {
    key: 'cpu',
    label: 'CPU使用率',
    value: formatPercent(summary.value.cpuPercent),
    percent: normalizePercent(summary.value.cpuPercent),
    extra: `负载 ${formatNumber(latest.value.cpu?.systemLoadAverage)} / 核心 ${firstPositive(latest.value.cpu?.availableProcessors, profile.value.cpuCores, profile.value.cpuThreads)}`,
    icon: HardwareChipOutline,
    className: 'icon-cpu'
  },
  {
    key: 'memory',
    label: '内存使用率',
    value: formatPercent(summary.value.memoryPercent),
    percent: normalizePercent(summary.value.memoryPercent),
    extra: `${latest.value.memory?.used || '-'} / ${latest.value.memory?.total || '-'}`,
    icon: AnalyticsOutline,
    className: 'icon-memory'
  },
  {
    key: 'disk',
    label: '磁盘最高使用率',
    value: formatPercent(summary.value.diskPercent),
    percent: normalizePercent(summary.value.diskPercent),
    extra: findMaxDiskText(),
    icon: ServerOutline,
    className: 'icon-disk'
  },
  {
    key: 'network',
    label: '网络流量',
    value: `${formatBytesPerSecond(summary.value.rxRate)} / ${formatBytesPerSecond(summary.value.txRate)}`,
    percent: null,
    extra: `主网卡 ${summary.value.primaryNetwork || profile.value.primaryNetwork || '-'}`,
    icon: SpeedometerOutline,
    className: 'icon-network'
  }
])

const hostSummaryItems = computed(() => [
  { label: 'CPU', value: formatCpuSummary(profile.value.cpuCores, profile.value.cpuThreads) },
  { label: '内存', value: valueOrDash(profile.value.memoryTotal) },
  { label: '磁盘', value: formatDiskSummary(profile.value.diskTotal, profile.value.diskCount) },
  { label: '运行时长', value: valueOrDash(profile.value.uptime) },
  { label: '虚拟化', value: valueOrDash(profile.value.virtualization) },
  { label: '包管理器', value: valueOrDash(profile.value.packageManager) }
])

const profileDetailGroups = computed(() => {
  const groups = [
    {
      name: 'basic-system',
      tab: '概览 / 系统',
      sections: [
        {
          title: '概览',
          items: [
            { label: '展示名称', value: valueOrDash(profile.value.displayName || dashboard.value?.target?.name) },
            { label: '主机名称', value: valueOrDash(profile.value.hostName) },
            { label: '入口IP', value: valueOrDash(profile.value.entryIp) },
            { label: '主网卡', value: valueOrDash(profile.value.primaryNetwork) },
            { label: '主地址', value: valueOrDash(profile.value.primaryAddress) }
          ]
        },
        {
          title: '系统',
          items: [
            { label: '操作系统', value: valueOrDash(profile.value.osName) },
            { label: '系统版本', value: valueOrDash(profile.value.osVersion) },
            { label: '内核名称', value: valueOrDash(profile.value.kernelName) },
            { label: '内核版本', value: valueOrDash(profile.value.kernelVersion) },
            { label: '系统架构', value: valueOrDash(profile.value.arch) },
            { label: '时区', value: valueOrDash(profile.value.timezone) }
          ]
        }
      ]
    },
    {
      name: 'hardware-storage',
      tab: '硬件 / 存储',
      sections: [
        {
          title: '硬件',
          items: [
            { label: 'CPU核心', value: valueOrDash(profile.value.cpuCores) },
            { label: 'CPU线程', value: valueOrDash(profile.value.cpuThreads) },
            { label: 'CPU厂商', value: valueOrDash(profile.value.cpuVendor) },
            { label: 'CPU型号', value: valueOrDash(profile.value.cpuModel) },
            { label: '内存总量', value: valueOrDash(profile.value.memoryTotal) },
            { label: 'Swap总量', value: valueOrDash(profile.value.swapTotal) }
          ]
        },
        {
          title: '存储',
          items: [
            { label: '根分区容量', value: valueOrDash(profile.value.rootDiskTotal) },
            { label: '磁盘总量', value: valueOrDash(profile.value.diskTotal) },
            { label: '磁盘数量', value: valueOrDash(profile.value.diskCount) }
          ]
        }
      ]
    },
    {
      name: 'runtime',
      tab: '运行环境',
      sections: [
        {
          title: '运行环境',
          items: [
            { label: '虚拟化', value: valueOrDash(profile.value.virtualization) },
            { label: '包管理器', value: valueOrDash(profile.value.packageManager) },
            { label: '启动时间', value: valueOrDash(profile.value.bootTime) },
            { label: '运行时长', value: valueOrDash(profile.value.uptime) },
            { label: '最后采集', value: formatTime(profile.value.lastCollectTime) }
          ]
        }
      ]
    }
  ]

  if (isLocalTarget.value) {
    groups.push({
      name: 'jvm',
      tab: 'JVM',
      sections: [
        {
          title: 'JVM',
          items: [
            { label: 'JVM名称', value: valueOrDash(latest.value.jvm?.name) },
            { label: 'JVM版本', value: valueOrDash(latest.value.jvm?.version) },
            { label: '启动时间', value: valueOrDash(latest.value.jvm?.startTime) },
            { label: '运行时长', value: valueOrDash(latest.value.jvm?.uptime) },
            { label: '堆内存', value: formatJvmHeap.value }
          ]
        }
      ]
    })
  }

  return groups
})

const formatJvmHeap = computed(() => {
  const jvm = latest.value.jvm
  return jvm?.heapUsed && jvm?.heapMax ? `${jvm.heapUsed} / ${jvm.heapMax}` : '-'
})

async function loadTargets() {
  targetsLoading.value = true
  try {
    const [targetList] = await Promise.all([
      serverMonitorApi.targets(),
      loadServerStatusMap()
    ])
    targets.value = decorateTargets(targetList)
    if (!targets.value.some((target) => target.targetKey === selectedTargetKey.value && !isTargetDisabled(target))) {
      selectedTargetKey.value = targets.value.find((target) => !isTargetDisabled(target))?.targetKey || 'local'
    }
    await loadDashboard()
  } catch {
    errorText.value = '监控目标加载失败'
  } finally {
    targetsLoading.value = false
  }
}

async function refreshTargetsOnly() {
  try {
    const [targetList] = await Promise.all([
      serverMonitorApi.targets(),
      loadServerStatusMap()
    ])
    targets.value = decorateTargets(targetList)
    applyDashboardServerStatus()
  } catch {
    // 保留现有目标卡片，避免短暂接口失败造成页面跳动
  }
}

async function loadServerStatusMap() {
  try {
    const res = await serverManagerApi.list({ page: 1, pageSize: 100 })
    serverStatusMap.value = new Map(
      (res.records || [])
        .filter((server) => typeof server.id === 'number')
        .map((server) => [server.id!, server.status])
    )
  } catch {
    serverStatusMap.value = new Map()
  }
}

function decorateTargets(targetList: ServerMonitorTarget[]) {
  return targetList.map(decorateTarget)
}

function decorateTarget(target: ServerMonitorTarget) {
  if (target.targetType !== 'ssh' || typeof target.serverId !== 'number') {
    return target
  }
  const status = serverStatusMap.value.get(target.serverId)
  if (status === undefined) {
    return target
  }
  return {
    ...target,
    serverStatus: status,
    status: status === 1 ? target.status : 'disabled'
  }
}

function applyDashboardServerStatus() {
  if (!dashboard.value?.target) return
  dashboard.value = {
    ...dashboard.value,
    target: decorateTarget(dashboard.value.target)
  }
}

async function loadAvailableServers() {
  availableServersLoading.value = true
  try {
    availableServers.value = await serverMonitorApi.availableServers()
  } catch {
    message.error('可添加服务器加载失败')
  } finally {
    availableServersLoading.value = false
  }
}

async function loadDashboard(silent = false) {
  if (!selectedTargetKey.value) return
  if (!silent) dashboardLoading.value = true
  errorText.value = ''
  try {
    dashboard.value = await serverMonitorApi.dashboard(selectedTargetKey.value)
    applyDashboardServerStatus()
    await nextTick()
    renderCharts()
  } catch {
    dashboard.value = null
    errorText.value = '监控数据加载失败'
  } finally {
    if (!silent) dashboardLoading.value = false
  }
}

async function refreshProfile() {
  if (!selectedTargetKey.value) return
  profileRefreshing.value = true
  try {
    dashboard.value = await serverMonitorApi.refreshProfile(selectedTargetKey.value)
    applyDashboardServerStatus()
    message.success('服务器档案已刷新')
    await loadTargets()
  } catch {
    errorText.value = '服务器档案刷新失败'
  } finally {
    profileRefreshing.value = false
  }
}

async function refreshMonitor() {
  if (!selectedTargetKey.value) return
  profileRefreshing.value = true
  targetsLoading.value = true
  errorText.value = ''
  try {
    const [targetList] = await Promise.all([
      serverMonitorApi.targets(),
      loadServerStatusMap()
    ])
    targets.value = decorateTargets(targetList)
    if (!targets.value.some((target) => target.targetKey === selectedTargetKey.value && !isTargetDisabled(target))) {
      selectedTargetKey.value = targets.value.find((target) => !isTargetDisabled(target))?.targetKey || 'local'
      router.replace({ path: route.path, query: { targetKey: selectedTargetKey.value } })
    }
    dashboard.value = await serverMonitorApi.refreshProfile(selectedTargetKey.value)
    applyDashboardServerStatus()
    await nextTick()
    renderCharts()
    message.success('监控数据已刷新')
  } catch {
    errorText.value = '监控数据刷新失败'
  } finally {
    profileRefreshing.value = false
    targetsLoading.value = false
  }
}

function selectTarget(targetKey: string) {
  if (selectedTargetKey.value === targetKey) return
  const target = targets.value.find((item) => item.targetKey === targetKey)
  if (target && isTargetDisabled(target)) {
    message.warning('该服务器已禁用，请在服务器管理启用')
    return
  }
  selectedTargetKey.value = targetKey
  router.replace({ path: route.path, query: { targetKey: selectedTargetKey.value } })
  loadDashboard()
}

async function openAddMonitor() {
  selectedAddServerId.value = null
  await loadAvailableServers()
  if (availableServers.value.length === 0) {
    message.info('暂无可添加服务器')
    return
  }
  showAddMonitorModal.value = true
}

async function enableSelectedServer() {
  if (!selectedAddServerId.value) return
  addMonitorLoading.value = true
  try {
    const dashboardData = await serverMonitorApi.enableServer(selectedAddServerId.value)
    dashboard.value = dashboardData
    selectedTargetKey.value = dashboardData.target?.targetKey || selectedTargetKey.value
    router.replace({ path: route.path, query: { targetKey: selectedTargetKey.value } })
    showAddMonitorModal.value = false
    message.success('已加入监控')
    await loadTargets()
  } catch {
    message.error('添加监控失败')
  } finally {
    addMonitorLoading.value = false
  }
}

async function removeMonitorTarget(target: ServerMonitorTarget) {
  if (target.targetType === 'local' || removingTargetKey.value) return
  removingTargetKey.value = target.targetKey
  try {
    await serverMonitorApi.removeTarget(target.targetKey)
    message.success('已移除监控')
    targets.value = targets.value.filter((item) => item.targetKey !== target.targetKey)
    if (selectedTargetKey.value === target.targetKey) {
      selectedTargetKey.value = targets.value.find((item) => item.targetKey === 'local')?.targetKey
        || targets.value[0]?.targetKey
        || 'local'
      router.replace({ path: route.path, query: { targetKey: selectedTargetKey.value } })
    }
    await loadTargets()
    await loadAvailableServers()
  } catch {
    message.error('移除监控失败')
  } finally {
    removingTargetKey.value = ''
  }
}

function targetSubtitle(target: ServerMonitorTarget) {
  if (target.targetType === 'local') {
    return profileForTarget(target, 'osName') || target.primaryAddress || '本机采集'
  }
  return target.entryIp || target.primaryAddress || target.primaryNetwork || '远程服务器'
}

function targetStatusText(target: Partial<ServerMonitorTarget>) {
  if (isTargetDisabled(target)) return '禁用'
  const status = target.status || target.summary?.status
  if (status === 'normal' || status === 'online') return '在线'
  if (status === 'error' || status === 'offline') return '异常'
  return '待采集'
}

function targetTagType(target: Partial<ServerMonitorTarget>) {
  if (isTargetDisabled(target)) return 'error'
  const status = target.status || target.summary?.status
  if (status === 'normal' || status === 'online') return 'success'
  if (status === 'error' || status === 'offline') return 'error'
  return 'default'
}

function targetCardClass(target: Partial<ServerMonitorTarget>) {
  if (isTargetDisabled(target)) return 'monitor-target-card--disabled'
  const status = target.status || target.summary?.status
  if (status === 'normal' || status === 'online') return 'monitor-target-card--normal'
  if (status === 'error' || status === 'offline') return 'monitor-target-card--error'
  return 'monitor-target-card--pending'
}

function isTargetDisabled(target: Partial<ServerMonitorTarget>) {
  return target.targetType === 'ssh' && (target.serverStatus === 0 || target.status === 'disabled')
}

function profileForTarget(target: ServerMonitorTarget, key: string) {
  if (target.targetKey !== selectedTargetKey.value) return ''
  return (profile.value as Record<string, any>)[key]
}

function renderCharts() {
  if (!echartsModule.value || !cpuChartRef.value || !memoryChartRef.value || !networkChartRef.value) {
    return
  }
  if (!cpuChart) cpuChart = echartsModule.value.init(cpuChartRef.value)
  if (!memoryChart) memoryChart = echartsModule.value.init(memoryChartRef.value)
  if (!networkChart) networkChart = echartsModule.value.init(networkChartRef.value)

  const series = dashboard.value?.series || []
  const labels = series.map((item) => item.time)
  const cpuData = series.map((item) => Number(item.cpuPercent || 0))
  const memoryData = series.map((item) => Number(item.memoryPercent || 0))
  const rxData = series.map((item) => Number(item.rxRate || 0))
  const txData = series.map((item) => Number(item.txRate || 0))

  cpuChart.setOption(buildPercentChart('CPU使用率', labels, cpuData, '#2f6bff'))
  memoryChart.setOption(buildPercentChart('内存使用率', labels, memoryData, '#18a058'))
  networkChart.setOption({
    title: { text: '网络流量', left: 'center', top: 6, textStyle: { fontSize: 15, fontWeight: 600 } },
    tooltip: { trigger: 'axis', valueFormatter: (value: number) => formatBytesPerSecond(value) },
    legend: { top: 38, itemGap: 20, data: ['下载', '上传'] },
    grid: { top: 84, left: 58, right: 24, bottom: 34 },
    xAxis: { type: 'category', data: labels, boundaryGap: false },
    yAxis: { type: 'value', axisLabel: { formatter: (value: number) => formatBytesPerSecond(value).replace('/s', '') } },
    series: [
      { name: '下载', data: rxData, type: 'line', smooth: true, areaStyle: { opacity: 0.12 } },
      { name: '上传', data: txData, type: 'line', smooth: true }
    ]
  })
  resizeCharts()
}

function resizeCharts() {
  if (chartResizeFrame) {
    cancelAnimationFrame(chartResizeFrame)
  }
  chartResizeFrame = requestAnimationFrame(() => {
    cpuChart?.resize()
    memoryChart?.resize()
    networkChart?.resize()
    chartResizeFrame = 0
  })
}

function observeChartContainers() {
  chartResizeObserver?.disconnect()
  if (typeof ResizeObserver === 'undefined') return

  chartResizeObserver = new ResizeObserver(resizeCharts)
  ;[cpuChartRef.value, memoryChartRef.value, networkChartRef.value]
    .filter((item): item is HTMLElement => !!item)
    .forEach((item) => chartResizeObserver?.observe(item))
}

function handleViewportResize() {
  resizeCharts()
}

function buildPercentChart(title: string, labels: string[], data: number[], color: string) {
  return {
    title: { text: `${title} ${formatPercent(data[data.length - 1] || 0)}`, left: 'center', top: 8, textStyle: { fontSize: 15, fontWeight: 600 } },
    tooltip: { trigger: 'axis', valueFormatter: (value: number) => formatPercent(value) },
    grid: { top: 64, left: 42, right: 20, bottom: 34 },
    xAxis: { type: 'category', data: labels, boundaryGap: false },
    yAxis: { type: 'value', min: 0, max: 100, axisLabel: { formatter: '{value}%' } },
    series: [{ data, type: 'line', smooth: true, areaStyle: { opacity: 0.12 }, itemStyle: { color } }]
  }
}

function findMaxDiskText() {
  const disks = latest.value.disks || []
  if (disks.length === 0) return '暂无磁盘数据'
  const disk = disks.reduce((best: any, item: any) => (
    normalizePercent(item.usedPercent) > normalizePercent(best.usedPercent) ? item : best
  ), disks[0])
  return `${disk.path || '-'} · ${disk.used || '-'} / ${disk.total || '-'}`
}

function normalizePercent(value: unknown) {
  const percent = Number(value || 0)
  if (!Number.isFinite(percent)) return 0
  return Math.max(0, Math.min(Number(percent.toFixed(2)), 100))
}

function formatPercent(value: unknown) {
  return `${normalizePercent(value).toFixed(2)}%`
}

function formatNumber(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) ? number.toFixed(2) : '-'
}

function firstPositive(...values: unknown[]) {
  for (const value of values) {
    const number = Number(value)
    if (Number.isFinite(number) && number > 0) return number
  }
  return '-'
}

function valueOrDash(value: unknown) {
  if (value === undefined || value === null || value === '') return '-'
  return String(value)
}

function formatCpuSummary(cores: unknown, threads: unknown) {
  if (cores === undefined && threads === undefined) return '-'
  return `${valueOrDash(cores)} 核 / ${valueOrDash(threads)} 线程`
}

function formatDiskSummary(total: unknown, count: unknown) {
  if (!total && count === undefined) return '-'
  return `${valueOrDash(total)} · ${valueOrDash(count)} 块`
}

function formatTime(value?: string) {
  if (!value) return '-'
  return new Date(value).toLocaleString('zh-CN')
}

function formatCompactTime(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatBytesPerSecond(value: unknown) {
  const bytes = Number(value || 0)
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B/s'
  if (bytes < 1024) return `${bytes.toFixed(0)} B/s`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(2)} KB/s`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(2)} MB/s`
  return `${(bytes / 1024 ** 3).toFixed(2)} GB/s`
}

watch(() => dashboard.value?.series, () => nextTick(renderCharts), { deep: true })

onMounted(async () => {
  echartsModule.value = await import('echarts')
  await loadTargets()
  await nextTick()
  observeChartContainers()
  timer = setInterval(() => {
    loadDashboard(true)
    refreshTargetsOnly()
  }, 5000)
  window.addEventListener('resize', handleViewportResize)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
  if (chartResizeFrame) cancelAnimationFrame(chartResizeFrame)
  chartResizeObserver?.disconnect()
  window.removeEventListener('resize', handleViewportResize)
  cpuChart?.dispose()
  memoryChart?.dispose()
  networkChart?.dispose()
})
</script>

<style lang="scss" scoped>
.server-monitor-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 100%;
  min-width: 0;
  overflow-x: hidden;
}

.toolbar-card :deep(.n-card__content) {
  padding: 16px 20px;
}

.toolbar,
.toolbar-actions,
.section-header,
.metric-head,
.host-summary__main {
  display: flex;
  align-items: center;
}

.toolbar {
  justify-content: space-between;
  gap: 16px;
}

.toolbar-actions {
  gap: 10px;
  flex-wrap: wrap;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
}

.page-subtitle,
.muted,
.metric-extra {
  color: var(--n-text-color-3);
}

.page-subtitle {
  margin-top: 4px;
  font-size: 13px;
}

.status-alert {
  margin-bottom: 14px;
}

.monitor-workspace {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  align-items: start;
  gap: 14px;
  min-width: 0;
}

.monitor-main,
.server-overview-card,
.target-panel {
  min-width: 0;
}

.monitor-main {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.server-overview-card :deep(.n-card__content) {
  padding: 0;
}

.target-panel {
  position: sticky;
  top: 14px;
}

.target-panel :deep(.n-card__content) {
  padding: 14px;
}

.target-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.target-panel__title {
  color: #0f172a;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.35;
}

.target-panel__count {
  margin-top: 2px;
  color: #64748b;
  font-size: 12px;
}

.target-list {
  display: grid;
  gap: 8px;
  max-height: calc(100dvh - 190px);
  overflow-y: auto;
  padding-right: 3px;
}

.server-overview {
  display: block;
  min-width: 0;
}

.server-overview__hero {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
  padding: 22px;
  transition: background .18s ease;
}

.server-overview__detail {
  min-width: 0;
  padding: 18px 22px 20px;
}

.server-overview__detail-head {
  margin-bottom: 8px;
}

.monitor-target-card {
  position: relative;
  width: 100%;
  min-height: 96px;
  overflow: hidden;
  padding: 12px 12px 10px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  cursor: pointer;
  transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease;
}

.monitor-target-card::before {
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  background: #cbd5e1;
  content: "";
}

.monitor-target-card--normal::before {
  background: #18a058;
}

.monitor-target-card--error::before {
  background: #d03050;
}

.monitor-target-card--pending::before {
  background: #94a3b8;
}

.monitor-target-card--disabled {
  color: #94a3b8;
  background: #f8fafc;
  cursor: not-allowed;
}

.monitor-target-card--disabled::before {
  background: #cbd5e1;
}

.monitor-target-card--disabled .monitor-target-card__icon {
  color: #64748b;
  background: #f1f5f9;
}

.monitor-target-card--disabled .monitor-target-card__name,
.monitor-target-card--disabled .monitor-target-card__stats strong {
  color: #64748b;
}

.monitor-target-card--disabled .monitor-target-card__address,
.monitor-target-card--disabled .monitor-target-card__stats div {
  color: #94a3b8;
}

.monitor-target-card:hover {
  transform: translateY(-1px);
  border-color: #94a3b8;
  box-shadow: 0 10px 24px rgba(15, 23, 42, .08);
}

.monitor-target-card--disabled:hover {
  transform: none;
  border-color: #e2e8f0;
  box-shadow: none;
}

.monitor-target-card--selected {
  border-color: #2563eb;
  background: #f8fbff;
  box-shadow: 0 0 0 1px rgba(37, 99, 235, .18);
}

.monitor-target-card--selected::after {
  position: absolute;
  right: -34px;
  top: -34px;
  width: 92px;
  height: 92px;
  border-radius: 999px;
  background: rgba(37, 99, 235, .08);
  content: "";
  pointer-events: none;
}

.monitor-target-card__top {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.monitor-target-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  border-radius: 8px;
  color: #0f766e;
  background: #ccfbf1;
}

.monitor-target-card__icon--local {
  color: #2563eb;
  background: #dbeafe;
}

.monitor-target-card__main {
  min-width: 0;
  flex: 1;
}

.monitor-target-card__name {
  overflow: hidden;
  color: #0f172a;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.monitor-target-card__address {
  margin-top: 4px;
  overflow: hidden;
  color: #64748b;
  font-size: 12px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.monitor-target-card__stats {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 6px;
  margin-top: 10px;
}

.monitor-target-card__stats div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #64748b;
  font-size: 13px;
}

.monitor-target-card__stats strong {
  overflow: hidden;
  color: #0f172a;
  font-weight: 700;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.monitor-target-card__disabled {
  position: relative;
  z-index: 1;
  margin-top: 10px;
  color: #94a3b8;
  font-size: 13px;
  line-height: 1.5;
}

.monitor-target-card__status {
  cursor: pointer;
}

.remove-monitor {
  display: inline-block;
  margin-top: 8px;
  color: #d03050;
  font-size: 12px;
  cursor: pointer;
}

.host-summary__main {
  align-items: flex-start;
  gap: 14px;
}

.host-summary__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 54px;
  flex: 0 0 54px;
  border-radius: 8px;
  color: #0f766e;
  background: #ccfbf1;
}

.host-summary__icon--local {
  color: #2563eb;
  background: #dbeafe;
}

.host-summary__body,
.host-summary__title-row {
  min-width: 0;
}

.host-summary__body {
  flex: 1;
}

.host-summary__actions {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
  justify-content: flex-end;
  margin-left: auto;
}

.host-summary__title-row {
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  gap: 8px;
}

.host-summary__title {
  overflow: hidden;
  color: #0f172a;
  font-size: 22px;
  font-weight: 800;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.host-summary__subtitle {
  margin-top: 8px;
  overflow: hidden;
  color: #475569;
  font-size: 14px;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.host-summary__meta {
  display: grid;
  gap: 8px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.4;
}

.host-summary__facts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.host-fact {
  min-width: 0;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
}

.host-fact span {
  display: block;
  color: #64748b;
  font-size: 12px;
  line-height: 1.35;
}

.host-fact strong {
  display: block;
  margin-top: 8px;
  overflow: hidden;
  color: #0f172a;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.metric-card :deep(.n-card__content) {
  min-height: 122px;
  padding: 14px;
}

.metric-head {
  gap: 8px;
  font-size: 13px;
  color: var(--n-text-color-2);
}

.metric-value {
  margin: 12px 0 10px;
  overflow: hidden;
  font-size: 24px;
  font-weight: 700;
  color: var(--n-title-text-color);
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.metric-extra {
  margin-top: 8px;
  overflow: hidden;
  font-size: 12px;
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.icon-cpu { color: #2f6bff; }
.icon-memory { color: #18a058; }
.icon-disk { color: #f0a020; }
.icon-network { color: #0e7a7a; }

.profile-dialog :deep(.n-card) {
  overflow: hidden;
  border-radius: 10px;
}

.profile-dialog :deep(.n-card-header) {
  padding: 20px 24px 14px;
  border-bottom: 1px solid #eef2f7;
}

.profile-dialog :deep(.n-card__content) {
  padding: 16px 24px 22px;
  background: #f8fafc;
}

.profile-tabs :deep(.n-tabs-nav) {
  margin-bottom: 14px;
}

.profile-tabs :deep(.n-tabs-tab) {
  min-width: 116px;
  justify-content: center;
}

.profile-group-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.profile-section {
  min-width: 0;
  padding: 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, .04);
}

.profile-section__title {
  margin-bottom: 12px;
  color: #0f172a;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.4;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.detail-item {
  display: grid;
  grid-template-columns: 86px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  min-width: 0;
  min-height: 38px;
  padding: 8px 10px;
  border: 1px solid #edf2f7;
  border-radius: 8px;
  background: #fbfdff;
}

.detail-label {
  color: #64748b;
  font-size: 13px;
  line-height: 1.4;
}

.detail-value {
  overflow: hidden;
  color: #1e293b;
  font-size: 14px;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-dialog__note {
  margin-top: 12px;
  color: #64748b;
  font-size: 12px;
}

.trend-section {
  min-width: 0;
  padding: 18px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, .08);
}

.trend-header {
  flex-wrap: wrap;
  margin-bottom: 12px;
  padding: 0 2px;
}

.chart-card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.chart-card--wide {
  grid-column: 1 / -1;
}

.chart-card {
  overflow: hidden;
  min-width: 0;
  border-color: #edf2f7;
  box-shadow: none;
}

.chart-card :deep(.n-card__content) {
  min-width: 0;
  overflow: hidden;
  padding: 14px;
}

.section-header {
  justify-content: space-between;
  gap: 12px;
}

.chart {
  max-width: 100%;
  width: 100%;
  height: 316px;
  min-width: 0;
}

.chart--network {
  height: 336px;
}

.chart :deep(canvas) {
  max-width: 100% !important;
}

.chart :deep(div) {
  max-width: 100% !important;
}

@media (max-width: 1440px) {
  .server-overview__hero {
    border-bottom: 0;
  }
}

@media (max-width: 1200px) {
  .monitor-workspace {
    grid-template-columns: 1fr;
  }

  .target-panel {
    position: static;
  }

  .target-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    max-height: none;
    overflow-y: visible;
  }

  .overview-grid,
  .detail-grid {
    grid-template-columns: 1fr;
  }

  .profile-group-grid {
    grid-template-columns: 1fr;
  }

  .host-summary__facts {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .chart-card-grid {
    grid-template-columns: 1fr;
  }

  .chart-card--wide {
    grid-column: auto;
  }
}

@media (max-width: 768px) {
  .toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .toolbar-actions,
  .toolbar-actions :deep(.n-button) {
    width: 100%;
  }

  .toolbar-actions :deep(.n-button) {
    flex: 1;
  }

  .overview-grid,
  .host-summary__facts,
  .detail-grid,
  .target-list,
  .chart-card-grid {
    grid-template-columns: 1fr;
  }

  .host-summary__main {
    flex-wrap: wrap;
  }

  .host-summary__actions {
    width: 100%;
    justify-content: flex-start;
    margin-left: 68px;
  }

  .chart-card :deep(.n-card__content) {
    padding: 10px;
  }

  .chart {
    height: 260px;
  }

  .chart--network {
    height: 280px;
  }
}
</style>
