import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Comment, ViewRecord, FavoriteRecord } from '@/types'
import { getItem, setItem } from '@/utils/storage'
import { useUserStore } from './userStore'
import { useMarkStore } from './markStore'

const STORAGE_KEYS = {
  comments: 'interaction_comments',
  favorites: 'interaction_favorites',
  viewHistory: 'interaction_view_history',
} as const

const MAX_VIEW_HISTORY = 100

/**
 * 互动 Store
 *
 * P0：全量 localStorage 持久化
 * P1 迁移计划：
 *   - toggleLike()   → POST/DELETE /api/marks/:id/like
 *   - addComment()   → POST /api/marks/:id/comments
 *   - deleteComment() → DELETE /api/comments/:id
 *   - toggleFavorite() → POST/DELETE /api/marks/:id/favorite
 *   - getComments()  → GET /api/marks/:id/comments?page=&size=
 *   - addViewRecord() → POST /api/marks/:id/view（可合并到详情接口）
 *   - 点赞数/评论数改为从 Mark 聚合字段读取（服务端维护）
 */
export const useInteractionStore = defineStore('interaction', () => {
  const comments = ref<Comment[]>([])
  const favorites = ref<FavoriteRecord[]>([])
  const viewHistory = ref<ViewRecord[]>([])

  // ========== 初始化 ==========

  function init() {
    const savedComments = getItem<Comment[]>(STORAGE_KEYS.comments)
    if (savedComments && Array.isArray(savedComments)) {
      comments.value = savedComments
    }

    const savedFavorites = getItem<FavoriteRecord[]>(STORAGE_KEYS.favorites)
    if (savedFavorites && Array.isArray(savedFavorites)) {
      favorites.value = savedFavorites
    }

    const savedHistory = getItem<ViewRecord[]>(STORAGE_KEYS.viewHistory)
    if (savedHistory && Array.isArray(savedHistory)) {
      viewHistory.value = savedHistory
    }
  }

  function syncComments(): boolean {
    return setItem(STORAGE_KEYS.comments, comments.value)
  }

  function syncFavorites(): boolean {
    return setItem(STORAGE_KEYS.favorites, favorites.value)
  }

  function syncViewHistory(): boolean {
    return setItem(STORAGE_KEYS.viewHistory, viewHistory.value)
  }

  // ========== 点赞 ==========

  /**
   * 切换点赞状态
   * P1：改为 API 调用，服务端维护 likeCount
   */
  function toggleLike(markId: string): boolean {
    const markStore = useMarkStore()
    const userStore = useUserStore()
    const userId = userStore.getUserId()
    const mark = markStore.getMarkById(markId)
    if (!mark) return false

    const idx = mark.likedBy.indexOf(userId)
    if (idx >= 0) {
      // 取消点赞
      mark.likedBy.splice(idx, 1)
      mark.likeCount = Math.max(0, mark.likeCount - 1)
    } else {
      // 点赞
      mark.likedBy.push(userId)
      mark.likeCount += 1
    }

    markStore.syncToStorage()
    return true
  }

  /** 检查当前用户是否已点赞 */
  function isLiked(markId: string): boolean {
    const markStore = useMarkStore()
    const userStore = useUserStore()
    const mark = markStore.getMarkById(markId)
    if (!mark) return false
    return mark.likedBy.includes(userStore.getUserId())
  }

  // ========== 评论 ==========

  /**
   * 添加评论
   * P1：改为 POST /api/marks/:id/comments，服务端生成 id
   */
  function addComment(markId: string, content: string): Comment | null {
    const userStore = useUserStore()
    const trimmed = content.trim()
    if (!trimmed) return null

    const comment: Comment = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 8),
      markId,
      userId: userStore.getUserId(),
      content: trimmed,
      createdAt: Date.now(),
    }

    comments.value.push(comment)
    syncComments()
    return comment
  }

  /**
   * 删除评论（只能删除自己的）
   * P1：改为 DELETE /api/comments/:id
   */
  function deleteComment(commentId: string): boolean {
    const userStore = useUserStore()
    const idx = comments.value.findIndex(
      (c) => c.id === commentId && c.userId === userStore.getUserId()
    )
    if (idx === -1) return false

    comments.value.splice(idx, 1)
    syncComments()
    return true
  }

  /** 获取某个打卡的评论列表（按时间正序） */
  function getComments(markId: string): Comment[] {
    return comments.value
      .filter((c) => c.markId === markId)
      .sort((a, b) => a.createdAt - b.createdAt)
  }

  /** 获取某个打卡的评论数 */
  function getCommentCount(markId: string): number {
    return comments.value.filter((c) => c.markId === markId).length
  }

  /** 获取当前用户的所有评论（按时间倒序） */
  const myComments = computed(() => {
    const userStore = useUserStore()
    const userId = userStore.getUserId()
    return [...comments.value]
      .filter((c) => c.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt)
  })

  // ========== 收藏 ==========

  /**
   * 切换收藏状态
   * P1：改为 POST/DELETE /api/marks/:id/favorite
   */
  function toggleFavorite(markId: string): boolean {
    const idx = favorites.value.findIndex((f) => f.markId === markId)
    if (idx >= 0) {
      favorites.value.splice(idx, 1)
    } else {
      favorites.value.push({ markId, createdAt: Date.now() })
    }
    syncFavorites()
    return true
  }

  /** 检查是否已收藏 */
  function isFavorited(markId: string): boolean {
    return favorites.value.some((f) => f.markId === markId)
  }

  /** 收藏列表（按时间倒序） */
  const favoriteList = computed(() =>
    [...favorites.value].sort((a, b) => b.createdAt - a.createdAt)
  )

  // ========== 浏览记录 ==========

  /**
   * 记录浏览
   * P1：可合并到 GET /api/marks/:id 详情接口的副作用
   */
  function addViewRecord(markId: string) {
    // 如果已有该记录，更新时间并提升到最前
    const idx = viewHistory.value.findIndex((v) => v.markId === markId)
    if (idx >= 0) {
      viewHistory.value.splice(idx, 1)
    }

    viewHistory.value.unshift({ markId, viewedAt: Date.now() })

    // 超过上限则裁剪
    if (viewHistory.value.length > MAX_VIEW_HISTORY) {
      viewHistory.value = viewHistory.value.slice(0, MAX_VIEW_HISTORY)
    }

    syncViewHistory()
  }

  /** 浏览记录列表（已按时间倒序） */
  const viewHistoryList = computed(() => viewHistory.value)

  // ========== 清理：删除打卡时清理关联互动数据 ==========

  function cleanupForMark(markId: string) {
    comments.value = comments.value.filter((c) => c.markId !== markId)
    favorites.value = favorites.value.filter((f) => f.markId !== markId)
    viewHistory.value = viewHistory.value.filter((v) => v.markId !== markId)
    syncComments()
    syncFavorites()
    syncViewHistory()
  }

  // 初始化
  init()

  return {
    // 点赞
    toggleLike,
    isLiked,
    // 评论
    comments,
    addComment,
    deleteComment,
    getComments,
    getCommentCount,
    myComments,
    // 收藏
    toggleFavorite,
    isFavorited,
    favoriteList,
    // 浏览
    addViewRecord,
    viewHistoryList,
    // 清理
    cleanupForMark,
  }
})
