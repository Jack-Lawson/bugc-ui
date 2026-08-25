<template>
  <section class="responsive-crud-page" :class="{ 'responsive-crud-page--mobile': isMobile }">
    <slot name="search" />
    <slot name="toolbar" />
    <slot />
    <slot name="pagination" />
  </section>
</template>

<script setup lang="ts">
import { useResponsive } from '@/composables/useResponsive'

const { isMobile } = useResponsive()
</script>
