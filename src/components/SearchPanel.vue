<template>
  <transition name="panel-slide">
    <div v-if="visible" class="search-panel">
      <!-- 面板头部 -->
      <div class="panel-header">
        <span class="panel-title">搜索结果</span>
        <button class="panel-close" @click="$emit('close')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <!-- 角色筛选条 -->
      <div class="filter-bar" v-if="characters.length > 0">
        <button
          class="filter-chip"
          :class="{ active: !filterCharId }"
          @click="$emit('filter', null)"
        >
          全部
        </button>
        <button
          v-for="char in characters"
          :key="char.id"
          class="filter-chip"
          :class="{ active: filterCharId === char.id }"
          @click="$emit('filter', char.id)"
        >
          <img :src="char.avatarUrl" :alt="char.name" class="chip-avatar" />
          <span>{{ char.name }}</span>
        </button>
      </div>

      <!-- 结果列表 -->
      <div class="result-list" v-if="results.length > 0">
        <div
          v-for="mark in results"
          :key="mark.id"
          class="result-item"
          @click="$emit('select', mark)"
        >
          <img
            v-if="mark.images.length > 0"
            :src="mark.images[0]"
            class="result-thumb"
            alt=""
          />
          <div v-else class="result-thumb result-thumb--empty">📷</div>
          <div class="result-info">
            <div class="result-location">📍 {{ mark.locationName || '未命名地点' }}</div>
            <div class="result-characters">{{ getCharacterNames(mark) }}</div>
            <div v-if="mark.description" class="result-desc">{{ mark.description }}</div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="result-empty">
        <span class="empty-icon">🔍</span>
        <span class="empty-text">没有找到匹配的打卡记录</span>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import type { Mark, Character } from '@/types'
import { useCharacterStore } from '@/stores/characterStore'

defineProps<{
  visible: boolean
  results: Mark[]
  characters: Character[]
  filterCharId: string | null
}>()

defineEmits<{
  close: []
  select: [mark: Mark]
  filter: [charId: string | null]
}>()

const characterStore = useCharacterStore()

function getCharacterNames(mark: Mark): string {
  const names = mark.characterIds
    .map((id) => characterStore.getCharacterById(id)?.name)
    .filter(Boolean)
  return names.join('、') || '未知角色'
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.search-panel {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1001;
  background: $bg-primary;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(env(safe-area-inset-top, 0px) + 12px) $spacing-lg $spacing-sm;
  background: $bg-overlay;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);

  .panel-title {
    font-size: $font-size-lg;
    font-weight: 600;
    color: $text-primary;
  }

  .panel-close {
    width: 32px;
    height: 32px;
    border-radius: $radius-full;
    border: none;
    background: rgba(255, 255, 255, 0.8);
    color: $text-secondary;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;

    &:hover {
      background: #fff;
    }
  }
}

.filter-bar {
  display: flex;
  gap: $spacing-xs;
  padding: $spacing-sm $spacing-lg;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border-bottom: 1px solid $divider-color;
  flex-shrink: 0;

  // 隐藏滚动条
  &::-webkit-scrollbar {
    display: none;
  }
  scrollbar-width: none;

  .filter-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    border-radius: $radius-full;
    border: 1.5px solid $border-color;
    background: $bg-card;
    font-size: $font-size-xs;
    color: $text-secondary;
    cursor: pointer;
    white-space: nowrap;
    transition: all $transition-fast;
    flex-shrink: 0;

    .chip-avatar {
      width: 18px;
      height: 18px;
      border-radius: $radius-full;
      object-fit: cover;
    }

    &.active {
      border-color: $color-primary;
      background: $color-primary-light;
      color: $color-primary-dark;
    }

    &:hover:not(.active) {
      border-color: $color-primary;
    }
  }
}

.result-list {
  flex: 1;
  overflow-y: auto;
  padding: $spacing-sm 0;

  .result-item {
    display: flex;
    align-items: center;
    gap: $spacing-md;
    padding: $spacing-md $spacing-lg;
    cursor: pointer;
    transition: background $transition-fast;
    border-bottom: 1px solid $divider-color;

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      background: $border-color-light;
    }

    &:active {
      background: rgba($color-primary, 0.08);
    }

    .result-thumb {
      width: 56px;
      height: 56px;
      border-radius: $radius-md;
      object-fit: cover;
      flex-shrink: 0;

      &--empty {
        background: $border-color-light;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
      }
    }

    .result-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;

      .result-location {
        font-size: $font-size-base;
        font-weight: 600;
        color: $text-primary;
      }

      .result-characters {
        font-size: $font-size-sm;
        color: $text-secondary;
      }

      .result-desc {
        font-size: $font-size-xs;
        color: $text-tertiary;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
    }
  }
}

.result-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: $spacing-md;

  .empty-icon {
    font-size: 40px;
    opacity: 0.5;
  }

  .empty-text {
    font-size: $font-size-sm;
    color: $text-tertiary;
  }
}

.panel-slide-enter-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.panel-slide-leave-active {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.panel-slide-enter-from {
  transform: translateY(100%);
  opacity: 0;
}
.panel-slide-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
