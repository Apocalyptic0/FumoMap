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
  }>(),
  {
    zoom: 13,
    marks: () => [],
    draggableMarker: false,
  }
)

const emit = defineEmits<{
  markerClick: [mark: Mark]
  dragEnd: [pos: GeoPosition]
}>()

const mapEl = ref<HTMLElement | null>(null)

const {
  flyTo,
  setCenter,
  addMarkMarker,
  clearMarkers,
  updateDragMarkerPosition,
  invalidateSize,
} = useMap({
  container: mapEl,
  center: props.center,
  zoom: props.zoom,
  draggableMarker: props.draggableMarker,
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

// 监听中心位置变化
watch(
  () => props.center,
  (newCenter) => {
    if (newCenter) {
      setCenter(newCenter)
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
})

defineExpose({
  flyTo,
  setCenter,
  invalidateSize,
})
</script>

<style lang="scss" scoped>
.map-view-container {
  width: 100%;
  height: 100%;
}
</style>
