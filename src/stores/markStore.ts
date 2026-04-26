import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Mark, MarkFormData } from '@/types'
import { getItem, setItem, isStorageNearFull } from '@/utils/storage'
import { useCharacterStore } from './characterStore'
import { useUserStore } from './userStore'
import { isSupabaseReady, waitForSession } from '@/api/client'
import * as marksApi from '@/api/marks'
import * as storageApi from '@/api/storage'
import type { DbMark } from '@/api/marks'

const STORAGE_KEY = 'marks'

/**
 * 将云端 DbMark（snake_case）转换为前端 Mark（camelCase）
 */
function dbMarkToMark(db: DbMark): Mark {
  return {
    id: db.id,
    userId: db.user_id,
    characterIds: db.character_ids,
    lat: db.lat,
    lng: db.lng,
    locationName: db.location_name,
    images: db.images,
    description: db.description,
    tags: db.tags,
    visibility: db.visibility,
    createdAt: new Date(db.created_at).getTime(),
    likeCount: db.like_count,
    likedBy: [],
  }
}

export const useMarkStore = defineStore('mark', () => {
  const marks = ref<Mark[]>([])

  /** 是否正在加载 */
  const loading = ref(false)

  /**
   * 初始化：从 localStorage 加载本地标记数据
   * 云端标记通过 fetchPublicMarks/fetchMyMarks 按需加载
   */
  function init() {
    const saved = getItem<Mark[]>(STORAGE_KEY)
    if (saved && Array.isArray(saved)) {
      marks.value = saved.map((m) => ({
        ...m,
        likeCount: m.likeCount ?? 0,
        likedBy: m.likedBy ?? [],
      }))
    }
  }

  /**
   * 同步数据到 localStorage
   */
  function syncToStorage(): boolean {
    return setItem(STORAGE_KEY, marks.value)
  }

  /**
   * 判断当前是否走云端路径
   */
  function shouldUseCloud(): boolean {
    if (!isSupabaseReady()) return false
    const userStore = useUserStore()
    return userStore.isCloudUser
  }

  /**
   * 添加新标记
   * 已登录：图片上传 Storage → 创建云端记录
   * 未登录：base64 存 localStorage
   */
  async function addMark(
    formData: MarkFormData,
    compressedFiles?: File[]
  ): Promise<{ success: boolean; message: string; mark?: Mark }> {
    const userStore = useUserStore()

    if (shouldUseCloud()) {
      // === 云端路径 ===
      try {
        loading.value = true
        // 确保 session 就绪
        const sessionOk = await waitForSession(2000)
        console.log('[MarkStore] 云端打卡路径 | session就绪:', sessionOk, '| userId:', userStore.getUserId())
        let imageUrls: string[] = formData.images

        // 如果提供了压缩文件，上传到 Storage
        if (compressedFiles && compressedFiles.length > 0) {
          imageUrls = await storageApi.uploadImages(
            compressedFiles,
            userStore.getUserId()
          )
        }

        const dbMark = await marksApi.createMark({
          user_id: userStore.getUserId(),
          character_ids: formData.characterIds,
          lat: formData.lat,
          lng: formData.lng,
          location_name: formData.locationName,
          images: imageUrls,
          description: formData.description,
          tags: formData.tags,
          visibility: 'public',
        })
        console.log('[MarkStore] 云端创建成功 | id:', dbMark.id, '| user_id:', dbMark.user_id)

        const mark = dbMarkToMark(dbMark)
        marks.value.push(mark)

        // 更新关联角色的 markCount
        const characterStore = useCharacterStore()
        characterStore.incrementMarkCount(formData.characterIds)

        return { success: true, message: '打卡成功！', mark }
      } catch (e: any) {
        console.error('[MarkStore] 云端创建失败:', e?.message)
        return { success: false, message: e?.message || '创建打卡失败，请重试' }
      } finally {
        loading.value = false
      }
    }

    // === 本地路径（P0 兼容） ===
    console.log('[MarkStore] 本地打卡路径 | userId:', userStore.getUserId())
    if (isStorageNearFull()) {
      return { success: false, message: '存储空间不足，请删除部分打卡记录后再试' }
    }

    const newMark: Mark = {
      id: generateId(),
      userId: userStore.getUserId(),
      characterIds: formData.characterIds,
      lat: formData.lat,
      lng: formData.lng,
      locationName: formData.locationName,
      images: formData.images,
      description: formData.description,
      tags: formData.tags,
      createdAt: Date.now(),
      likeCount: 0,
      likedBy: [],
    }

    marks.value.push(newMark)

    const saved = syncToStorage()
    if (!saved) {
      marks.value.pop()
      return { success: false, message: '保存失败，存储空间可能不足' }
    }

    const characterStore = useCharacterStore()
    characterStore.incrementMarkCount(formData.characterIds)

    return { success: true, message: '打卡成功！', mark: newMark }
  }

  /**
   * 删除标记
   */
  async function removeMark(id: string): Promise<boolean> {
    const index = marks.value.findIndex((m) => m.id === id)
    if (index === -1) return false

    const mark = marks.value[index]

    if (shouldUseCloud()) {
      try {
        // 删除云端图片
        const cloudImages = mark.images.filter((img) => img.startsWith('http'))
        if (cloudImages.length > 0) {
          await storageApi.deleteImages(cloudImages)
        }
        await marksApi.deleteMark(id)
      } catch (e) {
        console.error('[MarkStore] 云端删除失败:', e)
        return false
      }
    }

    marks.value.splice(index, 1)
    syncToStorage()

    const characterStore = useCharacterStore()
    characterStore.decrementMarkCount(mark.characterIds)

    return true
  }

  /**
   * 更新标记
   */
  async function updateMark(
    id: string,
    formData: MarkFormData,
    compressedFiles?: File[]
  ): Promise<{ success: boolean; message: string }> {
    const index = marks.value.findIndex((m) => m.id === id)
    if (index === -1) return { success: false, message: '未找到该打卡记录' }

    const oldMark = marks.value[index]
    const characterStore = useCharacterStore()
    const userStore = useUserStore()

    if (shouldUseCloud()) {
      try {
        loading.value = true
        let imageUrls: string[] = formData.images

        // 上传新图片
        if (compressedFiles && compressedFiles.length > 0) {
          imageUrls = await storageApi.uploadImages(
            compressedFiles,
            userStore.getUserId()
          )
        }

        const dbMark = await marksApi.updateMark(id, {
          character_ids: formData.characterIds,
          lat: formData.lat,
          lng: formData.lng,
          location_name: formData.locationName,
          images: imageUrls,
          description: formData.description,
          tags: formData.tags,
        })

        characterStore.decrementMarkCount(oldMark.characterIds)
        characterStore.incrementMarkCount(formData.characterIds)
        marks.value[index] = dbMarkToMark(dbMark)

        return { success: true, message: '更新成功！' }
      } catch (e: any) {
        return { success: false, message: e?.message || '更新失败，请重试' }
      } finally {
        loading.value = false
      }
    }

    // === 本地路径 ===
    characterStore.decrementMarkCount(oldMark.characterIds)
    characterStore.incrementMarkCount(formData.characterIds)

    marks.value[index] = {
      ...oldMark,
      characterIds: formData.characterIds,
      lat: formData.lat,
      lng: formData.lng,
      locationName: formData.locationName,
      images: formData.images,
      description: formData.description,
      tags: formData.tags,
    }

    const saved = syncToStorage()
    if (!saved) {
      marks.value[index] = oldMark
      characterStore.decrementMarkCount(formData.characterIds)
      characterStore.incrementMarkCount(oldMark.characterIds)
      return { success: false, message: '保存失败，存储空间可能不足' }
    }

    return { success: true, message: '更新成功！' }
  }

  /** ID → Mark 索引（O(1) 查找） */
  const marksById = computed(() => new Map(marks.value.map((m) => [m.id, m] as [string, Mark])))

  /**
   * 根据 ID 获取标记
   */
  function getMarkById(id: string): Mark | undefined {
    return marksById.value.get(id)
  }

  /** 所有标记（按时间倒序） */
  const allMarks = computed(() =>
    [...marks.value].sort((a, b) => b.createdAt - a.createdAt)
  )

  /** 标记总数 */
  const markCount = computed(() => marks.value.length)

  /**
   * 从云端加载公开标记（P1 新增）
   */
  async function fetchPublicMarks(): Promise<void> {
    if (!isSupabaseReady()) return
    try {
      loading.value = true
      const dbMarks = await marksApi.getPublicMarks()
      const fetched = dbMarks.map(dbMarkToMark)

      // 合并：云端数据覆盖本地，新增的追加
      const map = new Map(marks.value.map((m) => [m.id, m] as [string, Mark]))
      for (const m of fetched) {
        map.set(m.id, m) // 云端数据覆盖本地
      }
      marks.value = [...map.values()]
    } catch (e) {
      console.error('[MarkStore] 加载公开标记失败:', e)
    } finally {
      loading.value = false
    }
  }

  /**
   * 从云端加载我的标记（P1 新增）
   */
  async function fetchMyMarks(): Promise<void> {
    if (!shouldUseCloud()) return
    const userStore = useUserStore()
    try {
      loading.value = true
      const dbMarks = await marksApi.getMyMarks(userStore.getUserId())
      const fetched = dbMarks.map(dbMarkToMark)

      // 用云端数据替换本地
      const myIds = new Set(fetched.map((m) => m.id))
      marks.value = marks.value.filter((m) => !myIds.has(m.id))
      marks.value.push(...fetched)
    } catch (e) {
      console.error('[MarkStore] 加载我的标记失败:', e)
    } finally {
      loading.value = false
    }
  }

  // 初始化
  init()

  return {
    marks,
    allMarks,
    markCount,
    loading,
    addMark,
    removeMark,
    updateMark,
    getMarkById,
    syncToStorage,
    fetchPublicMarks,
    fetchMyMarks,
  }
})

/**
 * 生成唯一 ID（本地模式使用）
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
}
