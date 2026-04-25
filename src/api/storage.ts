import { supabase } from './client'

const BUCKET = 'mark-images'

/**
 * 上传图片到 Supabase Storage
 * @param file 压缩后的 File 对象
 * @param userId 当前用户 ID
 * @param markId 关联的打卡 ID（可选，新建时还没有 ID 则用临时路径）
 * @returns 公开访问 URL
 */
export async function uploadImage(
  file: File,
  userId: string,
  markId?: string
): Promise<string> {
  const ext = file.name.split('.').pop() || 'webp'
  const timestamp = Date.now()
  const folder = markId || 'temp'
  const path = `${userId}/${folder}/${timestamp}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      contentType: file.type || 'image/webp',
      upsert: false,
    })

  if (error) throw new Error(`图片上传失败: ${error.message}`)

  // 获取公开 URL
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/**
 * 批量上传图片
 */
export async function uploadImages(
  files: File[],
  userId: string,
  markId?: string
): Promise<string[]> {
  const urls: string[] = []
  for (const file of files) {
    const url = await uploadImage(file, userId, markId)
    urls.push(url)
  }
  return urls
}

/**
 * 删除图片
 * @param url 图片公开 URL，从中提取路径
 */
export async function deleteImage(url: string): Promise<void> {
  // 从 publicUrl 中提取 storage 路径
  // URL 格式: https://xxx.supabase.co/storage/v1/object/public/mark-images/{path}
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return

  const path = url.substring(idx + marker.length)
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) console.warn('[Storage] 删除图片失败:', error.message)
}

/**
 * 批量删除图片
 */
export async function deleteImages(urls: string[]): Promise<void> {
  const paths: string[] = []
  const marker = `/storage/v1/object/public/${BUCKET}/`

  for (const url of urls) {
    const idx = url.indexOf(marker)
    if (idx !== -1) {
      paths.push(url.substring(idx + marker.length))
    }
  }

  if (paths.length > 0) {
    const { error } = await supabase.storage.from(BUCKET).remove(paths)
    if (error) console.warn('[Storage] 批量删除图片失败:', error.message)
  }
}
