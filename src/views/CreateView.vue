<template>
  <div class="create-view">
    <!-- 顶部导航栏 -->
    <van-nav-bar
      title="新打卡"
      left-arrow
      @click-left="router.back()"
      class="create-nav"
    >
      <template #right>
        <span
          class="submit-btn"
          :class="{ active: isFormValid }"
          @click="handleSubmit"
        >
          提交
        </span>
      </template>
    </van-nav-bar>

    <div class="create-content">
      <!-- 地图选点区域 -->
      <div class="map-section">
        <MapView
          :center="selectedPosition"
          :zoom="15"
          :draggable-marker="true"
          @drag-end="onDragEnd"
        />
        <button class="use-location-btn" @click="useCurrentLocation">
          <span v-if="geoLoading">定位中...</span>
          <span v-else>📍 使用当前位置</span>
        </button>
      </div>

      <!-- 表单区域 -->
      <div class="form-section">
        <!-- 地点名称 -->
        <van-field
          v-model="form.locationName"
          label="地点名称"
          placeholder="给这个地点取个名字吧"
          :border="false"
          class="form-field"
        />

        <!-- 图片上传 -->
        <div class="form-item">
          <label class="form-label">打卡照片</label>
          <ImageUploader v-model="form.images" :max-count="3" />
        </div>

        <!-- 角色选择 -->
        <div class="form-item">
          <label class="form-label">选择角色</label>
          <div class="character-select" @click="showCharacterPicker = true">
            <div v-if="form.characterIds.length > 0" class="selected-characters">
              <div
                v-for="id in form.characterIds"
                :key="id"
                class="selected-char-tag"
              >
                <img
                  :src="getCharAvatar(id)"
                  class="char-tag-avatar"
                  :alt="getCharName(id)"
                />
                <span>{{ getCharName(id) }}</span>
              </div>
            </div>
            <span v-else class="select-placeholder">点击选择角色（可多选）</span>
            <span class="select-arrow">›</span>
          </div>
        </div>

        <!-- 文字描述 -->
        <van-field
          v-model="form.description"
          type="textarea"
          label="描述"
          placeholder="记录一下这次和 fumo 的旅途吧~"
          :border="false"
          :autosize="{ minHeight: 80 }"
          class="form-field"
        />

        <!-- 标签 -->
        <van-field
          v-model="tagsInput"
          label="标签"
          placeholder="用逗号分隔多个标签"
          :border="false"
          class="form-field"
        />
      </div>
    </div>

    <!-- 角色选择弹窗 -->
    <CharacterPicker
      v-model:show="showCharacterPicker"
      v-model="form.characterIds"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import type { GeoPosition, MarkFormData } from '@/types'
import MapView from '@/components/MapView.vue'
import ImageUploader from '@/components/ImageUploader.vue'
import CharacterPicker from '@/components/CharacterPicker.vue'
import { useMarkStore } from '@/stores/markStore'
import { useCharacterStore } from '@/stores/characterStore'
import { useGeolocation } from '@/composables/useGeolocation'

const router = useRouter()
const markStore = useMarkStore()
const characterStore = useCharacterStore()
const { position, loading: geoLoading, locate } = useGeolocation()

const showCharacterPicker = ref(false)
const tagsInput = ref('')

const selectedPosition = ref<GeoPosition>({ ...position.value })

const form = ref<MarkFormData>({
  characterIds: [],
  lat: position.value.lat,
  lng: position.value.lng,
  locationName: '',
  images: [],
  description: '',
  tags: [],
})

const isFormValid = computed(() => {
  return form.value.characterIds.length > 0 && form.value.locationName.trim() !== ''
})

function onDragEnd(pos: GeoPosition) {
  form.value.lat = pos.lat
  form.value.lng = pos.lng
  selectedPosition.value = pos
}

async function useCurrentLocation() {
  const pos = await locate()
  form.value.lat = pos.lat
  form.value.lng = pos.lng
  selectedPosition.value = { ...pos }
}

function getCharAvatar(id: string): string {
  return characterStore.getCharacterById(id)?.avatarUrl || ''
}

function getCharName(id: string): string {
  return characterStore.getCharacterById(id)?.name || '未知'
}

function handleSubmit() {
  if (!isFormValid.value) {
    showToast('请填写地点名称并选择至少一个角色')
    return
  }

  // 处理标签
  if (tagsInput.value.trim()) {
    form.value.tags = tagsInput.value
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter(Boolean)
  }

  const result = markStore.addMark(form.value)

  if (result.success) {
    showToast({ message: '打卡成功！', type: 'success' })
    router.push('/')
  } else {
    showToast({ message: result.message, type: 'fail' })
  }
}

// 初始定位
locate().then((pos) => {
  selectedPosition.value = { ...pos }
  form.value.lat = pos.lat
  form.value.lng = pos.lng
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.create-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: $bg-primary;
}

.create-nav {
  flex-shrink: 0;

  .submit-btn {
    font-size: $font-size-base;
    color: $text-tertiary;
    cursor: pointer;

    &.active {
      color: $color-primary;
      font-weight: 600;
    }
  }
}

.create-content {
  flex: 1;
  overflow-y: auto;
}

.map-section {
  height: 40vh;
  position: relative;

  .use-location-btn {
    position: absolute;
    bottom: $spacing-md;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    padding: $spacing-sm $spacing-lg;
    border-radius: $radius-xl;
    border: none;
    background: $bg-card;
    box-shadow: $shadow-md;
    font-size: $font-size-sm;
    color: $text-primary;
    cursor: pointer;
    white-space: nowrap;

    &:active {
      transform: translateX(-50%) scale(0.95);
    }
  }
}

.form-section {
  padding: $spacing-lg;
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.form-field {
  background: $bg-card;
  border-radius: $radius-md;

  :deep(.van-field__label) {
    color: $text-secondary;
    font-size: $font-size-sm;
  }

  :deep(.van-field__control) {
    color: $text-primary;

    &::placeholder {
      color: $text-placeholder;
    }
  }
}

.form-item {
  .form-label {
    display: block;
    font-size: $font-size-sm;
    color: $text-secondary;
    margin-bottom: $spacing-sm;
  }
}

.character-select {
  display: flex;
  align-items: center;
  background: $bg-card;
  border-radius: $radius-md;
  padding: $spacing-md;
  cursor: pointer;
  min-height: 48px;
  transition: all $transition-fast;

  &:active {
    background: $border-color-light;
  }

  .selected-characters {
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-xs;

    .selected-char-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border-radius: $radius-full;
      background: $color-primary-light;
      font-size: $font-size-xs;
      color: $color-primary-dark;

      .char-tag-avatar {
        width: 20px;
        height: 20px;
        border-radius: $radius-full;
        object-fit: cover;
      }
    }
  }

  .select-placeholder {
    flex: 1;
    color: $text-placeholder;
    font-size: $font-size-sm;
  }

  .select-arrow {
    font-size: 20px;
    color: $text-tertiary;
    flex-shrink: 0;
    margin-left: $spacing-sm;
  }
}
</style>
