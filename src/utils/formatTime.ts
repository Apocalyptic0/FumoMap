/**
 * 时间格式化工具
 * 统一全项目的相对时间展示，避免多处重复实现
 */

/**
 * 格式化为相对时间（详细模式）
 * 刚刚 → N分钟前 → N小时前 → N天前 → 月/日
 * @param timestamp 时间戳
 * @param dayThreshold 超过多少天后显示具体日期（默认 30）
 */
export function formatRelativeTime(timestamp: number, dayThreshold = 30): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < dayThreshold) return `${days}天前`

  return new Date(timestamp).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  })
}

/**
 * 格式化为卡片时间（简洁模式）
 * 今天 → 昨天 → N天前 → 月/日
 */
export function formatCardTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const days = Math.floor(diff / 86400000)

  if (days < 1) return '今天'
  if (days < 2) return '昨天'
  if (days < 7) return `${days}天前`

  return new Date(timestamp).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  })
}
