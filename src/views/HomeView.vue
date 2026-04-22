<template>
  <div class="home-view">
    <!-- 地图 -->
    <MapView
      ref="mapViewRef"
      :center="displayCenter"
      :marks="markStore.marks"
      :get-character="characterStore.getCharacterById"
      :show-location-marker="true"
      @marker-click="onMarkerClick"
      @map-move="onMapMove"
    />

    <!-- 顶部搜索栏 -->
    <div class="map-search-bar glass-effect">
      <div class="search-wrapper">
        <span class="search-icon">🔍</span>
        <input
          class="search-input"
          type="text"
          placeholder="搜索角色或地点..."
          readonly
        />
      </div>
    </div>

    <!-- 标记信息弹窗 -->
    <MarkerPopup :mark="selectedMark" />

    <!-- 右下角按钮组 -->
    <div class="map-actions">
      <button class="locate-btn" @click="handleLocate" :disabled="geoLoading">
        <span v-if="geoLoading" class="locate-loading">⟳</span>
        <span v-else>📍</span>
      </button>
      <FumoFab />
    </div>

    <!-- 定位提示 -->
    <transition name="fade">
      <div v-if="geoError" class="geo-toast glass-effect" @click="geoError = null">
        {{ geoError }}
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, provide, watch } from 'vue'
import { useRoute } from 'vue-router'
import type { Mark, GeoPosition } from '@/types'
import MapView from '@/components/MapView.vue'
import MarkerPopup from '@/components/MarkerPopup.vue'
import FumoFab from '@/components/FumoFab.vue'
import { useMarkStore } from '@/stores/markStore'
import { useCharacterStore } from '@/stores/characterStore'
import { useGeolocation } from '@/composables/useGeolocation'

const route = useRoute()
const markStore = useMarkStore()
const characterStore = useCharacterStore()
const { position, loading: geoLoading, error: geoError, locate } = useGeolocation()

const mapViewRef = ref<InstanceType<typeof MapView> | null>(null)
const selectedMark = ref<Mark | null>(null)

// 地图中心：独立于定位坐标，避免 locate() 完成后自动飞回
const displayCenter = ref<GeoPosition>({ lat: 22.5431, lng: 113.9348 })

// 提供地图中心坐标给子组件（FumoFab 使用）
const mapCenter = ref<GeoPosition>({ lat: 22.5431, lng: 113.9348 })
provide('mapCenter', mapCenter)

function onMarkerClick(mark: Mark) {
  selectedMark.value = selectedMark.value?.id === mark.id ? null : mark
}

function onMapMove(center: GeoPosition) {
  mapCenter.value = center
}

async function handleLocate() {
  const pos = await locate()
  displayCenter.value = pos
  mapViewRef.value?.flyTo(pos)
}

// 当 position 更新时（定位成功），更新蓝点但不移动地图
watch(position, (newPos) => {
  mapViewRef.value?.updateLocationMarker(newPos)
})

onMounted(async () => {
  const queryLat = Number(route.query.lat)
  const queryLng = Number(route.query.lng)
  if (queryLat && queryLng) {
    // 从详情页返回：地图直接定位到标记坐标，不做动画
    displayCenter.value = { lat: queryLat, lng: queryLng }
    // 静默获取当前位置用于蓝点（不影响地图中心）
    locate()
  } else {
    const pos = await locate()
    displayCenter.value = pos
  }
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;
@import '@/styles/map.scss';

.home-view {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.search-wrapper {
  position: relative;
}

.locate-loading {
  animation: spin 1s linear infinite;
  display: inline-block;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.geo-toast {
  position: absolute;
  top: 80px;
  left: $spacing-lg;
  right: $spacing-lg;
  z-index: 1001;
  text-align: center;
  padding: $spacing-sm $spacing-md;
  border-radius: $radius-md;
  font-size: $font-size-sm;
  color: $text-secondary;
  cursor: pointer;
}
</style>
