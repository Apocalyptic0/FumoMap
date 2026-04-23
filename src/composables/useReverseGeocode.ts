import { ref } from 'vue'
import type { GeoPosition } from '@/types'

export interface GeoNameResult {
  displayName: string
  shortName: string
  type: string
  lat: number
  lng: number
}

/** Nominatim 速率限制：至少间隔 1100ms（Nominatim 要求 1 次/秒） */
let lastRequestTime = 0
const MIN_REQUEST_INTERVAL = 1100

async function rateLimitedFetch(url: string, init?: RequestInit): Promise<Response> {
  const now = Date.now()
  const elapsed = now - lastRequestTime
  if (elapsed < MIN_REQUEST_INTERVAL) {
    await new Promise((r) => setTimeout(r, MIN_REQUEST_INTERVAL - elapsed))
  }
  lastRequestTime = Date.now()
  return fetch(url, init)
}

const DEBOUNCE_DELAY = 500

export function useReverseGeocode() {
  const suggestions = ref<GeoNameResult[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  /** 防抖计时器（每个实例独立，避免多实例共享冲突） */
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  /**
   * 根据坐标获取附近地标名称（使用 Nominatim OpenStreetMap 免费接口）
   * 内置防抖 + 速率限制，遵守 Nominatim 使用策略
   */
  async function reverseGeocode(pos: GeoPosition): Promise<GeoNameResult[]> {
    // 取消上一次未完成的防抖
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }

    return new Promise<GeoNameResult[]>((resolve) => {
      debounceTimer = setTimeout(async () => {
        loading.value = true
        error.value = null
        suggestions.value = []

        try {
          // Nominatim 反向地理编码
          const url = `https://nominatim.openstreetmap.org/reverse?lat=${pos.lat}&lon=${pos.lng}&format=json&zoom=18&addressdetails=1&accept-language=zh`
          const response = await rateLimitedFetch(url, {
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

          // 额外搜索附近 POI（速率限制保护）
          try {
            const searchUrl = `https://nominatim.openstreetmap.org/search?q=&lat=${pos.lat}&lon=${pos.lng}&format=json&limit=5&zoom=18&accept-language=zh`
            const searchRes = await rateLimitedFetch(searchUrl, {
              headers: { 'User-Agent': 'FumoMap/1.0' },
            })
            if (searchRes.ok) {
              const searchData = await searchRes.json()
              for (const item of searchData) {
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
          resolve(results)
        } catch {
          error.value = '获取地点名称失败'
          resolve([])
        } finally {
          loading.value = false
        }
      }, DEBOUNCE_DELAY)
    })
  }

  function clearSuggestions() {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
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
