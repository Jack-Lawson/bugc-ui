<template>
  <div class="page-container">
    <n-card class="page-layout">
      <div class="search-form">
        <n-form inline label-placement="left">
          <n-form-item label="服务名称">
            <n-input v-model:value="query.name" placeholder="请输入服务名称" clearable />
          </n-form-item>
          <n-form-item label="服务编码">
            <n-input v-model:value="query.code" placeholder="请输入服务编码" clearable />
          </n-form-item>
          <n-form-item label="状态">
            <n-select v-model:value="query.status" placeholder="请选择状态" :options="statusOptions" clearable />
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

      <div v-if="canAccessService && enabledServices.length && !isMobile" class="service-entry-grid">
        <button
          v-for="service in enabledServices"
          :key="service.id || service.code"
          class="service-entry"
          type="button"
          @click="openService(service)"
        >
          <span class="service-entry__icon">
            <n-icon><OpenOutline /></n-icon>
          </span>
          <span class="service-entry__body">
            <span class="service-entry__name">{{ service.name }}</span>
            <span class="service-entry__code">{{ getAccessPath(service) }}</span>
          </span>
        </button>
      </div>

      <div class="table-toolbar">
        <n-button v-if="canAddService" type="primary" @click="handleAdd">
          <template #icon><n-icon><AddOutline /></n-icon></template>
          新增服务
        </n-button>
      </div>

      <n-data-table
        v-if="!isMobile"
        :columns="columns"
        :data="services"
        :loading="loading"
        :row-key="(row: PersonalService) => row.id ?? row.code"
        remote
      />
      <div v-else class="service-mobile-list">
        <n-spin :show="loading">
          <div v-if="services.length" class="service-mobile-grid">
            <article
              v-for="service in services"
              :key="service.id || service.code"
              class="service-mobile-card"
            >
              <div class="service-mobile-card__header">
                <span class="service-entry__icon">
                  <n-icon><OpenOutline /></n-icon>
                </span>
                <span class="service-mobile-card__title">
                  <strong>{{ service.name }}</strong>
                  <span>{{ service.code }}</span>
                </span>
                <n-tag :type="service.status === 1 ? 'success' : 'default'" size="small">
                  {{ service.status === 1 ? '启用' : '禁用' }}
                </n-tag>
              </div>
              <div class="service-mobile-card__meta">
                <span>入口</span>
                <code>{{ getAccessPath(service) }}</code>
              </div>
              <div class="service-mobile-card__meta">
                <span>地址</span>
                <code>{{ service.targetBaseUrl || '-' }}</code>
              </div>
              <div v-if="canOperateService" class="service-mobile-card__actions">
                <n-button v-if="canAccessService" size="small" type="primary" @click="openService(service)">
                  <template #icon><n-icon><OpenOutline /></n-icon></template>
                  打开
                </n-button>
                <n-button v-if="canTestService" size="small" @click="handleTest(service)">
                  <template #icon><n-icon><FlashOutline /></n-icon></template>
                  测试
                </n-button>
                <n-button v-if="canEditService" size="small" @click="handleEdit(service)">编辑</n-button>
                <n-button v-if="canDeleteService" size="small" type="error" @click="handleDelete(service)">删除</n-button>
              </div>
            </article>
          </div>
          <n-empty v-else description="暂无服务" />
        </n-spin>
      </div>
      <div class="pagination-container">
        <n-pagination
          v-model:page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :item-count="pagination.itemCount"
          :page-sizes="[10, 20, 50, 100]"
          :show-size-picker="!isMobile"
          :show-quick-jumper="!isMobile"
          @update:page="loadServices"
          @update:page-size="handlePageSizeChange"
        >
          <template #prefix>共 {{ pagination.itemCount }} 条</template>
        </n-pagination>
      </div>
    </n-card>

    <n-modal v-model:show="showModal" preset="card" :title="modalTitle" style="width: 680px" :mask-closable="false">
      <n-form ref="formRef" :model="formData" :rules="rules" :label-placement="isMobile ? 'top' : 'left'" label-width="130">
        <n-form-item label="服务名称" path="name">
          <n-input v-model:value="formData.name" placeholder="例如：路由器管理" />
        </n-form-item>
        <n-form-item label="服务编码" path="code">
          <n-input v-model:value="formData.code" placeholder="例如：router-admin" :disabled="!!editingService" />
        </n-form-item>
        <n-form-item label="访问方式" path="accessMode">
          <n-select v-model:value="formData.accessMode" :options="accessModeOptions" />
        </n-form-item>
        <n-form-item label="服务根地址">
          <n-input v-model:value="formData.originBaseUrl" placeholder="只填写协议、主机和端口" />
        </n-form-item>
        <n-form-item label="入口路径">
          <n-input v-model:value="formData.entryPath" placeholder="例如：/" />
        </n-form-item>
        <n-form-item label="完整服务地址" path="targetBaseUrl">
          <n-input v-model:value="formData.targetBaseUrl" placeholder="兼容旧配置，可填写完整 http/https 地址" />
        </n-form-item>
        <n-form-item v-if="formData.code" label="内嵌地址">
          <n-input :value="getAccessPath(formData)" readonly />
        </n-form-item>
        <n-form-item label="图标">
          <n-input v-model:value="formData.icon" placeholder="例如：SpeedometerOutline" />
        </n-form-item>
        <n-form-item label="路径策略">
          <n-select v-model:value="formData.pathStrategy" :options="pathStrategyOptions" />
        </n-form-item>
        <n-form-item label="改写配置">
          <n-select v-model:value="formData.rewriteProfile" :options="rewriteProfileOptions" />
        </n-form-item>
        <n-form-item label="代理策略">
          <div class="switch-grid">
            <n-checkbox v-model:checked="formData.rewriteCookie" :checked-value="1" :unchecked-value="0">改写 Cookie Path</n-checkbox>
            <n-checkbox v-model:checked="formData.rewriteLocation" :checked-value="1" :unchecked-value="0">改写跳转地址</n-checkbox>
            <n-checkbox v-model:checked="formData.removeFrameHeaders" :checked-value="1" :unchecked-value="0">移除 iframe 限制头</n-checkbox>
            <n-checkbox v-model:checked="formData.rewriteBody" :checked-value="1" :unchecked-value="0">改写正文资源</n-checkbox>
            <n-checkbox v-model:checked="formData.websocketEnabled" :checked-value="1" :unchecked-value="0">启用 WebSocket</n-checkbox>
          </div>
        </n-form-item>
        <n-form-item label="超时时间" path="timeoutSeconds">
          <n-input-number v-model:value="formData.timeoutSeconds" :min="1" :max="120" style="width: 100%" />
        </n-form-item>
        <n-form-item label="排序">
          <n-input-number v-model:value="formData.sort" :min="0" style="width: 100%" />
        </n-form-item>
        <n-form-item label="状态">
          <n-switch v-model:value="formData.status" :checked-value="1" :unchecked-value="0">
            <template #checked>启用</template>
            <template #unchecked>禁用</template>
          </n-switch>
        </n-form-item>
        <n-form-item label="备注">
          <n-input v-model:value="formData.remark" type="textarea" :rows="3" placeholder="请输入备注" />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showModal = false">取消</n-button>
          <n-button type="primary" :loading="submitting" @click="handleSubmit">确定</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, reactive, ref, type VNode } from 'vue'
