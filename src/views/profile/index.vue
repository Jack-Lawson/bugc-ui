<template>
  <div class="profile-page">
    <div class="profile-layout">
      <!-- 左侧：用户信息卡片 -->
      <div class="profile-left">
        <!-- 头像卡片 -->
        <n-card class="user-card" :bordered="false">
          <div class="avatar-section">
            <div class="avatar-wrapper" @click="triggerUpload">
              <n-avatar
                :key="displayAvatar || 'profile-avatar-empty'"
                round
                :size="avatarSize"
                :src="displayAvatar || undefined"
                class="profile-avatar"
              >
                {{ formData.nickname?.charAt(0) || 'U' }}
              </n-avatar>
              <div class="avatar-overlay">
                <n-icon size="22"><CameraOutline /></n-icon>
              </div>
            </div>
            <input
              ref="fileInputRef"
              type="file"
              accept="image/*"
              style="display: none"
              @change="handleFileChange"
            />
            <h2 class="user-nickname">{{ formData.nickname || '未设置昵称' }}</h2>
            <p class="user-username">@{{ formData.username }}</p>
            <n-tag :type="formData.status === 1 ? 'success' : 'error'" size="small" round>
              {{ formData.status === 1 ? '正常' : '禁用' }}
            </n-tag>
          </div>
        </n-card>

        <!-- 基本信息卡片 -->
        <n-card class="info-card" :bordered="false">
          <template #header>
            <div class="card-header">
              <n-icon size="18"><PersonOutline /></n-icon>
              <span>基本信息</span>
            </div>
          </template>
          <div class="info-list">
            <div class="info-row">
              <span class="info-label">用户名</span>
              <span class="info-value">{{ formData.username }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">用户类型</span>
              <span class="info-value">{{ getUserTypeText(formData.userType) }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">性别</span>
              <span class="info-value">{{ getGenderText(formData.gender) }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">部门</span>
              <span class="info-value">{{ formData.deptName || '未分配' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">岗位</span>
              <span class="info-value">{{ formData.postNames || '未分配' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">注册时间</span>
              <span class="info-value">{{ formData.createTime || '-' }}</span>
            </div>
          </div>
        </n-card>
      </div>

      <!-- 右侧：编辑表单 -->
      <div class="profile-right">
        <n-card class="form-card" :bordered="false">
          <template #header>
            <div class="card-header">
              <n-icon size="18"><CreateOutline /></n-icon>
              <span>编辑资料</span>
            </div>
          </template>

          <n-form
            ref="formRef"
            :model="formData"
            :rules="rules"
            label-placement="top"
            require-mark-placement="right-hanging"
          >
            <n-grid :cols="formGridCols" :x-gap="24" :y-gap="4" responsive="screen">
              <n-gi>
                <n-form-item label="昵称" path="nickname">
                  <n-input v-model:value="formData.nickname" placeholder="请输入昵称" />
                </n-form-item>
              </n-gi>
              <n-gi>
                <n-form-item label="性别">
                  <n-radio-group v-model:value="formData.gender">
                    <n-space>
                      <n-radio :value="1">男</n-radio>
                      <n-radio :value="2">女</n-radio>
                      <n-radio :value="0">保密</n-radio>
                    </n-space>
                  </n-radio-group>
                </n-form-item>
              </n-gi>
              <n-gi>
                <n-form-item label="手机号" path="phone">
                  <n-input v-model:value="formData.phone" placeholder="请输入手机号" />
                </n-form-item>
              </n-gi>
              <n-gi>
                <n-form-item label="邮箱" path="email">
                  <n-input v-model:value="formData.email" placeholder="请输入邮箱" />
                </n-form-item>
              </n-gi>
              <n-gi :span="isMobile ? 1 : 2">
                <n-form-item label="个人简介">
                  <n-input
                    v-model:value="formData.remark"
                    type="textarea"
                    placeholder="介绍一下自己吧..."
                    :rows="4"
                  />
                </n-form-item>
              </n-gi>
            </n-grid>
          </n-form>

          <div class="form-actions">
            <n-button @click="handleReset">重置</n-button>
            <n-button type="primary" :loading="saving" @click="handleSave">
              保存修改
            </n-button>
          </div>
        </n-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useMessage, type FormInst, type FormRules } from 'naive-ui'
import { CameraOutline, PersonOutline, CreateOutline } from '@vicons/ionicons5'
import { authApi, type ProfileInfo } from '@/api/auth'
import { fileApi, userApi } from '@/api/system'
import { useUserStore } from '@/stores/user'
import { useResponsive } from '@/composables/useResponsive'
import { normalizeApiAssetUrl } from '@/config/app'

const message = useMessage()
const userStore = useUserStore()
const { isMobile, isTouchLayout } = useResponsive()

const formRef = ref<FormInst | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const loading = ref(false)
const saving = ref(false)
const avatarPreviewVersion = ref(0)

const avatarSize = computed(() => isMobile.value ? 82 : 100)
const formGridCols = computed(() => isTouchLayout.value ? 1 : 2)
const displayAvatar = computed(() => withAvatarPreviewVersion(
  normalizeApiAssetUrl(formData.value.avatar),
  avatarPreviewVersion.value
))

const formData = ref<Partial<ProfileInfo>>({
  id: 0,
  username: '',
  nickname: '',
  avatar: '',
  email: '',
  phone: '',
  gender: 0,
  status: 1,
  deptId: undefined,
  deptName: '',
  postNames: '',
  remark: '',
  userType: '',
  createTime: ''
})

const originalData = ref<Partial<ProfileInfo>>({})

const rules: FormRules = {
  nickname: [
    { required: true, message: '请输入昵称', trigger: 'blur' }
  ],
  email: [
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  phone: [
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号格式', trigger: 'blur' }
  ]
}

function getUserTypeText(type?: string): string {
  const map: Record<string, string> = {
    'admin': '后台管理员',
    'pc': 'PC前台用户',
    'app': 'App用户'
  }
  return map[type || ''] || '未知'
}

function getGenderText(gender?: number): string {
  const map: Record<number, string> = {
    1: '男',
    2: '女',
    0: '保密'
  }
  return map[gender || 0] || '未知'
}

function withAvatarPreviewVersion(url: string, version: number): string {
  if (!url || !version || url.startsWith('data:') || url.startsWith('blob:')) {
    return url
  }
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}_avatar=${version}`
}

function triggerUpload() {
  fileInputRef.value?.click()
}

async function handleFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  // 验证文件类型
  if (!file.type.startsWith('image/')) {
    message.warning('请选择图片文件')
    return
  }

  // 验证文件大小（最大5MB）
  if (file.size > 5 * 1024 * 1024) {
    message.warning('图片大小不能超过5MB')
    return
  }

  try {
    message.loading('头像上传中...')
    const result = await fileApi.uploadImage(file)
    const avatarUrl = resolveUploadedAvatarUrl(result)
    if (!avatarUrl) {
      message.warning('上传成功，但未返回头像地址')
      return
    }
    formData.value.avatar = normalizeApiAssetUrl(avatarUrl)
    avatarPreviewVersion.value = Date.now()
    message.success('头像上传成功')
  } catch (error) {
    message.error('头像上传失败')
  }

  // 清空input，允许重复选择同一文件
  target.value = ''
}

function resolveUploadedAvatarUrl(result: string | { id?: number; url?: string; filePath?: string }): string {
  if (typeof result === 'string') {
    return result
  }
  if (result.id) {
    return fileApi.getPreviewUrl(result.id)
  }
  return result.url || result.filePath || ''
}

async function loadProfile() {
  try {
    loading.value = true
    const data = await authApi.getProfile()
    const profile = await fillProfileAvatar(data)
    formData.value = {
      id: profile.id,
      username: profile.username,
      nickname: profile.nickname,
      avatar: profile.avatar || '',
      email: profile.email || '',
      phone: profile.phone || '',
      gender: profile.gender ?? 0,
      status: profile.status ?? 1,
      deptId: profile.deptId,
      deptName: profile.deptName || '',
      postNames: profile.postNames || '',
      remark: profile.remark || '',
      userType: profile.userType || '',
      createTime: profile.createTime || ''
    }
    avatarPreviewVersion.value = 0
    // 保存原始数据用于重置
    originalData.value = { ...formData.value }
  } catch (error) {
    message.error('加载个人信息失败')
  } finally {
    loading.value = false
  }
}

async function fillProfileAvatar(profile: ProfileInfo): Promise<ProfileInfo> {
  if (profile.avatar || !profile.id) {
    return profile
  }
  try {
    const detail = await userApi.detail(profile.id)
    return {
      ...profile,
      avatar: detail.user.avatar || profile.avatar
    }
  } catch (error) {
    return profile
  }
}

async function handleSave() {
  try {
    await formRef.value?.validate()
    saving.value = true
    await authApi.updateProfile({
      nickname: formData.value.nickname,
      email: formData.value.email,
      phone: formData.value.phone,
      avatar: formData.value.avatar,
      gender: formData.value.gender,
      remark: formData.value.remark
    })
    message.success('保存成功')
    // 更新store中的用户信息
    await userStore.getInfo()
    // 更新原始数据
    originalData.value = { ...formData.value }
  } catch (error: any) {
    if (error?.message) {
      message.error(error.message)
    }
  } finally {
    saving.value = false
  }
}

function handleReset() {
  formData.value = { ...originalData.value }
  avatarPreviewVersion.value = 0
}

onMounted(() => {
  loadProfile()
})
</script>

<style scoped>
.profile-page {
  padding: 24px;
  min-height: 100%;
  overflow-x: hidden;
}

.profile-layout {
  display: flex;
  gap: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

/* 左侧区域 */
.profile-left {
  width: 320px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 右侧区域 */
.profile-right {
  flex: 1;
  min-width: 0;
}

/* 卡片通用样式 */
.user-card,
.info-card,
.form-card {
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

/* 卡片头部 */
.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
}

/* 头像区域 */
.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0 4px;
  gap: 12px;
}

.avatar-wrapper {
  position: relative;
  cursor: pointer;
  border-radius: 50%;
  overflow: hidden;
}

.profile-avatar {
  border: 3px solid #f0f0f0;
  transition: transform 0.3s;
}

.avatar-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  opacity: 0;
  transition: opacity 0.25s;
}

.avatar-wrapper:hover .avatar-overlay {
  opacity: 1;
}

.avatar-wrapper:hover .profile-avatar {
  transform: scale(1.05);
}

.user-nickname {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
}

.user-username {
  margin: 0;
  font-size: 13px;
  color: #9ca3af;
}

/* 信息列表 */
.info-list {
  display: flex;
  flex-direction: column;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 13px;
  color: #9ca3af;
}

.info-value {
  font-size: 13px;
  color: #374151;
  font-weight: 500;
  min-width: 0;
  text-align: right;
  overflow-wrap: anywhere;
}

/* 表单操作按钮 */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #f5f5f5;
}

/* 暗色主题适配 */
:global(body.dark-theme) .user-nickname {
  color: rgba(255, 255, 255, 0.85);
}

:global(body.dark-theme) .user-username {
  color: rgba(255, 255, 255, 0.45);
}

:global(body.dark-theme) .info-label {
  color: rgba(255, 255, 255, 0.45);
}

:global(body.dark-theme) .info-value {
  color: rgba(255, 255, 255, 0.75);
}

:global(body.dark-theme) .info-row {
  border-bottom-color: rgba(255, 255, 255, 0.08);
}

:global(body.dark-theme) .form-actions {
  border-top-color: rgba(255, 255, 255, 0.08);
}

:global(body.dark-theme) .profile-avatar {
  border-color: #3f3f46;
}

@media (max-width: 1024px) {
  .profile-page {
    padding: 16px;
  }

  .profile-layout {
    flex-direction: column;
    gap: 16px;
    max-width: 720px;
  }

  .profile-left {
    width: 100%;
  }

  .profile-right {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .profile-page {
    padding: 12px;
    padding-bottom: calc(12px + env(safe-area-inset-bottom));
  }

  :global(.capacitor-native) .profile-page {
    min-height: 100dvh;
    padding-top: max(12px, env(safe-area-inset-top));
  }

  .profile-layout {
    gap: 12px;
  }

  .user-card,
  .info-card,
  .form-card {
    border-radius: 10px;
  }

  .user-card :deep(.n-card__content),
  .info-card :deep(.n-card__content),
  .form-card :deep(.n-card__content) {
    padding: 16px;
  }

  .info-card :deep(.n-card-header),
  .form-card :deep(.n-card-header) {
    padding: 16px 16px 0;
  }

  .avatar-section {
    padding: 4px 0 0;
    gap: 8px;
  }

  .avatar-overlay {
    opacity: 1;
    background: rgba(0, 0, 0, 0.28);
  }

  .user-nickname {
    max-width: 100%;
    font-size: 18px;
    text-align: center;
    overflow-wrap: anywhere;
  }

  .info-row {
    align-items: flex-start;
    gap: 16px;
    padding: 12px 0;
  }

  .info-label {
    flex: 0 0 72px;
    line-height: 20px;
  }

  .info-value {
    line-height: 20px;
  }

  .form-card :deep(.n-form-item) {
    margin-bottom: 14px;
  }

  .form-card :deep(.n-input),
  .form-card :deep(.n-input-wrapper) {
    min-height: 42px;
  }

  .form-card :deep(.n-radio-group .n-space) {
    gap: 10px 18px !important;
  }

  .form-actions {
    position: sticky;
    bottom: 0;
    z-index: 2;
    margin: 4px -16px -16px;
    padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
    background: #ffffff;
  }

  .form-actions :deep(.n-button) {
    flex: 1;
    min-height: 42px;
  }

  :global(body.dark-theme) .form-actions {
    background: #18181c;
  }
}
</style>
