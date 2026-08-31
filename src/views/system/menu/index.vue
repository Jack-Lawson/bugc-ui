<template>
  <div class="page-container">
    <n-card class="page-layout">
      <!-- 搜索表单 -->
      <div class="search-form">
        <n-form inline :model="searchForm" label-placement="left">
          <n-form-item label="菜单名称">
            <n-input v-model:value="searchForm.name" placeholder="请输入菜单名称" clearable />
          </n-form-item>
          <n-form-item label="状态">
            <n-select
              v-model:value="searchForm.status"
              placeholder="请选择状态"
              :options="statusOptions"
              clearable
              style="width: 120px"
            />
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

      <!-- 工具栏 -->
      <div class="table-toolbar">
        <n-button v-if="hasPermission('sys:menu:add')" type="primary" @click="handleAdd()">
          <template #icon><n-icon><AddOutline /></n-icon></template>
          新增菜单
        </n-button>
      </div>

      <!-- 表格 -->
      <n-data-table
        v-if="!isTouchLayout"
        :columns="columns"
        :data="tableData"
        :loading="loading"
        :row-key="(row: SysMenu) => row.id"
        default-expand-all
      />
      <div v-else class="mobile-card-list">
        <n-spin :show="loading">
          <n-tree
            v-if="mobileMenuOptions.length"
            v-model:expanded-keys="expandedMenuKeys"
            class="mobile-menu-tree"
            block-line
            expand-on-click
            :data="mobileMenuOptions"
            :selectable="false"
            :render-label="renderMobileMenuLabel"
            :render-suffix="renderMobileMenuActions"
          />
          <n-empty v-else description="暂无菜单" />
        </n-spin>
      </div>
    </n-card>

    <!-- 新增/编辑弹窗 -->
    <n-modal
      v-model:show="modalVisible"
      :title="modalTitle"
      preset="card"
      :style="{ width: isTouchLayout ? 'calc(100vw - 24px)' : '650px' }"
      :mask-closable="false"
    >
      <n-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        :label-placement="isTouchLayout ? 'top' : 'left'"
        label-width="80"
        class="modal-form"
      >
        <n-form-item label="上级菜单" path="parentId">
          <n-tree-select
            v-model:value="formData.parentId"
            :options="menuOptions"
            placeholder="请选择上级菜单"
            default-expand-all
            clearable
          />
        </n-form-item>
        <n-form-item label="菜单类型" path="type">
          <n-radio-group v-model:value="formData.type">
            <n-radio :value="1">目录</n-radio>
            <n-radio :value="2">菜单</n-radio>
            <n-radio :value="3">按钮</n-radio>
          </n-radio-group>
        </n-form-item>
        <n-form-item label="菜单名称" path="name">
          <n-input v-model:value="formData.name" placeholder="请输入菜单名称" />
        </n-form-item>
        <n-form-item v-if="formData.type !== 3" label="是否外链" path="isFrame">
          <n-switch v-model:value="formData.isFrame" :checked-value="1" :unchecked-value="0">
            <template #checked>是</template>
            <template #unchecked>否</template>
          </n-switch>
          <span style="margin-left: 8px; color: #999; font-size: 12px;">外链点击后将在新窗口打开</span>
        </n-form-item>
        <n-form-item v-if="formData.type !== 3 && !formData.isFrame" label="路由地址" path="path">
          <n-input v-model:value="formData.path" placeholder="请输入路由地址" />
        </n-form-item>
        <n-form-item v-if="formData.type !== 3 && formData.isFrame" label="外链地址" path="component">
          <n-input v-model:value="formData.component" placeholder="请输入外链地址，如：https://example.com" />
        </n-form-item>
        <n-form-item v-if="formData.type === 2 && !formData.isFrame" label="组件路径" path="component">
          <n-input v-model:value="formData.component" placeholder="请输入组件路径" />
        </n-form-item>
        <n-form-item v-if="formData.type === 3" label="权限标识" path="permission">
          <n-input v-model:value="formData.permission" placeholder="请输入权限标识，如：sys:user:add" />
        </n-form-item>
        <n-form-item v-if="formData.type !== 3" label="图标" path="icon">
          <IconSelect v-model="formIcon" />
        </n-form-item>
        <n-form-item label="排序" path="sort">
          <n-input-number v-model:value="formData.sort" :min="0" style="width: 100%" />
        </n-form-item>
        <n-form-item v-if="formData.type !== 3" label="是否可见" path="visible">
          <n-switch v-model:value="formData.visible" :checked-value="1" :unchecked-value="0">
            <template #checked>显示</template>
            <template #unchecked>隐藏</template>
          </n-switch>
        </n-form-item>
        <n-form-item label="状态" path="status">
          <n-switch v-model:value="formData.status" :checked-value="1" :unchecked-value="0">
            <template #checked>启用</template>
            <template #unchecked>禁用</template>
          </n-switch>
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="modalVisible = false">取消</n-button>
          <n-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, h, onMounted, computed, type VNode } from 'vue'
