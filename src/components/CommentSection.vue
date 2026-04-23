<template>
  <div class="comment-section">
    <div class="comment-header">
      <span class="comment-title">评论 ({{ comments.length }})</span>
    </div>

    <!-- 评论输入区 -->
    <div class="comment-input-wrap">
      <img :src="currentUser.avatarUrl" class="input-avatar" alt="我的头像" />
      <div class="input-box">
        <textarea
          ref="inputRef"
          v-model="inputContent"
          class="comment-input"
          placeholder="说点什么..."
          maxlength="500"
          rows="1"
          @input="autoResize"
          @keydown.enter.exact="handleSend"
        ></textarea>
        <button
          class="send-btn"
          :class="{ active: inputContent.trim() }"
          :disabled="!inputContent.trim()"
          @click="handleSend"
        >
          发送
        </button>
      </div>
    </div>

    <!-- 评论列表 -->
    <div class="comment-list" v-if="comments.length > 0">
      <div v-for="comment in comments" :key="comment.id" class="comment-item">
        <img :src="getUserAvatar(comment.userId)" class="comment-avatar" alt="头像" />
        <div class="comment-body">
          <div class="comment-meta">
            <span class="comment-author">
              {{ getUserName(comment.userId) }}
              <span v-if="comment.userId === currentUser.id" class="my-tag">我</span>
            </span>
            <span class="comment-time">{{ formatCommentTime(comment.createdAt) }}</span>
          </div>
          <p class="comment-text">{{ comment.content }}</p>
          <!-- 删除按钮（仅自己的评论） -->
          <button
            v-if="comment.userId === currentUser.id"
            class="comment-delete"
            @click="handleDelete(comment.id)"
          >
            删除
          </button>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="comment-empty">
      <span>还没有评论，来说两句吧~</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { showToast } from 'vant'
import { useUserStore } from '@/stores/userStore'
import { useInteractionStore } from '@/stores/interactionStore'

const props = defineProps<{
  markId: string
}>()

const userStore = useUserStore()
const interactionStore = useInteractionStore()

const inputRef = ref<HTMLTextAreaElement | null>(null)
const inputContent = ref('')

const currentUser = computed(() => userStore.currentUser)
const comments = computed(() => interactionStore.getComments(props.markId))

/** 根据 userId 获取昵称（P0 全部是本地用户，P1 从用户缓存查） */
function getUserName(userId: string): string {
  if (userId === currentUser.value.id) return currentUser.value.nickname
  return '旅行者' // P1: 从用户缓存中查询
}

/** 根据 userId 获取头像 */
function getUserAvatar(userId: string): string {
  if (userId === currentUser.id) return currentUser.value.avatarUrl
  return currentUser.value.avatarUrl // P0: 暂用默认头像
}

/** textarea 自动高度 */
function autoResize() {
  const el = inputRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 120) + 'px'
}

function handleSend() {
  const content = inputContent.value.trim()
  if (!content) return

  const result = interactionStore.addComment(props.markId, content)
  if (result) {
    inputContent.value = ''
    // 重置 textarea 高度
    nextTick(() => {
      if (inputRef.value) {
        inputRef.value.style.height = 'auto'
      }
    })
    showToast({ message: '评论成功', type: 'success' })
  }
}

function handleDelete(commentId: string) {
  interactionStore.deleteComment(commentId)
  showToast({ message: '已删除', type: 'success' })
}

function formatCommentTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 30) return `${days}天前`

  return new Date(timestamp).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  })
}

/** 聚焦输入框（供父组件调用） */
function focusInput() {
  inputRef.value?.focus()
}

defineExpose({ focusInput })
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.comment-section {
  padding: $spacing-lg;
  padding-top: $spacing-md;
}

.comment-header {
  display: flex;
  align-items: center;
  margin-bottom: $spacing-md;

  .comment-title {
    font-size: $font-size-base;
    font-weight: 600;
    color: $text-primary;
  }
}

.comment-input-wrap {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  margin-bottom: $spacing-lg;

  .input-avatar {
    width: 32px;
    height: 32px;
    border-radius: $radius-full;
    object-fit: cover;
    flex-shrink: 0;
  }

  .input-box {
    flex: 1;
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    background: $bg-card;
    border: 1.5px solid $border-color;
    border-radius: $radius-full;
    padding: 4px 4px 4px $spacing-md;
    transition: border-color $transition-fast;

    &:focus-within {
      border-color: $color-primary;
    }

    .comment-input {
      flex: 1;
      border: none;
      outline: none;
      font-size: $font-size-sm;
      color: $text-primary;
      background: transparent;
      line-height: 1.5;
      resize: none;
      max-height: 120px;
      overflow-y: auto;
      font-family: inherit;

      &::placeholder {
        color: $text-placeholder;
      }
    }

    .send-btn {
      padding: 6px 14px;
      border: none;
      border-radius: $radius-full;
      background: $border-color;
      color: $text-tertiary;
      font-size: $font-size-xs;
      font-weight: 500;
      cursor: pointer;
      flex-shrink: 0;
      transition: all $transition-fast;

      &.active {
        background: $color-primary;
        color: #fff;
      }

      &:disabled {
        cursor: not-allowed;
      }
    }
  }
}

.comment-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.comment-item {
  display: flex;
  gap: $spacing-sm;

  .comment-avatar {
    width: 28px;
    height: 28px;
    border-radius: $radius-full;
    object-fit: cover;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .comment-body {
    flex: 1;
    min-width: 0;

    .comment-meta {
      display: flex;
      align-items: center;
      gap: $spacing-sm;
      margin-bottom: 2px;

      .comment-author {
        font-size: $font-size-xs;
        font-weight: 600;
        color: $text-secondary;
        display: flex;
        align-items: center;
        gap: 4px;

        .my-tag {
          font-size: 10px;
          font-weight: 500;
          padding: 0 4px;
          border-radius: $radius-sm;
          background: $color-primary-light;
          color: $color-primary-dark;
        }
      }

      .comment-time {
        font-size: 10px;
        color: $text-tertiary;
      }
    }

    .comment-text {
      font-size: $font-size-sm;
      color: $text-primary;
      line-height: 1.5;
      margin: 0;
      word-break: break-word;
    }

    .comment-delete {
      margin-top: 4px;
      border: none;
      background: none;
      color: $text-tertiary;
      font-size: 10px;
      cursor: pointer;
      padding: 0;

      &:hover {
        color: #ee0a24;
      }
    }
  }
}

.comment-empty {
  text-align: center;
  padding: $spacing-xl 0;
  color: $text-placeholder;
  font-size: $font-size-sm;
}
</style>
