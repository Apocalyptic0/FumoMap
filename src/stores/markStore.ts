import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Mark, MarkFormData } from '@/types'
import { getItem, setItem, isStorageNearFull } from '@/utils/storage'
import { useCharacterStore } from './characterStore'

const STORAGE_KEY = 'marks'

export const useMarkStore = defineStore('mark', () => {
  const marks = ref<Mark[]>([])

  /**
   * 初始化：从 localStorage 加载标记数据
   */
  function init() {
    const saved = getItem<Mark[]>(STORAGE_KEY)
    if (saved && Array.isArray(saved)) {
      marks.value = saved
    }
  }

  /**
   * 同步数据到 localStorage
   */
  function syncToStorage(): boolean {
    return setItem(STORAGE_KEY, marks.value)
  }

  /**
   * 添加新标记
   */
  function addMark(formData: MarkFormData): { success: boolean; message: string; mark?: Mark } {
    // 检查存储空间
    if (isStorageNearFull()) {
      return { success: false, message: '存储空间不足，请删除部分打卡记录后再试' }
    }

    const newMark: Mark = {
      id: generateId(),
      characterIds: formData.characterIds,
      lat: formData.lat,
      lng: formData.lng,
      locationName: formData.locationName,
      images: formData.images,
      description: formData.description,
      tags: formData.tags,
      createdAt: Date.now(),
    }

    marks.value.push(newMark)

    const saved = syncToStorage()
    if (!saved) {
      // 写入失败，回滚
      marks.value.pop()
      return { success: false, message: '保存失败，存储空间可能不足' }
    }

    // 更新关联角色的 markCount
    const characterStore = useCharacterStore()
    characterStore.incrementMarkCount(formData.characterIds)

    return { success: true, message: '打卡成功！', mark: newMark }
  }

  /**
   * 删除标记
   */
  function removeMark(id: string): boolean {
    const index = marks.value.findIndex((m) => m.id === id)
    if (index === -1) return false

    const mark = marks.value[index]
    marks.value.splice(index, 1)
    syncToStorage()

    // 减少关联角色的 markCount
    const characterStore = useCharacterStore()
    characterStore.decrementMarkCount(mark.characterIds)

    return true
  }

  /**
   * 更新标记
   */
  function updateMark(id: string, formData: MarkFormData): { success: boolean; message: string } {
    const index = marks.value.findIndex((m) => m.id === id)
    if (index === -1) return { success: false, message: '未找到该打卡记录' }

    const oldMark = marks.value[index]

    // 更新角色 markCount（先减旧的，再加新的）
    const characterStore = useCharacterStore()
    characterStore.decrementMarkCount(oldMark.characterIds)
    characterStore.incrementMarkCount(formData.characterIds)

    // 保留 id 和 createdAt，更新其余字段
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
      // 回滚
      marks.value[index] = oldMark
      characterStore.decrementMarkCount(formData.characterIds)
      characterStore.incrementMarkCount(oldMark.characterIds)
      return { success: false, message: '保存失败，存储空间可能不足' }
    }

    return { success: true, message: '更新成功！' }
  }

  /**
   * 根据 ID 获取标记
   */
  function getMarkById(id: string): Mark | undefined {
    return marks.value.find((m) => m.id === id)
  }

  /** 所有标记（按时间倒序） */
  const allMarks = computed(() =>
    [...marks.value].sort((a, b) => b.createdAt - a.createdAt)
  )

  /** 标记总数 */
  const markCount = computed(() => marks.value.length)

  // 初始化
  init()

  return {
    marks,
    allMarks,
    markCount,
    addMark,
    removeMark,
    updateMark,
    getMarkById,
  }
})

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
}
