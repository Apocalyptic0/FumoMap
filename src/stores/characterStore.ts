import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Character } from '@/types'
import { defaultCharacters } from '@/data/characters'
import { getItem, setItem } from '@/utils/storage'

const STORAGE_KEY = 'characters'

export const useCharacterStore = defineStore('character', () => {
  // 角色列表（从预置数据加载，markCount 从 localStorage 同步）
  const characters = ref<Character[]>([])

  /**
   * 初始化角色数据
   * 从 localStorage 读取 markCount 数据并合并到预置角色
   */
  function init() {
    const savedCounts = getItem<Record<string, number>>(STORAGE_KEY + '_counts')
    characters.value = defaultCharacters.map((char) => ({
      ...char,
      markCount: savedCounts?.[char.id] ?? 0,
    }))
  }

  /**
   * 保存 markCount 到 localStorage
   */
  function saveMarkCounts() {
    const counts: Record<string, number> = {}
    characters.value.forEach((c) => {
      if (c.markCount > 0) {
        counts[c.id] = c.markCount
      }
    })
    setItem(STORAGE_KEY + '_counts', counts)
  }

  /**
   * 根据 ID 获取角色
   */
  function getCharacterById(id: string): Character | undefined {
    return characters.value.find((c) => c.id === id)
  }

  /**
   * 搜索角色（按名称模糊匹配）
   */
  function searchCharacters(keyword: string): Character[] {
    if (!keyword.trim()) return characters.value
    const kw = keyword.toLowerCase().trim()
    return characters.value.filter(
      (c) =>
        c.name.toLowerCase().includes(kw) ||
        c.nameEn.toLowerCase().includes(kw) ||
        c.tags.some((t) => t.toLowerCase().includes(kw))
    )
  }

  /**
   * 增加角色的 markCount
   */
  function incrementMarkCount(characterIds: string[]) {
    characterIds.forEach((id) => {
      const char = characters.value.find((c) => c.id === id)
      if (char) {
        char.markCount++
      }
    })
    saveMarkCounts()
  }

  /**
   * 减少角色的 markCount
   */
  function decrementMarkCount(characterIds: string[]) {
    characterIds.forEach((id) => {
      const char = characters.value.find((c) => c.id === id)
      if (char && char.markCount > 0) {
        char.markCount--
      }
    })
    saveMarkCounts()
  }

  /** 按 markCount 排序的热门角色 */
  const popularCharacters = computed(() =>
    [...characters.value].sort((a, b) => b.markCount - a.markCount)
  )

  // 初始化
  init()

  return {
    characters,
    popularCharacters,
    getCharacterById,
    searchCharacters,
    incrementMarkCount,
    decrementMarkCount,
  }
})
