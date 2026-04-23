<template>
  <div class="profile-view">
    <!-- 顶部导航 -->
    <div class="profile-header glass-effect">
      <button class="header-btn" @click="router.back()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
      <span class="header-title">个人主页</span>
      <div class="header-btn" style="visibility: hidden;"></div>
    </div>

    <!-- 用户信息卡片 -->
    <div class="user-card">
      <div class="user-info">
        <img :src="currentUser.avatarUrl" class="user-avatar" alt="头像" />
        <div class="user-detail">
          <div class="user-name-row">
            <h2 class="user-nickname">{{ currentUser.nickname }}</h2>
            <button class="edit-profile-btn" @click="showEditDialog = true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
          </div>
          <p class="user-bio">{{ currentUser.bio }}</p>
        </div>
      </div>

      <!-- 统计数据 -->
      <div class="user-stats">
        <div class="stat-item" @click="activeTab = 'marks'">
          <span class="stat-num">{{ markStore.markCount }}</span>
          <span class="stat-label">打卡</span>
        </div>
        <div class="stat-item" @click="activeTab = 'favorites'">
          <span class="stat-num">{{ interactionStore.favoriteList.length }}</span>
          <span class="stat-label">收藏</span>
        </div>
        <div class="stat-item" @click="activeTab = 'comments'">
          <span class="stat-num">{{ interactionStore.myComments.length }}</span>
          <span class="stat-label">评论</span>
        </div>
        <div class="stat-item" @click="activeTab = 'history'">
          <span class="stat-num">{{ interactionStore.viewHistoryList.length }}</span>
          <span class="stat-label">浏览</span>
        </div>
      </div>
    </div>

    <!-- Tab 切换 -->
    <div class="tab-bar">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-item"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Tab 内容区 -->
    <div class="tab-content">
      <!-- 打卡记录 -->
      <div v-if="activeTab === 'marks'" class="tab-panel">
        <template v-if="markStore.allMarks.length > 0">
          <MarkCard
            v-for="m in markStore.allMarks"
            :key="m.id"
            :mark="m"
            @click="goToMark(m.id)"
          />
        </template>
        <div v-else class="empty-state">
          <span class="empty-icon">📍</span>
          <span>还没有打卡记录</span>
        </div>
      </div>

      <!-- 收藏 -->
      <div v-if="activeTab === 'favorites'" class="tab-panel">
        <template v-if="favMarks.length > 0">
          <MarkCard
            v-for="m in favMarks"
            :key="m.id"
            :mark="m"
            @click="goToMark(m.id)"
          />
        </template>
        <div v-else class="empty-state">
          <span class="empty-icon">⭐</span>
          <span>还没有收藏</span>
        </div>
      </div>

      <!-- 评论 -->
      <div v-if="activeTab === 'comments'" class="tab-panel">
        <template v-if="interactionStore.myComments.length > 0">
          <div
            v-for="comment in interactionStore.myComments"
            :key="comment.id"
            class="comment-record"
            @click="goToMark(comment.markId)"
          >
            <div class="comment-record-header">
              <span class="comment-mark-name">{{ getMarkName(comment.markId) }}</span>
              <span class="comment-record-time">{{ formatTime(comment.createdAt) }}</span>
            </div>
            <p class="comment-record-text">{{ comment.content }}</p>
          </div>
        </template>
        <div v-else class="empty-state">
          <span class="empty-icon">💬</span>
          <span>还没有评论</span>
        </div>
      </div>

      <!-- 浏览记录 -->
      <div v-if="activeTab === 'history'" class="tab-panel">
        <template v-if="historyMarks.length > 0">
          <MarkCard
            v-for="item in historyMarks"
            :key="item.mark.id + '-' + item.viewedAt"
            :mark="item.mark"
            @click="goToMark(item.mark.id)"
          >
            <template #extra>
              <span class="history-time">浏览于 {{ formatTime(item.viewedAt) }}</span>
            </template>
          </MarkCard>
        </template>
        <div v-else class="empty-state">
          <span class="empty-icon">👀</span>
          <span>还没有浏览记录</span>
        </div>
      </div>
    </div>

    <!-- 编辑个人资料弹窗 -->
    <van-popup
      v-model:show="showEditDialog"
      round
      position="bottom"
      :style="{ maxHeight: '60vh' }"
    >
      <div class="edit-dialog">
        <div class="edit-header">
          <span class="edit-title">编辑资料</span>
          <button class="edit-close" @click="showEditDialog = false">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="edit-form">
          <div class="form-group">
            <label class="form-label">昵称</label>
            <input
              v-model="editNickname"
              class="form-input"
              type="text"
              placeholder="输入昵称"
              maxlength="20"
            />
          </div>
          <div class="form-group">
            <label class="form-label">个性签名</label>
            <input
              v-model="editBio"
              class="form-input"
              type="text"
              placeholder="一句话介绍自己"
              maxlength="50"
            />
          </div>
        </div>

        <button class="save-btn" @click="saveProfile">保存</button>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import MarkCard from '@/components/MarkCard.vue'