import { NButton, NIcon, NSpace, NTag, useDialog, useMessage, type DataTableColumns, type FormInst, type FormRules } from 'naive-ui'
import { AddOutline, FlashOutline, OpenOutline, RefreshOutline, SearchOutline } from '@vicons/ionicons5'
import { useRouter } from 'vue-router'
import { personalServiceApi, type PersonalService } from '@/api/personalService'
import { useResponsive } from '@/composables/useResponsive'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const message = useMessage()
const dialog = useDialog()
const { isMobile } = useResponsive()
const userStore = useUserStore()

const loading = ref(false)
const submitting = ref(false)
const services = ref<PersonalService[]>([])
const showModal = ref(false)
const editingService = ref<PersonalService | null>(null)
const formRef = ref<FormInst | null>(null)

const query = reactive<{ name: string; code: string; status: number | null }>({
  name: '',
  code: '',
  status: null
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  itemCount: 0
})

const statusOptions = [
  { label: '启用', value: 1 },
  { label: '禁用', value: 0 }
]
const accessModeOptions = [
  { label: '代理内嵌', value: 'proxy' },
  { label: '直接内嵌', value: 'iframe' },
  { label: '外链打开', value: 'external' }
]
const pathStrategyOptions = [
  { label: '自动识别', value: 'auto' },
  { label: '按服务根路径', value: 'origin_root' },
  { label: '按入口相对路径', value: 'entry_relative' }
]
const rewriteProfileOptions = [
  { label: '通用', value: 'generic' },
  { label: 'LuCI 路由器', value: 'luci' },
  { label: '不改写', value: 'none' }
]

const formData = reactive<PersonalService>(createDefaultForm())

