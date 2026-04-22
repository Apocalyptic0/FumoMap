<template>
  <div class="mark-detail-view" v-if="mark">
    <!-- 顶部区域：左侧图片 + 右侧坐标信息 -->
    <div class="top-section">
      <!-- 左侧：图片水平滚动 -->
      <div class="images-panel" v-if="mark.images.length > 0">
        <div class="images-scroll">
          <img
            v-for="(img, index) in mark.images"
            :key="index"
            :src="img"
            class="scroll-image"
            alt="打卡图片"
            @click="previewImage(index)"
          />
        </div>
        <div class="image-counter" v-if="mark.images.length > 1">
          {{ currentImageIndex + 1 }} / {{ mark.images.length }}
        </div>
      </div>
      <div class="images-panel images-empty" v-else>
        <span class="empty-icon">📷</span>
        <span class="empty-text">暂无图片</span>
      </div>

      <!-- 右侧：坐标与地点信息 -->
      <div class="coords-panel">
        <div class="coords-header">
          <span class="coords-icon">📍</span>
          <span class="coords-name">{{ mark.locationName || '未命名地点' }}</span>
        </div>
        <div class="coords-detail">
          <div class="coord-item">
            <span class="coord-label">纬度</span>
            <span class="coord-value">{{ mark.lat.toFixed(6) }}</span>
          </div>
          <div class="coord-item">
            <span class="coord-label">经度</span>
            <span class="coord-value">{{ mark.lng.toFixed(6) }}</span>
          </div>
        </div>
        <!-- 小地图预览 -->
        <div class="mini-map" ref="miniMapEl"></div>
        <div class="time-info">
          🕐 {{ formatTime(mark.createdAt) }}
        </div>
      </div>

      <!-- 返回按钮 -->
      <button class="back-btn glass-effect" @click="router.back()">
        ‹
      </button>
    </div>

    <!-- 角色信息区 -->
    <div class="character-section">
      <div class="primary-character">
        <img
          :src="primaryCharacter?.avatarUrl"
          :alt="primaryCharacter?.name"
          class="primary-avatar"
        />
        <div class="primary-detail">
          <h2 class="primary-name">{{ primaryCharacter?.name || '未知角色' }}</h2>
          <span class="primary-name-en">{{ primaryCharacter?.nameEn }}</span>
        </div>
      </div>

      <!-- 其余角色小头像 -->
      <div v-if="extraCharacters.length > 0" class="extra-characters">
        <span class="extra-label">同行角色：</span>
        <div class="extra-avatars">
          <div
            v-for="char in extraCharacters"
            :key="char.id"
            class="extra-avatar-item"
            :title="char.name"
          >
            <img :src="char.avatarUrl" :alt="char.name" class="extra-avatar" />
            <span class="extra-name">{{ char.name }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 描述内容区 -->
    <div class="description-section" v-if="mark.description">
      <div class="section-divider"></div>
      <p class="description-text">{{ mark.description }}</p>
    </div>

    <!-- 标签 -->
    <div class="tags-section" v-if="mark.tags.length > 0">
      <div v-for="tag in mark.tags" :key="tag" class="tag-capsule">
        {{ tag }}
      </div>
    </div>

    <!-- 底部操作栏 -->
    <div class="action-bar">
      <button class="action-btn">
        <span class="action-icon">♡</span>
        <span class="action-label">点赞</span>
      </button>
      <button class="action-btn">
        <span class="action-icon">💬</span>
        <span class="action-label">评论</span>
      </button>
      <button class="action-btn">
        <span class="action-icon">☆</span>
        <span class="action-label">收藏</span>
      </button>
    </div>
  </div>

  <!-- 加载失败 -->
  <div v-else class="detail-empty">
    <p>未找到该打卡记录</p>
    <van-button type="primary" round size="small" @click="router.push('/')">
      返回首页
    </van-button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showImagePreview } from 'vant'
