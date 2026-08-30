<template>
  <div class="page-container">
    <div class="file-layout" :class="[`file-layout--${activeType}`, { 'file-layout--mobile': isMobile }]">
      <n-card class="file-list-card" size="small">
        <template #header>
          <div class="group-strip">
            <div class="group-strip-title">{{ organizerTitle }}</div>
            <div class="group-list-wrapper">
              <div class="group-list">
                <div
                    :class="['group-item', { active: activeGroupId === -1 }]"
                    @click="selectGroup(-1)"
                >
                  <div class="group-card-top">
                    <div class="group-icon">
                      <n-icon><component :is="categoryIcon"/></n-icon>
                    </div>
                    <span class="group-count">{{ categoryAllCount }}</span>
                  </div>
                  <span class="group-name">全部</span>
                </div>
                <div
                    :class="['group-item', { active: activeGroupId === null }]"
                    @click="selectGroup(null)"
                >
                  <div class="group-card-top">
                    <div class="group-icon">
                      <n-icon><FolderOutline/></n-icon>
                    </div>
                    <span class="group-count">{{ ungroupedCount }}</span>
                  </div>
                  <span class="group-name">{{ ungroupedLabel }}</span>
                </div>
                <div
                    v-for="group in groups"
                    :key="group.id"
                    :class="['group-item', { active: activeGroupId === group.id }]"
                    @click="selectGroup(group.id!)"
                    @contextmenu.prevent="showGroupMenu($event, group)"
                >
                  <div class="group-card-top">
                    <div class="group-icon">
                      <n-icon><component :is="organizerItemIcon"/></n-icon>
                    </div>
                    <div class="group-card-actions" @click.stop>
                      <span class="group-count">{{ group.fileCount || 0 }}</span>
                      <n-dropdown
                          trigger="click"
                          :options="groupMenuOptions"
                          @select="(key: string) => handleGroupAction(key, group)"
                      >
                        <n-icon class="group-more"><EllipsisHorizontalOutline/></n-icon>
                      </n-dropdown>
                    </div>
                  </div>
                  <span class="group-name">{{ group.name }}</span>
                </div>
                <button class="group-item group-add" type="button" @click="openCreateFolderModal">
                  <div class="group-card-top">
                    <div class="group-icon">
                      <n-icon><AddOutline/></n-icon>
                    </div>
                  </div>
                  <span class="group-name">{{ createOrganizerText }}</span>
                </button>
              </div>
            </div>
          </div>
          <div class="toolbar">
            <div class="toolbar-left">
              <n-select
                  v-model:value="storageFilter"
                  class="storage-filter"
                  :options="storageOptions"
                  size="small"
                  @update:value="handleStorageFilterChange"
              />
              <n-button v-if="hasPermission('sys:file:upload')" @click="openCreateFolderModal">
                <template #icon><n-icon><AddOutline/></n-icon></template>
                {{ createOrganizerText }}
              </n-button>
              <n-button
                  v-if="hasPermission('sys:file:upload') && isFolderMode"
                  type="primary"
                  :loading="uploading"
                  :disabled="uploading"
                  @click="showUploadModal = true"
              >
                <template #icon><n-icon><CloudUploadOutline/></n-icon></template>
                {{ uploadModalTitle }}
              </n-button>
              <n-button
                  v-else-if="hasPermission('sys:file:upload')"
                  type="primary"
                  :loading="uploading"
                  :disabled="uploading"
                  @click="triggerFileSelect"
              >
                <template #icon><n-icon><CloudUploadOutline/></n-icon></template>
                {{ uploadModalTitle }}
              </n-button>
              <n-button :disabled="selectedIds.length === 0" @click="handleBatchDelete">
                删除
              </n-button>
              <n-button :disabled="selectedIds.length === 0" @click="showMoveModal = true">
                移动
              </n-button>
            </div>
            <div class="toolbar-right">
              <n-input
                  v-model:value="searchName"
                  class="file-search-input"
                  placeholder="请输入文件名称"
                  clearable
                  @keyup.enter="loadFiles"
              >
                <template #suffix>
                  <n-icon style="cursor: pointer" @click="loadFiles"><SearchOutline/></n-icon>
                </template>
              </n-input>
              <n-button class="file-search-button" type="primary" @click="loadFiles">
                <template #icon><n-icon><SearchOutline/></n-icon></template>
                搜索
              </n-button>
              <n-button-group class="file-view-toggle">
                <n-button :type="viewMode === 'list' ? 'primary' : 'default'" @click="viewMode = 'list'">
                  <template #icon><n-icon><ListOutline/></n-icon></template>
                </n-button>
                <n-button :type="viewMode === 'grid' ? 'primary' : 'default'" @click="viewMode = 'grid'">
                  <template #icon><n-icon><GridOutline/></n-icon></template>
                </n-button>
              </n-button-group>
            </div>
          </div>
          <div class="storage-hint">
            当前上传目标：{{ currentStorageLabel }}；列表范围：{{ selectedStorageLabel }}
          </div>
        </template>

        <div class="file-manager-body" @dragover.prevent="handleDragOver" @dragleave.prevent="handleDragLeave" @drop.prevent="handleDrop">
          <!-- 拖拽上传遮罩 -->
          <Transition name="fade">
            <div v-if="isDragging" class="drag-overlay">
              <div class="drag-content">
                <n-icon size="64" color="#fff"><CloudUploadOutline/></n-icon>
                <h3>{{ dragUploadTitle }}</h3>
                <p>{{ dragUploadHint }}</p>
              </div>
            </div>
          </Transition>

          <div v-if="isFolderMode" class="folder-breadcrumb">
            <n-breadcrumb>
              <n-breadcrumb-item @click="selectGroup(null)">
                <n-icon><FolderOutline/></n-icon>
                根目录
              </n-breadcrumb-item>
              <n-breadcrumb-item
                  v-for="folder in breadcrumb"
                  :key="folder.id"
                  @click="selectGroup(folder.id!)"
              >
                {{ folder.name }}
              </n-breadcrumb-item>
            </n-breadcrumb>
          </div>

          <!-- 全选栏 -->
          <div class="select-all-bar">
            <n-checkbox
                :checked="isAllSelected"
                :indeterminate="isIndeterminate"
                @update:checked="handleSelectAll"
            >
              全选
            </n-checkbox>
            <n-button text size="small" :disabled="files.length === 0" @click="handleInvertSelection">
              反选
            </n-button>
          </div>

          <!-- 文件列表区 -->
          <div class="file-content-wrapper">
            <n-spin :show="loading" class="file-spin">
              <div v-if="!hasContent" class="empty-state">
                <n-empty description="暂无数据">
                  <template #extra>
                    <p class="upload-hint">
                      <n-icon size="16"><CloudUploadOutline/></n-icon>
                      {{ emptyUploadHint }}
                    </p>
                  </template>
                </n-empty>
              </div>

              <!-- 平铺视图 -->
              <div v-else-if="viewMode === 'grid'" class="file-grid">
                <div
                    v-for="folder in visibleFolders"
                    :key="`folder-${folder.id}`"
                    class="file-card folder-card"
                    @dblclick="selectGroup(folder.id!)"
                    @click="selectGroup(folder.id!)"
                >
                  <div class="file-preview">
                    <div class="file-icon">
                      <n-icon size="52" color="#f59e0b"><FolderOpenOutline/></n-icon>
                    </div>
                  </div>
                  <div class="file-name" :title="folder.name">{{ folder.name }}</div>
                  <div class="file-meta folder-meta">
                    <span>{{ folder.childCount || 0 }} 个文件夹</span>
                    <span>{{ folder.fileCount || 0 }} 个文件</span>
                  </div>
                  <div class="file-actions">
                    <a @click.stop="handleGroupAction('edit', folder)">重命名</a>
                    <span>|</span>
                    <a class="danger-action" @click.stop="handleGroupAction('delete', folder)">删除</a>
                  </div>
                </div>
                <div
                    v-for="file in files"
                    :key="file.id"
                    :class="['file-card', { selected: selectedIds.includes(file.id!) }]"
                    @click="toggleSelect(file)"
                >
                  <div class="file-checkbox" @click.stop>
                    <n-checkbox :checked="selectedIds.includes(file.id!)" @update:checked="toggleSelect(file)"/>
                  </div>
                  <div class="file-preview" @click.stop="handlePreview(file)">
                    <img v-if="isImage(file)" :src="getFileThumbnailUrl(file)" :alt="file.originalName" loading="lazy" decoding="async"/>
                    <div v-else-if="isVideo(file)" class="file-icon">
                      <n-icon size="48" :color="getFileIconColor(file)">
                        <component :is="getFileIcon(file)"/>
                      </n-icon>
                    </div>
                    <div v-else class="file-icon">
                      <n-icon size="48" :color="getFileIconColor(file)">
                        <component :is="getFileIcon(file)"/>
                      </n-icon>
                    </div>
                  </div>
                  <div class="file-name" :title="file.originalName">{{ file.originalName }}</div>
                  <div class="file-actions">
                    <a @click.stop="handleRename(file)">重命名</a>
                    <span>|</span>
                    <a @click.stop="handleDownload(file)">下载</a>
                    <span v-if="isPreviewable(file)">|</span>
                    <a v-if="isPreviewable(file)" @click.stop="handlePreview(file)">查看</a>
                    <span>|</span>
                    <a class="danger-action" @click.stop="handleDelete(file)">删除</a>
                  </div>
                </div>
              </div>

              <!-- 列表视图 -->
              <div v-else class="file-list">
                <div
                    v-for="folder in visibleFolders"
                    :key="`folder-${folder.id}`"
                    class="file-row folder-row"
                    @dblclick="selectGroup(folder.id!)"
                    @click="selectGroup(folder.id!)"
                >
                  <div class="file-preview-small">
                    <n-icon size="32" color="#f59e0b"><FolderOpenOutline/></n-icon>
                  </div>
                  <div class="file-info">
                    <div class="file-name">{{ folder.name }}</div>
                    <div class="file-meta">
                      <span>{{ folder.childCount || 0 }} 个文件夹</span>
                      <span>{{ folder.fileCount || 0 }} 个文件</span>
                    </div>
                  </div>
                  <div class="file-actions" @click.stop>
                    <n-button size="small" quaternary @click="handleGroupAction('edit', folder)">重命名</n-button>
                    <n-button size="small" quaternary type="error" @click="handleGroupAction('delete', folder)">删除</n-button>
                  </div>
                </div>
                <div
                    v-for="file in files"
                    :key="file.id"
                    :class="['file-row', { selected: selectedIds.includes(file.id!) }]"
                    @click="toggleSelect(file)"
                >
                  <div class="file-checkbox" @click.stop>
                    <n-checkbox :checked="selectedIds.includes(file.id!)" @update:checked="toggleSelect(file)"/>
                  </div>
                  <div class="file-preview-small" @click.stop="handlePreview(file)">
                    <img v-if="isImage(file)" :src="getFileThumbnailUrl(file, 80, 80)" :alt="file.originalName" loading="lazy" decoding="async"/>
                    <n-icon v-else size="32" :color="getFileIconColor(file)">
                      <component :is="getFileIcon(file)"/>
                    </n-icon>
                  </div>
                  <div class="file-info">
                    <div class="file-name">{{ file.originalName }}</div>
                    <div class="file-meta">
                      <span>{{ formatFileSize(file.fileSize) }}</span>
                      <span>{{ file.createTime }}</span>
                    </div>
                  </div>
                  <div class="file-actions" @click.stop>
                    <n-button size="small" quaternary @click="handlePreview(file)">预览</n-button>
                    <n-button size="small" quaternary @click="handleDownload(file)">下载</n-button>
                    <n-button size="small" quaternary @click="handleRename(file)">重命名</n-button>
                    <n-button size="small" quaternary type="error" @click="handleDelete(file)">删除</n-button>
                  </div>
                </div>
              </div>
            </n-spin>
          </div>
        </div>

        <template #footer>
          <div class="pagination" style="display: flex; justify-content: flex-end; margin-top: 12px; align-items: center; gap: 12px;">
            <n-pagination
                v-model:page="pagination.page"
                v-model:page-size="pagination.pageSize"
                :item-count="pagination.itemCount"
                :page-sizes="[10, 20, 50, 100]"
                :show-size-picker="!isMobile"
                :show-quick-jumper="!isMobile"
                @update:page="loadFiles"
                @update:page-size="handlePageSizeChange"
            >
              <template #prefix>
                共 {{ pagination.itemCount }} 条
              </template>
            </n-pagination>
          </div>
        </template>
      </n-card>
    </div>

    <!-- 各种弹窗 -->
    <!-- 上传弹窗 -->
    <n-modal v-model:show="showUploadModal" preset="dialog" :title="uploadModalTitle">
      <div class="upload-dialog">
        <n-button type="primary" block :loading="uploading" :disabled="uploading" @click="triggerFileSelect">
          <template #icon><n-icon><component :is="categoryIcon"/></n-icon></template>
          {{ uploadFileButtonText }}
        </n-button>
        <n-button v-if="isFolderMode" block :disabled="uploading" @click="triggerFolderSelect">
          <template #icon><n-icon><FolderOpenOutline/></n-icon></template>
          选择文件夹
        </n-button>
      </div>
      <template #action>
        <n-button @click="showUploadModal = false">关闭</n-button>
      </template>
    </n-modal>

    <input
        ref="fileInputRef"
        class="hidden-upload-input"
        type="file"
        :accept="uploadAccept"
        multiple
        @change="handleFileInputChange"
    />
    <input
        v-if="isFolderMode"
        ref="folderInputRef"
        class="hidden-upload-input"
        type="file"
        multiple
        webkitdirectory
        directory
        @change="handleFolderInputChange"
    />

    <!-- 新增/编辑分组或文件夹弹窗 -->
    <n-modal v-model:show="showGroupModal" preset="dialog" :title="organizerModalTitle">
      <n-form :model="groupForm">
        <n-form-item :label="organizerInputLabel" required>
          <n-input v-model:value="groupForm.name" :placeholder="organizerInputPlaceholder"/>
        </n-form-item>
      </n-form>
      <template #action>
        <n-space>
          <n-button @click="showGroupModal = false">取消</n-button>
          <n-button type="primary" @click="handleSaveGroup">确定</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 移动到文件夹弹窗 -->
    <n-modal v-model:show="showMoveModal" preset="dialog" :title="moveModalTitle">
      <n-form>
        <n-form-item :label="moveTargetLabel">
          <n-select
              v-model:value="moveTargetGroupId"
              :options="moveGroupOptions"
              :placeholder="moveTargetPlaceholder"
          />
        </n-form-item>
      </n-form>
      <template #action>
        <n-space>
          <n-button @click="showMoveModal = false">取消</n-button>
          <n-button type="primary" @click="handleMoveFiles">确定</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 重命名弹窗 -->
    <n-modal v-model:show="showRenameModal" preset="dialog" title="重命名">
      <n-form>
        <n-form-item label="文件名">
          <n-input v-model:value="renameValue" placeholder="请输入新文件名"/>
        </n-form-item>
      </n-form>
      <template #action>
        <n-space>
          <n-button @click="showRenameModal = false">取消</n-button>
          <n-button type="primary" @click="handleSaveRename">确定</n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 预览弹窗 -->
    <n-modal v-model:show="previewVisible" preset="card" title="文件预览" :style="previewModalStyle">
      <div v-if="isImage(previewFile)" class="image-preview-shell">
        <div class="image-preview-toolbar">
          <n-button size="small" secondary @click="zoomOutImage">缩小</n-button>
          <span class="image-preview-scale">{{ imageZoomPercent }}%</span>
          <n-button size="small" secondary @click="zoomInImage">放大</n-button>
          <n-button size="small" tertiary @click="resetImageZoom">重置</n-button>
        </div>
        <div
            class="image-preview-viewport"
            :class="{ 'image-preview-viewport--dragging': imageDragging }"
            @wheel.prevent="handleImageWheel"
            @pointerdown="handleImageDragStart"
            @pointermove="handleImageDragMove"
            @pointerup="handleImageDragEnd"
            @pointercancel="handleImageDragEnd"
            @pointerleave="handleImageDragEnd"
        >
          <img
              :src="previewUrl"
              alt="预览"
              class="preview-image"
              :style="imagePreviewStyle"
              draggable="false"
          />
        </div>
      </div>
      <div v-else class="preview-container">
        <!-- 图片预览 -->
        <!-- 视频预览 -->
        <video v-if="isVideo(previewFile)" :src="previewUrl" controls class="preview-video"/>
        <!-- 音频预览 -->
        <audio v-else-if="isAudio(previewFile)" :src="previewUrl" controls/>
        <!-- PDF预览 -->
        <iframe v-else-if="isPdf(previewFile)" :src="previewUrl" class="preview-pdf"/>
        <!-- 文本/代码预览 -->
        <div v-else-if="isText(previewFile)" class="preview-text">
          <n-spin :show="textLoading">
            <n-code :code="previewText" :language="getCodeLanguage(previewFile)" show-line-numbers/>
          </n-spin>
        </div>
        <!-- Office文档预览 -->
        <div v-else-if="isOffice(previewFile)" class="preview-office">
          <iframe :src="getOfficePreviewUrl(previewFile)" class="preview-office-frame" frameborder="0" allowfullscreen />
        </div>
        <!-- 其他文件 -->
        <div v-else class="preview-other">
          <n-icon size="64"><DocumentOutline/></n-icon>
          <p>{{ previewFile?.originalName }}</p>
          <p class="preview-tip">该文件类型暂不支持预览</p>
          <n-button type="primary" @click="handleDownload(previewFile!)">下载文件</n-button>
        </div>
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import {ref, reactive, computed, onMounted, watch} from 'vue'
import {useRoute} from 'vue-router'
import {useMessage, useDialog} from 'naive-ui'
import {
  CloudUploadOutline, SearchOutline, ListOutline, GridOutline, FolderOutline,
  AddOutline, EllipsisHorizontalOutline, DocumentOutline, DocumentTextOutline,
  ImageOutline, VideocamOutline, CodeSlashOutline, FolderOpenOutline
} from '@vicons/ionicons5'
import {
  fileApi,
  fileConfigApi,
  fileGroupApi,
  type FileUploadBatchResult,
  type SysFile,
  type SysFileConfig,
  type SysFileGroup
} from '@/api/system'
import {useUserStore} from '@/stores/user'
import {normalizeApiAssetUrl} from '@/config/app'
import {useResponsive} from '@/composables/useResponsive'

