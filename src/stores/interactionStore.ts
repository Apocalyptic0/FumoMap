import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Comment, ViewRecord, FavoriteRecord } from '@/types'
import { getItem, setItem } from '@/utils/storage'
import { useUserStore } from './userStore'
import { useMarkStore } from './markStore'
import { isSupabaseReady, waitForSession } from '@/api/client'
import * as interactionsApi from '@/api/interactions'

const STORAGE_KEYS = {
  comments: 'interaction_comments',
  favorites: 'interaction_favorites',
  viewHistory: 'interaction_view_history',
} as const

const MAX_VIEW_HISTORY = 100

/**
 * 互动 Store
 *
 * 双路径模式：
 *   - 云端用户：调用 Supabase API + 乐观更新
 *   - 本地用户 / 未登录：localStorage 持久化（P0 兼容）
 */
export const useInteractionStore = defineStore('interaction', () => {
  const comments = ref<Comment[]>([])
  const favorites = ref<FavoriteRecord[]>([])
  const viewHistory = ref<ViewRecord[]>([])

  /** 云端点赞状态缓存 markId → boolean */
  const likedCache = ref<Map<string, boolean>>(new Map())
  /** 云端收藏状态缓存 markId → boolean */
  const favoritedCache = ref<Map<string, boolean>>(new Map())

  // ========== 工具函数 ==========

  function shouldUseCloud(): boolean {
    if (!isSupabaseReady()) return false
    const userStore = useUserStore()
    return userStore.isCloudUser
  }

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

  /**
   * 清除本地互动缓存（登出时调用）
   */
  function clearLocalCache() {
    likedCache.value.clear()
    favoritedCache.value.clear()
    comments.value = []
    favorites.value = []
    viewHistory.value = []
    syncComments()
    syncFavorites()
    syncViewHistory()
  }

  // ========== 点赞 ==========

  /**
   * 切换点赞状态
   * 云端：API 调用 + 乐观更新
   * 本地：localStorage
   */
  async function toggleLike(markId: string): Promise<boolean> {
    const markStore = useMarkStore()
    const userStore = useUserStore()
    const userId = userStore.getUserId()
    const mark = markStore.getMarkById(markId)
    if (!mark) return false

    if (shouldUseCloud()) {
      // 确保 session 就绪
      await waitForSession(2000)
      // 乐观更新
      const wasLiked = likedCache.value.get(markId) ?? false
      likedCache.value.set(markId, !wasLiked)
      mark.likeCount += wasLiked ? -1 : 1

      try {
        const nowLiked = await interactionsApi.toggleLike(markId, userId)
        likedCache.value.set(markId, nowLiked)
        return true
      } catch (e) {
        // 回滚
        likedCache.value.set(markId, wasLiked)
        mark.likeCount += wasLiked ? 1 : -1
        console.error('[InteractionStore] 点赞失败:', e)
        return false
      }
    }

    // === 本地路径 ===
    const idx = mark.likedBy.indexOf(userId)
    if (idx >= 0) {
      mark.likedBy.splice(idx, 1)
      mark.likeCount = Math.max(0, mark.likeCount - 1)
    } else {
      mark.likedBy.push(userId)
      mark.likeCount += 1
    }

    markStore.syncToStorage()
    return true
  }

  /** 检查当前用户是否已点赞 */
  function isLiked(markId: string): boolean {
    if (shouldUseCloud()) {
      return likedCache.value.get(markId) ?? false
    }
    const markStore = useMarkStore()
    const userStore = useUserStore()
    const mark = markStore.getMarkById(markId)
    if (!mark) return false
    return mark.likedBy.includes(userStore.getUserId())
  }

  /**
   * 从云端加载某打卡的点赞状态
   */
  async function fetchLikeStatus(markId: string): Promise<void> {
    if (!shouldUseCloud()) return
    const userStore = useUserStore()
    try {
      const liked = await interactionsApi.isLiked(markId, userStore.getUserId())
      likedCache.value.set(markId, liked)
    } catch (e) {
      console.error('[InteractionStore] 获取点赞状态失败:', e)
    }
  }

  // ========== 评论 ==========

  /**
   * 添加评论
   * 云端：API 调用
   * 本地：localStorage
   */
  async function addComment(markId: string, content: string): Promise<Comment | null> {
    const userStore = useUserStore()
    const trimmed = content.trim()
    if (!trimmed) return null

    if (shouldUseCloud()) {
      try {
        // 确保 session 就绪
        await waitForSession(2000)
        const dbComment = await interactionsApi.addComment(markId, userStore.getUserId(), trimmed)
        const comment: Comment = {
          id: dbComment.id,
          markId: dbComment.mark_id,
          userId: dbComment.user_id,
          content: dbComment.content,
          createdAt: new Date(dbComment.created_at).getTime(),
        }
        comments.value.push(comment)
        return comment
      } catch (e) {
        console.error('[InteractionStore] 评论失败:', e)
        return null
      }
    }

    // === 本地路径 ===
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
   */
  async function deleteComment(commentId: string): Promise<boolean> {
    const userStore = useUserStore()

    if (shouldUseCloud()) {
      try {
        await interactionsApi.deleteComment(commentId)
        comments.value = comments.value.filter((c) => c.id !== commentId)
        return true
      } catch (e) {
        console.error('[InteractionStore] 删除评论失败:', e)
        return false
      }
    }

    // === 本地路径 ===
    const idx = comments.value.findIndex(
      (c) => c.id === commentId && c.userId === userStore.getUserId()
    )
    if (idx === -1) return false

    comments.value.splice(idx, 1)
    syncComments()
    return true
  }

  /** 评论按 markId 分组索引（已按时间正序） */
  const commentsMap = computed(() => {
    const map = new Map<string, Comment[]>()
    for (const c of comments.value) {
      let list = map.get(c.markId)
      if (!list) {
        list = []
        map.set(c.markId, list)
      }
      list.push(c)
    }
    // 每组按时间正序
    for (const list of map.values()) {
      list.sort((a, b) => a.createdAt - b.createdAt)
    }
    return map
  })

  /** 获取某个打卡的评论列表（按时间正序） */
  function getComments(markId: string): Comment[] {
    return commentsMap.value.get(markId) ?? []
  }

  /**
   * 从云端加载某打卡的评论
   */
  async function fetchComments(markId: string): Promise<void> {
    if (!shouldUseCloud()) return
    try {
      const dbComments = await interactionsApi.getComments(markId)
      // 先移除该 markId 的旧缓存
      comments.value = comments.value.filter((c) => c.markId !== markId)
      // 追加云端数据
      for (const dc of dbComments) {
        comments.value.push({
          id: dc.id,
          markId: dc.mark_id,
          userId: dc.user_id,
          content: dc.content,
          createdAt: new Date(dc.created_at).getTime(),
        })
      }
    } catch (e) {
      console.error('[InteractionStore] 获取评论失败:', e)
    }
  }

  /** 评论数索引 */
  const commentCountMap = computed(() => {
    const map = new Map<string, number>()
    comments.value.forEach((c) => {
      map.set(c.markId, (map.get(c.markId) ?? 0) + 1)
    })
    return map
  })

  function getCommentCount(markId: string): number {
    return commentCountMap.value.get(markId) ?? 0
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
   */
  async function toggleFavorite(markId: string): Promise<boolean> {
    if (shouldUseCloud()) {
      // 确保 session 就绪
      await waitForSession(2000)
      const userStore = useUserStore()
      const wasFavorited = favoritedCache.value.get(markId) ?? false

      // 乐观更新
      favoritedCache.value.set(markId, !wasFavorited)
      if (wasFavorited) {
        favorites.value = favorites.value.filter((f) => f.markId !== markId)
      } else {
        favorites.value.push({ markId, createdAt: Date.now() })
      }

      try {
        const nowFavorited = await interactionsApi.toggleFavorite(markId, userStore.getUserId())
        favoritedCache.value.set(markId, nowFavorited)
        return true
      } catch (e) {
        // 回滚
        favoritedCache.value.set(markId, wasFavorited)
        if (!wasFavorited) {
          favorites.value = favorites.value.filter((f) => f.markId !== markId)
        } else {
          favorites.value.push({ markId, createdAt: Date.now() })
        }
        console.error('[InteractionStore] 收藏失败:', e)
        return false
      }
    }

    // === 本地路径 ===
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
    if (shouldUseCloud()) {
      return favoritedCache.value.get(markId) ?? false
    }
    return favorites.value.some((f) => f.markId === markId)
  }

  /**
   * 从云端加载某打卡的收藏状态
   */
  async function fetchFavoriteStatus(markId: string): Promise<void> {
    if (!shouldUseCloud()) return
    if (favoritedCache.value.has(markId)) return // 已缓存
    const userStore = useUserStore()
    try {
      const fav = await interactionsApi.isFavorited(markId, userStore.getUserId())
      favoritedCache.value.set(markId, fav)
    } catch (e) {
      console.error('[InteractionStore] 获取收藏状态失败:', e)
    }
  }

  /**
   * 从云端加载我的收藏列表
   */
  async function fetchMyFavorites(): Promise<void> {
    if (!shouldUseCloud()) return
    const userStore = useUserStore()
    try {
      const items = await interactionsApi.getFavorites(userStore.getUserId())
      favorites.value = items.map((item) => ({
        markId: item.mark_id,
        createdAt: new Date(item.created_at).getTime(),
      }))
      // 更新缓存
      favoritedCache.value.clear()
      for (const item of items) {
        favoritedCache.value.set(item.mark_id, true)
      }
    } catch (e) {
      console.error('[InteractionStore] 获取收藏列表失败:', e)
    }
  }

  /** 收藏列表（按时间倒序） */
  const favoriteList = computed(() =>
    [...favorites.value].sort((a, b) => b.createdAt - a.createdAt)
  )

  // ========== 浏览记录 ==========

  /**
   * 记录浏览
   */
  async function addViewRecord(markId: string) {
    if (shouldUseCloud()) {
      const userStore = useUserStore()
      try {
        await interactionsApi.addViewRecord(markId, userStore.getUserId())
      } catch (e) {
        console.error('[InteractionStore] 记录浏览失败:', e)
      }
    }

    // 本地也维护一份用于 UI 展示
    const idx = viewHistory.value.findIndex((v) => v.markId === markId)
    if (idx >= 0) {
      viewHistory.value.splice(idx, 1)
    }

    viewHistory.value.unshift({ markId, viewedAt: Date.now() })

    if (viewHistory.value.length > MAX_VIEW_HISTORY) {
      viewHistory.value = viewHistory.value.slice(0, MAX_VIEW_HISTORY)
    }

    syncViewHistory()
  }

  // ========== 清理：删除打卡时清理关联互动数据 ==========

  function cleanupForMark(markId: string) {
    comments.value = comments.value.filter((c) => c.markId !== markId)
    favorites.value = favorites.value.filter((f) => f.markId !== markId)
    viewHistory.value = viewHistory.value.filter((v) => v.markId !== markId)
    likedCache.value.delete(markId)
    favoritedCache.value.delete(markId)
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
    fetchLikeStatus,
    // 评论
    comments,
    addComment,
    deleteComment,
    getComments,
    getCommentCount,
    myComments,
    fetchComments,
    // 收藏
    toggleFavorite,
    isFavorited,
    favoriteList,
    fetchMyFavorites,
    fetchFavoriteStatus,
    // 浏览
    addViewRecord,
    viewHistory,
    // 清理
    cleanupForMark,
    clearLocalCache,
  }
})