import L from 'leaflet'
import { useMarkStore } from '@/stores/markStore'
import { useCharacterStore } from '@/stores/characterStore'

const route = useRoute()
const router = useRouter()
const markStore = useMarkStore()
const characterStore = useCharacterStore()

const miniMapEl = ref<HTMLElement | null>(null)
let miniMap: L.Map | null = null
const currentImageIndex = ref(0)

const mark = computed(() => {
  const id = route.params.id as string
  return markStore.getMarkById(id) ?? null
})

const primaryCharacter = computed(() => {
  if (!mark.value || mark.value.characterIds.length === 0) return null
  return characterStore.getCharacterById(mark.value.characterIds[0])
})

const extraCharacters = computed(() => {
  if (!mark.value || mark.value.characterIds.length <= 1) return []
  return mark.value.characterIds
    .slice(1)
    .map((id) => characterStore.getCharacterById(id))
    .filter(Boolean) as NonNullable<ReturnType<typeof characterStore.getCharacterById>>[]
})

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function previewImage(index: number) {
  if (!mark.value) return
  showImagePreview({
    images: mark.value.images,
    startPosition: index,
  })
}

function initMiniMap() {
  if (!miniMapEl.value || !mark.value) return

  miniMap = L.map(miniMapEl.value, {
    center: [mark.value.lat, mark.value.lng],
    zoom: 15,
    zoomControl: false,
    attributionControl: false,
    dragging: false,
    touchZoom: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    keyboard: false,
  })

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 20,
    subdomains: 'abcd',
  }).addTo(miniMap)

  // 添加标记点（Pin 造型）
  const icon = L.divIcon({
    className: 'mini-map-marker',
    html: `<div class="fumo-pin-marker" style="--pin-color: #D4CAF0; --pin-size: 24px;">
      <div class="pin-head" style="width:24px;height:24px;border-radius:50%;border:2px solid #fff;background:#D4CAF0;display:flex;align-items:center;justify-content:center;">
        <div style="width:14px;height:14px;border-radius:50%;background:#fff;"></div>
      </div>
      <div class="pin-tip"></div>
    </div>`,
    iconSize: [24, 36],
    iconAnchor: [12, 36],
  })

  L.marker([mark.value.lat, mark.value.lng], { icon }).addTo(miniMap)
}

onMounted(() => {
  setTimeout(initMiniMap, 100)
})

