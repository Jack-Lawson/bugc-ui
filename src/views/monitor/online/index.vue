<template>
  <div class="page-container">
    <n-card class="page-layout">
      <div class="table-toolbar">
        <n-button @click="loadData">
          <template #icon><n-icon><RefreshOutline /></n-icon></template>
          刷新
        </n-button>
      </div>

      <n-data-table v-if="!isTouchLayout" :columns="columns" :data="tableData" :loading="loading" :row-key="(row: OnlineUser) => row.tokenId" />
      <div v-else class="mobile-card-list">
        <n-spin :show="loading">
          <article v-for="user in tableData" :key="user.tokenId" class="mobile-card">
            <div class="mobile-card__header">
              <div class="mobile-card__title">
                <strong>{{ user.loginName }}</strong>
                <span>{{ user.browser || '-' }} / {{ user.os || '-' }}</span>
              </div>
              <n-tag :type="user.status === 1 ? 'success' : 'default'" size="small">
                {{ user.status === 1 ? '在线' : '离线' }}
              </n-tag>
            </div>
            <div class="mobile-card__meta"><span>会话</span><em>{{ user.tokenId }}</em></div>
            <div class="mobile-card__meta"><span>主机</span><em>{{ user.ipaddr || '-' }}</em></div>
            <div class="mobile-card__meta"><span>地点</span><em>{{ user.loginLocation || '-' }}</em></div>
            <div class="mobile-card__meta"><span>登录</span><em>{{ user.loginTime || '-' }}</em></div>
            <div class="mobile-card__meta"><span>访问</span><em>{{ user.lastAccessTime || '-' }}</em></div>
            <div v-if="hasPermission('monitor:online:forceLogout')" class="mobile-card__actions">
              <n-button size="small" type="error" @click="handleForceLogout(user)">强退</n-button>
            </div>
          </article>
          <n-empty v-if="!tableData.length" description="暂无在线用户" />
        </n-spin>
      </div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, h, onMounted } from 'vue'
import { NButton, NTag, useMessage, useDialog, type DataTableColumns } from 'naive-ui'
import { RefreshOutline } from '@vicons/ionicons5'
import { onlineApi, type OnlineUser } from '@/api/monitor'
import { useUserStore } from '@/stores/user'
import { useResponsive } from '@/composables/useResponsive'

const message = useMessage()
const dialog = useDialog()
const userStore = useUserStore()
const { isTouchLayout } = useResponsive()
const hasPermission = (permission: string) => userStore.hasPermission(permission)

const tableData = ref<OnlineUser[]>([])
const loading = ref(false)

const columns: DataTableColumns<OnlineUser> = [
  { title: '序号', key: 'index', width: 60, render: (_row, index) => index + 1 },
  { title: '会话编号', key: 'tokenId', ellipsis: { tooltip: true }, minWidth: 180 },
  { title: '登录名称', key: 'loginName', width: 100 },
  { title: '主机', key: 'ipaddr', width: 130 },
  { title: '登录地点', key: 'loginLocation', width: 140 },
  { title: '浏览器', key: 'browser', width: 120 },
  { title: '操作系统', key: 'os', width: 120 },
  { title: '会话状态', key: 'status', width: 100, render(row) {
    return h(NTag, { type: row.status === 1 ? 'success' : 'default', size: 'small' }, { default: () => row.status === 1 ? '在线' : '离线' })
  }},
  { title: '登录时间', key: 'loginTime', width: 180 },
  { title: '最后访问时间', key: 'lastAccessTime', width: 180 },
  { title: '操作', key: 'actions', width: 100, fixed: 'right', render(row) {
    return hasPermission('monitor:online:forceLogout')
      ? h(NButton, { size: 'small', type: 'error', onClick: () => handleForceLogout(row) }, { default: () => '强退' })
      : '-'
  }}
]

async function loadData() {
  loading.value = true
  try { tableData.value = await onlineApi.list() }
  finally { loading.value = false }
}

function handleForceLogout(row: OnlineUser) {
  dialog.warning({
    title: '提示', content: '确定要强制下线该用户吗？', positiveText: '确定', negativeText: '取消',
    onPositiveClick: async () => {
      const tokenValue = row.tokenValue || row.tokenId
      const isSelf = !!userStore.token && tokenValue === userStore.token
      await onlineApi.forceLogout(tokenValue)
      message.success('操作成功')
      if (isSelf) {
        await userStore.logout()
        return
      }
      loadData()
    }
  })
}

onMounted(() => loadData())
</script>
<style lang="scss" scoped>
.page-layout{
  height: calc(100vh - 160px);
}

.table-toolbar {
  margin-bottom: 16px;
}

.mobile-card-list {
  min-width: 0;
}

.mobile-card {
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;

  & + & {
    margin-top: 10px;
  }
}

.mobile-card__header {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
}

.mobile-card__title {
  display: grid;
  flex: 1;
  min-width: 0;
  gap: 3px;

  strong,
  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    color: #0f172a;
    font-size: 15px;
  }

  span {
    color: #64748b;
    font-size: 12px;
  }
}

.mobile-card__meta {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 8px;
  color: #64748b;
  font-size: 12px;

  em {
    min-width: 0;
    color: #334155;
    font-style: normal;
    overflow-wrap: anywhere;
  }
}

.mobile-card__actions {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  :deep(.n-button) {
    flex: 0 0 auto;
  }
}

@media (max-width: 1024px) {
  .page-layout {
    height: auto;
    min-height: calc(100vh - 120px);
  }
}
</style>