import { NButton, NTag, NSpace, NIcon, useMessage, useDialog, type DataTableColumns, type FormInst, type FormRules, type TreeOption, type TreeSelectOption } from 'naive-ui'
import { SearchOutline, RefreshOutline, AddOutline } from '@vicons/ionicons5'
import { menuApi, type SysMenu } from '@/api/system'
import IconSelect from '@/components/IconSelect.vue'
import { getIconComponent } from '@/utils/icons'
import { useUserStore } from '@/stores/user'
import { addDynamicRoutes, resetRouter } from '@/router'
import { useResponsive } from '@/composables/useResponsive'

const message = useMessage()
const dialog = useDialog()
const userStore = useUserStore()
const { isTouchLayout } = useResponsive()

// 权限检查
const hasPermission = (permission: string) => userStore.hasPermission(permission)

// 搜索表单
const searchForm = reactive({
  name: '',
  status: null as number | null
})

// 状态选项
const statusOptions = [
  { label: '启用', value: 1 },
  { label: '禁用', value: 0 }
]

// 菜单类型
const typeMap: Record<number, { text: string; type: 'info' | 'success' | 'warning' }> = {
  1: { text: '目录', type: 'info' },
  2: { text: '菜单', type: 'success' },
  3: { text: '按钮', type: 'warning' }
}

// 表格数据
const tableData = ref<SysMenu[]>([])
const loading = ref(false)
const expandedMenuKeys = ref<Array<string | number>>([])

type MenuTreeOption = TreeOption & {
  menu: SysMenu
  children?: MenuTreeOption[]
}

const mobileMenuOptions = computed<MenuTreeOption[]>(() => buildMobileMenuOptions(tableData.value))

function buildMobileMenuOptions(menus: SysMenu[]): MenuTreeOption[] {
  return menus.map(menu => ({
    key: menu.id!,
    label: menu.name,
    menu,
    children: menu.children?.length ? buildMobileMenuOptions(menu.children) : undefined
  }))
}

function getMenuSummary(menu: SysMenu) {
  return menu.path || menu.permission || menu.component || '-'
}

function renderMobileMenuLabel({ option }: { option: TreeOption }) {
  const menu = (option as MenuTreeOption).menu
  return h('div', { class: 'mobile-menu-node' }, [
    h('div', { class: 'mobile-menu-node__main' }, [
      h('div', { class: 'mobile-menu-node__title' }, [
        h('strong', null, menu.name),
        h(NTag, { type: typeMap[menu.type].type, size: 'small', round: true }, { default: () => typeMap[menu.type].text })
      ]),
      h('div', { class: 'mobile-menu-node__path' }, getMenuSummary(menu))
    ]),
    h('div', { class: 'mobile-menu-node__meta' }, [
      menu.type !== 3
        ? h(NTag, { type: menu.visible === 1 ? 'success' : 'default', size: 'small' }, { default: () => (menu.visible === 1 ? '显示' : '隐藏') })
        : null,
      h(NTag, { type: menu.status === 1 ? 'success' : 'error', size: 'small' }, { default: () => (menu.status === 1 ? '启用' : '禁用') }),
      h('span', { class: 'mobile-menu-node__sort' }, `排序 ${menu.sort ?? '-'}`)
    ])
  ])
}

function renderMobileMenuActions({ option }: { option: TreeOption }) {
  const menu = (option as MenuTreeOption).menu
  const buttons: VNode[] = []
  if (menu.type !== 3 && hasPermission('sys:menu:add')) {
    buttons.push(h(NButton, { size: 'tiny', tertiary: true, type: 'primary', onClick: (event: MouseEvent) => { event.stopPropagation(); handleAdd(menu.id) } }, { default: () => '增' }))
  }
  if (hasPermission('sys:menu:edit')) {
    buttons.push(h(NButton, { size: 'tiny', tertiary: true, onClick: (event: MouseEvent) => { event.stopPropagation(); handleEdit(menu) } }, { default: () => '改' }))
  }
  if (hasPermission('sys:menu:delete')) {
    buttons.push(h(NButton, { size: 'tiny', tertiary: true, type: 'error', onClick: (event: MouseEvent) => { event.stopPropagation(); handleDelete(menu) } }, { default: () => '删' }))
  }
  return h('div', { class: 'mobile-menu-actions' }, buttons)
}

