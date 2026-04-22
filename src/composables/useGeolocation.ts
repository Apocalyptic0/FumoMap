import { ref, onUnmounted } from 'vue'
import type { GeoPosition } from '@/types'

// 默认位置：深圳宝安区（方便国内测试）
const DEFAULT_POSITION: GeoPosition = { lat: 22.5431, lng: 113.9348 }

export interface GeolocationState {
  position: ReturnType<typeof ref<GeoPosition>>
  accuracy: ReturnType<typeof ref<number>>
  loading: ReturnType<typeof ref<boolean>>
  error: ReturnType<typeof ref<string | null>>
  isDefault: ReturnType<typeof ref<boolean>>
  locate: () => Promise<GeoPosition>
  startWatch: () => void
  stopWatch: () => void
}

export function useGeolocation() {
  const position = ref<GeoPosition>(DEFAULT_POSITION)
  const accuracy = ref(0) // 定位精度（米）
  const loading = ref(false)
  const error = ref<string | null>(null)
  const isDefault = ref(true)
  let watchId: number | null = null

  /**
   * 获取当前位置（单次）
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
          accuracy.value = pos.coords.accuracy
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

  /**
   * 开始持续监听位置变化（用于首页蓝点实时更新）
   */
  function startWatch() {
    if (!navigator.geolocation || watchId !== null) return

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const geo: GeoPosition = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }
        position.value = geo
        accuracy.value = pos.coords.accuracy
        isDefault.value = false
      },
      () => {
        // 静默处理，不覆盖已有位置
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      }
    )
  }

  /**
   * 停止监听
   */
  function stopWatch() {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId)
      watchId = null
    }
  }

  onUnmounted(() => {
    stopWatch()
  })

  return {
    position,
    accuracy,
    loading,
    error,
    isDefault,
    locate,
    startWatch,
    stopWatch,
    DEFAULT_POSITION,
  }
}
