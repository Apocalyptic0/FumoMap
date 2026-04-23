<template>
  <div class="mark-card" @click="$emit('click')">
    <!-- 缩略图 -->
    <div class="card-thumb">
      <img
        v-if="mark.images.length > 0"
        :src="mark.images[0]"
        class="thumb-img"
        alt="缩略图"
      />
      <div v-else class="thumb-placeholder">
        <span>🖼️</span>
      </div>
    </div>

    <!-- 卡片内容 -->
    <div class="card-content">
      <div class="card-top">
        <span class="card-location text-ellipsis">{{ mark.locationName || '未命名地点' }}</span>
        <span class="card-time">{{ formatCardTime(mark.createdAt) }}</span>
      </div>

      <!-- 角色头像 -->
      <div class="card-characters">
        <img
          v-for="char in displayCharacters"
          :key="char.id"
          :src="char.avatarUrl"
          :alt="char.name"
          :title="char.name"
          class="card-char-avatar"
        />
        <span v-if="mark.characterIds.length > maxAvatars" class="card-char-more">
          +{{ mark.characterIds.length - maxAvatars }}
        </span>
      </div>

      <!-- 描述摘要 -->
      <p v-if="mark.description" class="card-desc text-ellipsis">
        {{ mark.description }}
      </p>

      <!-- 互动数据 -->
      <div class="card-stats" v-if="showStats">
        <span class="stat-item" v-if="mark.likeCount > 0">
          ❤️ {{ mark.likeCount }}
        </span>
        <span class="stat-item" v-if="commentCount > 0">
          💬 {{ commentCount }}
        </span>
      </div>

      <!-- 附加信息插槽（用于不同 Tab 显示不同信息） -->
      <slot name="extra"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Mark } from '@/types'
import { useCharacterStore } from '@/stores/characterStore'
import { useInteractionStore } from '@/stores/interactionStore'
import { formatCardTime } from '@/utils/formatTime'

const props = withDefaults(defineProps<{
  mark: Mark
  showStats?: boolean
  maxAvatars?: number
}>(), {
  showStats: true,
  maxAvatars: 3,
})

defineEmits<{
  click: []
}>()

const characterStore = useCharacterStore()
const interactionStore = useInteractionStore()

const displayCharacters = computed(() =>
  props.mark.characterIds
    .slice(0, props.maxAvatars)
    .map((id) => characterStore.getCharacterById(id))
    .filter(Boolean) as NonNullable<ReturnType<typeof characterStore.getCharacterById>>[]
)

const commentCount = computed(() => interactionStore.getCommentCount(props.mark.id))
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.mark-card {
  display: flex;
  gap: $spacing-md;
  padding: $spacing-md;
  background: $bg-card;
  border-radius: $radius-md;
  box-shadow: $shadow-card;
  cursor: pointer;
  transition: all $transition-fast;

  &:active {
    transform: scale(0.98);
    box-shadow: $shadow-sm;
  }
}

.card-thumb {
  width: 72px;
  height: 72px;
  border-radius: $radius-sm;
  overflow: hidden;
  flex-shrink: 0;
  background: $border-color-light;

  .thumb-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .thumb-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    opacity: 0.4;
  }
}

.card-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;

  .card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $spacing-sm;

    .card-location {
      font-size: $font-size-sm;
      font-weight: 600;
      color: $text-primary;
      flex: 1;
      min-width: 0;
    }

    .card-time {
      font-size: 10px;
      color: $text-tertiary;
      flex-shrink: 0;
    }
  }

  .card-characters {
    display: flex;
    align-items: center;

    .card-char-avatar {
      width: 22px;
      height: 22px;
      border-radius: $radius-full;
      border: 1.5px solid #fff;
      object-fit: cover;
      margin-right: -4px;
    }

    .card-char-more {
      font-size: 10px;
      color: $text-tertiary;
      margin-left: 8px;
    }
  }

  .card-desc {
    font-size: $font-size-xs;
    color: $text-secondary;
    margin: 0;
    line-height: 1.4;
  }

  .card-stats {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    margin-top: 2px;

    .stat-item {
      font-size: 10px;
      color: $text-tertiary;
    }
  }
}
</style>