// 菜单选项（用于选择上级）
const menuOptions = computed<TreeSelectOption[]>(() => {
  const options: TreeSelectOption[] = [
    { key: 0, label: '顶级菜单' }
  ]

  function convert(menus: SysMenu[]): TreeSelectOption[] {
    return menus
      .filter(m => m.type !== 3) // 按钮不能作为上级
      .map(menu => ({
        key: menu.id,
        label: menu.name,
        children: menu.children ? convert(menu.children) : undefined
      }))
  }

  options.push(...convert(tableData.value))
  return options
})

// 表格列
const columns: DataTableColumns<SysMenu> = [
  { title: '菜单名称', key: 'name', width: 200 },
  {
    title: '类型',
    key: 'type',
    width: 120,
    render(row) {
      const info = typeMap[row.type]
      return h(NTag, { type: info.type, size: 'small' }, { default: () => info.text })
    }
  },
  {
    title: '图标',
    key: 'icon',
    width: 180,
    render(row) {
      if (!row.icon) return '-'
      const iconComponent = getIconComponent(row.icon)
      if (iconComponent) {
        return h(NSpace, { align: 'center' }, {
          default: () => [
            h(NIcon, { size: 18 }, { default: () => h(iconComponent) }),
            h('span', { style: { fontSize: '12px', color: '#666' } }, row.icon)
          ]
        })
      }
      return row.icon
    }
  },
  { title: '路由地址', key: 'path', width: 200 , render(row) {
      return row.path || '-'
    }},
  { title: '组件路径', key: 'component', width: 200 , render(row) {
      return row.component || '-'
    }},
  { title: '权限标识', key: 'permission', width: 200 , render(row) {
      return row.permission || '-'
    }},
  { title: '排序', key: 'sort', width: 80 },
  {
    title: '可见',
    key: 'visible',
    width: 80,
    render(row) {
      if (row.type === 3) return '-'
      return h(
        NTag,
        { type: row.visible === 1 ? 'success' : 'default', size: 'small' },
        { default: () => (row.visible === 1 ? '是' : '否') }
      )
    }
  },
  {
    title: '状态',
    key: 'status',
    width: 80,
    render(row) {
      return h(
        NTag,
        { type: row.status === 1 ? 'success' : 'error', size: 'small' },
        { default: () => (row.status === 1 ? '启用' : '禁用') }
      )
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 200,
    fixed: 'right',
    render(row) {
      const buttons: VNode[] = []
      if (row.type !== 3 && hasPermission('sys:menu:add')) {
        buttons.push(h(NButton, { size: 'small', onClick: () => handleAdd(row.id) }, { default: () => '新增' }))
      }
      if (hasPermission('sys:menu:edit')) {
        buttons.push(h(NButton, { size: 'small', onClick: () => handleEdit(row) }, { default: () => '编辑' }))
      }
      if (hasPermission('sys:menu:delete')) {
        buttons.push(h(NButton, { size: 'small', type: 'error', onClick: () => handleDelete(row) }, { default: () => '删除' }))
      }
      return buttons.length > 0 ? h(NSpace, null, { default: () => buttons }) : '-'
    }
  }
]

// 弹窗
const modalVisible = ref(false)
const modalTitle = ref('新增菜单')
const formRef = ref<FormInst | null>(null)
const submitLoading = ref(false)

const formData = reactive<SysMenu>({
  id: undefined,
  parentId: 0,
  name: '',
  type: 1,
  path: '',
  component: '',
  permission: '',
  icon: '',
  sort: 0,
  visible: 1,
  status: 1,
  isFrame: 0
})

const formIcon = computed({
  get: () => formData.icon || '',
  set: (value: string) => {
    formData.icon = value
  }
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入菜单名称', trigger: 'blur' }],
  type: [{ required: true, type: 'number', message: '请选择菜单类型', trigger: 'change' }]
}

// 刷新当前登录用户的菜单、权限和动态路由，保证菜单开关保存后立即影响页面。
async function refreshUserRoutes() {
  await userStore.getInfo()
  resetRouter()
  addDynamicRoutes(userStore.menus)
}

// 按菜单类型构造提交数据，避免表单切换类型后提交无效字段。
function buildSubmitData(): SysMenu {
  const data: SysMenu = {
    ...formData,
    name: formData.name?.trim() || '',
    path: formData.path?.trim() || '',
    component: formData.component?.trim() || '',
    permission: formData.permission?.trim() || '',
    parentId: formData.parentId ?? 0,
    sort: formData.sort ?? 0,
    status: formData.status ?? 1,
    visible: formData.visible ?? 1,
    isFrame: formData.isFrame ?? 0
  }

  if (data.type === 3) {
    data.path = ''
    data.component = ''
    data.icon = ''
    data.visible = 1
    data.isFrame = 0
    if (!data.permission) {
      throw new Error('请输入权限标识')
    }
    return data
  }

  data.permission = ''
  if (data.isFrame === 1) {
    data.path = ''
    if (!data.component) {
      throw new Error('请输入外链地址')
    }
    if (!/^https?:\/\//i.test(data.component)) {
      throw new Error('外链地址必须以 http:// 或 https:// 开头')
    }
    return data
  }

  if (!data.path) {
    throw new Error('请输入路由地址')
  }
  if (data.type === 1) {
    data.component = ''
  } else if (!data.component) {
    throw new Error('请输入组件路径')
  }
  return data
}

// 加载数据
async function loadData() {
  loading.value = true
  try {
    const res = await menuApi.tree({
      name: searchForm.name || undefined,
      status: searchForm.status ?? undefined
    })
    tableData.value = res
    expandedMenuKeys.value = []
  } catch (error) {
    // 错误已在拦截器处理
  } finally {
    loading.value = false
  }
}

// 搜索
function handleSearch() {
  loadData()
}

// 重置
function handleReset() {
  searchForm.name = ''
  searchForm.status = null
  handleSearch()
}

// 新增
function handleAdd(parentId?: number) {
  modalTitle.value = '新增菜单'
  Object.assign(formData, {
    id: undefined,
    parentId: parentId || 0,
    name: '',
    type: 1,
    path: '',
    component: '',
    permission: '',
    icon: '',
    sort: 0,
    visible: 1,
    status: 1,
    isFrame: 0
  })
  modalVisible.value = true
}

// 编辑
function handleEdit(row: SysMenu) {
  modalTitle.value = '编辑菜单'
  Object.assign(formData, { ...row })
  modalVisible.value = true
}

// 提交
async function handleSubmit() {
  try {
    await formRef.value?.validate()
    submitLoading.value = true

    const submitData = buildSubmitData()
    if (formData.id) {
      await menuApi.update(submitData)
      message.success('更新成功')
    } else {
      await menuApi.create(submitData)
      message.success('创建成功')
    }

    modalVisible.value = false
    await loadData()
    await refreshUserRoutes()
  } catch (error) {
    if (error instanceof Error) {
      message.warning(error.message)
    }
  } finally {
    submitLoading.value = false
  }
}

// 删除
function handleDelete(row: SysMenu) {
  dialog.warning({
    title: '提示',
    content: `确定要删除菜单"${row.name}"吗？`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await menuApi.delete(row.id!)
        message.success('删除成功')
        await loadData()
        await refreshUserRoutes()
      } catch (error) {
        // 错误已在拦截器处理
      }
    }
  })
}

