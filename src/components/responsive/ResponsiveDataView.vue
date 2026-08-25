<template>
  <div class="responsive-data-view" :class="{ 'responsive-data-view--mobile': isMobile }">
    <div class="responsive-data-view__desktop">
      <slot />
    </div>
    <div class="responsive-data-view__mobile">
      <slot name="mobile">
        <slot />
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useResponsive } from '@/composables/useResponsive'

const { isMobile } = useResponsive()
</script>
