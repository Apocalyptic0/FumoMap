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
  userId?: string          // P1: 创建者用户 ID（云端标记必有，本地标记可选）
  characterIds: string[]   // 关联角色 ID 列表（第一个为主角色，用于地图图标显示）
  lat: number
  lng: number
  locationName: string     // 地点名（用户填写）
  images: string[]         // P0: base64 列表；P1: CDN URL 列表（兼容两种格式）
  description: string
  tags: string[]
  visibility?: 'public' | 'private'  // P1: 可见性，默认 public
  createdAt: number        // 时间戳
  isOffline?: boolean          // 离线打卡标识（本地创建、未上云）
  // --- 互动字段（P0 本地计数，P1 迁移到服务端聚合） ---
  likeCount: number        // 点赞数
  likedBy: string[]        // P0 点赞用户 ID 列表（P1 改为服务端关联表）
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

// =============================
// 用户 & 互动模型（P0 本地 → P1 接入云端）
// =============================

/**
 * 本地用户
 * P1 迁移时：id 替换为服务端 UID，avatarUrl 换为 CDN URL
 */
export interface LocalUser {
  id: string
  nickname: string
  avatarUrl: string
  bio: string
  createdAt: number
}

/**
 * P1 认证用户（扩展本地用户）
 */
export interface AuthUser extends LocalUser {
  email: string
  isCloudUser: true  // 标识为云端用户
}

/** 评论 */
export interface Comment {
  id: string
  markId: string
  userId: string
  content: string
  createdAt: number
  nickname?: string       // 评论者昵称（云端评论从 profiles 关联获取）
  avatarUrl?: string      // 评论者头像
}

/** 浏览记录 */
export interface ViewRecord {
  markId: string
  viewedAt: number
}

/** 收藏记录 */
export interface FavoriteRecord {
  markId: string
  createdAt: number
}

/**
 * 互动数据汇总（用于列表卡片展示）
 * P1 接入服务端后可由 API 直接返回
 */
export interface InteractionSummary {
  likeCount: number
  commentCount: number
  isLiked: boolean
  isFavorited: boolean
}

/** 默认地图中心：深圳（方便国内测试） */
export const DEFAULT_CENTER: GeoPosition = { lat: 22.5431, lng: 113.9348 }
