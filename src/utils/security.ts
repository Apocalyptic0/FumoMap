/**
 * 安全工具函数
 * XSS 防护、输入校验、前端节流
 */

/**
 * 净化用户输入：剥离 HTML 标签，防止 XSS
 * 用于评论、描述等用户可输入的文本字段
 */
export function sanitizeInput(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * 校验邮箱格式
 */
export function validateEmail(email: string): { valid: boolean; message: string } {
  const trimmed = email.trim()
  if (!trimmed) return { valid: false, message: '请输入邮箱' }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(trimmed)) return { valid: false, message: '邮箱格式不正确' }

  return { valid: true, message: '' }
}

/**
 * 校验密码强度
 */
export function validatePassword(password: string): { valid: boolean; message: string } {
  if (!password) return { valid: false, message: '请输入密码' }
  if (password.length < 8) return { valid: false, message: '密码至少8位' }
  return { valid: true, message: '' }
}

/**
 * 创建前端节流器
 * 用于登录/注册按钮防暴力提交
 * @param ms 冷却时间（毫秒），默认 3000
 */
export function createRateLimiter(ms = 3000) {
  let lastTime = 0
  return {
    canProceed(): boolean {
      const now = Date.now()
      if (now - lastTime < ms) return false
      lastTime = now
      return true
    },
    reset() {
      lastTime = 0
    },
  }
}
