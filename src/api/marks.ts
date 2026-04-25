import { supabase } from './client'

/**
 * 创建打卡标记（云端 marks 表）
 */
export interface CreateMarkPayload {
  character_ids: string[]
  lat: number
  lng: number
  location_name: string
  images: string[]         // CDN URL 数组
  description: string
  tags: string[]
  visibility?: 'public' | 'private'
}

/**
 * 云端 Mark 记录（数据库行格式，snake_case）
 */
export interface DbMark {
  id: string
  user_id: string
  character_ids: string[]
  lat: number
  lng: number
  location_name: string
  images: string[]
  description: string
  tags: string[]
  visibility: 'public' | 'private'
  like_count: number
  created_at: string
}

/**
 * 创建打卡
 */
export async function createMark(payload: CreateMarkPayload): Promise<DbMark> {
  const { data, error } = await supabase
    .from('marks')
    .insert(payload)
    .select()
    .single()

  if (error) throw new Error(`创建打卡失败: ${error.message}`)
  return data as DbMark
}

/**
 * 更新打卡
 */
export async function updateMark(
  id: string,
  payload: Partial<CreateMarkPayload>
): Promise<DbMark> {
  const { data, error } = await supabase
    .from('marks')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`更新打卡失败: ${error.message}`)
  return data as DbMark
}

/**
 * 删除打卡
 */
export async function deleteMark(id: string): Promise<void> {
  const { error } = await supabase
    .from('marks')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`删除打卡失败: ${error.message}`)
}

/**
 * 获取单条打卡（含点赞/收藏状态）
 */
export async function getMark(id: string, userId?: string): Promise<DbMark & { is_liked?: boolean; is_favorited?: boolean }> {
  const { data, error } = await supabase
    .from('marks')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error(`获取打卡失败: ${error.message}`)

  const result = data as DbMark & { is_liked?: boolean; is_favorited?: boolean }

  // 查询当前用户的点赞/收藏状态
  if (userId) {
    const [likeRes, favRes] = await Promise.all([
      supabase.from('likes').select('id').eq('mark_id', id).eq('user_id', userId).maybeSingle(),
      supabase.from('favorites').select('id').eq('mark_id', id).eq('user_id', userId).maybeSingle(),
    ])
    result.is_liked = !!likeRes.data
    result.is_favorited = !!favRes.data
  }

  return result
}

/**
 * 获取公开标记列表
 */
export async function getPublicMarks(options?: {
  limit?: number
  offset?: number
}): Promise<DbMark[]> {
  const limit = options?.limit ?? 200
  const offset = options?.offset ?? 0

  const { data, error } = await supabase
    .from('marks')
    .select('*')
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw new Error(`获取标记列表失败: ${error.message}`)
  return (data ?? []) as DbMark[]
}

/**
 * 获取当前用户的所有标记（含私密）
 */
export async function getMyMarks(userId: string): Promise<DbMark[]> {
  const { data, error } = await supabase
    .from('marks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`获取我的标记失败: ${error.message}`)
  return (data ?? []) as DbMark[]
}