const message = useMessage()
const dialog = useDialog()
const route = useRoute()
const userStore = useUserStore()
const {isMobile} = useResponsive()
const hasPermission = (permission: string) => userStore.hasPermission(permission)

type FileCategory = 'image' | 'video' | 'file'
type UploadFileWithPath = File & { webkitRelativePath?: string; relativePath?: string }
type DropEntry = {
  name: string
  isFile: boolean
  isDirectory: boolean
  file?: (callback: (file: File) => void) => void
  createReader?: () => { readEntries: (callback: (entries: DropEntry[]) => void) => void }
}
type DropItem = DataTransferItem & { webkitGetAsEntry?: () => DropEntry | null }
type PreparedUploadFile = {
  file: File
  relativePath?: string
}
type UploadValidationResult = PreparedUploadFile & {
  reason?: string
}

const UPLOAD_BATCH_SIZE = 10
const IMAGE_HEADER_READ_SIZE = 512

const props = defineProps<{
  category?: FileCategory
}>()

// 文件类型标签
const routeCategoryMap: Record<string, FileCategory> = {
  '/system/image': 'image',
  '/system/video': 'video',
  '/system/file': 'file'
}

function resolveCategory(): FileCategory {
  return props.category || routeCategoryMap[route.path] || 'file'
}

