import type { GeoPosition } from '@/types'

/**
 * Haversine 公式计算两个坐标之间的球面距离（单位：千米）
 */
export function haversineDistance(a: GeoPosition, b: GeoPosition): number {
  const R = 6371 // 地球半径（千米）
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)
  const calc =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng
  const c = 2 * Math.atan2(Math.sqrt(calc), Math.sqrt(1 - calc))
  return R * c
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/**
 * 判断坐标是否在矩形边界内
 */
export function isInBounds(
  pos: GeoPosition,
  bounds: { southWest: GeoPosition; northEast: GeoPosition }
): boolean {
  return (
    pos.lat >= bounds.southWest.lat &&
    pos.lat <= bounds.northEast.lat &&
    pos.lng >= bounds.southWest.lng &&
    pos.lng <= bounds.northEast.lng
  )
}
