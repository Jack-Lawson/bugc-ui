<template>
  <div class="page-container">
    <n-card class="page-layout">
      <!-- 统计卡片 -->
      <div class="stats-section">
        <div class="stats-cards">
          <n-card class="stat-card" size="small" :bordered="false" content-style="background: transparent">
            <div class="stat-item">
              <span class="stat-value">{{ stats.totalCount }}</span>
              <span class="stat-label">请求总数</span>
            </div>
          </n-card>
          <n-card class="stat-card success" size="small" :bordered="false" content-style="background: transparent">
            <div class="stat-item">
              <span class="stat-value">{{ stats.successCount }}</span>
              <span class="stat-label">成功</span>
            </div>
          </n-card>
          <n-card class="stat-card fail" size="small" :bordered="false" content-style="background: transparent">
            <div class="stat-item">
              <span class="stat-value">{{ stats.failCount }}</span>
              <span class="stat-label">失败</span>
            </div>
          </n-card>
        </div>

        <n-grid :cols="isTouchLayout ? 1 : 2" :x-gap="16" :y-gap="12" class="stats-charts">
          <n-gi>
            <n-card title="请求方法分布" size="small" :bordered="false" content-style="background: transparent">
              <div ref="methodChartRef" class="chart-box"></div>
            </n-card>
          </n-gi>
          <n-gi>
            <n-card title="Top10 API 路径" size="small" :bordered="false" content-style="background: transparent">
              <div ref="pathChartRef" class="chart-box"></div>
            </n-card>
          </n-gi>
          <n-gi :span="isTouchLayout ? 1 : 2">
            <n-card title="每日请求趋势" size="small" :bordered="false" content-style="background: transparent">
              <div ref="lineChartRef" class="chart-box"></div>
            </n-card>
          </n-gi>
        </n-grid>
      </div>

      <!-- 筛选与表格 -->
      <div class="search-form">
        <n-form inline :model="searchForm" label-placement="left">
          <n-form-item label="API 路径">
            <n-input v-model:value="searchForm.apiPath" placeholder="请输入路径" clearable style="width: 200px" />
          </n-form-item>
          <n-form-item label="请求方法">
            <n-select v-model:value="searchForm.method" placeholder="请选择" :options="methodOptions" clearable style="width: 120px" />
          </n-form-item>
          <n-form-item label="状态">
            <n-select v-model:value="searchForm.success" placeholder="请选择" :options="successOptions" clearable style="width: 100px" />
          </n-form-item>
          <n-form-item label="日期范围">
            <n-date-picker v-model:value="dateRange" type="datetimerange" clearable />
          </n-form-item>
          <n-form-item>
            <n-space>
              <n-button type="primary" @click="handleSearch">
                <template #icon><n-icon><SearchOutline /></n-icon></template>
                搜索
              </n-button>
              <n-button @click="handleReset">
                <template #icon><n-icon><RefreshOutline /></n-icon></template>
                重置
              </n-button>
            </n-space>
          </n-form-item>
        </n-form>
      </div>

      <n-data-table
        v-if="!isTouchLayout"
        :columns="columns"
        :data="tableData"
        :loading="loading"
        :row-key="(row: ApiAccessLog) => row.id ?? `${row.apiPath || ''}-${row.startTime || ''}`"
      />
      <div v-else class="mobile-log-list">
        <n-spin :show="loading">
          <article v-for="row in tableData" :key="row.id ?? `${row.apiPath || ''}-${row.startTime || ''}`" class="mobile-log-item">
            <div class="mobile-log-item__main">
              <div class="mobile-log-item__title">
                <strong>{{ row.apiPath || '-' }}</strong>
                <n-tag :type="row.success === 1 ? 'success' : 'error'" size="small">
                  {{ row.success === 1 ? '成功' : '失败' }}
                </n-tag>
              </div>
              <div class="mobile-log-item__meta">
                <span>{{ row.method || '-' }}</span>
                <span>{{ row.statusCode || '-' }}</span>
                <span>{{ row.costTime ?? '-' }}ms</span>
              </div>
              <div class="mobile-log-item__meta">
                <span>用户 {{ row.userId || '-' }}</span>
                <span>{{ row.startTime || '-' }}</span>
              </div>
            </div>
          </article>
          <n-empty v-if="!tableData.length" description="暂无日志" />
        </n-spin>
      </div>

      <div class="pagination-container">
        <n-pagination
          v-model:page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :item-count="pagination.itemCount"
          :page-sizes="[10, 20, 50, 100]"
          :show-size-picker="!isTouchLayout"
          :show-quick-jumper="!isTouchLayout"
          @update:page="loadPage"
          @update:page-size="loadPage"
        >
          <template #prefix>共 {{ pagination.itemCount }} 条</template>
        </n-pagination>
      </div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { NCard, NGrid, NGi, NForm, NFormItem, NInput, NSelect, NDatePicker, NButton, NSpace, NIcon, NDataTable, NPagination, type DataTableColumns } from 'naive-ui'