const activeType = ref<FileCategory>(resolveCategory())
const isFolderMode = computed(() => activeType.value === 'file')

type StorageFilter = 'current' | 'all' | string

const storageFilter = ref<StorageFilter>('current')
const fileConfigs = ref<SysFileConfig[]>([])
const currentStorageType = computed(() => fileConfigs.value.find(item => item.master === 1)?.storageType || '')
const storageNameMap = computed(() => new Map(fileConfigs.value.map(item => [item.storageType, item.name || item.storageType])))
const currentStorageLabel = computed(() => storageNameMap.value.get(currentStorageType.value) || currentStorageType.value || '当前主存储')
const selectedStorageLabel = computed(() => {
  if (storageFilter.value === 'current') {
    return `当前存储（${currentStorageLabel.value}）`
  }
  if (storageFilter.value === 'all') {
    return '全部存储'
  }
  return storageNameMap.value.get(storageFilter.value) || storageFilter.value
})
const storageOptions = computed(() => {
  const options = [
    {label: `当前存储（${currentStorageLabel.value}）`, value: 'current'},
    {label: '全部存储', value: 'all'}
  ]
  const used = new Set(options.map(item => item.value))
  fileConfigs.value.forEach(item => {
    if (item.storageType && !used.has(item.storageType)) {
      options.push({label: item.name || item.storageType, value: item.storageType})
      used.add(item.storageType)
    }
  })
  return options
})
const selectedStorageParam = computed(() => storageFilter.value)

const categoryTitle = computed(() => {
  if (activeType.value === 'image') return '图片'
  if (activeType.value === 'video') return '视频'
  return '文件'
})

const categoryIcon = computed(() => {
  if (activeType.value === 'image') return ImageOutline
  if (activeType.value === 'video') return VideocamOutline
  return DocumentOutline
})

const organizerTitle = computed(() => isFolderMode.value ? '文件夹' : `${categoryTitle.value}分组`)
const ungroupedLabel = computed(() => isFolderMode.value ? '根目录' : '未分组')
const createOrganizerText = computed(() => isFolderMode.value ? '新建文件夹' : '新建分组')
const organizerItemIcon = computed(() => isFolderMode.value ? FolderOpenOutline : categoryIcon.value)
const organizerInputLabel = computed(() => isFolderMode.value ? '文件夹名称' : '分组名称')
const organizerInputPlaceholder = computed(() => isFolderMode.value ? '请输入文件夹名称' : '请输入分组名称')
const organizerModalTitle = computed(() => {
  if (editingGroup.value) return isFolderMode.value ? '重命名文件夹' : '重命名分组'
  return createOrganizerText.value
})
const moveModalTitle = computed(() => isFolderMode.value ? '移动到文件夹' : '移动到分组')
const moveTargetLabel = computed(() => isFolderMode.value ? '目标文件夹' : '目标分组')
const moveTargetPlaceholder = computed(() => isFolderMode.value ? '请选择文件夹' : '请选择分组')

