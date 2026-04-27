import { computed, type Ref } from 'vue'
import type { Mark } from '@/types'
import { useMarkStore } from '@/stores/markStore'
import { useCharacterStore } from '@/stores/characterStore'

/**
 * 打卡筛选 composable
 * 抽取 HomeView / ExploreView 共用的搜索和角色筛选逻辑
 */
export function useMarkFilter(keyword: Ref<string>) {
  const markStore = useMarkStore()
  const characterStore = useCharacterStore()

  /** 有打卡记录的角色列表（用于筛选面板） */
  const charactersWithMarks = computed(() => {
    const charIdsWithMarks = new Set<string>()
    markStore.visibleMarks.forEach((m) =>
      m.characterIds.forEach((id) => charIdsWithMarks.add(id))
    )
    return characterStore.characters.filter((c) => charIdsWithMarks.has(c.id))
  })

  /**
   * 按关键词过滤打卡列表
   * 匹配：地点名 / 描述 / 标签 / 角色中英文名
   */
  function filterByKeyword(marks: Mark[]): Mark[] {
    const kw = keyword.value.toLowerCase().trim()
    if (!kw) return marks

    return marks.filter((m) => {
      if (m.locationName.toLowerCase().includes(kw)) return true
      if (m.description.toLowerCase().includes(kw)) return true
      if (m.tags.some((t) => t.toLowerCase().includes(kw))) return true
      return m.characterIds.some((id) => {
        const char = characterStore.getCharacterById(id)
        return (
          char &&
          (char.name.toLowerCase().includes(kw) ||
            char.nameEn.toLowerCase().includes(kw))
        )
      })
    })
  }

  return {
    charactersWithMarks,
    filterByKeyword,
  }
}
