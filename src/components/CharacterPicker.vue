<template>
  <van-popup
    v-model:show="visible"
    position="bottom"
    round
    :style="{ height: '60%' }"
    @closed="$emit('update:show', false)"
  >
    <div class="character-picker">
      <!-- 顶部拖拽条 -->
      <div class="picker-handle"></div>

      <!-- 已选角色标签 -->
      <div v-if="selectedIds.length > 0" class="selected-tags">
        <span
          v-for="id in selectedIds"
          :key="id"
          class="selected-tag"
          @click="toggleSelect(id)"
        >
          {{ getCharName(id) }}
          <span class="tag-close">×</span>
        </span>
      </div>

      <!-- 搜索框 -->
      <div class="picker-search">
        <input
          v-model="keyword"
          type="text"
          class="picker-search-input"
          placeholder="搜索角色名称..."
        />
      </div>

      <!-- 角色网格 -->
      <div class="picker-grid">
        <div
          v-for="char in filteredCharacters"
          :key="char.id"
          class="character-card"
          :class="{ selected: isSelected(char.id) }"
          @click="toggleSelect(char.id)"
        >
          <div class="character-avatar-wrapper">
            <img :src="char.avatarUrl" :alt="char.name" class="character-avatar" />
            <span v-if="isSelected(char.id)" class="check-badge">✓</span>
          </div>
          <span class="character-name">{{ char.name }}</span>
        </div>
      </div>

      <!-- 确认按钮 -->
      <div class="picker-footer">
        <van-button
          type="primary"
          block
          round
          :disabled="selectedIds.length === 0"
          @click="confirm"
        >
          确认选择{{ selectedIds.length > 0 ? ` (${selectedIds.length})` : '' }}
        </van-button>
      </div>
    </div>
  </van-popup>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useCharacterStore } from '@/stores/characterStore'

const props = defineProps<{
  show: boolean
  modelValue: string[]
}>()

const emit = defineEmits<{
  'update:show': [val: boolean]
  'update:modelValue': [ids: string[]]
}>()

const characterStore = useCharacterStore()

const visible = ref(props.show)
const keyword = ref('')
const selectedIds = ref<string[]>([...props.modelValue])

watch(() => props.show, (val) => {
  visible.value = val
  if (val) {
    selectedIds.value = [...props.modelValue]
  }
})

const filteredCharacters = computed(() => {
  return characterStore.searchCharacters(keyword.value)
})

function isSelected(id: string): boolean {
  return selectedIds.value.includes(id)
}

function toggleSelect(id: string) {
  const index = selectedIds.value.indexOf(id)
  if (index === -1) {
    selectedIds.value.push(id)
  } else {
    selectedIds.value.splice(index, 1)
  }
}

function getCharName(id: string): string {
  return characterStore.getCharacterById(id)?.name || '未知'
}

function confirm() {
  emit('update:modelValue', [...selectedIds.value])
  emit('update:show', false)
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.character-picker {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 0 $spacing-lg $spacing-lg;

  .picker-handle {
    width: 36px;
    height: 4px;
    border-radius: 2px;
    background: $border-color;
    margin: $spacing-sm auto $spacing-md;
  }

  .selected-tags {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-xs;
    margin-bottom: $spacing-sm;

    .selected-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: $radius-full;
      background: $color-primary-light;
      color: $color-primary-dark;
      font-size: $font-size-xs;
      cursor: pointer;
      transition: all $transition-fast;

      &:active {
        background: $color-primary;
        color: white;
      }

      .tag-close {
        font-size: 12px;
        opacity: 0.7;
      }
    }
  }

  .picker-search {
    margin-bottom: $spacing-md;

    .picker-search-input {
      width: 100%;
      height: 40px;
      border: 1.5px solid $border-color;
      border-radius: $radius-xl;
      padding: 0 $spacing-lg;
      font-size: $font-size-sm;
      color: $text-primary;
      outline: none;
      background: $bg-primary;
      transition: border-color $transition-fast;

      &::placeholder {
        color: $text-placeholder;
      }

      &:focus {
        border-color: $color-primary;
      }
    }
  }

  .picker-grid {
    flex: 1;
    overflow-y: auto;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: $spacing-md;
    padding-bottom: $spacing-md;

    .character-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: $spacing-xs;
      padding: $spacing-sm;
      border-radius: $radius-md;
      cursor: pointer;
      transition: all $transition-fast;
      border: 2px solid transparent;

      &.selected {
        border-color: $color-primary;
        background: rgba($color-primary, 0.06);
      }

      &:active {
        transform: scale(0.95);
      }

      .character-avatar-wrapper {
        position: relative;
        width: 56px;
        height: 56px;

        .character-avatar {
          width: 100%;
          height: 100%;
          border-radius: $radius-full;
          object-fit: cover;
        }

        .check-badge {
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 20px;
          height: 20px;
          border-radius: $radius-full;
          background: $color-primary;
          color: white;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
        }
      }

      .character-name {
        font-size: $font-size-xs;
        color: $text-primary;
        text-align: center;
        line-height: 1.3;
      }
    }
  }

  .picker-footer {
    padding-top: $spacing-md;
    border-top: 1px solid $divider-color;
  }
}
</style>
