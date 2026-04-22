# FumoMap 项目设计方案 v0.1

> 供 CodeBuddy 开发参考  
> 文档版本：2026-04-21  
> 发布形式：**网页版优先**，后续考虑微信小程序

---

## 一、项目概述

### 背景

Fumo 是以东方 Project 角色为原型设计的毛绒玩偶，在玩家社区中深受喜爱。爱好者们常常带着 fumo 旅行、记录生活或拍摄二设剧情。

**FumoMap** 是一个专为东方 fumo 爱好者设计的地图打卡社区，以地图为核心展示形式，让用户将带着 fumo 走过的每一个地方以「标记」的形式留存下来，形成一张充满回忆的东方世界地图。

### 定位

- **核心价值**：记录 + 分享 + 发现
- **目标用户**：东方 Project fumo 爱好者
- **发布平台**：网页（Web App，移动端优先响应式设计）

---

## 二、功能规划

### 阶段划分

| 阶段 | 名称 | 核心内容 |
|------|------|----------|
| P0 | 本地原型 | 地图展示 + 本地打卡 + 标记渲染，验证核心体验 |
| P1 | 基础联网版 | 用户系统 + 云端存储 + 图片上传，可供小圈子使用 |
| P2 | 社交版 | 点赞/评论 + 筛选 + 私密控制，社区功能完整 |
| P3 | 增强版 | AI 角色回复 + 地图风格化 + 导航跳转 |

---

### P0 · 本地原型（优先实现）

目标：在不依赖后端的情况下，验证地图交互和打卡流程的核心体验。

- 地图加载与展示（Leaflet + OpenStreetMap）
- 获取当前位置（浏览器 Geolocation API）
- 本地打卡：上传图片（base64 存 localStorage）+ 文字描述 + 选择 fumo 角色
- 打卡后在地图对应坐标生成标记，图标为所选角色头像
- 点击标记展开详情卡片（图片 + 文字）
- 数据持久化到 localStorage / IndexedDB

---

### P1 · 基础联网版

- 用户注册 / 登录（邮箱 + 密码，或第三方 OAuth）
- 标记数据存储到云端数据库
- 图片上传至对象存储（OSS/COS），客户端压缩后上传
- 其他用户可在地图上看到公开标记
- 公开 / 私密两档可见性控制

---

### P2 · 社交版

- 点赞、评论功能
- 私密控制扩展（公开 / 仅好友 / 私人）
- 好友关系（关注/被关注）
- Tag 功能（用户自定义 + 预设 tag）
- 筛选功能：
  - 按 fumo 角色筛选
  - 按当前坐标半径筛选
  - 按 tag 筛选
- 个人主页：我的标记 / 我的收藏 / 我关注的动态
- 收藏功能

---

### P3 · 增强版

- **AI 角色回复**：打卡后用户可选择触发，由大模型以对应东方角色身份回复（非自动触发）
- **地图风格化**：AI 根据当前地图区域的地形/建筑生成东方风格化图层，突出高频打卡地标
- **导航跳转**：从标记详情页调起高德/谷歌地图导航

---

## 三、核心数据模型

### 角色（Character）

```json
{
  "id": "string",
  "name": "string",           // 角色名（如"爱丽丝·玛格特罗伊德"）
  "nameEn": "string",         // 英文名
  "series": "string",         // 所属系列/作品
  "avatarUrl": "string",      // 角色头像（用于地图标记图标）
  "tags": ["string"]          // 角色标签（辅助搜索）
}
```

### 用户（User）

```json
{
  "id": "string",
  "nickname": "string",
  "avatarUrl": "string",
  "bio": "string",
  "createdAt": "timestamp",
  "followingCount": "number",
  "followerCount": "number"
}
```

### 标记（Mark）

```json
{
  "id": "string",
  "userId": "string",
  "characterId": "string",     // 关联的 fumo 角色
  "lat": "number",             // 纬度
  "lng": "number",             // 经度
  "locationName": "string",    // 地点名（可选，用户填写或逆地理编码）
  "images": ["string"],        // 图片 URL 列表
  "description": "string",     // 文字描述
  "tags": ["string"],
  "visibility": "public | friends | private",
  "likeCount": "number",
  "commentCount": "number",
  "createdAt": "timestamp"
}
```

### 评论（Comment）

```json
{
  "id": "string",
  "markId": "string",
  "userId": "string",
  "content": "string",
  "createdAt": "timestamp"
}
```

---

## 四、页面结构

### 页面列表

```
/                   地图主页（核心页面）
/mark/:id           标记详情页
/create             创建打卡页
/profile/:userId    个人主页
/profile/me         我的主页
/explore            发现页（按热度/最新浏览标记列表）
/settings           设置页
```

### 地图主页 `/`

- 全屏地图作为背景
- 顶部：搜索栏 + 筛选入口
- 右下：定位到当前位置按钮 + 打卡按钮（FAB）
- 地图上展示标记图标（角色头像圆形裁切）
- 点击标记弹出简略信息卡（图片缩略图 + 角色名 + 地点名）
- 点击卡片跳转详情页

### 标记详情页 `/mark/:id`

- 图片轮播（支持多张）
- 角色头像 + 角色名
- 地点名 + 小地图定位预览
- 文字描述
- tags
- 点赞 / 评论 / 收藏操作栏
- 评论列表
- AI 角色回复区（P3）

