<template>
  <div ref="mapEl" class="map-view-container"></div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { DEFAULT_CENTER } from '@/types'
import type { GeoPosition, Mark, Character } from '@/types'
import { useMap } from '@/composables/useMap'

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
} = useMap({
  container: mapEl,
  center: props.center,
  zoom: props.zoom,
  draggableMarker: props.draggableMarker,
  showLocationMarker: props.showLocationMarker,
  onDragEnd: (pos) => emit('dragEnd', pos),
})

// 上一次渲染的标记 ID 集合，用于增量 diff
let prevMarkIds = new Set<string>()

/**
 * 渲染标记的辅助函数
 */
function renderMark(mark: Mark) {
  const primaryCharId = mark.characterIds[0]
  const character = props.getCharacter?.(primaryCharId)
  addMarkMarker(mark, character, (m) => emit('markerClick', m))
}

// 监听标记数据变化 — 增量 diff：只增删变化的标记，避免全量重建
watch(
  () => props.marks,
  (newMarks) => {
    const newIds = new Set(newMarks.map((m) => m.id))

    // 移除已不存在的标记
    for (const oldId of prevMarkIds) {
      if (!newIds.has(oldId)) {
        removeMarkMarker(oldId)
      }
    }

    // 添加新出现的标记
    for (const mark of newMarks) {
      if (!prevMarkIds.has(mark.id)) {
        renderMark(mark)
      }
    }

    prevMarkIds = newIds
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
  // 初始渲染标记
  if (props.marks.length > 0) {
    props.marks.forEach((mark) => {
      renderMark(mark)
    })
    prevMarkIds = new Set(props.marks.map((m) => m.id))
  }

  // 监听地图移动事件，向父组件报告当前中心
  if (map.value) {
    map.value.on('moveend', () => {
      if (map.value) {
        const center = map.value.getCenter()
        emit('mapMove', { lat: center.lat, lng: center.lng })
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
})
</script>

<style lang="scss" scoped>
.map-view-container {
  width: 100%;
  height: 100%;
}
</style>