import { SearchOutline, RefreshOutline } from '@vicons/ionicons5'
import { apiAccessApi, type ApiAccessLog, type ApiAccessStatistics } from '@/api/monitor'
import { useResponsive } from '@/composables/useResponsive'

const stats = reactive<ApiAccessStatistics>({
  totalCount: 0,
  successCount: 0,
  failCount: 0,
  dailyStats: {},
  topPaths: [],
  methodCount: {}
})
const { isTouchLayout } = useResponsive()

const methodChartRef = ref<HTMLElement | null>(null)
const pathChartRef = ref<HTMLElement | null>(null)
const lineChartRef = ref<HTMLElement | null>(null)
let methodChart: any = null
let pathChart: any = null
let lineChart: any = null

const searchForm = reactive({
  apiPath: '',
  method: null as string | null,
  success: null as number | null
})

const dateRange = ref<[number, number] | null>(null)
const tableData = ref<ApiAccessLog[]>([])
const loading = ref(false)
const pagination = reactive({ page: 1, pageSize: 20, itemCount: 0 })

const methodOptions = [
  { label: 'GET', value: 'GET' },
  { label: 'POST', value: 'POST' },
  { label: 'PUT', value: 'PUT' },
  { label: 'DELETE', value: 'DELETE' }
]

const successOptions = [
  { label: '成功', value: 1 },
  { label: '失败', value: 0 }
]

const columns: DataTableColumns<ApiAccessLog> = [
  { title: 'ID', key: 'id', width: 70 },
  { title: 'API 路径', key: 'apiPath', ellipsis: { tooltip: true }, minWidth: 200 },
  { title: '方法', key: 'method', width: 80 },
  { title: '状态码', key: 'statusCode', width: 90 },
  { title: '成功', key: 'success', width: 70, render: (row) => row.success === 1 ? '是' : '否' },
  { title: '耗时(ms)', key: 'costTime', width: 90 },
  { title: 'IP', key: 'ip', width: 120 },
  { title: '用户ID', key: 'userId', width: 90 },
  { title: '请求时间', key: 'startTime', width: 180 }
]

const startDate = computed(() => {
  const d = new Date()
  d.setDate(d.getDate() - 6)
  return d.toISOString().slice(0, 10)
})
const endDate = computed(() => new Date().toISOString().slice(0, 10))

async function loadStatistics() {
  try {
    const res = await apiAccessApi.statistics({ startDate: startDate.value, endDate: endDate.value })
    Object.assign(stats, res)
    updateCharts()
  } catch { /* ignore */ }
}

function updateCharts() {
  import('echarts').then((echarts) => {
    const compact = isTouchLayout.value
    if (methodChartRef.value && stats.methodCount) {
      if (!methodChart) methodChart = echarts.init(methodChartRef.value)
      const data = Object.entries(stats.methodCount).map(([name, value]) => ({ name, value }))
      methodChart.setOption({
        tooltip: { trigger: 'item' },
        legend: compact ? { bottom: 0, type: 'scroll' } : undefined,
        series: [{
          type: 'pie',
          radius: compact ? ['34%', '58%'] : '60%',
          center: compact ? ['50%', '42%'] : ['50%', '50%'],
          label: { formatter: '{b}', overflow: 'truncate' },
          data
        }]
      })
      methodChart.resize()
    }
    if (pathChartRef.value && stats.topPaths?.length) {
      if (!pathChart) pathChart = echarts.init(pathChartRef.value)
      const xData = stats.topPaths.map((p) => p.apiPath.length > 18 ? p.apiPath.slice(0, 15) + '...' : p.apiPath)
      const yData = stats.topPaths.map((p) => p.count)
      pathChart.setOption({
        tooltip: { trigger: 'axis' },
        grid: compact ? { left: 36, right: 12, top: 24, bottom: 70 } : { left: 80, right: 20, bottom: 60 },
        xAxis: { type: 'category', data: xData, axisLabel: { rotate: compact ? 45 : 30, fontSize: compact ? 10 : 12 } },
        yAxis: { type: 'value' },
        series: [{ type: 'bar', data: yData, itemStyle: { color: '#18a058' } }]
      })
      pathChart.resize()
    }
    if (lineChartRef.value && stats.dailyStats) {
      if (!lineChart) lineChart = echarts.init(lineChartRef.value)
      const keys = Object.keys(stats.dailyStats).sort()
      const totalData = keys.map((k) => stats.dailyStats[k]?.total ?? 0)
      const successData = keys.map((k) => stats.dailyStats[k]?.success ?? 0)
      const failData = keys.map((k) => stats.dailyStats[k]?.fail ?? 0)
      lineChart.setOption({
        tooltip: { trigger: 'axis' },
        legend: { data: ['总数', '成功', '失败'], bottom: compact ? 0 : undefined },
        grid: compact ? { left: 36, right: 12, top: 28, bottom: 58 } : undefined,
        xAxis: { type: 'category', data: keys, axisLabel: { fontSize: compact ? 10 : 12 } },
        yAxis: { type: 'value', axisLabel: { fontSize: compact ? 10 : 12 } },
        series: [
          { name: '总数', type: 'line', smooth: true, data: totalData, itemStyle: { color: '#18a058' } },
          { name: '成功', type: 'line', smooth: true, data: successData, itemStyle: { color: '#2080f0' } },
          { name: '失败', type: 'line', smooth: true, data: failData, itemStyle: { color: '#d03050' } }
        ]
      })
      lineChart.resize()
    }
  }).catch(() => {})
}