onMounted(() => {
  loadData()
})
</script>

<style lang="scss" scoped>
.search-form,
.table-toolbar {
  margin-bottom: 16px;
}

.mobile-card-list {
  min-width: 0;
}

.mobile-menu-tree {
  border: 1px solid #eef2f7;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.mobile-menu-tree :deep(.n-tree-node) {
  min-height: 64px;
  padding: 6px 6px 6px 0;
  border-bottom: 1px solid #f1f5f9;
}

.mobile-menu-tree :deep(.n-tree-node-switcher) {
  align-self: center;
}

.mobile-menu-tree :deep(.n-tree-node-content) {
  min-width: 0;
}

.mobile-menu-tree :deep(.n-tree-node-content__text) {
  min-width: 0;
  flex: 1;
}

.mobile-menu-tree :deep(.n-tree-node-content__suffix) {
  margin-left: 6px;
}

.mobile-menu-node {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.mobile-menu-node__main {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.mobile-menu-node__title,
.mobile-menu-node__meta,
.mobile-menu-actions {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 6px;
  min-width: 0;
}

.mobile-menu-node__title strong {
  min-width: 0;
  color: #0f172a;
  font-size: 14px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mobile-menu-node__path {
  min-width: 0;
  color: #64748b;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mobile-menu-node__sort {
  flex: 0 0 auto;
  color: #64748b;
  font-size: 12px;
}

.mobile-menu-actions {
  justify-content: flex-end;
  overflow-x: auto;
  max-width: 112px;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.mobile-menu-actions :deep(.n-button) {
  flex: 0 0 auto;
  min-width: 30px;
  padding: 0 7px;
}

@media (max-width: 1024px) {
  .page-layout :deep(.n-card__content) {
    padding: 12px;
  }

  .search-form :deep(.n-form),
  .search-form :deep(.n-form-item),
  .search-form :deep(.n-input),
  .search-form :deep(.n-select) {
    width: 100%;
  }
}

</style>