onUnmounted(() => {
  if (miniMap) {
    miniMap.remove()
    miniMap = null
  }
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;
@import '@/styles/map.scss';

.mark-detail-view {
  width: 100%;
  min-height: 100%;
  background: $bg-primary;
  padding-bottom: 72px;
}

// 顶部区域：左右分栏
.top-section {
  display: flex;
  position: relative;
  background: $bg-card;
}

// 左侧图片面板
.images-panel {
  flex: 1.2;
  min-width: 0;
  position: relative;
  background: $border-color-light;

  .images-scroll {
    width: 100%;
    height: 240px;
    overflow-x: auto;
    overflow-y: hidden;
    display: flex;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;

    &::-webkit-scrollbar {
      display: none;
    }

    .scroll-image {
      width: 100%;
      min-width: 100%;
      height: 100%;
      object-fit: cover;
      scroll-snap-align: start;
      flex-shrink: 0;
      cursor: pointer;
    }
  }

  .image-counter {
    position: absolute;
    bottom: $spacing-sm;
    right: $spacing-sm;
    background: rgba(0, 0, 0, 0.5);
    color: #fff;
    font-size: $font-size-xs;
    padding: 2px 8px;
    border-radius: $radius-full;
  }

  &.images-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: $spacing-sm;

    .empty-icon {
      font-size: 40px;
      opacity: 0.5;
    }

    .empty-text {
      font-size: $font-size-sm;
      color: $text-tertiary;
    }
  }
}

// 右侧坐标面板
.coords-panel {
  flex: 0.8;
  padding: $spacing-md;
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  background: $bg-card;

  .coords-header {
    display: flex;
    align-items: center;
    gap: $spacing-xs;

    .coords-icon {
      font-size: 16px;
    }

    .coords-name {
      font-size: $font-size-base;
      font-weight: 600;
      color: $text-primary;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .coords-detail {
    display: flex;
    flex-direction: column;
    gap: $spacing-xs;

    .coord-item {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .coord-label {
        font-size: $font-size-xs;
        color: $text-tertiary;
      }

      .coord-value {
        font-size: $font-size-xs;
        color: $text-secondary;
        font-family: monospace;
      }
    }
  }

  .mini-map {
    width: 100%;
    height: 80px;
    border-radius: $radius-md;
    overflow: hidden;
    background: $border-color-light;
    flex-shrink: 0;
  }

  .time-info {
    font-size: $font-size-xs;
    color: $text-tertiary;
  }
}

.back-btn {
  position: absolute;
  top: calc(env(safe-area-inset-top, 0px) + 12px);
  left: $spacing-md;
  z-index: 10;
  width: 36px;
  height: 36px;
  border-radius: $radius-full;
  border: none;
  font-size: 22px;
  color: $text-primary;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:active {
    transform: scale(0.9);
  }
}

// 角色信息区
.character-section {
  padding: $spacing-lg;
  background: $bg-card;

  .primary-character {
    display: flex;
    align-items: center;
    gap: $spacing-md;
    margin-bottom: $spacing-md;

    .primary-avatar {
      width: 48px;
      height: 48px;
      border-radius: $radius-full;
      object-fit: cover;
      border: 2px solid $color-primary-light;
    }

    .primary-detail {
      .primary-name {
        font-size: $font-size-lg;
        font-weight: 600;
        color: $text-primary;
        margin: 0;
      }

      .primary-name-en {
        font-size: $font-size-sm;
        color: $text-tertiary;
      }
    }
  }

  .extra-characters {
    .extra-label {
      font-size: $font-size-xs;
      color: $text-tertiary;
      display: block;
      margin-bottom: $spacing-xs;
    }

    .extra-avatars {
      display: flex;
      flex-wrap: wrap;
      gap: $spacing-sm;

      .extra-avatar-item {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px 4px 4px;
        border-radius: $radius-full;
        background: $border-color-light;

        .extra-avatar {
          width: 24px;
          height: 24px;
          border-radius: $radius-full;
          object-fit: cover;
        }

        .extra-name {
          font-size: $font-size-xs;
          color: $text-secondary;
        }
      }
    }
  }
}

.description-section {
  padding: 0 $spacing-lg $spacing-lg;
  background: $bg-card;

  .section-divider {
    height: 1px;
    background: $divider-color;
    margin-bottom: $spacing-lg;
  }

  .description-text {
    font-size: $font-size-base;
    color: $text-primary;
    line-height: 1.7;
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
  }
}

.tags-section {
  padding: 0 $spacing-lg $spacing-lg;
  background: $bg-card;
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-xs;

  .tag-capsule {
    padding: 4px 12px;
    border-radius: $radius-full;
    background: $color-primary-light;
    color: $color-primary-dark;
    font-size: $font-size-xs;
  }
}

.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: calc(56px + env(safe-area-inset-bottom, 0px));
  padding-bottom: env(safe-area-inset-bottom, 0px);
  background: $bg-card;
  box-shadow: 0 -2px 12px rgba(184, 169, 232, 0.08);
  display: flex;
  align-items: center;
  z-index: 100;

  .action-btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    border: none;
    background: none;
    cursor: pointer;
    padding: $spacing-sm 0;

    .action-icon {
      font-size: 22px;
      color: $text-tertiary;
    }

    .action-label {
      font-size: $font-size-xs;
      color: $text-tertiary;
    }

    &:active {
      .action-icon {
        transform: scale(1.2);
      }
    }
  }
}

.detail-empty {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: $spacing-lg;
  color: $text-tertiary;
  font-size: $font-size-base;
}
</style>