import { useUserStore } from '@/stores/userStore'
import { useMarkStore } from '@/stores/markStore'
import { useInteractionStore } from '@/stores/interactionStore'

const router = useRouter()
const userStore = useUserStore()
const markStore = useMarkStore()
const interactionStore = useInteractionStore()

const currentUser = computed(() => userStore.currentUser)

type TabKey = 'marks' | 'favorites' | 'comments' | 'history'
const activeTab = ref<TabKey>('marks')
const tabs: { key: TabKey; label: string }[] = [
  { key: 'marks', label: '打卡' },
  { key: 'favorites', label: '收藏' },
  { key: 'comments', label: '评论' },
  { key: 'history', label: '浏览' },
]

// 编辑资料
const showEditDialog = ref(false)
const editNickname = ref(currentUser.value.nickname)
const editBio = ref(currentUser.value.bio)

/** 收藏的打卡列表 */
const favMarks = computed(() =>
  interactionStore.favoriteList
    .map((f) => markStore.getMarkById(f.markId))
    .filter(Boolean) as NonNullable<ReturnType<typeof markStore.getMarkById>>[]
)

/** 浏览历史对应的打卡列表 */
const historyMarks = computed(() =>
  interactionStore.viewHistoryList
    .map((v) => {
      const mark = markStore.getMarkById(v.markId)
      return mark ? { mark, viewedAt: v.viewedAt } : null
    })
    .filter(Boolean) as { mark: NonNullable<ReturnType<typeof markStore.getMarkById>>; viewedAt: number }[]
)

function getMarkName(markId: string): string {
  const mark = markStore.getMarkById(markId)
  return mark?.locationName || '未知地点'
}

function formatTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`

  return new Date(timestamp).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  })
}

function goToMark(id: string) {
  router.push(`/mark/${id}`)
}

function saveProfile() {
  const nickname = editNickname.value.trim()
  if (!nickname) {
    showToast('昵称不能为空')
    return
  }

  userStore.updateProfile({
    nickname,
    bio: editBio.value.trim(),
  })

  showEditDialog.value = false
  showToast({ message: '已保存', type: 'success' })
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.profile-view {
  width: 100%;
  height: 100vh;
  background: $bg-primary;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.profile-header {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  padding: calc(env(safe-area-inset-top, 0px) + 8px) $spacing-md $spacing-sm;
  background: $bg-overlay;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);

  .header-btn {
    width: 36px;
    height: 36px;
    border-radius: $radius-full;
    border: none;
    background: rgba(255, 255, 255, 0.8);
    color: $text-primary;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: $shadow-sm;
    flex-shrink: 0;

    &:active {
      transform: scale(0.9);
    }
  }

  .header-title {
    flex: 1;
    text-align: center;
    font-size: $font-size-lg;
    font-weight: 600;
    color: $text-primary;
  }
}

// 用户信息卡片
.user-card {
  margin: $spacing-lg;
  padding: $spacing-lg;
  background: $bg-card;
  border-radius: $radius-lg;
  box-shadow: $shadow-card;
}

.user-info {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  margin-bottom: $spacing-lg;

  .user-avatar {
    width: 56px;
    height: 56px;
    border-radius: $radius-full;
    object-fit: cover;
    border: 2.5px solid $color-primary-light;
    flex-shrink: 0;
  }

  .user-detail {
    flex: 1;
    min-width: 0;

    .user-name-row {
      display: flex;
      align-items: center;
      gap: $spacing-sm;

      .user-nickname {
        font-size: $font-size-lg;
        font-weight: 600;
        color: $text-primary;
        margin: 0;
      }

      .edit-profile-btn {
        width: 28px;
        height: 28px;
        border-radius: $radius-full;
        border: 1px solid $border-color;
        background: $bg-card;
        color: $text-tertiary;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        flex-shrink: 0;

        &:hover {
          border-color: $color-primary;
          color: $color-primary;
        }
      }
    }

    .user-bio {
      font-size: $font-size-sm;
      color: $text-secondary;
      margin: 4px 0 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

.user-stats {
  display: flex;
  border-top: 1px solid $divider-color;
  padding-top: $spacing-md;

  .stat-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    cursor: pointer;

    .stat-num {
      font-size: $font-size-lg;
      font-weight: 700;
      color: $text-primary;
    }

    .stat-label {
      font-size: $font-size-xs;
      color: $text-tertiary;
    }

    &:active {
      opacity: 0.7;
    }
  }
}

// Tab 栏
.tab-bar {
  display: flex;
  padding: 0 $spacing-lg;
  border-bottom: 1px solid $divider-color;
  background: $bg-card;
  position: sticky;
  top: 52px;
  z-index: 40;

  .tab-item {
    flex: 1;
    padding: $spacing-md 0;
    border: none;
    background: none;
    font-size: $font-size-sm;
    font-weight: 500;
    color: $text-tertiary;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all $transition-fast;

    &.active {
      color: $color-primary-dark;
      border-bottom-color: $color-primary;
      font-weight: 600;
    }
  }
}

// Tab 内容
.tab-content {
  padding: $spacing-lg;
}

.tab-panel {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

// 评论记录卡片
.comment-record {
  padding: $spacing-md;
  background: $bg-card;
  border-radius: $radius-md;
  box-shadow: $shadow-card;
  cursor: pointer;

  &:active {
    transform: scale(0.98);
  }

  .comment-record-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $spacing-xs;

    .comment-mark-name {
      font-size: $font-size-sm;
      font-weight: 600;
      color: $color-primary-dark;
    }

    .comment-record-time {
      font-size: 10px;
      color: $text-tertiary;
    }
  }

  .comment-record-text {
    font-size: $font-size-sm;
    color: $text-primary;
    margin: 0;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}

.history-time {
  font-size: 10px;
  color: $text-tertiary;
  margin-top: 2px;
}

// 空状态
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-xxl 0;
  color: $text-placeholder;
  font-size: $font-size-sm;

  .empty-icon {
    font-size: 32px;
    opacity: 0.5;
  }
}

// 编辑资料弹窗
.edit-dialog {
  padding: $spacing-lg;

  .edit-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $spacing-lg;

    .edit-title {
      font-size: $font-size-lg;
      font-weight: 600;
      color: $text-primary;
    }

    .edit-close {
      width: 32px;
      height: 32px;
      border: none;
      background: none;
      color: $text-tertiary;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      border-radius: $radius-full;

      &:hover {
        background: $border-color-light;
      }
    }
  }

  .edit-form {
    display: flex;
    flex-direction: column;
    gap: $spacing-md;

    .form-group {
      .form-label {
        display: block;
        font-size: $font-size-sm;
        font-weight: 500;
        color: $text-secondary;
        margin-bottom: $spacing-xs;
      }

      .form-input {
        width: 100%;
        padding: $spacing-sm $spacing-md;
        border: 1.5px solid $border-color;
        border-radius: $radius-md;
        font-size: $font-size-base;
        color: $text-primary;
        background: $bg-card;
        outline: none;
        transition: border-color $transition-fast;

        &:focus {
          border-color: $color-primary;
        }

        &::placeholder {
          color: $text-placeholder;
        }
      }
    }
  }

  .save-btn {
    width: 100%;
    margin-top: $spacing-lg;
    padding: $spacing-md;
    border: none;
    border-radius: $radius-md;
    background: $color-primary;
    color: #fff;
    font-size: $font-size-base;
    font-weight: 600;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
      background: $color-primary-dark;
    }

    &:active {
      transform: scale(0.98);
    }
  }
}
</style>
