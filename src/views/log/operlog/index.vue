<template>
  <div class="page-container">
    <n-card class="page-layout">
      <div class="search-form">
        <n-form inline :model="searchForm" label-placement="left">
          <n-form-item label="模块名称">
            <n-input v-model:value="searchForm.title" placeholder="请输入模块名称" clearable />
          </n-form-item>
          <n-form-item label="操作人员">
            <n-input v-model:value="searchForm.operName" placeholder="请输入操作人员" clearable />
          </n-form-item>
          <n-form-item label="状态">
            <n-select v-model:value="searchForm.status" placeholder="请选择状态" :options="statusOptions" clearable style="width: 120px" />
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

      <div class="table-toolbar">
        <n-button v-if="hasPermission('sys:operlog:delete')" type="error" @click="handleClean">
          <template #icon><n-icon><TrashOutline /></n-icon></template>
          清空日志
        </n-button>
      </div>

      <n-data-table
        v-if="!isTouchLayout"
        :columns="columns"
        :data="tableData"
        :loading="loading"
        :row-key="(row: SysOperLog) => row.id"
        remote
      />
      <div v-else class="mobile-log-list">
        <n-spin :show="loading">
          <article v-for="row in tableData" :key="row.id" class="mobile-log-item">
            <div class="mobile-log-item__main">
              <div class="mobile-log-item__title">
                <strong>{{ row.title || '-' }}</strong>
                <n-tag :type="row.status === 0 ? 'success' : 'error'" size="small">
                  {{ row.status === 0 ? '正常' : '异常' }}
                </n-tag>
              </div>
              <div class="mobile-log-item__sub">{{ row.operUrl || row.method || '-' }}</div>
              <div class="mobile-log-item__meta">
                <span>{{ businessTypeMap[row.businessType] || '其他' }}</span>
                <span>{{ row.requestMethod || '-' }}</span>
                <span>{{ row.costTime }}ms</span>
              </div>
              <div class="mobile-log-item__meta">
                <span>{{ row.operName || '-' }}</span>
                <span>{{ row.operTime || '-' }}</span>
              </div>
            </div>
            <div class="mobile-log-item__actions">
              <n-button size="tiny" tertiary @click="handleDetail(row)">详情</n-button>
              <n-button v-if="hasPermission('sys:operlog:delete')" size="tiny" tertiary type="error" @click="handleDelete(row)">删除</n-button>
            </div>
          </article>
          <n-empty v-if="!tableData.length" description="暂无日志" />
        </n-spin>
      </div>

      <div class="pagination-container" style="display: flex; justify-content: flex-end; margin-top: 12px">
        <n-pagination
          v-model:page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :item-count="pagination.itemCount"
          :page-sizes="[10, 20, 50, 100]"
          :show-size-picker="!isTouchLayout"
          :show-quick-jumper="!isTouchLayout"
          @update:page="handlePageChange"
          @update:page-size="handlePageSizeChange"
        >
          <template #prefix>
            共 {{ pagination.itemCount }} 条
          </template>
        </n-pagination>
      </div>
    </n-card>

    <n-modal v-model:show="detailVisible" title="日志详情" preset="card" :style="{ width: isTouchLayout ? 'calc(100vw - 24px)' : '700px' }">
      <n-descriptions :column="isTouchLayout ? 1 : 2" :label-placement="isTouchLayout ? 'top' : 'left'">
        <n-descriptions-item label="模块名称">{{ detailData.title }}</n-descriptions-item>
        <n-descriptions-item label="请求方式">{{ detailData.requestMethod }}</n-descriptions-item>
        <n-descriptions-item label="操作人员">{{ detailData.operName }}</n-descriptions-item>
        <n-descriptions-item label="操作地址">{{ detailData.operIp }}</n-descriptions-item>
        <n-descriptions-item label="请求地址" :span="2">{{ detailData.operUrl }}</n-descriptions-item>
        <n-descriptions-item label="方法名称" :span="2">{{ detailData.method }}</n-descriptions-item>
        <n-descriptions-item label="请求参数" :span="2">
          <div class="code-container">
            <n-code :code="formatJson(detailData.operParam)" language="json" word-wrap />
          </div>
        </n-descriptions-item>
        <n-descriptions-item label="返回参数" :span="2">
          <div class="code-container">
            <n-code :code="formatJson(detailData.jsonResult)" language="json" word-wrap />
          </div>
        </n-descriptions-item>
        <n-descriptions-item label="操作状态">
          <n-tag :type="detailData.status === 0 ? 'success' : 'error'" size="small">{{ detailData.status === 0 ? '正常' : '异常' }}</n-tag>
        </n-descriptions-item>
        <n-descriptions-item label="耗时">{{ detailData.costTime }}ms</n-descriptions-item>
        <n-descriptions-item label="操作时间" :span="2">{{ detailData.operTime }}</n-descriptions-item>
        <n-descriptions-item v-if="detailData.errorMsg" label="错误信息" :span="2">
          <n-text type="error">{{ detailData.errorMsg }}</n-text>
        </n-descriptions-item>
      </n-descriptions>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, h, onMounted } from 'vue'
import { NButton, NTag, NSpace, NPagination, useMessage, useDialog, type DataTableColumns } from 'naive-ui'
import { SearchOutline, RefreshOutline, TrashOutline } from '@vicons/ionicons5'
import { operLogApi, type SysOperLog } from '@/api/monitor'
import { useUserStore } from '@/stores/user'
import { useResponsive } from '@/composables/useResponsive'

