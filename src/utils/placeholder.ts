/**
 * 占位图生成工具
 * 根据角色名首字母和预设淡彩色板生成 SVG data URI 作为头像占位图
 */

// 淡彩色板
const PASTEL_COLORS = [
  '#B8A9E8', // 淡紫
  '#F2B8C6', // 淡粉
  '#A8D8EA', // 淡蓝
  '#B8E6C8', // 淡绿
  '#F5E6A3', // 淡黄
  '#F5C4A1', // 淡桃
  '#C4B8E8', // 薰衣草
  '#E8B8D4', // 玫粉
  '#A8E8D8', // 薄荷
  '#E8D4A8', // 奶茶
  '#D4A8E8', // 淡紫红
  '#A8C8E8', // 天蓝
  '#E8A8B8', // 珊瑚粉
  '#B8D8A8', // 草绿
  '#E8C8A8', // 杏色
]

/**
 * 根据字符串生成一致的颜色索引
 */
function getColorIndex(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash) % PASTEL_COLORS.length
}

/**
 * 获取角色名的显示字符（中文取第一个字，英文取首字母）
 */
function getDisplayChar(name: string): string {
  if (!name) return '?'
  // 检查是否为中文字符
  if (/[\u4e00-\u9fa5]/.test(name[0])) {
    return name[0]
  }
  return name[0].toUpperCase()
}

/**
 * 生成 SVG 占位头像 data URI
 * @param name 角色名（用于生成颜色和首字母）
 * @param size SVG 尺寸（默认 80）
 */
export function generatePlaceholderAvatar(name: string, size = 80): string {
  const color = PASTEL_COLORS[getColorIndex(name)]
  const char = getDisplayChar(name)
  const fontSize = size * 0.4

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="${color}"/>
    <text x="${size / 2}" y="${size / 2}" dy="0.35em" text-anchor="middle"
      font-family="-apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif"
      font-size="${fontSize}" font-weight="600" fill="white">${char}</text>
  </svg>`

  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
