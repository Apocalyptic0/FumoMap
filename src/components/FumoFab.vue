<template>
  <button class="fumo-fab" @click="handleClick" :class="{ 'fab-pulse': pulse }">
    <span class="fab-icon">+</span>
  </button>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, inject, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import type { GeoPosition } from '@/types'

const router = useRouter()
const pulse = ref(true)

// 从父组件注入地图引用，获取当前地图中心
const mapCenter = inject<Ref<GeoPosition>>('mapCenter', ref({ lat: 22.5431, lng: 113.9348 }))

let timer: ReturnType<typeof setTimeout> | null = null

function handleClick() {
  pulse.value = false
  // 传递当前地图中心坐标到创建页
  const center = mapCenter.value
  router.push({
    path: '/create',
    query: {
      lat: center.lat.toString(),
      lng: center.lng.toString(),
    },
  })
}

onMounted(() => {
  // 5秒后停止呼吸动画
  timer = setTimeout(() => {
    pulse.value = false
  }, 5000)
})

onUnmounted(() => {
  if (timer) clearTimeout(timer)
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.fumo-fab {
  width: 56px;
  height: 56px;
  border-radius: $radius-full;
  border: none;
  background: linear-gradient(135deg, $color-pink, $color-primary);
  box-shadow: $shadow-lg;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all $transition-fast;
  position: relative;

  &:active {
    transform: scale(0.9);
  }

  &.fab-pulse {
    animation: fabPulse 2s ease-in-out infinite;
  }

  .fab-icon {
    font-size: 28px;
    color: white;
    font-weight: 300;
    line-height: 1;
  }
}

@keyframes fabPulse {
  0%, 100% {
    box-shadow: 0 4px 16px rgba(184, 169, 232, 0.3);
  }
  50% {
    box-shadow: 0 4px 24px rgba(184, 169, 232, 0.6),
                0 0 0 8px rgba(184, 169, 232, 0.1);
  }
}
</style>
