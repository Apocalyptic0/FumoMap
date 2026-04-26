-- ==========================================
-- FumoMap P1 数据库 Schema
-- 在 Supabase SQL Editor 中执行
-- ==========================================

-- 用户资料表（扩展 Supabase Auth 的 auth.users）
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  nickname    TEXT NOT NULL DEFAULT 'Fumo旅行者',
  avatar_url  TEXT,
  bio         TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 打卡标记表
CREATE TABLE IF NOT EXISTS marks (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  character_ids   TEXT[] NOT NULL,
  lat             DOUBLE PRECISION NOT NULL,
  lng             DOUBLE PRECISION NOT NULL,
  location_name   TEXT NOT NULL,
  images          TEXT[] DEFAULT '{}',
  description     TEXT DEFAULT '',
  tags            TEXT[] DEFAULT '{}',
  visibility      TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  like_count      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 点赞表
CREATE TABLE IF NOT EXISTS likes (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mark_id   UUID REFERENCES marks(id) ON DELETE CASCADE NOT NULL,
  user_id   UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(mark_id, user_id)
);

-- 评论表
CREATE TABLE IF NOT EXISTS comments (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mark_id     UUID REFERENCES marks(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content     TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 收藏表
CREATE TABLE IF NOT EXISTS favorites (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mark_id     UUID REFERENCES marks(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(mark_id, user_id)
);

-- 浏览记录表
CREATE TABLE IF NOT EXISTS view_records (
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  mark_id     UUID REFERENCES marks(id) ON DELETE CASCADE NOT NULL,
  viewed_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, mark_id)
);

-- ==========================================
-- RPC 函数：点赞计数
-- ==========================================

CREATE OR REPLACE FUNCTION increment_like_count(mark_id_input UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE marks SET like_count = like_count + 1 WHERE id = mark_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_like_count(mark_id_input UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE marks SET like_count = GREATEST(0, like_count - 1) WHERE id = mark_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- RLS 行级安全策略
-- ==========================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE view_records ENABLE ROW LEVEL SECURITY;

-- profiles: 所有人可读公开信息，本人可更新自己的
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- marks: 公开标记所有人可读，本人可 CRUD 自己的
CREATE POLICY "marks_select_public" ON marks FOR SELECT USING (
  visibility = 'public' OR user_id = auth.uid()
);
CREATE POLICY "marks_insert" ON marks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "marks_update" ON marks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "marks_delete" ON marks FOR DELETE USING (auth.uid() = user_id);

-- likes: 认证用户可操作自己的记录
CREATE POLICY "likes_select" ON likes FOR SELECT USING (true);
CREATE POLICY "likes_insert" ON likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_delete" ON likes FOR DELETE USING (auth.uid() = user_id);

-- comments: 所有人可读，认证用户可创建，本人可删
CREATE POLICY "comments_select" ON comments FOR SELECT USING (true);
CREATE POLICY "comments_insert" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_delete" ON comments FOR DELETE USING (auth.uid() = user_id);

-- favorites: 本人可操作
CREATE POLICY "favorites_select" ON favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "favorites_insert" ON favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "favorites_delete" ON favorites FOR DELETE USING (auth.uid() = user_id);

-- view_records: 本人可操作
CREATE POLICY "view_records_select" ON view_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "view_records_upsert" ON view_records FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "view_records_update" ON view_records FOR UPDATE USING (auth.uid() = user_id);

-- ==========================================
-- Storage 桶配置（需在控制台手动创建桶 mark-images）
-- 以下 RLS 策略在 Storage → Policies 中配置：
--   SELECT: 公开读（允许所有人）
--   INSERT: 认证用户可上传（auth.role() = 'authenticated'）
--   DELETE: 仅本人可删（bucket_id = 'mark-images' AND auth.uid()::text = (storage.foldername(name))[1]）
-- ==========================================
