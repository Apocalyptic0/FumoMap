import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { LocalUser } from '@/types'
import { getItem, setItem } from '@/utils/storage'
import { generatePlaceholderAvatar } from '@/utils/placeholder'

const STORAGE_KEY = 'user_profile'

/** 默认测试用户 */
const DEFAULT_USER: LocalUser = {
  id: 'local_user_001',
  nickname: 'Fumo旅行者',
  avatarUrl: generatePlaceholderAvatar('旅行者'),
  bio: '在幻想乡四处打卡中~',
  createdAt: Date.now(),
}

/**
 * 用户 Store
 *
 * P0：本地单用户，数据存 localStorage
 * P1 迁移计划：
 *   - init() 改为调用 auth API 获取用户信息
 *   - updateProfile() 改为调用 PUT /api/user/profile
 *   - 新增 login() / logout() / refreshToken()
 */
export const useUserStore = defineStore('user', () => {
  const currentUser = ref<LocalUser>(DEFAULT_USER)

  /** 是否已登录（P0 永远为 true，P1 根据 token 判断） */
  const isLoggedIn = computed(() => !!currentUser.value.id)

  /**
   * 初始化：从 localStorage 加载用户信息
   * P1：替换为 fetchUserProfile() 从服务端获取
   */
  function init() {
    const saved = getItem<LocalUser>(STORAGE_KEY)
    if (saved && saved.id) {
      currentUser.value = saved
    } else {
      // 首次使用，创建默认测试用户
      currentUser.value = { ...DEFAULT_USER, createdAt: Date.now() }
      syncToStorage()
    }
  }

  function syncToStorage(): boolean {
    return setItem(STORAGE_KEY, currentUser.value)
  }

  /**
   * 更新用户资料
   * P1：替换为 API 调用 + 乐观更新
   */
  function updateProfile(updates: Partial<Pick<LocalUser, 'nickname' | 'bio' | 'avatarUrl'>>) {
    if (updates.nickname !== undefined) currentUser.value.nickname = updates.nickname
    if (updates.bio !== undefined) currentUser.value.bio = updates.bio
    if (updates.avatarUrl !== undefined) currentUser.value.avatarUrl = updates.avatarUrl
    syncToStorage()
  }

  /** 获取当前用户 ID */
  function getUserId(): string {
    return currentUser.value.id
  }

  // 初始化
  init()

  return {
    currentUser,
    isLoggedIn,
    updateProfile,
    getUserId,
  }
})
