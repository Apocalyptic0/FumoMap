/**
 * localStorage 工具函数
 * 封装读写操作，自动 JSON 序列化/反序列化，包含容量检测和错误处理
 */

const STORAGE_PREFIX = 'fumomap_'

/**
 * 从 localStorage 读取数据
 */
export function getItem<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key)
    if (raw === null) return null
    return JSON.parse(raw) as T
  } catch (e) {
    console.warn(`[Storage] 读取 "${key}" 失败:`, e)
    return null
  }
}

/**
 * 写入数据到 localStorage
 * @returns 是否写入成功
 */
export function setItem<T>(key: string, value: T): boolean {
  try {
    const data = JSON.stringify(value)
    localStorage.setItem(STORAGE_PREFIX + key, data)
    return true
  } catch (e) {
    console.error(`[Storage] 写入 "${key}" 失败:`, e)
    // DOMException: QuotaExceededError
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      console.error('[Storage] localStorage 存储空间不足！')
    }
    return false
  }
}

/**
 * 删除 localStorage 中的数据
 */
export function removeItem(key: string): void {
  try {
    localStorage.removeItem(STORAGE_PREFIX + key)
  } catch (e) {
    console.warn(`[Storage] 删除 "${key}" 失败:`, e)
  }
}

/**
 * 估算 localStorage 已使用的空间（单位：字节）
 */
export function getUsedSpace(): number {
  let total = 0
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key) {
      total += key.length + (localStorage.getItem(key)?.length || 0)
    }
  }
  return total * 2 // UTF-16 每个字符占 2 字节
}

/**
 * 检查是否接近存储上限（默认 5MB）
 * @param threshold 阈值百分比（0-1），默认 0.9（90%）
 */
export function isStorageNearFull(threshold = 0.9): boolean {
  const maxSize = 5 * 1024 * 1024 // 5MB
  const used = getUsedSpace()
  return used / maxSize > threshold
}
