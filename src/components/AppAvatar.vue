<template>
  <span
    class="app-avatar"
    :class="{ 'app-avatar--round': round, 'app-avatar--image': imageVisible }"
    :style="avatarStyle"
  >
    <img
      v-if="imageVisible"
      :key="normalizedSrc"
      class="app-avatar__image"
      :src="normalizedSrc"
      :alt="alt"
      @error="handleImageError"
    />
    <span v-else class="app-avatar__text">{{ fallbackText }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { normalizeApiAssetUrl } from '@/config/app'

const props = withDefaults(defineProps<{
  src?: string
  size?: number | 'small' | 'medium' | 'large'
  round?: boolean
  fallback?: string
  alt?: string
}>(), {
  src: '',
  size: 'medium',
  round: false,
  fallback: 'U',
  alt: 'avatar'
})

const imageLoadFailed = ref(false)

const sizeValue = computed(() => {
  if (typeof props.size === 'number') {
    return props.size
  }
  const sizeMap: Record<'small' | 'medium' | 'large', number> = {
    small: 28,
    medium: 34,
    large: 40
  }
  return sizeMap[props.size]
})

const normalizedSrc = computed(() => normalizeApiAssetUrl(props.src))
const imageVisible = computed(() => !!normalizedSrc.value && !imageLoadFailed.value)
const fallbackText = computed(() => props.fallback?.charAt(0) || 'U')

const avatarStyle = computed(() => ({
  width: `${sizeValue.value}px`,
  height: `${sizeValue.value}px`,
  fontSize: `${Math.max(12, Math.round(sizeValue.value * 0.38))}px`
}))

watch(normalizedSrc, () => {
  imageLoadFailed.value = false
})

function handleImageError() {
  imageLoadFailed.value = true
}
</script>

<style scoped>
.app-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  overflow: hidden;
  color: #ffffff;
  background: #c4c4c4;
  line-height: 1;
  vertical-align: middle;
}

.app-avatar--round {
  border-radius: 50%;
}

.app-avatar--image {
  background: transparent;
}

.app-avatar__image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.app-avatar__text {
  font-weight: 600;
}
</style>
