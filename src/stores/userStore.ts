import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { LocalUser, AuthUser } from '@/types'
import { getItem, setItem } from '@/utils/storage'
import { generatePlaceholderAvatar } from '@/utils/placeholder'
import { isSupabaseReady, waitForSession } from '@/api/client'
import * as authApi from '@/api/auth'
import { supabase } from '@/api/client'

const STORAGE_KEY = 'user_profile'

/** 默认本地用户（未登录时降级使用） */
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
 * 双路径模式：
 *   - 已登录云端用户：数据来自 Supabase Auth + profiles 表
 *   - 未登录 / Supabase 不可用：降级为 P0 本地用户
 */
export const useUserStore = defineStore('user', () => {
  const currentUser = ref<LocalUser | AuthUser>({ ...DEFAULT_USER })

  /** 是否为云端登录用户 */
  const isCloudUser = computed(() => 'isCloudUser' in currentUser.value && currentUser.value.isCloudUser === true)

  /** 是否已登录（云端用户 = 有 session；本地用户 = 永远 true，兼容 P0） */
  const isLoggedIn = computed(() => !!currentUser.value.id)

  /** 认证初始化是否完成 */
  const authReady = ref(false)

  /** 认证操作中 */
  const authLoading = ref(false)

  /**
   * 初始化：优先恢复 Supabase session，否则降级 localStorage
   */
  async function init() {
    if (import.meta.env.DEV) console.log('[UserStore] init 开始 | isSupabaseReady:', isSupabaseReady())
    if (isSupabaseReady()) {
      // 始终注册认证状态监听器
      authApi.onAuthStateChange(async (event, newSession) => {
        if (import.meta.env.DEV) console.log('[UserStore] onAuthStateChange | event:', event, '| hasSession:', !!newSession)
        if (event === 'SIGNED_OUT') {
          resetToLocal()
        } else if (event === 'INITIAL_SESSION' && !newSession) {
          // 初始化时无 session，加载本地用户（不覆盖已登录状态）
          if (!isCloudUser.value) {
            loadLocalUser()
            authReady.value = true
          }
        } else if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && newSession?.user) {
          await loadCloudProfile(newSession.user.id, newSession.user.email ?? '')
        }
      })

      try {
        const session = await authApi.getSession()
        console.log('[UserStore] getSession 结果 | hasSession:', !!session, '| userId:', session?.user?.id)
        if (session?.user) {
          await waitForSession()
          await loadCloudProfile(session.user.id, session.user.email ?? '')
          authReady.value = true
          if (import.meta.env.DEV) console.log('[UserStore] session 恢复成功 | isCloudUser:', isCloudUser.value)
          return
        }
      } catch (e) {
        console.warn('[UserStore] Supabase session 恢复失败，降级本地模式:', e)
      }
    }

    // 降级：从 localStorage 加载本地用户
    loadLocalUser()
    authReady.value = true
    if (import.meta.env.DEV) console.log('[UserStore] init 完成（本地模式）| userId:', currentUser.value.id)
  }

  /** 加载本地用户 */
  function loadLocalUser() {
    const saved = getItem<LocalUser>(STORAGE_KEY)
    if (saved && saved.id) {
      currentUser.value = saved
    } else {
      currentUser.value = { ...DEFAULT_USER, createdAt: Date.now() }
      syncToStorage()
    }
  }

  /** 加载云端 profile，不存在则自动创建 */
  async function loadCloudProfile(userId: string, email: string) {
    let profile = await authApi.getProfile(userId)

    // profiles 表没有记录 → 自动补建（兼容注册时 insert 失败的场景）
    if (!profile) {
      if (import.meta.env.DEV) console.log('[UserStore] profiles 无记录，自动创建 | userId:', userId)
      try {
        const nickname = email.split('@')[0] ?? 'Fumo旅行者'
        await supabase.from('profiles').insert({ id: userId, nickname })
        profile = await authApi.getProfile(userId)
      } catch (e) {
        console.warn('[UserStore] 自动创建 profile 失败:', e)
      }
    }

    const authUser: AuthUser = {
      id: userId,
      email,
      nickname: profile?.nickname ?? 'Fumo旅行者',
      avatarUrl: profile?.avatar_url ?? generatePlaceholderAvatar(profile?.nickname ?? '旅行者'),
      bio: profile?.bio ?? '',
      createdAt: profile?.created_at ? new Date(profile.created_at).getTime() : Date.now(),
      isCloudUser: true,
    }
    currentUser.value = authUser
  }

  function syncToStorage(): boolean {
    return setItem(STORAGE_KEY, currentUser.value)
  }

  /**
   * 邮箱+密码注册
   */
  async function register(email: string, password: string, nickname: string): Promise<{ success: boolean; message: string }> {
    authLoading.value = true
    try {
      const result = await authApi.register(email, password, nickname)
      if (result.success && result.user && result.session) {
        // 有 session 说明不需要邮箱验证，直接进入登录态
        await waitForSession()
        await loadCloudProfile(result.user.id, email)
      }
      return result
    } finally {
      authLoading.value = false
    }
  }

  /**
   * 邮箱+密码登录
   */
  async function login(email: string, password: string): Promise<{ success: boolean; message: string }> {
    authLoading.value = true
    try {
      const result = await authApi.login(email, password)
      if (import.meta.env.DEV) console.log('[UserStore] login | success:', result.success, '| userId:', result.user?.id)
      if (result.success && result.user) {
        // signInWithPassword 已返回 session，直接加载 profile
        // 仅在未返回 session 时才 waitForSession
        if (!result.session) {
          const sessionOk = await waitForSession()
          if (import.meta.env.DEV) console.log('[UserStore] login waitForSession:', sessionOk)
        }
        await loadCloudProfile(result.user.id, email)
        if (import.meta.env.DEV) console.log('[UserStore] login 完成 | isCloudUser:', isCloudUser.value, '| userId:', currentUser.value.id)
      }
      return result
    } finally {
      authLoading.value = false
    }
  }

  /**
   * 登出
   */
  async function logout() {
    await authApi.logout()
    resetToLocal()
  }

  /** 重置为本地用户 */
  function resetToLocal() {
    if (import.meta.env.DEV) console.log('[UserStore] resetToLocal | isCloudUser:', isCloudUser.value)
    currentUser.value = { ...DEFAULT_USER, createdAt: Date.now() }
    syncToStorage()
  }

  /**
   * 更新用户资料
   * 云端用户调 API + 乐观更新；本地用户直接写 localStorage
   */
  async function updateProfile(updates: Partial<Pick<LocalUser, 'nickname' | 'bio' | 'avatarUrl'>>) {
    if (import.meta.env.DEV) console.log('[UserStore] updateProfile | isCloudUser:', isCloudUser.value, '| userId:', currentUser.value.id)
    const old = { ...currentUser.value }

    // 乐观更新
    if (updates.nickname !== undefined) currentUser.value.nickname = updates.nickname
    if (updates.bio !== undefined) currentUser.value.bio = updates.bio
    if (updates.avatarUrl !== undefined) currentUser.value.avatarUrl = updates.avatarUrl

    if (isCloudUser.value) {
      try {
        // 确保 session 可用，避免 RLS 因 token 缺失拒绝
        await waitForSession(2000)
        await authApi.updateProfile(currentUser.value.id, {
          nickname: updates.nickname,
          bio: updates.bio,
          avatar_url: updates.avatarUrl,
        })
      } catch (e) {
        // 回滚
        currentUser.value = old as LocalUser | AuthUser
        throw e
      }
    } else {
      syncToStorage()
    }
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
    isCloudUser,
    authReady,
    authLoading,
    register,
    login,
    logout,
    updateProfile,
    getUserId,
  }
})
