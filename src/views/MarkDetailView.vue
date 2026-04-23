<template>
  <div class="mark-detail-view" v-if="mark">
    <!-- 顶部固定导航栏 -->
    <div class="detail-header">
      <button class="header-btn glass-effect" @click="router.back()" title="返回上一页">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
      <span class="header-title">打卡详情</span>
      <button class="header-btn glass-effect" @click="goToMap" title="返回地图">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>

    <!-- 上方左右分栏：左图片 + 右地图 -->
    <div class="hero-split">
      <!-- 左侧图片区（带左右切换按钮） -->
      <div class="hero-images" v-if="mark.images.length > 0">
        <img
          :src="mark.images[currentImageIndex]"
          class="hero-img"
          alt="打卡图片"
          @click="previewImage(currentImageIndex)"
        />
        <!-- 左切换按钮 -->
        <button
          v-if="mark.images.length > 1 && currentImageIndex > 0"
          class="img-nav-btn img-nav-prev"
          @click="currentImageIndex--"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <!-- 右切换按钮 -->
        <button
          v-if="mark.images.length > 1 && currentImageIndex < mark.images.length - 1"
          class="img-nav-btn img-nav-next"
          @click="currentImageIndex++"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
        <!-- 页码指示器 -->
        <span v-if="mark.images.length > 1" class="images-indicator">
          {{ currentImageIndex + 1 }} / {{ mark.images.length }}
        </span>
      </div>
      <!-- 无图片时占位 -->
      <div class="hero-images hero-images--empty" v-else>
        <span class="empty-icon">🖼️</span>
        <span class="empty-text">暂无图片</span>
      </div>

      <!-- 右侧地图区（可交互，显示所有标记） -->
      <div class="hero-map-wrap">
        <MapView
          ref="mapViewRef"
          :center="{ lat: mark.lat, lng: mark.lng }"
          :marks="markStore.marks"
          :get-character="characterStore.getCharacterById"
          @marker-click="onMarkerClick"
        />
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
      <button class="action-btn action-btn--edit" @click="editMark">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
        <span>编辑</span>
      </button>
      <button class="action-btn action-btn--delete" @click="deleteMark">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
        <span>删除</span>
      </button>
    </div>

    <!-- 自定义全屏图片预览 -->
    <teleport to="body">
      <transition name="fade">
        <div v-if="previewVisible && mark" class="preview-overlay" @click="onPreviewOverlayClick">
          <!-- 右上角关闭按钮 -->
          <button class="preview-close" @click="closePreview">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          <!-- 页码 -->
          <div class="preview-counter" v-if="mark.images.length > 1">
            {{ previewIndex + 1 }} / {{ mark.images.length }}
          </div>

          <!-- 图片 -->
          <img :src="mark.images[previewIndex]" class="preview-img" alt="预览图片" />

          <!-- 左切换 -->
          <button
            v-if="mark.images.length > 1 && previewIndex > 0"
            class="preview-nav preview-nav-prev"
            @click.stop="previewPrev"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>

          <!-- 右切换 -->
          <button
            v-if="mark.images.length > 1 && previewIndex < mark.images.length - 1"
            class="preview-nav preview-nav-next"
            @click.stop="previewNext"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
      </transition>
    </teleport>
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
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showDialog, showToast } from 'vant'
import type { Mark } from '@/types'
import MapView from '@/components/MapView.vue'
import { useMarkStore } from '@/stores/markStore'
import { useCharacterStore } from '@/stores/characterStore'

const route = useRoute()
const router = useRouter()
const markStore = useMarkStore()
const characterStore = useCharacterStore()

const mapViewRef = ref<InstanceType<typeof MapView> | null>(null)
const currentImageIndex = ref(0)

// 自定义全屏图片预览状态
const previewVisible = ref(false)
const previewIndex = ref(0)

const mark = computed(() => {
  const id = route.params.id as string
  return markStore.getMarkById(id) ?? null
})