const uploadAccept = computed(() => {
  if (activeType.value === 'image') return 'image/*'
  if (activeType.value === 'video') return 'video/*'
  return undefined
})

const uploadModalTitle = computed(() => {
  if (activeType.value === 'image') return '上传图片'
  if (activeType.value === 'video') return '上传视频'
  return '上传文件'
})

const uploadFileButtonText = computed(() => {
  if (activeType.value === 'image') return '选择图片'
  if (activeType.value === 'video') return '选择视频'
  return '选择文件'
})

const dragUploadTitle = computed(() => {
  if (activeType.value === 'image') return '松开鼠标上传图片'
  if (activeType.value === 'video') return '松开鼠标上传视频'
  return '松开鼠标上传文件'
})

const dragUploadHint = computed(() => {
  if (activeType.value === 'image') return '支持拖拽多张图片到当前分组'
  if (activeType.value === 'video') return '支持拖拽多个视频到当前分组'
  return '支持多文件或文件夹同时上传'
})

const emptyUploadHint = computed(() => {
  if (activeType.value === 'image') return '支持拖拽图片到此区域批量上传'
  if (activeType.value === 'video') return '支持拖拽视频到此区域批量上传'
  return '支持拖拽文件或文件夹到此区域批量上传'
})

// 分组相关
const groups = ref<SysFileGroup[]>([])
const allGroups = ref<SysFileGroup[]>([])
const breadcrumb = ref<SysFileGroup[]>([])
const ungroupedCount = ref(0)
const categoryAllCount = ref(0)
const activeGroupId = ref<number | null>(activeType.value === 'file' ? null : -1)

// 视图模式
const viewMode = ref<'list' | 'grid'>('grid')

// 搜索
const searchName = ref('')

// 文件列表
const files = ref<SysFile[]>([])
const thumbnailRefreshVersion = ref(Date.now())
const visibleFolders = computed(() => isFolderMode.value && activeGroupId.value !== -1 ? groups.value : [])
const hasContent = computed(() => files.value.length > 0 || visibleFolders.value.length > 0)
const loading = ref(false)
const uploading = ref(false)
const selectedIds = ref<number[]>([])
const pagination = reactive({
  page: 1,
  pageSize: 20,
  itemCount: 0
})

// 分组弹窗
const showGroupModal = ref(false)
const editingGroup = ref<SysFileGroup | null>(null)
const groupForm = reactive({name: ''})
const showUploadModal = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
const folderInputRef = ref<HTMLInputElement | null>(null)

// 移动弹窗
const showMoveModal = ref(false)
const moveTargetGroupId = ref<number | null>(null)

// 重命名弹窗
const showRenameModal = ref(false)
const renameValue = ref('')
const renamingFile = ref<SysFile | null>(null)

// 预览
const previewVisible = ref(false)
const previewFile = ref<SysFile | null>(null)
const previewUrl = ref('')
const previewText = ref('')
const textLoading = ref(false)
const imageZoom = ref(1)
const imageOffsetX = ref(0)
const imageOffsetY = ref(0)
const imageZoomPercent = computed(() => Math.round(imageZoom.value * 100))
const imagePreviewStyle = computed(() => ({
  transform: `translate(${imageOffsetX.value}px, ${imageOffsetY.value}px) scale(${imageZoom.value})`
}))
const imageDragging = ref(false)
const imageDragState = reactive({
  startX: 0,
  startY: 0,
  offsetX: 0,
  offsetY: 0
})

// 预览弹窗样式（根据文件类型调整大小）
const previewModalStyle = computed(() => {
  if (!previewFile.value) return {width: '800px'}
  if (isPdf(previewFile.value) || isOffice(previewFile.value)) {
    return {width: '90vw', height: '90vh'}
  }
  if (isText(previewFile.value)) {
    return {width: '900px', maxHeight: '80vh'}
  }
  return {width: '800px'}
})

function clampImageZoom(value: number) {
  return Math.min(Math.max(value, 0.2), 5)
}

function setImageZoom(value: number) {
  imageZoom.value = Number(clampImageZoom(value).toFixed(2))
}

function zoomInImage() {
  setImageZoom(imageZoom.value + 0.2)
}

function zoomOutImage() {
  setImageZoom(imageZoom.value - 0.2)
}

function resetImageZoom() {
  setImageZoom(1)
  imageOffsetX.value = 0
  imageOffsetY.value = 0
  imageDragging.value = false
}

function handleImageWheel(event: WheelEvent) {
  const delta = event.deltaY > 0 ? -0.1 : 0.1
  setImageZoom(imageZoom.value + delta)
}

function handleImageDragStart(event: PointerEvent) {
  if (event.button !== 0 || !(event.currentTarget instanceof HTMLElement)) {
    return
  }
  const target = event.currentTarget
  imageDragging.value = true
  imageDragState.startX = event.clientX
  imageDragState.startY = event.clientY
  imageDragState.offsetX = imageOffsetX.value
  imageDragState.offsetY = imageOffsetY.value
  target.setPointerCapture?.(event.pointerId)
}

function handleImageDragMove(event: PointerEvent) {
  if (!imageDragging.value || !(event.currentTarget instanceof HTMLElement)) {
    return
  }
  event.preventDefault()
  imageOffsetX.value = imageDragState.offsetX + event.clientX - imageDragState.startX
  imageOffsetY.value = imageDragState.offsetY + event.clientY - imageDragState.startY
}

function handleImageDragEnd(event: PointerEvent) {
  if (event.currentTarget instanceof HTMLElement) {
    event.currentTarget.releasePointerCapture?.(event.pointerId)
  }
  imageDragging.value = false
}

// 拖拽上传
const isDragging = ref(false)
let dragCounter = 0

// 分组菜单选项
const groupMenuOptions = [
  {label: '编辑', key: 'edit'},
  {label: '删除', key: 'delete'}
]

// 移动分组选项
const moveGroupOptions = computed(() => {
  if (!isFolderMode.value) {
    return [
      {label: '未分组', value: null},
      ...allGroups.value
          .filter(item => item.parentId == null)
          .map(item => ({label: item.name, value: item.id}))
    ]
  }
  return [
    {label: '根目录', value: null},
    ...flattenFolderOptions(allGroups.value)
  ]
})

// 全选相关
const isAllSelected = computed(() => files.value.length > 0 && selectedIds.value.length === files.value.length)
const isIndeterminate = computed(() => selectedIds.value.length > 0 && selectedIds.value.length < files.value.length)

// 加载分组
async function loadGroups() {
  try {
    const storageType = selectedStorageParam.value
    const allRes = await fileGroupApi.list({groupScope: activeType.value, storageType})
    if (isFolderMode.value) {
      groups.value = await fileGroupApi.children({
        groupScope: activeType.value,
        parentId: activeGroupId.value === -1 ? null : activeGroupId.value,
        storageType
      })
      breadcrumb.value = await fileGroupApi.breadcrumb(activeGroupId.value === -1 ? null : activeGroupId.value)
    } else {
      groups.value = allRes.groups.filter(item => item.parentId == null)
      breadcrumb.value = []
    }
    allGroups.value = allRes.groups
    ungroupedCount.value = allRes.ungroupedCount
    categoryAllCount.value = Number(allRes.allCount || 0)
  } catch (error) {
    // 错误已在拦截器处理
  }
}

