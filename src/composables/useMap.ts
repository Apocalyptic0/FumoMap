import { ref, onMounted, onUnmounted, type Ref } from 'vue'
import L from 'leaflet'
import type { GeoPosition, Mark } from '@/types'
import type { Character } from '@/types'

/** 标记样式接口，支持后续个性化扩展 */
export interface MarkerStyle {
  type: 'pin' | 'circle' | 'custom'
  color?: string
  size?: number
  customHtml?: string
}

interface UseMapOptions {
  container: Ref<HTMLElement | null>
  center?: GeoPosition
  zoom?: number
  draggableMarker?: boolean // 是否启用可拖拽的选点标记
  onDragEnd?: (pos: GeoPosition) => void
  showLocationMarker?: boolean // 是否显示当前位置蓝点标记
}

export function useMap(options: UseMapOptions) {
  const map = ref<L.Map | null>(null)
  const markers = ref<Map<string, L.Marker>>(new Map())
  const dragMarker = ref<L.Marker | null>(null)
  const locationMarker = ref<L.Marker | null>(null) // 当前位置蓝点标记

  // 默认中心：深圳（方便国内测试）
  const defaultCenter: GeoPosition = { lat: 22.5431, lng: 113.9348 }
  const defaultZoom = 16

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
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        options: {
          maxZoom: 19,
          attribution: '© OpenStreetMap',
        },
      },
    ]

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = map.value as any

    let tileLayer = L.tileLayer(tileLayers[0].url, tileLayers[0].options)
    tileLayer.addTo(m)

    tileLayer.on('tileerror', () => {
      if (map.value && tileLayers.length > 1) {
        m.removeLayer(tileLayer)
        tileLayer = L.tileLayer(tileLayers[1].url, tileLayers[1].options)
        tileLayer.addTo(m)
      }
    })

    L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(m)

    if (options.draggableMarker) {
      addDragMarker(center)
    }

    if (options.showLocationMarker) {
      addLocationMarker(center)
    }
  }

  /**
   * 添加可拖拽的定位标记
   */
  function addDragMarker(pos: GeoPosition) {
    if (!map.value) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = map.value as any

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
    }).addTo(m) as L.Marker

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
   * 添加当前位置蓝点标记（带脉冲动画）
   */
  function addLocationMarker(pos: GeoPosition) {
    if (!map.value) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = map.value as any

    removeLocationMarker()

    const icon = L.divIcon({
      className: 'location-marker',
      html: `<div class="location-dot">
        <div class="location-dot-pulse"></div>
        <div class="location-dot-center"></div>
      </div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    })

    locationMarker.value = L.marker([pos.lat, pos.lng], {
      icon,
      interactive: false,
      zIndexOffset: 1000,
    }).addTo(m) as L.Marker
  }

  /**
   * 更新当前位置标记
   */
  function updateLocationMarker(pos: GeoPosition) {
    if (locationMarker.value) {
      locationMarker.value.setLatLng([pos.lat, pos.lng])
    } else {
      addLocationMarker(pos)
    }
  }

  /**
   * 移除当前位置标记
   */
  function removeLocationMarker() {
    if (locationMarker.value && map.value) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(map.value as any).removeLayer(locationMarker.value)
      locationMarker.value = null
    }
  }

  /**
   * 添加打卡标记到地图（Pin 造型）
   */
  function addMarkMarker(
    mark: Mark,
    character: Character | undefined,
    onClick?: (mark: Mark) => void,
    style?: MarkerStyle
  ) {
    if (!map.value || markers.value.has(mark.id)) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = map.value as any

    const markerStyle = style || { type: 'pin' as const }
    const avatarUrl = character?.avatarUrl || ''
    const markerSize = markerStyle.size || 40
    const pinColor = markerStyle.color || '#D4CAF0'
    const pinHeight = markerSize + 16

    let iconHtml: string

    if (markerStyle.type === 'custom' && markerStyle.customHtml) {
      iconHtml = markerStyle.customHtml
    } else {
      const innerSize = markerSize - 8
      iconHtml = `<div class="fumo-pin-marker" style="--pin-color: ${pinColor}; --pin-size: ${markerSize}px;">
        <div class="pin-head">
          <img src="${avatarUrl}" class="pin-avatar" alt="${character?.name || ''}" style="width:${innerSize}px;height:${innerSize}px;" />
        </div>
        <div class="pin-tip"></div>
      </div>`
    }

    const icon = L.divIcon({
      className: 'fumo-marker',
      html: iconHtml,
      iconSize: [markerSize, pinHeight],
      iconAnchor: [markerSize / 2, pinHeight],
    })

    const marker = L.marker([mark.lat, mark.lng], { icon }).addTo(m) as L.Marker

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(map.value as any).removeLayer(marker)
      markers.value.delete(markId)
    }
  }

  /**
   * 清除所有标记
   */
  function clearMarkers() {
    markers.value.forEach((marker) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(map.value as any)?.removeLayer(marker)
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
    locationMarker.value = null
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
    updateLocationMarker,
    removeLocationMarker,
    invalidateSize,
    initMap,
    destroyMap,
  }
}
