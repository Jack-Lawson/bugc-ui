import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

export const responsiveBreakpoints = {
  mobile: 768,
  tablet: 1024
} as const

const width = ref(typeof window !== 'undefined' ? window.innerWidth : 1440)
let listenerAttached = false
let activeConsumers = 0

function updateWidth() {
  width.value = window.innerWidth
}

function attachResizeListener() {
  if (listenerAttached || typeof window === 'undefined') return
  window.addEventListener('resize', updateWidth, { passive: true })
  listenerAttached = true
}

function detachResizeListener() {
  if (!listenerAttached || typeof window === 'undefined') return
  if (activeConsumers > 0) return
  window.removeEventListener('resize', updateWidth)
  listenerAttached = false
}

export function useResponsive() {
  const isMobile = computed(() => width.value <= responsiveBreakpoints.mobile)
  const isTablet = computed(() => width.value > responsiveBreakpoints.mobile && width.value <= responsiveBreakpoints.tablet)
  const isDesktop = computed(() => width.value > responsiveBreakpoints.tablet)
  const isTouchLayout = computed(() => width.value <= responsiveBreakpoints.tablet)

  onMounted(() => {
    if (typeof window === 'undefined') return
    activeConsumers++
    updateWidth()
    attachResizeListener()
  })

  onBeforeUnmount(() => {
    activeConsumers = Math.max(0, activeConsumers - 1)
    detachResizeListener()
  })

  return {
    width,
    breakpoints: responsiveBreakpoints,
    isMobile,
    isTablet,
    isDesktop,
    isTouchLayout
  }
}
