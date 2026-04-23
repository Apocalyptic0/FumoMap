/** 东方角色 */
export interface Character {
  id: string
  name: string        // 中文名
  nameEn: string      // 英文名
  avatarUrl: string   // 头像 URL（P0 为 SVG data URI 占位图）
  tags: string[]      // 角色标签
  markCount: number   // 被打卡记录次数（全局统计）
  aiProfile: string   // 角色性格描述缓存（供后续 AI 角色回复使用）
}

/** 打卡标记 */
export interface Mark {
  id: string
  characterIds: string[] // 关联角色 ID 列表（第一个为主角色，用于地图图标显示）
  lat: number
  lng: number
  locationName: string    // 地点名（用户填写）
  images: string[]        // base64 图片列表（最多 3 张）
  description: string
  tags: string[]
  createdAt: number       // 时间戳
}

/** 创建标记表单数据 */
export interface MarkFormData {
  characterIds: string[]  // 关联角色 ID 列表（至少选择一个）
  lat: number
  lng: number
  locationName: string
  images: string[]
  description: string
  tags: string[]
}

/** 地理位置 */
export interface GeoPosition {
  lat: number
  lng: number
}

/** 默认地图中心：深圳（方便国内测试） */
export const DEFAULT_CENTER: GeoPosition = { lat: 22.5431, lng: 113.9348 }
