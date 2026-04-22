<template>
  <div class="mark-detail-view" v-if="mark">
    <!-- 顶部固定导航栏 -->
    <div class="detail-header">
      <button class="back-btn glass-effect" @click="router.back()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
      <span class="header-title">打卡详情</span>
      <span class="header-spacer"></span>
    </div>

    <!-- 上方左右分栏：左图片 + 右地图 -->
    <div class="hero-split">
      <!-- 左侧图片区（支持纵向滑动） -->
      <div class="hero-images" v-if="mark.images.length > 0">
        <div class="images-scroll">
          <img
            v-for="(img, index) in mark.images"
            :key="index"
            :src="img"
            class="hero-img"
            alt="打卡图片"
            @click="previewImage(index)"
          />
        </div>
        <span v-if="mark.images.length > 1" class="images-counter">{{ mark.images.length }}张</span>
      </div>
      <!-- 无图片时占位 -->
      <div class="hero-images hero-images--empty" v-else>
        <span class="empty-icon">🖼️</span>
        <span class="empty-text">暂无图片</span>
      </div>

      <!-- 右侧地图区 -->
      <div class="hero-map-wrap">
        <div class="hero-map" ref="miniMapEl"></div>
        <!-- 地点名称叠加 -->
        <div class="hero-location-badge">
          <span class="badge-icon">📍</span>
          <span class="badge-name">{{ mark.locationName || '未命名地点' }}</span>
        </div>
      </div>
    </div>

    <!-- 下方可滚动内容区 -->
    <div class="detail-body">
      <!-- 坐标与时间信息 -->
      <div class="info-row">
        <div class="info-chip">
          <span class="chip-label">纬度</span>
          <span class="chip-value">{{ mark.lat.toFixed(6) }}</span>
        </div>
        <div class="info-chip">
          <span class="chip-label">经度</span>
          <span class="chip-value">{{ mark.lng.toFixed(6) }}</span>
        </div>
        <div class="info-chip">
          <span class="chip-label">时间</span>
          <span class="chip-value">{{ formatTime(mark.createdAt) }}</span>
        </div>
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
    month: 'short',
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
    closeable: true,
    closeOnPopstate: true,
  })
}

function initMiniMap() {
  if (!miniMapEl.value || !mark.value) return

  miniMap = L.map(miniMapEl.value, {
    center: [mark.value.lat, mark.value.lng],
    zoom: 16,
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

.mark-detail-view {
  width: 100%;
  min-height: 100%;
  background: $bg-primary;
  padding-bottom: 72px;
}

// 顶部导航栏
.detail-header {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  padding: calc(env(safe-area-inset-top, 0px) + 8px) $spacing-md $spacing-sm;
  background: $bg-overlay;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);

  .back-btn {
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

  .header-spacer {
    width: 36px;
  }
}

// 上方左右分栏
.hero-split {
  display: flex;
  width: 100%;
  height: 45vh;
  min-height: 240px;

  // 左侧图片区
  .hero-images {
    position: relative;
    flex: 1;
    min-width: 0;
    background: $bg-card;

    .images-scroll {
      width: 100%;
      height: 100%;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;

      &::-webkit-scrollbar {
        width: 3px;
      }
      &::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.15);
        border-radius: 4px;
      }

      .hero-img {
        width: 100%;
        height: auto;
        display: block;
        object-fit: cover;
        cursor: pointer;
        transition: opacity $transition-fast;

        &:active {
          opacity: 0.85;
        }

        & + .hero-img {
          border-top: 2px solid $bg-primary;
        }
      }
    }

    .images-counter {
      position: absolute;
      bottom: $spacing-sm;
      right: $spacing-sm;
      font-size: $font-size-xs;
      color: #fff;
      background: rgba(0, 0, 0, 0.5);
      padding: 2px 8px;
      border-radius: $radius-full;
      z-index: 2;
    }

    &--empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: $spacing-sm;
      background: $bg-card;

      .empty-icon {
        font-size: 32px;
        opacity: 0.4;
      }

      .empty-text {
        font-size: $font-size-sm;
        color: $text-placeholder;
      }
    }
  }

  // 右侧地图区
  .hero-map-wrap {
    position: relative;
    flex: 1;
    min-width: 0;

    .hero-map {
      width: 100%;
      height: 100%;
    }

    .hero-location-badge {
      position: absolute;
      bottom: $spacing-sm;
      left: $spacing-sm;
      right: $spacing-sm;
      z-index: 5;
      display: flex;
      align-items: center;
      gap: $spacing-xs;
      padding: $spacing-xs $spacing-md;
      border-radius: $radius-full;
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      box-shadow: $shadow-sm;

      .badge-icon {
        font-size: 14px;
        flex-shrink: 0;
      }

      .badge-name {
        font-size: $font-size-sm;
        font-weight: 600;
        color: $text-primary;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }
}

// 下方内容区
.detail-body {
  padding: $spacing-lg;
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

// 坐标与时间信息条
.info-row {
  display: flex;
  gap: $spacing-sm;
  flex-wrap: wrap;

  .info-chip {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: $spacing-sm $spacing-md;
    background: $bg-card;
    border-radius: $radius-md;
    flex: 1;
    min-width: 0;

    .chip-label {
      font-size: $font-size-xs;
      color: $text-tertiary;
    }

    .chip-value {
      font-size: $font-size-xs;
      color: $text-secondary;
      font-family: monospace;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

// 角色信息区
.character-section {
  padding: $spacing-md;
  background: $bg-card;
  border-radius: $radius-md;

  .primary-character {
    display: flex;
    align-items: center;
    gap: $spacing-md;
    margin-bottom: $spacing-md;

    .primary-avatar {
      width: 44px;
      height: 44px;
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
  padding: 0;

  .section-divider {
    height: 1px;
    background: $divider-color;
    margin-bottom: $spacing-md;
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
