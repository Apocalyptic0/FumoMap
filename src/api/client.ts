import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string

/**
 * Supabase 客户端单例
 * 迁移腾讯云时：替换本文件为 axios 实例即可，其余 api/ 文件内部重写
 */
export const supabase: SupabaseClient = createClient(supabaseUrl || '', supabasePublishableKey || '', {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    // 使用 localStorage 存储 session（Supabase 默认行为）
    // 后续可切换为 cookie 模式增强安全性
  },
})

/**
 * 检查 Supabase 配置是否可用
 * 用于运行时判断走云端还是本地降级路径
 */
export function isSupabaseReady(): boolean {
  return !!(supabaseUrl && supabasePublishableKey)
}

/**
 * 等待 Supabase session 就绪
 *
 * 登录/注册后，Supabase SDK 内部 session 写入 localStorage 是异步的，
 * 立即发起带 RLS 的请求可能因 token 未同步而失败（auth.uid() 返回 null）。
 * 此函数轮询 getSession 直到返回有效 session 或超时。
 */
export async function waitForSession(timeoutMs = 5000): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const { data } = await supabase.auth.getSession()
    if (data.session?.access_token) return true
    // 短暂等待后重试
    await new Promise((r) => setTimeout(r, 100))
  }
  console.warn('[Client] waitForSession 超时')
  return false
}