const message = useMessage()
const dialog = useDialog()
const userStore = useUserStore()
const { isTouchLayout } = useResponsive()
const hasPermission = (permission: string) => userStore.hasPermission(permission)

const searchForm = reactive({ title: '', operName: '', status: null as number | null })
const statusOptions = [{ label: '正常', value: 0 }, { label: '异常', value: 1 }]
const tableData = ref<SysOperLog[]>([])
const loading = ref(false)
const pagination = reactive({
  page: 1,
  pageSize: 10,
  itemCount: 0
})

const detailVisible = ref(false)
const detailData = ref<SysOperLog>({} as SysOperLog)

const businessTypeMap: Record<number, string> = { 0: '其他', 1: '新增', 2: '修改', 3: '删除', 4: '查询', 5: '导出' }

const columns: DataTableColumns<SysOperLog> = [
  { title: 'ID', key: 'id', width: 80 },
  { title: '模块名称', key: 'title', width: 120 },
  { title: '业务类型', key: 'businessType', width: 100, render(row) {
    return h('span', {}, businessTypeMap[row.businessType] || '其他')
  }},
  { title: '请求方式', key: 'requestMethod', width: 100 },
  { title: '操作人员', key: 'operName', width: 100 },
  { title: 'IP地址', key: 'operIp', width: 140 },
  { title: '状态', key: 'status', width: 80, render(row) {
    return h(NTag, { type: row.status === 0 ? 'success' : 'error', size: 'small' }, { default: () => row.status === 0 ? '正常' : '异常' })
  }},
  { title: '耗时', key: 'costTime', width: 80, render(row) { return h('span', {}, `${row.costTime}ms`) }},
  { title: '操作时间', key: 'operTime', width: 180 },
  { title: '操作', key: 'actions', width: 120, fixed: 'right', render(row) {
    const buttons = [h(NButton, { size: 'small', onClick: () => handleDetail(row) }, { default: () => '详情' })]
    if (hasPermission('sys:operlog:delete')) {
      buttons.push(h(NButton, { size: 'small', type: 'error', onClick: () => handleDelete(row) }, { default: () => '删除' }))
    }
    return h(NSpace, null, { default: () => buttons })
  }}
]

async function loadData() {
  loading.value = true
  try {
    const res = await operLogApi.page({
      page: pagination.page,
      pageSize: pagination.pageSize,
      title: searchForm.title || undefined,
      operName: searchForm.operName || undefined,
      status: searchForm.status ?? undefined
    })
    tableData.value = res.list
    pagination.itemCount = Number(res.total)
  } finally { loading.value = false }
}

function handleSearch() { pagination.page = 1; loadData() }
function handleReset() { searchForm.title = ''; searchForm.operName = ''; searchForm.status = null; handleSearch() }
function handlePageChange(page: number) { pagination.page = page; loadData() }
function handlePageSizeChange(pageSize: number) { pagination.pageSize = pageSize; pagination.page = 1; loadData() }

function handleDetail(row: SysOperLog) {
  detailData.value = row
  detailVisible.value = true
}

// 格式化 JSON 字符串
function formatJson(jsonStr: string | undefined | null): string {
  if (!jsonStr) return ''
  try {
    const obj = JSON.parse(jsonStr)
    return JSON.stringify(obj, null, 2)
  } catch {
    // 如果不是有效的 JSON，直接返回原字符串
    return jsonStr
  }
}

function handleDelete(row: SysOperLog) {
  dialog.warning({
    title: '提示', content: '确定要删除该日志吗？', positiveText: '确定', negativeText: '取消',
    onPositiveClick: async () => { await operLogApi.delete(row.id!); message.success('删除成功'); loadData() }
  })
}

function handleClean() {
  dialog.warning({
    title: '提示', content: '确定要清空所有操作日志吗？', positiveText: '确定', negativeText: '取消',
    onPositiveClick: async () => { await operLogApi.clean(); message.success('清空成功'); loadData() }
  })
}

onMounted(() => loadData())
</script>

<style scoped>
.code-container {
  max-height: 200px;
  overflow: auto;
  background-color: #f5f5f5;
  border-radius: 4px;
  padding: 8px;
  width: 100%;
}

.code-container :deep(.n-code) {
  white-space: pre-wrap;
  word-break: break-all;
}

.mobile-log-list {
  min-width: 0;
  border-top: 1px solid #eef2f7;
}

.mobile-log-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  padding: 12px 0;
  border-bottom: 1px solid #eef2f7;
}

.mobile-log-item__main {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.mobile-log-item__title,
.mobile-log-item__meta,
.mobile-log-item__actions {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.mobile-log-item__title strong,
.mobile-log-item__sub,
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

.mobile-log-item__sub {
  color: #475569;
  font-size: 12px;
}

.mobile-log-item__meta {
  color: #64748b;
  font-size: 12px;
}

.mobile-log-item__actions {
  flex-direction: column;
  align-items: flex-end;
}

@media (max-width: 1024px) {
  .page-layout :deep(.n-card__content) {
    padding: 12px;
  }

  .search-form :deep(.n-form),
  .search-form :deep(.n-form-item),
  .search-form :deep(.n-input),
  .search-form :deep(.n-select) {
    width: 100% !important;
  }

  .search-form :deep(.n-space) {
    width: 100%;
    display: grid !important;
    grid-template-columns: 1fr 1fr;
    gap: 8px !important;
  }

  .table-toolbar {
    margin-bottom: 12px;
  }

  .pagination-container {
    justify-content: center !important;
  }
}

</style>
