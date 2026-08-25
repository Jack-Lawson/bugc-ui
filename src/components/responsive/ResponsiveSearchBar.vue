<template>
  <div class="responsive-search-bar search-form">
    <div class="responsive-search-bar__main">
      <slot />
    </div>
    <n-collapse-transition :show="expanded">
      <div class="responsive-search-bar__more">
        <slot name="more" />
      </div>
    </n-collapse-transition>
    <button
      v-if="$slots.more"
      class="responsive-search-bar__toggle"
      type="button"
      @click="expanded = !expanded"
    >
      {{ expanded ? '收起筛选' : '更多筛选' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const expanded = ref(false)
</script>