const modalTitle = computed(() => editingService.value ? '编辑个人服务' : '新增个人服务')
const enabledServices = computed(() => services.value.filter(service => service.status === 1))
const hasPermission = (permission: string) => userStore.hasPermission(permission)
const canAddService = computed(() => hasPermission('personal:service:add'))
const canEditService = computed(() => hasPermission('personal:service:edit'))
const canDeleteService = computed(() => hasPermission('personal:service:remove'))
const canAccessService = computed(() => hasPermission('personal:service:access'))
const canTestService = computed(() => hasPermission('personal:service:test'))
const canOperateService = computed(() => canAccessService.value || canTestService.value || canEditService.value || canDeleteService.value)

const rules: FormRules = {
  name: [{ required: true, message: '请输入服务名称', trigger: 'blur' }],
  code: [
    { required: true, message: '请输入服务编码', trigger: 'blur' },
    {
      pattern: /^[a-zA-Z0-9_-]{2,64}$/,
      message: '服务编码只能包含字母、数字、下划线和中划线，长度2-64位',
      trigger: 'blur'
    }
  ],
  targetBaseUrl: [{ required: true, message: '请输入服务地址', trigger: 'blur' }],
  timeoutSeconds: [{ required: true, type: 'number', message: '请输入超时时间', trigger: 'blur' }]
}

const columns: DataTableColumns<PersonalService> = [
  { title: '服务名称', key: 'name', minWidth: 140 },
  { title: '服务编码', key: 'code', width: 150 },
  { title: '服务地址', key: 'targetBaseUrl', minWidth: 240, ellipsis: { tooltip: true } },
  {
    title: '状态',
    key: 'status',
    width: 90,
    render(row) {
      return h(NTag, { type: row.status === 1 ? 'success' : 'default', size: 'small' }, {
        default: () => row.status === 1 ? '启用' : '禁用'
      })
    }
  },
  { title: '排序', key: 'sort', width: 80 },
  {
    title: '操作',
    key: 'actions',
    width: 360,
    fixed: 'right',
    render(row) {
      const buttons: VNode[] = []
      if (canAccessService.value) {
        buttons.push(h(NButton, { size: 'small', onClick: () => openService(row) }, {
          icon: () => h(NIcon, null, { default: () => h(OpenOutline) }),
          default: () => '打开'
        }))
      }
      if (canTestService.value) {
        buttons.push(h(NButton, { size: 'small', onClick: () => handleTest(row) }, {
          icon: () => h(NIcon, null, { default: () => h(FlashOutline) }),
          default: () => '测试'
        }))
      }
      if (canEditService.value) {
        buttons.push(h(NButton, { size: 'small', onClick: () => handleEdit(row) }, { default: () => '编辑' }))
      }
      if (canDeleteService.value) {
        buttons.push(h(NButton, { size: 'small', type: 'error', onClick: () => handleDelete(row) }, { default: () => '删除' }))
      }
      return buttons.length > 0 ? h(NSpace, null, { default: () => buttons }) : '-'
    }
  }
]

function createDefaultForm(): PersonalService {
  return {
    code: '',
    name: '',
    targetBaseUrl: '',
    originBaseUrl: '',
    entryPath: '/',
    pathStrategy: 'auto',
    icon: 'SpeedometerOutline',
    accessMode: 'proxy',
    rewriteCookie: 1,
    rewriteLocation: 1,
    removeFrameHeaders: 1,
    rewriteBody: 1,
    rewriteProfile: 'generic',
    websocketEnabled: 0,
    timeoutSeconds: 10,
    sort: 0,
    status: 1,
    remark: ''
  }
}

function resetForm(data = createDefaultForm()) {
  delete formData.id
  Object.assign(formData, data)
  formRef.value?.restoreValidation()
}

