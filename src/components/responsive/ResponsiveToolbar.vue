<template>
  <div class="responsive-toolbar table-toolbar">
    <div class="responsive-toolbar__primary">
      <slot />
    </div>
    <n-popover
      v-if="$slots.more"
      trigger="click"
      placement="bottom-end"
      :show-arrow="false"
    >
      <template #trigger>
        <n-button secondary class="responsive-toolbar__more">
          更多
        </n-button>
      </template>
      <div class="responsive-toolbar__menu">
        <slot name="more" />
      </div>
    </n-popover>
  </div>
</template>
