<template>
  <transition name="popup-slide">
    <div v-if="mark" class="marker-popup" @click="goToDetail">
      <img
        v-if="mark.images.length > 0"
        :src="mark.images[0]"
        class="popup-thumbnail"
        alt="打卡图片"
      />
      <div v-else class="popup-thumbnail popup-placeholder">
        <span>📷</span>
      </div>
      <div class="popup-info">
        <div class="popup-character">{{ characterName }}</div>
        <div class="popup-location">📍 {{ mark.locationName || '未命名地点' }}</div>
        <div v-if="mark.description" class="popup-desc">{{ mark.description }}</div>
      </div>
      <div class="popup-arrow">›</div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Mark } from '@/types'
import { useCharacterStore } from '@/stores/characterStore'

const props = defineProps<{
  mark: Mark | null
}>()

const router = useRouter()
const characterStore = useCharacterStore()

const characterName = computed(() => {
  if (!props.mark) return ''
  const primaryId = props.mark.characterIds[0]
  const char = characterStore.getCharacterById(primaryId)
  if (!char) return '未知角色'
  const extraCount = props.mark.characterIds.length - 1
  return extraCount > 0 ? `${char.name} +${extraCount}` : char.name
})

function goToDetail() {
  if (props.mark) {
    router.push(`/mark/${props.mark.id}`)
  }
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.marker-popup {
  position: absolute;
  bottom: 100px;
  left: $spacing-lg;
  right: $spacing-lg;
  z-index: 1000;
  background: $bg-card;
  border-radius: $radius-lg;
  box-shadow: $shadow-md;
  padding: $spacing-md;
  display: flex;
  align-items: center;
  gap: $spacing-md;
  cursor: pointer;
  transition: transform $transition-normal, box-shadow $transition-normal;

  &:active {
    transform: scale(0.98);
    box-shadow: $shadow-sm;
  }

  .popup-thumbnail {
    width: 64px;
    height: 64px;
    border-radius: $radius-md;
    object-fit: cover;
    flex-shrink: 0;
  }

  .popup-placeholder {
    background: $border-color-light;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
  }

  .popup-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;

    .popup-character {
      font-size: $font-size-base;
      font-weight: 600;
      color: $text-primary;
    }

    .popup-location {
      font-size: $font-size-sm;
      color: $text-secondary;
    }

    .popup-desc {
      font-size: $font-size-xs;
      color: $text-tertiary;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
  }

  .popup-arrow {
    font-size: 20px;
    color: $text-tertiary;
    flex-shrink: 0;
  }
}

.popup-slide-enter-active {
  animation: slideUp 0.3s ease;
}

.popup-slide-leave-active {
  animation: slideUp 0.2s ease reverse;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
