<template>
  <div class="create-view">
    <!-- 顶部导航栏 -->
    <van-nav-bar
      title="新打卡"
      left-arrow
      @click-left="router.back()"
      class="create-nav"
    />

    <div class="create-content">
      <!-- 地图选点区域 -->
      <div class="map-section">
        <MapView
          :center="selectedPosition"
          :zoom="16"
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
        <!-- 地点名称 - 支持自动获取 -->
        <div class="form-item location-name-item">
          <label class="form-label">地点名称</label>
          <van-field
            v-model="form.locationName"
            placeholder="给这个地点取个名字吧"
            :border="false"
            class="form-field"
            @focus="onLocationNameFocus"
          />
          <!-- 地标建议列表 -->
          <div v-if="geoSuggestions.length > 0 && showSuggestions" class="suggestions-list">
            <div
              v-for="(sug, idx) in geoSuggestions"
              :key="idx"
              class="suggestion-item"
              @click="selectSuggestion(sug)"
            >
              <span class="sug-icon">📍</span>
              <span class="sug-name">{{ sug.shortName }}</span>
              <span class="sug-type">{{ sug.type }}</span>
            </div>
          </div>
          <div v-if="geoLoading" class="suggestions-loading">
            <span class="loading-icon">⟳</span> 获取附近地标...
          </div>
        </div>

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

        <!-- 底部醒目提交按钮 -->
        <button
          class="submit-button"
          :class="{ active: isFormValid, disabled: !isFormValid }"
          @click="handleSubmit"
        >
          提交打卡
        </button>
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
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast } from 'vant'
import type { GeoPosition, MarkFormData } from '@/types'
import MapView from '@/components/MapView.vue'
import ImageUploader from '@/components/ImageUploader.vue'
import CharacterPicker from '@/components/CharacterPicker.vue'
import { useMarkStore } from '@/stores/markStore'
import { useCharacterStore } from '@/stores/characterStore'
import { useGeolocation } from '@/composables/useGeolocation'
import { useReverseGeocode, type GeoNameResult } from '@/composables/useReverseGeocode'

const router = useRouter()
const route = useRoute()
const markStore = useMarkStore()
const characterStore = useCharacterStore()
const { position, loading: geoPosLoading, locate } = useGeolocation()
const { suggestions: geoSuggestions, loading: geoNameLoading, reverseGeocode } = useReverseGeocode()

// 定位加载状态（位置获取或地标名称获取）
const geoLoading = computed(() => geoPosLoading.value || geoNameLoading.value)

const showCharacterPicker = ref(false)
const tagsInput = ref('')
const showSuggestions = ref(true)

// 从路由参数获取地图中心坐标（由首页 FumoFab 传入）
const routeCenter: GeoPosition = route.query.lat && route.query.lng
  ? { lat: parseFloat(route.query.lat as string), lng: parseFloat(route.query.lng as string) }
  : { ...position.value }

const selectedPosition = ref<GeoPosition>({ ...routeCenter })

const form = ref<MarkFormData>({
  characterIds: [],
  lat: routeCenter.lat,
  lng: routeCenter.lng,
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
  // 拖拽后自动获取附近地标
  fetchLocationName(pos)
}

async function useCurrentLocation() {
  const pos = await locate()
  form.value.lat = pos.lat
  form.value.lng = pos.lng
  selectedPosition.value = { ...pos }
  fetchLocationName(pos)
}

function onLocationNameFocus() {
  showSuggestions.value = true
}

async function fetchLocationName(pos: GeoPosition) {
  const results = await reverseGeocode(pos)
  if (results.length > 0 && !form.value.locationName.trim()) {
    form.value.locationName = results[0].shortName
  }
  showSuggestions.value = true
}

function selectSuggestion(sug: GeoNameResult) {
  form.value.locationName = sug.shortName
  showSuggestions.value = false
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

// 初始化：使用路由传入的坐标，并获取附近地标
onMounted(() => {
  fetchLocationName(routeCenter)
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

// 地点名称建议列表
.location-name-item {
  position: relative;
}

.suggestions-list {
  background: $bg-card;
  border-radius: $radius-md;
  box-shadow: $shadow-md;
  margin-top: $spacing-xs;
  overflow: hidden;
  max-height: 200px;
  overflow-y: auto;
  z-index: 10;

  .suggestion-item {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    padding: $spacing-md;
    cursor: pointer;
    transition: background $transition-fast;
    border-bottom: 1px solid $divider-color;

    &:last-child {
      border-bottom: none;
    }

    &:active {
      background: $border-color-light;
    }

    .sug-icon {
      font-size: 16px;
      flex-shrink: 0;
    }

    .sug-name {
      flex: 1;
      font-size: $font-size-sm;
      color: $text-primary;
    }

    .sug-type {
      font-size: $font-size-xs;
      color: $text-tertiary;
      padding: 2px 8px;
      border-radius: $radius-full;
      background: $border-color-light;
    }
  }
}

.suggestions-loading {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  padding: $spacing-sm $spacing-md;
  font-size: $font-size-xs;
  color: $text-tertiary;

  .loading-icon {
    animation: spin 1s linear infinite;
    display: inline-block;
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
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

// 底部醒目提交按钮
.submit-button {
  width: 100%;
  height: 48px;
  border: none;
  border-radius: $radius-xl;
  font-size: $font-size-lg;
  font-weight: 600;
  cursor: pointer;
  transition: all $transition-normal;
  margin-top: $spacing-lg;

  &.disabled {
    background: $border-color-light;
    color: $text-tertiary;
    cursor: not-allowed;
  }

  &.active {
    background: linear-gradient(135deg, $color-pink, $color-primary);
    color: white;
    box-shadow: $shadow-md;

    &:active {
      transform: scale(0.97);
      box-shadow: $shadow-sm;
    }
  }
}
</style>