### 创建打卡页 `/create`

- 地图选点（默认当前位置，可拖拽调整）
- 图片上传（多张，本地压缩）
- 文字描述输入
- 角色选择（搜索 + 列表，显示头像）
- Tag 添加
- 可见性设置
- 提交

### 个人主页 `/profile/:userId`

- 头像 + 昵称 + 简介
- 关注 / 粉丝数
- 标记列表（网格瀑布流）/ 收藏列表（Tab 切换）

---

## 五、技术栈

### 前端

| 技术 | 选型 | 说明 |
|------|------|------|
| 框架 | **Vue 3** + Vite | 轻量、生态好，适合移动端 Web |
| 地图 | **Leaflet.js** | 开源免费，支持自定义图层 |
| 地图瓦片 | **OpenStreetMap**（主）/ 高德瓦片（国内备选） | OSM 免费，高德国内体验更好 |
| UI 组件 | **Vant 4**（移动端）或 Naive UI | 移动优先 |
| 状态管理 | Pinia | Vue 3 官方推荐 |
| 图片压缩 | browser-image-compression | 客户端压缩后再上传 |
| HTTP 请求 | Axios | |

### 后端（P1 开始）

| 技术 | 选型 | 说明 |
|------|------|------|
| 运行时 | **Node.js** | |
| 框架 | **Fastify** 或 Express | Fastify 性能更好 |
| 数据库 | **PostgreSQL + PostGIS** | PostGIS 支持地理查询（半径范围内的标记） |
| ORM | Prisma 或 Drizzle | |
| 图片存储 | **腾讯云 COS** 或阿里云 OSS | |
| 认证 | JWT + Refresh Token | |
| 逆地理编码 | 高德地图 API / OpenStreetMap Nominatim | 将坐标转为地点名 |

### 部署

| 环境 | 方案 |
|------|------|
| 前端 | Vercel / Cloudflare Pages |
| 后端 | Railway / 腾讯云轻量应用服务器 |
| 数据库 | Supabase（托管 PostgreSQL，含 PostGIS）|
| 图片 CDN | 随 OSS/COS 自带 |

### 版本管理

- GitHub（已确认）
- 分支策略：`main`（稳定）/ `dev`（开发）/ `feature/*`（功能分支）

---

## 六、关键技术说明

### 地理位置查询（PostGIS）

筛选某坐标周围 N 公里内的标记，使用 PostGIS 的 `ST_DWithin`：

```sql
SELECT * FROM marks
WHERE ST_DWithin(
  location::geography,
  ST_MakePoint(:lng, :lat)::geography,
  :radius_meters
)
AND visibility = 'public'
ORDER BY created_at DESC;
```

这使得"附近的打卡"功能实现非常简洁，强烈推荐在 P1 阶段就引入。

### 地图标记图标

Leaflet 支持自定义 DivIcon，可以用 CSS + 角色头像 URL 渲染圆形裁切的头像图标：

```javascript
const icon = L.divIcon({
  className: 'fumo-marker',
  html: `<img src="${character.avatarUrl}" class="marker-avatar" />`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
})
```

### AI 角色回复（P3 参考）

- 触发方式：用户主动点击「听听 xx 怎么说」按钮
- 模型接入：工蜂 AI API 或 OpenAI API
- Prompt 结构：

```
System: 你是东方 Project 中的「{角色名}」，请用该角色的性格和语气，
        对用户在「{地点名}」拍摄的这张 fumo 照片写一段短评或感想。
        风格要符合角色性格，字数控制在 80-120 字。

User: [图片] {用户描述}
```

---

## 七、P0 原型开发清单

P0 目标是纯前端、无后端、验证核心交互体验。

### 环境搭建
- [ ] 初始化 Vue 3 + Vite 项目
- [ ] 安装 Leaflet、Vant、Pinia
- [ ] 配置基础路由（vue-router）

### 地图功能
- [ ] 引入 Leaflet，渲染 OSM 底图
- [ ] 实现定位到当前位置
- [ ] 实现地图拖拽/缩放

### 打卡功能
- [ ] 创建打卡页面（表单）
- [ ] 图片选择（input file + base64 转换）
- [ ] 文字描述输入
- [ ] 角色选择（预置 10-20 个常见角色数据）
- [ ] 提交后写入 localStorage

### 标记展示
- [ ] 从 localStorage 读取标记数据
- [ ] 在地图上渲染角色头像图标
- [ ] 点击标记展示简略信息弹窗
- [ ] 标记详情页面展示图片+文字

### 收尾
- [ ] 移动端样式适配（视口、触摸操作）
- [ ] 基本的加载/错误状态处理

---

## 八、待定事项

| 事项 | 说明 |
|------|------|
| UI 美术风格 | 待定，建议参考东方同人画风（清新淡彩 or 幻想乡风格） |
| 角色库范围 | 需要整理初始角色列表和对应头像素材 |
| 域名 / 项目名 | fumomap.xxx 待注册确认 |
| 内容审核策略 | P1 联网后需要考虑图片内容合规问题 |
| 国内地图瓦片 | 若主要面向国内用户，OSM 在国内部分地区加载慢，需要备选高德瓦片方案 |

---

*文档由爱丽丝整理，供 CodeBuddy 初步参考。如有调整请更新本文档版本号。🎭*
