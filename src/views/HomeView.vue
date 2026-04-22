<template>
  <div class="home-view">
    <!-- 地图 -->
    <MapView
      ref="mapViewRef"
      :center="position"
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
import { ref, onMounted, provide } from 'vue'
import type { Mark, GeoPosition } from '@/types'
import MapView from '@/components/MapView.vue'
import MarkerPopup from '@/components/MarkerPopup.vue'
import FumoFab from '@/components/FumoFab.vue'
import { useMarkStore } from '@/stores/markStore'
import { useCharacterStore } from '@/stores/characterStore'
import { useGeolocation } from '@/composables/useGeolocation'

const markStore = useMarkStore()
const characterStore = useCharacterStore()
const { position, loading: geoLoading, error: geoError, locate } = useGeolocation()

const mapViewRef = ref<InstanceType<typeof MapView> | null>(null)
const selectedMark = ref<Mark | null>(null)

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
  mapViewRef.value?.flyTo(pos)
}

onMounted(async () => {
  await locate()
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