function resizeCharts() {
  methodChart?.resize()
  pathChart?.resize()
  lineChart?.resize()
}

async function loadPage() {
  loading.value = true
  try {
    const formatDt = (ms: number) => {
      const d = new Date(ms)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
    }
    const [startTime, endTime] = dateRange.value
      ? [formatDt(dateRange.value[0] as number), formatDt(dateRange.value[1] as number)]
      : [null, null]
    const res = await apiAccessApi.page({
      page: pagination.page,
      pageSize: pagination.pageSize,
      apiPath: searchForm.apiPath || undefined,
      method: searchForm.method || undefined,
      success: searchForm.success ?? undefined,
      startTime: startTime as any,
      endTime: endTime as any
    })
    tableData.value = res.list || []
    pagination.itemCount = res.total ?? 0
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  loadPage()
}

function handleReset() {
  searchForm.apiPath = ''
  searchForm.method = null
  searchForm.success = null
  dateRange.value = null
  pagination.page = 1
  loadPage()
}

let timer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  loadStatistics()
  loadPage()
  timer = setInterval(loadStatistics, 10000)
  window.addEventListener('resize', resizeCharts)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
  window.removeEventListener('resize', resizeCharts)
  methodChart?.dispose()
  pathChart?.dispose()
  lineChart?.dispose()
})
</script>

<style lang="scss" scoped>
.page-layout {
  .stats-section {
    margin-bottom: 20px;
  }
  .stats-cards {
    display: flex;
    gap: 16px;
    margin-bottom: 16px;
  }
  .stat-card {
    flex: 1;
    .stat-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
      .stat-value {
        font-size: 24px;
        font-weight: 700;
        color: #111827;
      }
      .stat-label {
        font-size: 13px;
        color: #6b7280;
      }
    }
    &.success .stat-value { color: #18a058; }
    &.fail .stat-value { color: #d03050; }
  }
  .stats-charts {
    margin-bottom: 16px;
  }
  .chart-box {
    height: 260px;
  }
  .search-form {
    margin-bottom: 16px;
  }
  .pagination-container {
    display: flex;
    justify-content: flex-end;
    margin-top: 12px;
  }

  @media (max-width: 1024px) {
    :deep(.n-card__content) {
      padding: 12px;
    }

    .stats-section {
      margin-bottom: 16px;
    }

    .stats-cards {
      gap: 8px;
      margin-bottom: 12px;
    }

    .stat-card {
      min-width: 0;

      :deep(.n-card__content) {
        padding: 12px 8px;
      }

      .stat-item {
        gap: 2px;

        .stat-value {
          font-size: 18px;
        }

        .stat-label {
          font-size: 12px;
          white-space: nowrap;
        }
      }
    }

    .stats-charts {
      margin-bottom: 12px;
    }

    .stats-charts :deep(.n-card-header) {
      padding: 12px 12px 0;
    }

    .stats-charts :deep(.n-card__content) {
      padding: 8px 8px 12px;
    }

    .chart-box {
      height: 240px;
      min-width: 0;
    }

    .search-form :deep(.n-form),
    .search-form :deep(.n-form-item),
    .search-form :deep(.n-input),
    .search-form :deep(.n-select),
    .search-form :deep(.n-date-picker) {
      width: 100% !important;
    }

    .search-form :deep(.n-space) {
      width: 100%;
      display: grid !important;
      grid-template-columns: 1fr 1fr;
      gap: 8px !important;
    }

    .pagination-container {
      justify-content: center;
    }
  }
}

.mobile-log-list {
  min-width: 0;
  border-top: 1px solid #eef2f7;
}

.mobile-log-item {
  display: grid;
  gap: 6px;
  padding: 12px 0;
  border-bottom: 1px solid #eef2f7;
}

.mobile-log-item__main {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.mobile-log-item__title,
.mobile-log-item__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.mobile-log-item__title strong,
.mobile-log-item__meta span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mobile-log-item__title strong {
  min-width: 0;
  color: #0f172a;
  font-size: 14px;
}

.mobile-log-item__meta {
  color: #64748b;
  font-size: 12px;
}
</style>
