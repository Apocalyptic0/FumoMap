import { ref } from 'vue'
import type { GeoPosition } from '@/types'

export interface GeoNameResult {
  displayName: string
  shortName: string
  type: string
  lat: number
  lng: number
}

export function useReverseGeocode() {
  const suggestions = ref<GeoNameResult[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * 根据坐标获取附近地标名称（使用 Nominatim OpenStreetMap 免费接口）
   */
  async function reverseGeocode(pos: GeoPosition): Promise<GeoNameResult[]> {
    loading.value = true
    error.value = null
    suggestions.value = []

    try {
      // Nominatim 反向地理编码
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${pos.lat}&lon=${pos.lng}&format=json&zoom=18&addressdetails=1&accept-language=zh`
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'FumoMap/1.0',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      const results: GeoNameResult[] = []

      if (data && data.display_name) {
        const addr = data.address || {}
        // 构建短名称 - 优先使用 POI/建筑名，否则用道路+区域
        const shortName = addr.tourism || addr.building || addr.office ||
          addr.amenity || addr.shop || addr.leisure ||
          addr.road || addr.suburb || addr.city_district ||
          data.display_name.split(',')[0]

        results.push({
          displayName: data.display_name,
          shortName,
          type: data.type || 'place',
          lat: parseFloat(data.lat),
          lng: parseFloat(data.lon),
        })
      }

      // 额外搜索附近 POI
      try {
        const searchUrl = `https://nominatim.openstreetmap.org/search?q=&lat=${pos.lat}&lon=${pos.lng}&format=json&limit=5&zoom=18&accept-language=zh`
        const searchRes = await fetch(searchUrl, {
          headers: { 'User-Agent': 'FumoMap/1.0' },
        })
        if (searchRes.ok) {
          const searchData = await searchRes.json()
          for (const item of searchData) {
            // 避免与反向编码结果重复
            const shortName = item.display_name.split(',')[0]
            if (!results.some(r => r.shortName === shortName)) {
              results.push({
                displayName: item.display_name,
                shortName,
                type: item.type || 'place',
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon),
              })
            }
          }
        }
      } catch {
        // 附近搜索失败不影响主结果
      }

      suggestions.value = results
      return results
    } catch (e) {
      error.value = '获取地点名称失败'
      return []
    } finally {
      loading.value = false
    }
  }

  function clearSuggestions() {
    suggestions.value = []
    error.value = null
  }

  return {
    suggestions,
    loading,
    error,
    reverseGeocode,
    clearSuggestions,
  }
}