// 加载文件
async function loadFiles() {
  loading.value = true
  selectedIds.value = []
  try {
    const res = await fileApi.pageByGroup({
      page: pagination.page,
      pageSize: pagination.pageSize,
      groupId: activeGroupId.value,
      fileScope: activeType.value,
      originalName: searchName.value || undefined,
      storageType: selectedStorageParam.value
    })
    files.value = res.list
    pagination.itemCount = Number(res.total)
    if (activeGroupId.value === -1) {
      categoryAllCount.value = pagination.itemCount
    }
  } catch (error) {
    // 错误已在拦截器处理
  } finally {
    loading.value = false
  }
}

function handlePageSizeChange(pageSize: number) {
  pagination.pageSize = pageSize
  pagination.page = 1
  loadFiles()
}

function handleStorageFilterChange() {
  activeGroupId.value = activeType.value === 'file' ? null : -1
  pagination.page = 1
  loadGroups()
  loadFiles()
}

async function loadStorageConfigs() {
  try {
    fileConfigs.value = await fileConfigApi.list()
  } catch (error) {
    fileConfigs.value = []
  }
}

// 选择分组
function selectGroup(groupId: number | null) {
  activeGroupId.value = groupId
  pagination.page = 1
  loadGroups()
  loadFiles()
}

// 选择/取消选择文件
function toggleSelect(file: SysFile) {
  const idx = selectedIds.value.indexOf(file.id!)
  if (idx === -1) {
    selectedIds.value.push(file.id!)
  } else {
    selectedIds.value.splice(idx, 1)
  }
}

// 全选/取消全选
function handleSelectAll(checked: boolean) {
  if (checked) {
    selectedIds.value = files.value.map(f => f.id!)
  } else {
    selectedIds.value = []
  }
}

function handleInvertSelection() {
  const currentIds = files.value.map(f => f.id!).filter(Boolean)
  const selectedSet = new Set(selectedIds.value)
  selectedIds.value = currentIds.filter(id => !selectedSet.has(id))
}

// 分组操作
function handleGroupAction(key: string, group: SysFileGroup) {
  if (key === 'edit') {
    editingGroup.value = group
    groupForm.name = group.name
    showGroupModal.value = true
  } else if (key === 'delete') {
    dialog.warning({
      title: '提示',
      content: isFolderMode.value
          ? `确定要删除文件夹"${group.name}"吗？文件夹内的文件将移动到上级目录。`
          : `确定要删除分组"${group.name}"吗？分组内的文件将移动到未分组。`,
      positiveText: '确定',
      negativeText: '取消',
      onPositiveClick: async () => {
        try {
          await fileGroupApi.delete(group.id!)
          message.success('删除成功')
          loadGroups()
          if (activeGroupId.value === group.id) {
            selectGroup(group.parentId ?? null)
          }
        } catch (error) {
          // 错误已在拦截器处理
        }
      }
    })
  }
}

function showGroupMenu(_e: MouseEvent, _group: SysFileGroup) {
  // 右键菜单暂不实现，使用下拉菜单
}

function openCreateFolderModal() {
  editingGroup.value = null
  groupForm.name = ''
  showGroupModal.value = true
}

// 保存分组
async function handleSaveGroup() {
  if (!groupForm.name.trim()) {
    message.warning(organizerInputPlaceholder.value)
    return
  }
  try {
    if (editingGroup.value) {
      await fileGroupApi.update({id: editingGroup.value.id, name: groupForm.name, groupScope: activeType.value})
      message.success('更新成功')
    } else {
      await fileGroupApi.create({
        name: groupForm.name,
        groupScope: activeType.value,
        parentId: isFolderMode.value && activeGroupId.value !== -1 ? activeGroupId.value : null
      })
      message.success('创建成功')
    }
    showGroupModal.value = false
    editingGroup.value = null
    groupForm.name = ''
    loadGroups()
  } catch (error) {
    // 错误已在拦截器处理
  }
}

// 获取当前上传目标分组ID
function getUploadGroupId(): number | null {
  if (activeGroupId.value === -1 || activeGroupId.value === null) {
    return null
  }
  return activeGroupId.value
}

function triggerFileSelect() {
  if (uploading.value) return
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
    fileInputRef.value.click()
  }
}

function triggerFolderSelect() {
  if (uploading.value) return
  if (folderInputRef.value) {
    folderInputRef.value.value = ''
    folderInputRef.value.click()
  }
}

async function handleFileInputChange(event: Event) {
  if (uploading.value) return
  const input = event.target as HTMLInputElement
  const selectedFiles = Array.from(input.files || [])
  if (selectedFiles.length === 0) return
  await uploadFilesToCurrentFolder(selectedFiles)
  input.value = ''
}

async function handleFolderInputChange(event: Event) {
  if (uploading.value) return
  const input = event.target as HTMLInputElement
  const selectedFiles = Array.from(input.files || [])
  if (selectedFiles.length === 0) return
  await uploadFilesToCurrentFolder(selectedFiles)
  input.value = ''
}

async function uploadFilesToCurrentFolder(uploadFiles: File[]) {
  const result = await uploadPreparedFiles(uploadFiles.map(uploadFile => ({
    file: uploadFile,
    relativePath: isFolderMode.value ? getRelativePath(uploadFile) : undefined
  })))
  showUploadResult(result)
}

async function uploadPreparedFiles(uploadFiles: PreparedUploadFile[]): Promise<FileUploadBatchResult> {
  if (uploading.value) {
    return {
      successCount: 0,
      failCount: uploadFiles.length,
      successFiles: [],
      failFiles: uploadFiles.map(item => ({fileName: item.file.name, reason: '文件正在上传中'}))
    }
  }
  uploading.value = true
  const validationResults = await Promise.all(uploadFiles.map(validatePreparedUploadFile))
  const validFiles = validationResults.filter(item => !item.reason)
  const result: FileUploadBatchResult = {
    successCount: 0,
    failCount: validationResults.length - validFiles.length,
    successFiles: [],
    failFiles: validationResults
        .filter(item => item.reason)
        .map(item => ({fileName: item.file.name, reason: item.reason || '文件类型不符合当前资源库'}))
  }

  try {
    if (validFiles.length === 0) {
      return result
    }

    const uploadGroupId = getUploadGroupId()
    for (let index = 0; index < validFiles.length; index += UPLOAD_BATCH_SIZE) {
      const batch = validFiles.slice(index, index + UPLOAD_BATCH_SIZE)
      try {
        const batchResult = await fileApi.uploadBatch(batch.map(item => item.file), {
          groupId: uploadGroupId,
          fileScope: activeType.value,
          relativePaths: batch.map(item => item.relativePath || item.file.name)
        })
        mergeUploadResult(result, batchResult)
      } catch (error) {
        batch.forEach(item => {
          result.failFiles.push({fileName: item.file.name, reason: error instanceof Error ? error.message : '上传失败'})
        })
        result.failCount = result.failFiles.length
      }
    }

    if (result.successCount > 0) {
      await sleep(600)
      thumbnailRefreshVersion.value = Date.now()
      await loadFiles()
      await loadGroups()
    }

    return result
  } finally {
    uploading.value = false
  }
}

function mergeUploadResult(target: FileUploadBatchResult, source: FileUploadBatchResult) {
  target.successFiles.push(...(source.successFiles || []))
  target.failFiles.push(...(source.failFiles || []))
  target.successCount = target.successFiles.length
  target.failCount = target.failFiles.length
}