async function loadServices() {
  loading.value = true
  try {
    const res = await personalServiceApi.list({
      page: pagination.page,
      pageSize: pagination.pageSize,
      name: query.name || undefined,
      code: query.code || undefined,
      status: query.status ?? undefined
    })
    services.value = res.records || []
    pagination.itemCount = Number(res.total || 0)
  } catch (error) {
    services.value = []
    pagination.itemCount = 0
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  loadServices()
}

function handleReset() {
  query.name = ''
  query.code = ''
  query.status = null
  handleSearch()
}

function handlePageSizeChange(pageSize: number) {
  pagination.pageSize = pageSize
  pagination.page = 1
  loadServices()
}

function handleAdd() {
  if (!canAddService.value) {
    message.warning('暂无新增权限')
    return
  }
  editingService.value = null
  resetForm()
  showModal.value = true
}

function handleEdit(row: PersonalService) {
  if (!canEditService.value) {
    message.warning('暂无编辑权限')
    return
  }
  editingService.value = row
  resetForm({ ...row })
  showModal.value = true
}

async function handleSubmit() {
  try {
    normalizeFormAddress()
    await formRef.value?.validate()
    submitting.value = true
    if (editingService.value?.id) {
      await personalServiceApi.update({ ...formData, id: editingService.value.id })
      message.success('修改成功')
    } else {
      const createData = { ...formData }
      delete createData.id
      await personalServiceApi.create(createData)
      message.success('创建成功')
    }
    showModal.value = false
    loadServices()
  } finally {
    submitting.value = false
  }
}

async function handleTest(row: PersonalService) {
  if (!canTestService.value) {
    message.warning('暂无测试权限')
    return
  }
  if (!row.id) {
    message.warning('请先保存服务后再测试')
    return
  }
  const success = await personalServiceApi.test(row.id)
  if (success) {
    message.success('连接测试成功')
  } else {
    message.warning('连接测试失败')
  }
}

function handleDelete(row: PersonalService) {
  if (!canDeleteService.value) {
    message.warning('暂无删除权限')
    return
  }
  dialog.warning({
    title: '提示',
    content: `确定要删除个人服务"${row.name}"吗？`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      await personalServiceApi.delete(row.id!)
      message.success('删除成功')
      loadServices()
    }
  })
}


function openService(row: PersonalService) {
  if (!canAccessService.value) {
    message.warning('暂无访问权限')
    return
  }
  if (row.accessMode === 'external') {
    window.open(getTargetEntryUrl(row), '_blank', 'noopener,noreferrer')
    return
  }
  router.push({
    path: `/personal-service/${row.code}`,
    query: { refresh: String(Date.now()) }
  })
}

function getAccessPath(row: Pick<PersonalService, 'code'>) {
  if (!row.code) return ''
  return `/api/personal/services/${row.code}/`
}

function normalizeFormAddress() {
  if (!formData.originBaseUrl && formData.targetBaseUrl) {
    try {
      const url = new URL(formData.targetBaseUrl)
      formData.originBaseUrl = url.origin
      formData.entryPath = url.pathname || '/'
    } catch (error) {
      return
    }
  }
  if (!formData.entryPath) {
    formData.entryPath = '/'
  }
  if (formData.entryPath && !formData.entryPath.startsWith('/')) {
    formData.entryPath = `/${formData.entryPath}`
  }
  if (formData.originBaseUrl) {
    formData.targetBaseUrl = `${formData.originBaseUrl.replace(/\/+$/, '')}${formData.entryPath || '/'}`
  }
}

function getTargetEntryUrl(row: PersonalService) {
  if (row.originBaseUrl) {
    return `${row.originBaseUrl.replace(/\/+$/, '')}${row.entryPath || '/'}`
  }
  return row.targetBaseUrl
}

onMounted(loadServices)
</script>

<style lang="scss" scoped>
.search-form,
.service-entry-grid,
.table-toolbar {
  margin-bottom: 16px;
}

.service-entry-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.service-entry {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 72px;
  padding: 12px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;

  &:hover {
    border-color: #18c3c8;
    box-shadow: 0 8px 18px rgb(15 23 42 / 8%);
    transform: translateY(-1px);
  }
}

.service-entry__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 8px;
  color: #0f9ea4;
  background: #e8fbfb;
  font-size: 22px;
  flex: 0 0 auto;
}

.service-entry__body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.service-entry__name {
  color: #0f172a;
  font-weight: 600;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.service-entry__code {
  color: #64748b;
  font-size: 12px;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.service-mobile-list {
  min-width: 0;
}

.service-mobile-grid {
  display: grid;
  gap: 10px;
}

.service-mobile-card {
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.service-mobile-card__header {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.service-mobile-card__title {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 2px;

  strong,
  span {
    min-width: 0;
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

.service-mobile-card__meta {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 8px;
  align-items: start;
  color: #64748b;
  font-size: 12px;

  code {
    min-width: 0;
    padding: 0;
    color: #334155;
    background: transparent;
    overflow-wrap: anywhere;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  }
}

.service-mobile-card__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;

  :deep(.n-button) {
    width: 100%;
  }
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.switch-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  width: 100%;
}

@media (max-width: 900px) {
  .switch-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .page-layout :deep(.n-card__content) {
    padding: 12px;
  }

  .search-form,
  .table-toolbar {
    margin-bottom: 10px;
  }

  .table-toolbar :deep(.n-button) {
    width: 100%;
  }

  .pagination-container {
    justify-content: flex-start;
    overflow-x: auto;
    padding-bottom: 2px;
  }
}
</style>