// 切换标记时重置图片索引
watch(() => route.params.id, () => {
  currentImageIndex.value = 0
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
  previewIndex.value = index
  previewVisible.value = true
}

function closePreview() {
  previewVisible.value = false
}

function previewPrev() {
  if (previewIndex.value > 0) previewIndex.value--
}

function previewNext() {
  if (mark.value && previewIndex.value < mark.value.images.length - 1) previewIndex.value++
}

function onPreviewOverlayClick(e: MouseEvent) {
  if ((e.target as HTMLElement).classList.contains('preview-overlay')) {
    closePreview()
  }
}

function onMarkerClick(clickedMark: Mark) {
  if (clickedMark.id === mark.value?.id) return
  router.push(`/mark/${clickedMark.id}`)
}

/** × 按钮：返回地图并定位到当前标记坐标 */
function goToMap() {
  if (mark.value) {
    router.push({
      path: '/',
      query: {
        lat: String(mark.value.lat),
        lng: String(mark.value.lng),
      },
    })
  } else {
    router.push('/')
  }
}

/** 编辑打卡：跳转到创建页编辑模式 */
function editMark() {
  if (mark.value) {
    router.push(`/create?edit=${mark.value.id}`)
  }
}

/** 删除打卡 */
async function deleteMark() {
  if (!mark.value) return
  const markId = mark.value.id
  try {
    await showDialog({
      title: '确认删除',
      message: '删除后无法恢复，确定要删除这条打卡记录吗？',
      showCancelButton: true,
      confirmButtonText: '删除',
      confirmButtonColor: '#ee0a24',
      cancelButtonText: '取消',
    })
    const success = markStore.removeMark(markId)
    if (success) {
      showToast({ message: '已删除', type: 'success' })
      router.replace('/')
    } else {
      showToast({ message: '删除失败', type: 'fail' })
    }
  } catch {
    // 用户取消
  }
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.mark-detail-view {
  width: 100%;
  height: 100vh;
  background: $bg-primary;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
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

  .header-btn {
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
    flex-shrink: 0;

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
    background: #1a1a1a;
    overflow: hidden;

    .hero-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      cursor: pointer;
      display: block;
    }

    // 左右切换按钮
    .img-nav-btn {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 32px;
      height: 32px;
      border-radius: $radius-full;
      border: none;
      background: rgba(255, 255, 255, 0.85);
      color: $text-primary;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: $shadow-sm;
      z-index: 5;
      transition: all 0.15s ease;

      &:hover {
        background: #fff;
        box-shadow: $shadow-md;
      }

      &:active {
        transform: translateY(-50%) scale(0.9);
      }
    }

    .img-nav-prev {
      left: $spacing-sm;
    }

    .img-nav-next {
      right: $spacing-sm;
    }

    // 页码指示器
    .images-indicator {
      position: absolute;
      bottom: $spacing-sm;
      left: 50%;
      transform: translateX(-50%);
      font-size: $font-size-xs;
      color: #fff;
      background: rgba(0, 0, 0, 0.5);
      padding: 2px 10px;
      border-radius: $radius-full;
      z-index: 2;
      user-select: none;
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

    .hero-location-badge {
      position: absolute;
      bottom: $spacing-sm;
      left: $spacing-sm;
      right: $spacing-sm;
      z-index: 1000;
      display: flex;
      align-items: center;
      gap: $spacing-xs;
      padding: $spacing-xs $spacing-md;
      border-radius: $radius-full;
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      box-shadow: $shadow-sm;
      pointer-events: none;

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
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: none;
    background: none;
    cursor: pointer;
    padding: $spacing-md;
    font-size: $font-size-sm;
    font-weight: 500;
    transition: all $transition-fast;

    &--edit {
      color: $color-primary;

      &:hover {
        background: rgba(156, 136, 255, 0.08);
      }

      &:active {
        background: rgba(156, 136, 255, 0.15);
      }
    }

    &--delete {
      color: #ee0a24;

      &:hover {
        background: rgba(238, 10, 36, 0.06);
      }

      &:active {
        background: rgba(238, 10, 36, 0.12);
      }
    }
  }
}

// 全屏图片预览
.preview-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;

  .preview-close {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 40px;
    height: 40px;
    border-radius: $radius-full;
    border: none;
    background: rgba(255, 255, 255, 0.15);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 10;
    transition: background 0.15s;

    &:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  }

  .preview-counter {
    position: absolute;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    color: rgba(255, 255, 255, 0.7);
    font-size: $font-size-sm;
    z-index: 10;
    user-select: none;
  }

  .preview-img {
    max-width: 90vw;
    max-height: 85vh;
    object-fit: contain;
    user-select: none;
    border-radius: 4px;
  }

  .preview-nav {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 44px;
    height: 44px;
    border-radius: $radius-full;
    border: none;
    background: rgba(255, 255, 255, 0.15);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 10;
    transition: background 0.15s;

    &:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  }

  .preview-nav-prev {
    left: 16px;
  }

  .preview-nav-next {
    right: 16px;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
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