function showUploadResult(result: FileUploadBatchResult) {
  if (result.successCount > 0 && result.failCount === 0) {
    message.success(`已上传 ${result.successCount} 个文件`)
    return
  }
  if (result.successCount > 0) {
    message.warning(`已上传 ${result.successCount} 个文件，失败 ${result.failCount} 个`)
    return
  }
  if (result.failCount > 0) {
    const firstFailure = result.failFiles[0]
    message.error(firstFailure ? `${firstFailure.fileName} 上传失败：${firstFailure.reason}` : '上传失败')
  }
}

// 拖拽上传
function handleDragOver() {
  dragCounter++
  isDragging.value = true
}

function handleDragLeave() {
  dragCounter--
  if (dragCounter === 0) {
    isDragging.value = false
  }
}

async function handleDrop(e: DragEvent) {
  if (uploading.value) return
  isDragging.value = false
  dragCounter = 0
  const droppedFiles = await collectDroppedFiles(e)
  if (droppedFiles.length === 0) return
  await uploadFilesToCurrentFolder(droppedFiles)
}

function getRelativePath(file: File): string {
  const fileWithPath = file as UploadFileWithPath
  return fileWithPath.webkitRelativePath || fileWithPath.relativePath || file.name
}

async function collectDroppedFiles(event: DragEvent): Promise<UploadFileWithPath[]> {
  const items = Array.from(event.dataTransfer?.items || []) as DropItem[]
  const entryItems: DropEntry[] = []
  for (const item of items) {
    const entry = item.webkitGetAsEntry?.() as DropEntry | null | undefined
    if (entry) {
      entryItems.push(entry)
    }
  }
  if (entryItems.length === 0) {
    return Array.from(event.dataTransfer?.files || []) as UploadFileWithPath[]
  }
  const files: UploadFileWithPath[] = []
  for (const entry of entryItems) {
    files.push(...await readDropEntry(entry, ''))
  }
  return files
}

async function readDropEntry(entry: DropEntry, parentPath: string): Promise<UploadFileWithPath[]> {
  const currentPath = parentPath ? `${parentPath}/${entry.name}` : entry.name
  if (entry.isFile && entry.file) {
    return new Promise(resolve => {
      entry.file!(file => {
        const fileWithPath = file as UploadFileWithPath
        fileWithPath.relativePath = currentPath
        resolve([fileWithPath])
      })
    })
  }
  if (!entry.isDirectory || !entry.createReader) {
    return []
  }
  const reader = entry.createReader()
  const children = await readAllDropEntries(reader)
  const nested = await Promise.all(children.map(child => readDropEntry(child, currentPath)))
  return nested.flat()
}

async function readAllDropEntries(reader: { readEntries: (callback: (entries: DropEntry[]) => void) => void }): Promise<DropEntry[]> {
  const entries: DropEntry[] = []
  while (true) {
    const batch = await new Promise<DropEntry[]>(resolve => {
      reader.readEntries(resolve)
    })
    if (batch.length === 0) {
      return entries
    }
    entries.push(...batch)
  }
}

async function validatePreparedUploadFile(item: PreparedUploadFile): Promise<UploadValidationResult> {
  const reason = await validateUploadFile(item.file)
  return {...item, reason}
}

async function validateUploadFile(file: File): Promise<string | undefined> {
  const fileType = file.type || ''
  if (activeType.value === 'image' && !fileType.startsWith('image/')) {
    return '图片库只能上传图片文件'
  }
  if (activeType.value === 'image' && !await hasSupportedImageSignature(file)) {
    return '图片文件内容无效或格式不支持'
  }
  if (activeType.value === 'video' && !fileType.startsWith('video/')) {
    return '视频库只能上传视频文件'
  }
  if (activeType.value === 'file' && (fileType.startsWith('image/') || fileType.startsWith('video/'))) {
    return '文件库不能上传图片或视频文件'
  }
  return undefined
}

async function hasSupportedImageSignature(file: File): Promise<boolean> {
  const suffix = getFileSuffix(file.name)
  const header = new Uint8Array(await file.slice(0, IMAGE_HEADER_READ_SIZE).arrayBuffer())
  switch (suffix) {
    case 'jpg':
    case 'jpeg':
      return startsWithBytes(header, [0xFF, 0xD8, 0xFF])
    case 'png':
      return startsWithBytes(header, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
    case 'gif':
      return startsWithText(header, 'GIF87a') || startsWithText(header, 'GIF89a')
    case 'bmp':
      return startsWithText(header, 'BM')
    case 'webp':
      return header.length >= 12
          && startsWithText(header, 'RIFF')
          && header[8] === 'W'.charCodeAt(0)
          && header[9] === 'E'.charCodeAt(0)
          && header[10] === 'B'.charCodeAt(0)
          && header[11] === 'P'.charCodeAt(0)
    case 'ico':
      return startsWithBytes(header, [0x00, 0x00, 0x01, 0x00])
    case 'svg':
      return headerText(header).includes('<svg') || headerText(header).includes(':svg')
    default:
      return false
  }
}

function getFileSuffix(fileName: string): string {
  const index = fileName.lastIndexOf('.')
  return index >= 0 ? fileName.slice(index + 1).toLowerCase() : ''
}

function startsWithBytes(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) return false
  return signature.every((value, index) => bytes[index] === value)
}

function startsWithText(bytes: Uint8Array, signature: string): boolean {
  if (bytes.length < signature.length) return false
  return Array.from(signature).every((char, index) => bytes[index] === char.charCodeAt(0))
}

function headerText(bytes: Uint8Array): string {
  return new TextDecoder('utf-8', {fatal: false}).decode(bytes).toLowerCase()
}

// 预览
async function handlePreview(file: SysFile) {
  previewFile.value = file
  resetImageZoom()
  
  // 图片、PDF、视频、音频等需要内嵌预览的文件，强制使用后端预览接口（避免云存储的attachment头导致下载）
  if (isImage(file) || isPdf(file) || isVideo(file) || isAudio(file)) {
    previewUrl.value = fileApi.getPreviewUrl(file.id!)
  } else if (file.url) {
    previewUrl.value = getFileAssetUrl(file)
  } else {
    previewUrl.value = fileApi.getPreviewUrl(file.id!)
  }
  previewText.value = ''

  if (isText(file)) {
    textLoading.value = true
    try {
      const text = await fileApi.getTextContent(file.id!)
      previewText.value = text
    } catch (error) {
      previewText.value = '无法加载文件内容'
    } finally {
      textLoading.value = false
    }
  }

  previewVisible.value = true
}

// 下载
function handleDownload(file: SysFile) {
  const link = document.createElement('a')
  link.href = fileApi.getDownloadUrl(file.id!)
  link.download = file.originalName
  link.click()
}

// 重命名
function handleRename(file: SysFile) {
  renamingFile.value = file
  renameValue.value = file.originalName
  showRenameModal.value = true
}

async function handleSaveRename() {
  if (!renameValue.value.trim()) {
    message.warning('请输入文件名')
    return
  }
  try {
    await fileApi.rename(renamingFile.value!.id!, renameValue.value)
    message.success('重命名成功')
    showRenameModal.value = false
    loadFiles()
  } catch (error) {
    // 错误已在拦截器处理
  }
}

// 删除
function handleDelete(file: SysFile) {
  dialog.warning({
    title: '提示',
    content: `确定要删除文件"${file.originalName}"吗？`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await fileApi.delete(file.id!)
        message.success('删除成功')
        loadFiles()
        loadGroups()
      } catch (error) {
        // 错误已在拦截器处理
      }
    }
  })
}

