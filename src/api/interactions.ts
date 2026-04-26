import { supabase } from './client'

// ========== 点赞 ==========

/**
 * 切换点赞状态
 * @returns 当前是否已点赞
 */
export async function toggleLike(markId: string, userId: string): Promise<boolean> {
  // 查询是否已点赞
  const { data: existing } = await supabase
    .from('likes')
    .select('id')
    .eq('mark_id', markId)
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    // 取消点赞
    await supabase.from('likes').delete().eq('id', existing.id)
    // 更新 like_count
    await supabase.rpc('decrement_like_count', { mark_id_input: markId })
    return false
  } else {
    // 点赞
    await supabase.from('likes').insert({ mark_id: markId, user_id: userId })
    await supabase.rpc('increment_like_count', { mark_id_input: markId })
    return true
  }
}

/**
 * 检查是否已点赞
 */
export async function isLiked(markId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('likes')
    .select('id')
    .eq('mark_id', markId)
    .eq('user_id', userId)
    .maybeSingle()
  return !!data
}

// ========== 评论 ==========

export interface DbComment {
  id: string
  mark_id: string
  user_id: string
  content: string
  created_at: string
  // 关联查询 profile
  profiles?: { nickname: string; avatar_url: string | null }
}

/**
 * 添加评论
 */
export async function addComment(
  markId: string,
  userId: string,
  content: string
): Promise<DbComment> {
  const { data, error } = await supabase
    .from('comments')
    .insert({ mark_id: markId, user_id: userId, content })
    .select('*, profiles(nickname, avatar_url)')
    .single()

  if (error) throw new Error(`评论失败: ${error.message}`)
  return data as DbComment
}

/**
 * 删除评论（RLS 确保只能删自己的）
 */
export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)

  if (error) throw new Error(`删除评论失败: ${error.message}`)
}

/**
 * 获取某打卡的评论列表（含用户信息）
 */
export async function getComments(
  markId: string,
  options?: { limit?: number; offset?: number }
): Promise<DbComment[]> {
  const limit = options?.limit ?? 50
  const offset = options?.offset ?? 0

  const { data, error } = await supabase
    .from('comments')
    .select('*, profiles(nickname, avatar_url)')
    .eq('mark_id', markId)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) throw new Error(`获取评论失败: ${error.message}`)
  return (data ?? []) as DbComment[]
}

// ========== 收藏 ==========

/**
 * 切换收藏状态
 * @returns 当前是否已收藏
 */
export async function toggleFavorite(markId: string, userId: string): Promise<boolean> {
  const { data: existing } = await supabase
    .from('favorites')
    .select('id')
    .eq('mark_id', markId)
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    await supabase.from('favorites').delete().eq('id', existing.id)
    return false
  } else {
    await supabase.from('favorites').insert({ mark_id: markId, user_id: userId })
    return true
  }
}

/**
 * 获取用户收藏列表（含时间戳）
 */
export async function getFavorites(userId: string): Promise<{ mark_id: string; created_at: string }[]> {
  const { data } = await supabase
    .from('favorites')
    .select('mark_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return (data ?? []) as { mark_id: string; created_at: string }[]
}

/**
 * 检查是否已收藏
 */
export async function isFavorited(markId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('favorites')
    .select('id')
    .eq('mark_id', markId)
    .eq('user_id', userId)
    .maybeSingle()
  return !!data
}

// ========== 浏览记录 ==========

/**
 * 记录浏览（upsert：存在则更新时间）
 */
export async function addViewRecord(markId: string, userId: string): Promise<void> {
  await supabase
    .from('view_records')
    .upsert(
      { mark_id: markId, user_id: userId, viewed_at: new Date().toISOString() },
      { onConflict: 'user_id,mark_id' }
    )
}
