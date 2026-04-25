import { supabase } from './client'
import type { Session, User, AuthError } from '@supabase/supabase-js'

export interface AuthResult {
  success: boolean
  message: string
  user?: User
  session?: Session
}

/**
 * 邮箱+密码注册
 * 注册成功后自动创建 profiles 记录
 */
export async function register(
  email: string,
  password: string,
  nickname: string
): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nickname }, // 存入 user_metadata，触发器可读取
    },
  })

  if (error) return { success: false, message: mapAuthError(error) }
  if (!data.user) return { success: false, message: '注册失败，请重试' }

  // 创建 profiles 记录
  const { error: profileError } = await supabase.from('profiles').insert({
    id: data.user.id,
    nickname,
  })

  if (profileError) {
    console.warn('[Auth] 创建 profile 失败:', profileError.message)
    // 不阻断注册流程，后续可补建
  }

  return {
    success: true,
    message: '注册成功',
    user: data.user,
    session: data.session ?? undefined,
  }
}

/**
 * 邮箱+密码登录
 */
export async function login(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) return { success: false, message: mapAuthError(error) }

  return {
    success: true,
    message: '登录成功',
    user: data.user,
    session: data.session,
  }
}

/**
 * 登出
 */
export async function logout(): Promise<void> {
  await supabase.auth.signOut()
}

/**
 * 获取当前 session
 */
export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession()
  return data.session
}

/**
 * 获取当前用户
 */
export async function getCurrentUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser()
  return data.user
}

/**
 * 监听认证状态变化
 */
export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void
) {
  return supabase.auth.onAuthStateChange(callback)
}

/**
 * 获取用户 profile（nickname/avatar/bio）
 */
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nickname, avatar_url, bio, created_at')
    .eq('id', userId)
    .single()

  if (error) return null
  return data
}

/**
 * 更新用户 profile
 */
export async function updateProfile(
  userId: string,
  updates: { nickname?: string; bio?: string; avatar_url?: string }
) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

/**
 * 映射 Supabase Auth 错误为中文提示
 */
function mapAuthError(error: AuthError): string {
  const msg = error.message.toLowerCase()
  if (msg.includes('invalid login credentials')) return '邮箱或密码错误'
  if (msg.includes('email not confirmed')) return '请先验证邮箱'
  if (msg.includes('user already registered')) return '该邮箱已注册'
  if (msg.includes('password')) return '密码不符合要求（至少6位）'
  if (msg.includes('rate limit')) return '请求过于频繁，请稍后再试'
  if (msg.includes('network')) return '网络连接失败，请检查网络'
  return error.message
}
