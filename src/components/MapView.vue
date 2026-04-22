<template>
  <div ref="mapEl" class="map-view-container"></div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
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
  clearMarkers,
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

// 监听标记数据变化，重新渲染
watch(
  () => props.marks,
  (newMarks) => {
    clearMarkers()
    newMarks.forEach((mark) => {
      const primaryCharId = mark.characterIds[0]
      const character = props.getCharacter?.(primaryCharId)
      addMarkMarker(mark, character, (m) => emit('markerClick', m))
    })
  },
  { deep: true }
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
      const primaryCharId = mark.characterIds[0]
      const character = props.getCharacter?.(primaryCharId)
      addMarkMarker(mark, character, (m) => emit('markerClick', m))
    })
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
  return props.center || { lat: 22.5431, lng: 113.9348 }
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