// 批量删除
function handleBatchDelete() {
  dialog.warning({
    title: '提示',
    content: `确定要删除选中的 ${selectedIds.value.length} 个文件吗？`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await fileApi.deleteBatch(selectedIds.value)
        message.success('删除成功')
        selectedIds.value = []
        loadFiles()
        loadGroups()
      } catch (error) {
        // 错误已在拦截器处理
      }
    }
  })
}

// 移动文件
async function handleMoveFiles() {
  try {
    await fileApi.moveToGroup(selectedIds.value, moveTargetGroupId.value)
    message.success('移动成功')
    showMoveModal.value = false
    selectedIds.value = []
    loadFiles()
    loadGroups()
  } catch (error) {
    // 错误已在拦截器处理
  }
}

// 文件类型判断等工具函数
function isImage(file: SysFile | null): boolean { return file?.fileType?.startsWith('image/') || false }
function isVideo(file: SysFile | null): boolean { return file?.fileType?.startsWith('video/') || false }
function isAudio(file: SysFile | null): boolean { return file?.fileType?.startsWith('audio/') || false }
function isPdf(file: SysFile | null): boolean { return file?.fileType === 'application/pdf' || file?.fileSuffix?.toLowerCase() === '.pdf' }
function isOffice(file: SysFile | null): boolean { const s = file?.fileSuffix?.toLowerCase() || ''; return ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'].includes(s) }
function isText(file: SysFile | null): boolean { if (!file) return false; const textTypes = ['text/', 'application/json', 'application/xml', 'application/javascript']; const s = file.fileSuffix?.toLowerCase() || ''; return textTypes.some(t => file.fileType?.startsWith(t)) || ['.txt', '.md', '.json', '.xml', '.yaml', '.yml', '.ini', '.conf', '.cfg', '.properties', '.js', '.ts', '.vue', '.jsx', '.tsx', '.css', '.scss', '.less', '.html', '.htm', '.java', '.py', '.go', '.rs', '.c', '.cpp', '.h', '.hpp', '.cs', '.php', '.rb', '.swift', '.kt', '.sql', '.sh', '.bat', '.ps1', '.log', '.csv'].includes(s) }
function isPreviewable(file: SysFile): boolean { return isImage(file) || isVideo(file) || isAudio(file) || isPdf(file) || isText(file) || isOffice(file) }
function getCodeLanguage(file: SysFile | null): string { const s = file?.fileSuffix?.toLowerCase() || ''; const m: any = {'.js': 'javascript', '.ts': 'typescript', '.vue': 'vue', '.json': 'json', '.java': 'java', '.py': 'python', '.md': 'markdown'}; return m[s] || 'text' }
function getFileAssetUrl(file: SysFile): string { return normalizeApiAssetUrl(file.url) || fileApi.getPreviewUrl(file.id!) }
function getFileThumbnailUrl(file: SysFile, width = 240, height = 160): string {
  if (!file.id) return getFileAssetUrl(file)
  return `${fileApi.getThumbnailUrl(file.id, width, height)}&r=${thumbnailRefreshVersion.value}`
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, ms))
}
function getOfficePreviewUrl(file: SysFile | null): string { if (!file) return ''; return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(getFileAssetUrl(file))}` }
function getFileIcon(file: SysFile) { const s = file.fileSuffix?.toLowerCase() || ''; if (['.doc', '.docx', '.xls', '.xlsx', '.pdf', '.txt', '.md'].includes(s)) return DocumentTextOutline; if (['.js', '.ts', '.vue'].includes(s)) return CodeSlashOutline; if (file.fileType?.startsWith('image/')) return ImageOutline; return DocumentOutline }
function getFileIconColor(file: SysFile) { const s = file.fileSuffix?.toLowerCase() || ''; if (['.doc', '.docx'].includes(s)) return '#2b579a'; if (['.xls', '.xlsx'].includes(s)) return '#217346'; if (['.pdf'].includes(s)) return '#f40f02'; return '#9ca3af' }
function formatFileSize(bytes: number): string { if (bytes === 0) return '0 B'; const k = 1024; const s = ['B', 'KB', 'MB', 'GB', 'TB']; const i = Math.floor(Math.log(bytes) / Math.log(k)); return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + s[i] }

function flattenFolderOptions(items: SysFileGroup[]) {
  return items.map(item => ({
    label: `${'　'.repeat(item.level || 0)}${item.name}`,
    value: item.id
  }))
}

onMounted(() => {
  loadStorageConfigs()
  loadGroups()
  loadFiles()
})

watch(
  () => [route.path, props.category] as const,
  () => {
    const nextCategory = resolveCategory()
    if (activeType.value !== nextCategory) {
      activeType.value = nextCategory
      activeGroupId.value = nextCategory === 'file' ? null : -1
      pagination.page = 1
      loadGroups()
      loadFiles()
    }
  }
)
</script>

<style scoped>
.file-layout {
  height: 100%;
}

.group-strip {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--n-border-color);
}

.group-strip-title {
  flex-shrink: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--n-text-color);
}

.group-list-wrapper {
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 2px;
}

.group-list {
  display: flex;
  align-items: stretch;
  gap: 8px;
  min-width: max-content;
}

.group-item {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 108px;
  min-height: 64px;
  padding: 8px 10px;
  cursor: pointer;
  gap: 6px;
  position: relative;
  border: 1px solid var(--n-border-color);
  border-radius: 6px;
  background: var(--n-color);
  color: var(--n-text-color);
  transition: border-color 0.2s, background 0.2s, box-shadow 0.2s, transform 0.2s;
}

.group-item:hover {
  border-color: var(--n-primary-color);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06);
  transform: translateY(-1px);
}

.group-item.active {
  border-color: var(--n-primary-color);
  background: var(--n-primary-color-hover);
}

.group-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.group-card-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.group-icon {
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: var(--n-action-color);
  color: var(--n-text-color-3);
  font-size: 15px;
}

.group-item.active .group-icon {
  background: var(--n-primary-color);
  color: #fff;
}

.group-name {
  display: block;
  min-width: 0;
  font-size: 13px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-count {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--n-hover-color);
  color: var(--n-text-color-3);
  font-size: 11px;
  line-height: 18px;
  text-align: center;
}

.group-item.active .group-count {
  background: #fff;
  color: var(--n-primary-color);
}

.group-more {
  width: 18px;
  height: 18px;
  opacity: 0;
  transition: opacity 0.2s;
}
.group-item:hover .group-more,
.group-item.active .group-more { opacity: 1; }

.group-add {
  border-style: dashed;
  color: var(--n-primary-color);
}

.file-list-card {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 160px);
}

.file-list-card :deep(.n-card-header) {
  display: block;
}

.file-list-card :deep(.n-card__content) {
  padding: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toolbar-left, .toolbar-right { display: flex; align-items: center; gap: 8px; }

.storage-filter {
  width: 190px;
  flex-shrink: 0;
}

.storage-hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--n-text-color-3);
}

.upload-dialog {
  display: grid;
  gap: 10px;
  padding-top: 4px;
}

.upload-dialog :deep(.n-button) {
  width: 100%;
}

.hidden-upload-input {
  display: none;
}

.file-search-input {
  width: 200px;
}

.file-search-button {
  display: none;
}

.file-manager-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.folder-breadcrumb {
  padding: 8px 16px;
  border-bottom: 1px solid var(--n-border-color);
  background: var(--n-color);
}

.select-all-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--n-border-color);
}

.file-content-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.file-spin { height: 100%; }

.empty-state { height: 100%; display: flex; align-items: center; justify-content: center; min-height: 300px; }
.upload-hint { display: flex; align-items: center; gap: 6px; color: var(--n-text-color-3); font-size: 13px; margin-top: 8px; }

/* 平铺视图 */
.file-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
}

.file-card {
  border: 1px solid var(--n-border-color);
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
}

.file-card:hover { border-color: var(--n-primary-color); box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.file-card.selected { border-color: var(--n-primary-color); background: var(--n-primary-color-hover); }
.folder-card {
  background: color-mix(in srgb, var(--n-warning-color) 6%, var(--n-color));
}
.folder-card:hover {
  border-color: #f59e0b;
}

.file-card .file-checkbox { position: absolute; top: 8px; left: 8px; z-index: 1; }
.file-preview { width: 100%; height: 100px; display: flex; align-items: center; justify-content: center; background: var(--n-hover-color); border-radius: 4px; overflow: hidden; margin-bottom: 8px; }
.file-preview img { max-width: 100%; max-height: 100%; object-fit: contain; }
.file-preview video { max-width: 100%; max-height: 100%; }

.file-name { font-size: 13px; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.file-actions { display: flex; gap: 4px; font-size: 12px; }
.file-actions a { color: var(--n-primary-color); cursor: pointer; }
.file-actions a.danger-action { color: var(--n-error-color); }
.file-actions span { color: var(--n-text-color-3); }

/* 列表视图 */
.file-list { display: flex; flex-direction: column; }
.file-row { display: flex; align-items: center; padding: 10px 12px; border-bottom: 1px solid var(--n-border-color); cursor: pointer; gap: 12px; transition: background 0.2s; }
.file-row:hover { background: var(--n-hover-color); }
.file-row.selected { background: var(--n-primary-color-hover); }
.file-row .file-checkbox { flex-shrink: 0; }
.file-preview-small { width: 40px; height: 40px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: var(--n-hover-color); border-radius: 4px; overflow: hidden; }
.file-preview-small img { width: 100%; height: 100%; object-fit: cover; }
.file-info { flex: 1; min-width: 0; }
.file-meta { display: flex; gap: 12px; font-size: 12px; color: var(--n-text-color-3); margin-top: 2px; }
.folder-meta {
  margin-bottom: 4px;
  flex-wrap: wrap;
  gap: 4px 8px;
}
.folder-row {
  background: color-mix(in srgb, var(--n-warning-color) 5%, var(--n-color));
}

/* 分页 */
.pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}
.goto { display: flex; align-items: center; gap: 4px; }

/* 预览相关样式 */
.preview-container { display: flex; justify-content: center; align-items: center; min-height: 300px; width: 100%; }
.preview-image, .preview-video { max-width: 100%; max-height: 70vh; }
.image-preview-shell {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.image-preview-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
}

.image-preview-scale {
  min-width: 48px;
  color: var(--n-text-color-2);
  font-size: 13px;
  text-align: center;
}

.image-preview-viewport {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  max-height: 70vh;
  width: 100%;
  overflow: hidden;
  border-radius: 6px;
  background: var(--n-hover-color);
  overscroll-behavior: contain;
  cursor: grab;
  touch-action: none;
}

.image-preview-viewport--dragging {
  cursor: grabbing;
}

.image-preview-viewport .preview-image {
  display: block;
  max-width: 100%;
  max-height: 70vh;
  height: auto;
  transform-origin: center center;
  transition: transform 0.12s ease;
  user-select: none;
}

.image-preview-viewport--dragging .preview-image {
  transition: none;
}

.preview-pdf { width: 100%; height: 75vh; border: none; }
.preview-office { width: 100%; height: 75vh; }
.preview-office-frame { width: 100%; height: 100%; border: none; }
.preview-text { width: 100%; max-height: 70vh; overflow: auto; background: #1e1e1e; border-radius: 4px; padding: 12px; }

/* 拖拽上传遮罩 */
.drag-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); z-index: 100; display: flex; align-items: center; justify-content: center; }
.drag-content { text-align: center; color: #fff; padding: 40px; border: 2px dashed rgba(255,255,255,0.3); border-radius: 16px; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 768px) {
  .file-layout {
    min-width: 0;
  }

  .file-list-card {
    min-height: calc(100dvh - 76px);
  }

  .file-list-card :deep(.n-card-header) {
    padding: 12px;
  }

  .group-strip {
    align-items: stretch;
    flex-direction: column;
    gap: 8px;
    padding-bottom: 10px;
    margin-bottom: 10px;
  }

  .group-strip-title {
    font-size: 13px;
  }

  .group-list-wrapper {
    margin: 0 -2px;
  }

  .group-list {
    gap: 6px;
  }

  .group-item {
    width: 92px;
    min-height: 58px;
    padding: 7px 8px;
  }

  .group-icon {
    width: 24px;
    height: 24px;
  }

  .group-name {
    font-size: 12px;
  }

  .toolbar {
    align-items: stretch;
    flex-direction: column-reverse;
    gap: 12px;
  }

  .toolbar-left,
  .toolbar-right {
    width: 100%;
    align-items: stretch;
    min-width: 0;
  }

  .toolbar-left {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .storage-filter {
    width: 100%;
    grid-column: 1 / -1;
  }

  .file-layout--image .toolbar-left,
  .file-layout--video .toolbar-left {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .toolbar-left :deep(.n-upload),
  .toolbar-left :deep(.n-upload-trigger),
  .toolbar-left :deep(.n-button),
  .toolbar-left > .n-button {
    width: 100%;
  }

  .toolbar-right {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    gap: 8px;
    flex-shrink: 0;
  }

  .file-search-input {
    width: 100%;
    min-width: 0;
  }

  .file-search-button {
    display: inline-flex;
    flex-shrink: 0;
    min-width: 72px;
  }

  .file-view-toggle {
    flex-shrink: 0;
  }

  .toolbar-right :deep(.file-view-toggle) {
    display: flex;
    width: 82px;
  }

  .toolbar-right :deep(.file-view-toggle .n-button) {
    flex: 1 1 0;
    min-width: 0;
  }

  .select-all-bar {
    padding: 8px 12px;
  }

  .folder-breadcrumb {
    padding: 8px 12px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .file-content-wrapper {
    padding: 12px;
  }

  .file-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .file-card {
    padding: 10px;
  }

  .file-preview {
    height: 88px;
  }

  .file-actions {
    flex-wrap: wrap;
    gap: 3px 5px;
    line-height: 1.5;
  }

  .file-row {
    align-items: flex-start;
    gap: 8px;
    padding: 10px;
  }

  .file-meta {
    flex-wrap: wrap;
    gap: 4px 8px;
  }

  .pagination {
    justify-content: flex-start;
    overflow-x: auto;
    padding: 10px 12px;
    -webkit-overflow-scrolling: touch;
  }

  .preview-container {
    min-height: 220px;
  }

  .image-preview-toolbar {
    justify-content: flex-start;
  }

  .image-preview-toolbar :deep(.n-button) {
    flex: 1 1 calc(25% - 8px);
  }

  .image-preview-viewport {
    min-height: 220px;
    max-height: 62vh;
  }

  .preview-image,
  .preview-video {
    max-height: 62vh;
  }
}

@media (max-width: 380px) {
  .toolbar-right {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .file-search-input {
    grid-column: 1 / -1;
  }

  .file-search-button {
    width: 100%;
  }

  .file-view-toggle {
    justify-self: end;
  }

  .toolbar-left {
    grid-template-columns: 1fr;
  }

  .file-grid {
    grid-template-columns: 1fr;
  }
}
</style>
