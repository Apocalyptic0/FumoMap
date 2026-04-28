<template>
  <div ref="mapEl" class="map-view-container"></div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { DEFAULT_CENTER } from '@/types'
import type { GeoPosition, Mark, Character } from '@/types'
import { isInBounds } from '@/utils/geo'
import { useMap } from '@/composables/useMap'

/** 缩放低于此值时不显示标记 */
const MIN_ZOOM_FOR_MARKERS = 12

/** 视口边界内边距（度），让边缘标记也可见 */
const BOUNDS_PADDING = 0.005

const props = withDefaults(
  defineProps<{
    center?: GeoPosition
    zoom?: number
    marks?: Mark[]
    getCharacter?: (id: string) => Character | undefined
    draggableMarker?: boolean
    showLocationMarker?: boolean
  }>(),
  {
    zoom: 16,
    marks: () => [],
    draggableMarker: false,
    showLocationMarker: false,
  }
)

const emit = defineEmits<{
  markerClick: [mark: Mark]
  dragEnd: [pos: GeoPosition]
  mapMove: [center: GeoPosition]
  zoomChange: [zoom: number]
}>()

const mapEl = ref<HTMLElement | null>(null)

const {
  map,
  flyTo,
  setCenter,
  addMarkMarker,
  removeMarkMarker,
  updateDragMarkerPosition,
  updateLocationMarker,
  invalidateSize,
  getBounds,
  getZoom,
} = useMap({
  container: mapEl,
  center: props.center,
  zoom: props.zoom,
  draggableMarker: props.draggableMarker,
  showLocationMarker: props.showLocationMarker,
  onDragEnd: (pos) => emit('dragEnd', pos),
})

// 缓存所有标记数据（全量），用于视口过滤
let cachedMarks: Mark[] = []
// 当前已渲染到地图上的标记 ID 集合
let renderedMarkIds = new Set<string>()

/**
 * 渲染标记的辅助函数
 */
function renderMark(mark: Mark) {
  const primaryCharId = mark.characterIds[0]
  const character = props.getCharacter?.(primaryCharId)
  addMarkMarker(mark, character, (m) => emit('markerClick', m))
}

/**
 * 根据当前视口和缩放级别，计算应该显示的标记
 * - 缩放低于阈值 → 不显示任何标记
 * - 否则 → 只显示视口内的标记
 */
function getVisibleMarks(): Mark[] {
  const zoom = getZoom()
  if (zoom < MIN_ZOOM_FOR_MARKERS) return []

  const bounds = getBounds()
  if (!bounds) return cachedMarks

  // 扩展边界以包含边缘标记
  const paddedBounds = {
    southWest: {
      lat: bounds.southWest.lat - BOUNDS_PADDING,
      lng: bounds.southWest.lng - BOUNDS_PADDING,
    },
    northEast: {
      lat: bounds.northEast.lat + BOUNDS_PADDING,
      lng: bounds.northEast.lng + BOUNDS_PADDING,
    },
  }

  return cachedMarks.filter((m) => isInBounds({ lat: m.lat, lng: m.lng }, paddedBounds))
}

/**
 * 增量更新地图上的标记：只增删差异部分
 */
function updateRenderedMarkers() {
  const visibleMarks = getVisibleMarks()
  const newIds = new Set(visibleMarks.map((m) => m.id))

  // 移除不再可见的标记
  for (const oldId of renderedMarkIds) {
    if (!newIds.has(oldId)) {
      removeMarkMarker(oldId)
    }
  }

  // 添加新出现的标记
  for (const mark of visibleMarks) {
    if (!renderedMarkIds.has(mark.id)) {
      renderMark(mark)
    }
  }

  renderedMarkIds = newIds
}

// 监听标记数据变化 — 更新缓存并重新计算可见标记
watch(
  () => props.marks,
  (newMarks) => {
    cachedMarks = [...newMarks]
    updateRenderedMarkers()
  }
)

// 监听中心位置变化 - 只平移不重置缩放
watch(
  () => props.center,
  (newCenter) => {
    if (newCenter) {
      flyTo(newCenter)
      if (props.draggableMarker) {
        updateDragMarkerPosition(newCenter)
      }
    }
  }
)

onMounted(() => {
  // 缓存初始标记数据
  cachedMarks = [...props.marks]

  // 初始渲染可见标记
  updateRenderedMarkers()

  // 监听地图移动和缩放事件
  if (map.value) {
    map.value.on('moveend', () => {
      if (map.value) {
        const center = map.value.getCenter()
        emit('mapMove', { lat: center.lat, lng: center.lng })
        // 视口变化时重新计算可见标记
        updateRenderedMarkers()
      }
    })

    map.value.on('zoomend', () => {
      if (map.value) {
        emit('zoomChange', map.value.getZoom())
        // 缩放变化时重新计算可见标记
        updateRenderedMarkers()
      }
    })
  }
})

function getCenter(): GeoPosition {
  if (map.value) {
    const center = map.value.getCenter()
    return { lat: center.lat, lng: center.lng }
  }
  return props.center || { ...DEFAULT_CENTER }
}

defineExpose({
  flyTo,
  setCenter,
  invalidateSize,
  updateLocationMarker,
  getCenter,
  getZoom,
  getBounds,
})
</script>

<style lang="scss" scoped>
.map-view-container {
  width: 100%;
  height: 100%;
}
</style>
