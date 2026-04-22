<template>
  <div class="mark-detail-view" v-if="mark">
    <!-- 图片轮播区 -->
    <div class="carousel-section">
      <ImageCarousel :images="mark.images" />
      <button class="back-btn glass-effect" @click="router.back()">
        ‹
      </button>
    </div>

    <!-- 角色与地点信息 -->
    <div class="info-section">
      <div class="character-info">
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

      <!-- 地点信息 -->
      <div class="location-info">
        <span class="location-icon">📍</span>
        <span class="location-name">{{ mark.locationName || '未命名地点' }}</span>
      </div>

      <!-- 小地图预览 -->
      <div class="mini-map" ref="miniMapEl"></div>
    </div>

    <!-- 描述内容区 -->
    <div class="description-section" v-if="mark.description">
      <div class="section-divider"></div>
      <p class="description-text">{{ mark.description }}</p>

      <!-- 标签 -->
      <div v-if="mark.tags.length > 0" class="tags-row">
        <span v-for="tag in mark.tags" :key="tag" class="tag-capsule">
          {{ tag }}
        </span>
      </div>
    </div>

    <!-- 时间信息 -->
    <div class="time-section">
      <span class="time-text">🕐 {{ formatTime(mark.createdAt) }}</span>
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
import L from 'leaflet'
import ImageCarousel from '@/components/ImageCarousel.vue'
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
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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

  // 添加标记点
  const icon = L.divIcon({
    className: 'mini-map-marker',
    html: '<div style="width:12px;height:12px;border-radius:50%;background:#B8A9E8;border:2px solid white;box-shadow:0 2px 6px rgba(184,169,232,0.5)"></div>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
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
  padding-bottom: 72px; // 为底部操作栏留空
}

.carousel-section {
  position: relative;

  .back-btn {
    position: absolute;
    top: calc(env(safe-area-inset-top, 0px) + 12px);
    left: $spacing-lg;
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
}

.info-section {
  padding: $spacing-lg;
  background: $bg-card;
  border-radius: $radius-lg $radius-lg 0 0;
  margin-top: -$spacing-lg;
  position: relative;
  z-index: 2;

  .character-info {
    .primary-character {
      display: flex;
      align-items: center;
      gap: $spacing-md;
      margin-bottom: $spacing-md;

      .primary-avatar {
        width: 56px;
        height: 56px;
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
      margin-bottom: $spacing-md;

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

  .location-info {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    margin-bottom: $spacing-md;

    .location-icon {
      font-size: 16px;
    }

    .location-name {
      font-size: $font-size-base;
      color: $text-secondary;
    }
  }

  .mini-map {
    width: 100%;
    height: 120px;
    border-radius: $radius-md;
    overflow: hidden;
    background: $border-color-light;
  }
}

.description-section {
  padding: $spacing-lg;
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

  .tags-row {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-xs;
    margin-top: $spacing-md;

    .tag-capsule {
      padding: 4px 12px;
      border-radius: $radius-full;
      background: $color-primary-light;
      color: $color-primary-dark;
      font-size: $font-size-xs;
    }
  }
}

.time-section {
  padding: $spacing-md $spacing-lg;
  background: $bg-card;

  .time-text {
    font-size: $font-size-xs;
    color: $text-tertiary;
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
