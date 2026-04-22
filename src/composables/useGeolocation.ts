import { ref } from 'vue'
import type { GeoPosition } from '@/types'

// 默认位置：深圳宝安区（方便国内测试）
const DEFAULT_POSITION: GeoPosition = { lat: 22.5431, lng: 113.9348 }

export function useGeolocation() {
  const position = ref<GeoPosition>(DEFAULT_POSITION)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const isDefault = ref(true)

  /**
   * 获取当前位置
   */
  async function locate(): Promise<GeoPosition> {
    if (!navigator.geolocation) {
      error.value = '您的浏览器不支持定位功能'
      return DEFAULT_POSITION
    }

    loading.value = true
    error.value = null

    return new Promise<GeoPosition>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const geo: GeoPosition = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }
          position.value = geo
          isDefault.value = false
          loading.value = false
          resolve(geo)
        },
        (err) => {
          loading.value = false
          switch (err.code) {
            case err.PERMISSION_DENIED:
              error.value = '定位权限被拒绝，已使用默认位置'
              break
            case err.POSITION_UNAVAILABLE:
              error.value = '无法获取位置信息，已使用默认位置'
              break
            case err.TIMEOUT:
              error.value = '定位超时，已使用默认位置'
              break
            default:
              error.value = '定位失败，已使用默认位置'
          }
          position.value = DEFAULT_POSITION
          isDefault.value = true
          resolve(DEFAULT_POSITION)
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 5000,
        }
      )
    })
  }

  return {
    position,
    loading,
    error,
    isDefault,
    locate,
    DEFAULT_POSITION,
  }
}
