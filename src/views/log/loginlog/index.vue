<template>
  <div class="page-container">
    <n-card class="page-layout">
      <div class="search-form">
        <n-form inline :model="searchForm" label-placement="left">
          <n-form-item label="用户名">
            <n-input v-model:value="searchForm.username" placeholder="请输入用户名" clearable />
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
        <n-button v-if="hasPermission('sys:loginlog:delete')" type="error" @click="handleClean">
          <template #icon><n-icon><TrashOutline /></n-icon></template>
          清空日志
        </n-button>
      </div>

      <n-data-table
        v-if="!isTouchLayout"
        :columns="columns"
        :data="tableData"
        :loading="loading"
        :row-key="(row: SysLoginLog) => row.id"
        remote
      />
      <div v-else class="mobile-log-list">
        <n-spin :show="loading">
          <article v-for="row in tableData" :key="row.id" class="mobile-log-item">
            <div class="mobile-log-item__main">
              <div class="mobile-log-item__title">
                <strong>{{ row.username || '-' }}</strong>
                <n-tag :type="row.status === 0 ? 'success' : 'error'" size="small">
                  {{ row.status === 0 ? '成功' : '失败' }}
                </n-tag>
              </div>
              <div class="mobile-log-item__sub">{{ row.msg || row.loginLocation || '-' }}</div>
              <div class="mobile-log-item__meta">
                <span>{{ row.loginLocation || '-' }}</span>
                <span>{{ row.browser || '-' }}</span>
              </div>
              <div class="mobile-log-item__meta">
                <span>{{ row.os || '-' }}</span>
                <span>{{ row.loginTime || '-' }}</span>
              </div>
            </div>
            <div class="mobile-log-item__actions">
              <n-button v-if="hasPermission('sys:loginlog:delete')" size="tiny" tertiary type="error" @click="handleDelete(row)">删除</n-button>
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, h, onMounted } from 'vue'
import { NButton, NTag, NSpace, NPagination, useMessage, useDialog, type DataTableColumns } from 'naive-ui'
import { SearchOutline, RefreshOutline, TrashOutline } from '@vicons/ionicons5'
import { loginLogApi, type SysLoginLog } from '@/api/monitor'
import { useUserStore } from '@/stores/user'
import { useResponsive } from '@/composables/useResponsive'

const message = useMessage()
const dialog = useDialog()
const userStore = useUserStore()
const { isTouchLayout } = useResponsive()
const hasPermission = (permission: string) => userStore.hasPermission(permission)

const searchForm = reactive({ username: '', status: null as number | null })
const statusOptions = [{ label: '成功', value: 0 }, { label: '失败', value: 1 }]
const tableData = ref<SysLoginLog[]>([])
const loading = ref(false)
const pagination = reactive({
  page: 1,
  pageSize: 10,
  itemCount: 0
})

const columns: DataTableColumns<SysLoginLog> = [
  { title: 'ID', key: 'id', width: 80 },
  { title: '用户名', key: 'username', width: 120 },
  { title: 'IP地址', key: 'ipaddr', width: 140 },
  { title: '登录地点', key: 'loginLocation', width: 150 },
  { title: '浏览器', key: 'browser', width: 200 },
  { title: '操作系统', key: 'os', width: 300 },
  { title: '状态', key: 'status', width: 80, render(row) {
    return h(NTag, { type: row.status === 0 ? 'success' : 'error', size: 'small' }, { default: () => row.status === 0 ? '成功' : '失败' })
  }},
  { title: '提示信息', key: 'msg', ellipsis: { tooltip: true } },
  { title: '登录时间', key: 'loginTime', width: 180 },
  { title: '操作', key: 'actions', width: 80, fixed: 'right', render(row) {
    return hasPermission('sys:loginlog:delete')
      ? h(NButton, { size: 'small', type: 'error', onClick: () => handleDelete(row) }, { default: () => '删除' })
      : '-'
  }}
]

async function loadData() {
  loading.value = true
  try {
    const res = await loginLogApi.page({
      page: pagination.page,
      pageSize: pagination.pageSize,
      username: searchForm.username || undefined,
      status: searchForm.status ?? undefined
    })
    tableData.value = res.list
    pagination.itemCount = Number(res.total)
  } finally { loading.value = false }
}

function handleSearch() { pagination.page = 1; loadData() }
function handleReset() { searchForm.username = ''; searchForm.status = null; handleSearch() }
function handlePageChange(page: number) { pagination.page = page; loadData() }
function handlePageSizeChange(pageSize: number) { pagination.pageSize = pageSize; pagination.page = 1; loadData() }

function handleDelete(row: SysLoginLog) {
  dialog.warning({
    title: '提示', content: '确定要删除该日志吗？', positiveText: '确定', negativeText: '取消',
    onPositiveClick: async () => { await loginLogApi.delete(row.id!); message.success('删除成功'); loadData() }
  })
}

function handleClean() {
  dialog.warning({
    title: '提示', content: '确定要清空所有登录日志吗？', positiveText: '确定', negativeText: '取消',
    onPositiveClick: async () => { await loginLogApi.clean(); message.success('清空成功'); loadData() }
  })
}

onMounted(() => loadData())
</script>

<style scoped>
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
  justify-content: flex-end;
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
