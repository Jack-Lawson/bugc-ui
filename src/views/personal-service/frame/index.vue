<template>
  <div class="personal-service-frame">
    <n-empty v-if="!code" description="服务编码无效" />
    <n-spin v-else :show="loading" description="加载中...">
      <iframe
        :key="frameKey"
        ref="iframeRef"
        :src="frameSrc"
        class="personal-service-frame__content"
        frameborder="0"
        allowfullscreen
        @load="handleLoad"
      />
    </n-spin>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { apiConfig, joinUrl } from '@/config/app'
import { useUserStore } from '@/stores/user'
import { personalServiceApi, type PersonalService } from '@/api/personalService'

const route = useRoute()
const userStore = useUserStore()
const iframeRef = ref<HTMLIFrameElement | null>(null)
const loading = ref(true)
const service = ref<PersonalService | null>(null)

const code = computed(() => {
  const routeCode = String(route.params.code || '').trim()
  if (routeCode) return routeCode
  const pathSegments = route.path.split('/').filter(Boolean)
  return pathSegments[pathSegments.length - 1] || ''
})

const frameSrc = computed(() => {
  if (!code.value) return ''
  if (service.value?.accessMode === 'iframe') {
    return getTargetEntryUrl(service.value)
  }
  const base = joinUrl(apiConfig.baseUrl, `/personal/services/${encodeURIComponent(code.value)}/`)
  if (!userStore.token) return base
  const url = new URL(base, window.location.origin)
  url.searchParams.set('Authorization', userStore.token)
  return url.pathname + url.search
})

const frameKey = computed(() => `${frameSrc.value}#${route.query.refresh || ''}`)

function handleLoad() {
  loading.value = false
}

function resetLoading() {
  loading.value = true
  setTimeout(() => {
    loading.value = false
  }, 5000)
}

async function loadService() {
  if (!code.value) return
  try {
    const res = await personalServiceApi.list({
      page: 1,
      pageSize: 1,
      code: code.value,
      status: 1
    })
    service.value = res.records?.[0] || null
  } catch (error) {
    service.value = null
  }
}

function getTargetEntryUrl(row: PersonalService) {
  if (row.originBaseUrl) {
    return `${row.originBaseUrl.replace(/\/+$/, '')}${row.entryPath || '/'}`
  }
  return row.targetBaseUrl
}

watch(frameSrc, resetLoading)
watch(code, loadService)

onMounted(() => {
  loadService()
  resetLoading()
})
</script>

<style lang="scss" scoped>
.personal-service-frame {
  width: 100%;
  height: 100%;
  min-height: calc(100vh - 120px);
  position: relative;

  :deep(.n-spin-container),
  :deep(.n-spin-content) {
    height: 100%;
  }
}

.personal-service-frame__content {
  width: 100%;
  height: 100%;
  min-height: calc(100vh - 120px);
  border: none;
}
</style>
