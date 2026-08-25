<template>
  <n-modal
    :show="show"
    preset="card"
    :title="title"
    :style="modalStyle"
    :mask-closable="maskClosable"
    @update:show="emit('update:show', $event)"
  >
    <slot />
    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useResponsive } from '@/composables/useResponsive'

const props = withDefaults(defineProps<{
  show: boolean
  title?: string
  width?: string | number
  maskClosable?: boolean
}>(), {
  title: '',
  width: 600,
  maskClosable: false
})

const emit = defineEmits<{
  'update:show': [value: boolean]
}>()

const { isMobile } = useResponsive()

const modalStyle = computed(() => {
  if (isMobile.value) {
    return {
      width: 'calc(100vw - 24px)',
      maxWidth: 'calc(100vw - 24px)'
    }
  }
  const width = typeof props.width === 'number' ? `${props.width}px` : props.width
  return { width }
})
</script>
