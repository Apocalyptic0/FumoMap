import { ref, onMounted, onUnmounted, type Ref } from 'vue'
import L from 'leaflet'
import type { GeoPosition, Mark } from '@/types'
import type { Character } from '@/types'

interface UseMapOptions {
  container: Ref<HTMLElement | null>
  center?: GeoPosition
  zoom?: number
  draggableMarker?: boolean // 是否启用可拖拽的选点标记
  onDragEnd?: (pos: GeoPosition) => void
}

export function useMap(options: UseMapOptions) {
  const map = ref<L.Map | null>(null)
  const markers = ref<Map<string, L.Marker>>(new Map())
  const dragMarker = ref<L.Marker | null>(null)

  // 默认中心：东京（fumo 起源地）
  const defaultCenter: GeoPosition = { lat: 35.6762, lng: 139.6503 }
  const defaultZoom = 13

  /**
   * 初始化地图
   */
  function initMap() {
    if (!options.container.value || map.value) return

    const center = options.center || defaultCenter
    const zoom = options.zoom || defaultZoom

    map.value = L.map(options.container.value, {
      center: [center.lat, center.lng],
      zoom,
      zoomControl: false, // 移动端隐藏缩放控件
      attributionControl: false,
    })

    // 添加瓦片层（多备选源，优先国内可用）
    // 优先使用 CartoDB Positron（清新淡彩风格，全球 CDN 速度快）
    const tileLayers = [
      {
        url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        options: {
          maxZoom: 20,
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a> © <a href="https://carto.com/">CARTO</a>',
          subdomains: 'abcd',
        },
      },
      {
        // 备选：OSM 官方
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        options: {
          maxZoom: 19,
          attribution: '© OpenStreetMap',
        },
      },
    ]

    // 尝试加载第一个瓦片源
    let tileLayer = L.tileLayer(tileLayers[0].url, tileLayers[0].options)
    tileLayer.addTo(map.value)

    // 如果第一个加载失败，切换备选
    tileLayer.on('tileerror', () => {
      if (map.value && tileLayers.length > 1) {
        map.value.removeLayer(tileLayer)
        tileLayer = L.tileLayer(tileLayers[1].url, tileLayers[1].options)
        tileLayer.addTo(map.value)
      }
    })

    // 归属信息
    L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(map.value)

    // 如果需要可拖拽标记（创建打卡页使用）
    if (options.draggableMarker) {
      addDragMarker(center)
    }
  }

  /**
   * 添加可拖拽的定位标记
   */
  function addDragMarker(pos: GeoPosition) {
    if (!map.value) return

    const icon = L.divIcon({
      className: 'drag-marker',
      html: `<div class="drag-marker-pin">
        <svg width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 26 16 26s16-14 16-26C32 7.16 24.84 0 16 0z" fill="#D4CAF0"/>
          <circle cx="16" cy="16" r="8" fill="white"/>
        </svg>
      </div>`,
      iconSize: [32, 42],
      iconAnchor: [16, 42],
    })

    dragMarker.value = L.marker([pos.lat, pos.lng], {
      icon,
      draggable: true,
    }).addTo(map.value)

    dragMarker.value.on('dragend', () => {
      if (dragMarker.value && options.onDragEnd) {
        const latlng = dragMarker.value.getLatLng()
        options.onDragEnd({ lat: latlng.lat, lng: latlng.lng })
      }
    })
  }

  /**
   * 飞到指定位置
   */
  function flyTo(pos: GeoPosition, zoom?: number) {
    map.value?.flyTo([pos.lat, pos.lng], zoom || map.value.getZoom(), {
      duration: 1,
    })
  }

  /**
   * 设置地图中心
   */
  function setCenter(pos: GeoPosition, zoom?: number) {
    map.value?.setView([pos.lat, pos.lng], zoom || map.value.getZoom())
  }

  /**
   * 添加打卡标记到地图
   */
  function addMarkMarker(
    mark: Mark,
    character: Character | undefined,
    onClick?: (mark: Mark) => void
  ) {
    if (!map.value || markers.value.has(mark.id)) return

    const avatarUrl = character?.avatarUrl || ''
    const icon = L.divIcon({
      className: 'fumo-marker',
      html: `<img src="${avatarUrl}" class="marker-avatar" alt="${character?.name || ''}" />`,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    })

    const marker = L.marker([mark.lat, mark.lng], { icon }).addTo(map.value)

    if (onClick) {
      marker.on('click', () => onClick(mark))
    }

    markers.value.set(mark.id, marker)
  }

  /**
   * 移除标记
   */
  function removeMarkMarker(markId: string) {
    const marker = markers.value.get(markId)
    if (marker && map.value) {
      map.value.removeLayer(marker)
      markers.value.delete(markId)
    }
  }

  /**
   * 清除所有标记
   */
  function clearMarkers() {
    markers.value.forEach((marker) => {
      map.value?.removeLayer(marker)
    })
    markers.value.clear()
  }

  /**
   * 更新拖拽标记位置
   */
  function updateDragMarkerPosition(pos: GeoPosition) {
    dragMarker.value?.setLatLng([pos.lat, pos.lng])
  }

  /**
   * 销毁地图
   */
  function destroyMap() {
    if (map.value) {
      map.value.remove()
      map.value = null
    }
    markers.value.clear()
    dragMarker.value = null
  }

  /**
   * 触发地图 resize（容器尺寸变化后调用）
   */
  function invalidateSize() {
    map.value?.invalidateSize()
  }

  onMounted(() => {
    initMap()
  })

  onUnmounted(() => {
    destroyMap()
  })

  return {
    map,
    flyTo,
    setCenter,
    addMarkMarker,
    removeMarkMarker,
    clearMarkers,
    updateDragMarkerPosition,
    invalidateSize,
    initMap,
    destroyMap,
  }
}
