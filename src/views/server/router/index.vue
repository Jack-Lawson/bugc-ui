<template>
  <div class="router-service-page">
    <n-spin v-if="loading" :show="true" description="加载中..." />
    <n-empty v-else-if="!resolvedCode" description="暂无路由器服务配置">
      <template #extra>
        <n-button type="primary" @click="goManage">去配置</n-button>
      </template>
    </n-empty>
    <iframe
      v-else
      :key="frameSrc"
      :src="frameSrc"
      class="router-service-page__frame"
      frameborder="0"
      allowfullscreen
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiConfig, joinUrl } from '@/config/app'
import { useUserStore } from '@/stores/user'
import { personalServiceApi } from '@/api/personalService'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const loading = ref(true)
const resolvedCode = ref('')

const frameSrc = computed(() => {
  if (!resolvedCode.value) return ''
  const base = joinUrl(apiConfig.baseUrl, `/personal/services/${encodeURIComponent(resolvedCode.value)}/`)
  if (!userStore.token) return base
  const url = new URL(base, window.location.origin)
  url.searchParams.set('Authorization', userStore.token)
  return url.pathname + url.search
})

async function resolveServiceCode() {
  const queryCode = String(route.query.code || '').trim()
  if (queryCode) {
    resolvedCode.value = queryCode
    return
  }

  const page = await personalServiceApi.list({ page: 1, pageSize: 100, status: 1 })
  const services = page.records || []
  const matched = services.find(service => service.code === 'router')
    || services.find(service => service.code === 'router-admin')
    || services.find(service => service.name?.includes('路由'))
  resolvedCode.value = matched?.code || ''
}

function goManage() {
  router.push('/personal-service/manage')
}

onMounted(async () => {
  try {
    await resolveServiceCode()
  } catch (error) {
    resolvedCode.value = ''
  } finally {
    loading.value = false
  }
})
</script>

<style lang="scss" scoped>
.router-service-page {
  width: 100%;
  height: 100%;
  min-height: calc(100vh - 120px);
  display: flex;
  align-items: stretch;
  justify-content: center;

  :deep(.n-spin-container),
  :deep(.n-spin-content) {
    width: 100%;
    height: 100%;
  }

  :deep(.n-empty) {
    margin: auto;
  }
}

.router-service-page__frame {
  width: 100%;
  height: 100%;
  min-height: calc(100vh - 120px);
  border: none;
}
</style>
