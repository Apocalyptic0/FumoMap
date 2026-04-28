<template>
  <div class="explore-view">
    <!-- 顶部导航栏 -->
    <div class="explore-header glass-effect">
      <button class="back-btn" @click="goBack">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
      <h1 class="header-title">发现</h1>
      <div class="header-spacer"></div>
    </div>

    <!-- 搜索栏 -->
    <div class="explore-search">
      <div class="search-wrapper">
        <span class="search-icon">🔍</span>
        <input
          class="search-input"
          type="text"
          placeholder="搜索角色、地点或标签..."
          v-model="searchKeyword"
        />
        <button v-if="searchKeyword" class="search-clear" @click="searchKeyword = ''">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>

    <!-- 排序 Tab -->
    <div class="sort-tabs">
      <button
        class="sort-tab"
        :class="{ active: sortMode === 'nearby' }"
        @click="sortMode = 'nearby'"
      >
        附近
      </button>
      <button
        class="sort-tab"
        :class="{ active: sortMode === 'hot' }"
        @click="sortMode = 'hot'"
      >
        热门
      </button>
    </div>

    <!-- 附近页随机探索按钮 -->
    <div v-if="sortMode === 'nearby'" class="nearby-actions">
      <div class="nearby-center-info">
        <span v-if="nearbyCenter" class="nearby-label">
          📍 {{ nearbyCenterLabel }}
        </span>
      </div>
      <button class="random-explore-btn" @click="randomExplore" :disabled="randomLoading">
        <span v-if="randomLoading" class="random-loading">⟳</span>
        <span v-else>🎲</span>
        随机探索
      </button>
    </div>

    <!-- 角色筛选 Chip 横向滚动 -->
    <div class="char-filter-bar" v-if="charactersWithMarks.length > 0">
      <div class="char-filter-scroll">
        <button
          class="char-chip"
          :class="{ active: selectedCharId === '' }"
          @click="selectedCharId = ''"
        >
          全部
        </button>
        <button
          v-for="char in charactersWithMarks"
          :key="char.id"
          class="char-chip"
          :class="{ active: selectedCharId === char.id }"
          @click="selectedCharId = selectedCharId === char.id ? '' : char.id"
        >
          <img :src="char.avatarUrl" :alt="char.name" class="chip-avatar" />
          <span>{{ char.name }}</span>
        </button>
      </div>
    </div>

    <!-- 打卡列表 -->
    <div class="explore-list">
      <div v-if="loading" class="explore-loading">
        <span class="loading-spinner">⟳</span>
        <span>加载中...</span>
      </div>

      <template v-else-if="filteredMarks.length > 0">
        <MarkCard
          v-for="mark in filteredMarks"
          :key="mark.id"
          :mark="mark"
          @click="goToDetail(mark)"
        />
      </template>

      <div v-else class="explore-empty">
        <span class="empty-icon">🔍</span>
        <p class="empty-text">
          {{ searchKeyword || selectedCharId ? '没有找到匹配的打卡' : '暂无打卡记录' }}
        </p>
        <button
          v-if="searchKeyword || selectedCharId"
          class="empty-clear-btn"
          @click="searchKeyword = ''; selectedCharId = ''"
        >
          清除筛选
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { Mark, GeoPosition } from '@/types'
import MarkCard from '@/components/MarkCard.vue'
import { useMarkStore } from '@/stores/markStore'
import { useUserStore } from '@/stores/userStore'
import { useMarkFilter } from '@/composables/useMarkFilter'
import { useGeolocation } from '@/composables/useGeolocation'
import { haversineDistance } from '@/utils/geo'

const router = useRouter()
const markStore = useMarkStore()
const userStore = useUserStore()
const { position, isDefault: isGeoDefault, locate } = useGeolocation()

const sortMode = ref<'nearby' | 'hot'>('nearby')
const searchKeyword = ref('')
const debouncedKeyword = ref('')
const selectedCharId = ref('')
const randomLoading = ref(false)

/** 附近页的中心坐标（可被随机探索切换） */
const nearbyCenter = ref<GeoPosition | null>(null)

/** 附近页搜索半径（千米） */
const NEARBY_RADIUS_KM = 50

/** 热门页最大条数 */
const HOT_LIMIT = 50

/** 附近页最大条数 */
const NEARBY_LIMIT = 20

// 防抖：搜索输入 300ms 后才更新过滤
let debounceTimer: ReturnType<typeof setTimeout> | null = null
watch(searchKeyword, (val) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debouncedKeyword.value = val
  }, 300)
})

const { charactersWithMarks, filterByKeyword } = useMarkFilter(debouncedKeyword)

const loading = computed(() => markStore.loading)

/** 附近中心点标签 */
const nearbyCenterLabel = computed(() => {
  if (!nearbyCenter.value) return ''
  if (!isGeoDefault.value && nearbyCenter.value === position.value) {
    return '你的位置附近'
  }
  return '随机位置附近'
})

/** 搜索 + 角色筛选 + 排序后的列表 */
const filteredMarks = computed(() => {
  let results = markStore.visibleMarks

  // 角色筛选
  if (selectedCharId.value) {
    results = results.filter((m) => m.characterIds.includes(selectedCharId.value))
  }

  // 关键词搜索
  results = filterByKeyword(results)

  // 排序
  if (sortMode.value === 'hot') {
    return [...results]
      .sort((a, b) => b.likeCount - a.likeCount || b.createdAt - a.createdAt)
      .slice(0, HOT_LIMIT)
  }

  // 附近模式
  const center = nearbyCenter.value
  if (!center) return []

  return [...results]
    .map((m) => ({
      mark: m,
      distance: haversineDistance(center, { lat: m.lat, lng: m.lng }),
    }))
    .filter((item) => item.distance <= NEARBY_RADIUS_KM)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, NEARBY_LIMIT)
    .map((item) => item.mark)
})

/**
 * 随机探索：从所有打卡中随机选一个坐标作为附近中心
 */
function randomExplore() {
  const marks = markStore.visibleMarks
  if (marks.length === 0) return

  randomLoading.value = true
  const randomMark = marks[Math.floor(Math.random() * marks.length)]
  nearbyCenter.value = { lat: randomMark.lat, lng: randomMark.lng }

  // 短暂加载动画
  setTimeout(() => {
    randomLoading.value = false
  }, 300)
}

function goBack() {
  router.back()
}

function goToDetail(mark: Mark) {
  router.push({ name: 'MarkDetail', params: { id: mark.id } })
}

onMounted(async () => {
  // 如果 marks 为空（直接访问 /explore），主动拉取
  if (markStore.visibleMarks.length === 0) {
    markStore.fetchPublicMarks()
    if (userStore.isCloudUser) {
      markStore.fetchMyMarks()
    }
  }

  // 初始化附近中心坐标
  await locate()
  if (!isGeoDefault.value) {
    // 有真实定位，使用用户位置
    nearbyCenter.value = { ...position.value }
  } else {
    // 无定位，随机选一个打卡坐标
    randomExplore()
  }
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.explore-view {
  min-height: 100vh;
  background: $bg-primary;
  display: flex;
  flex-direction: column;
}

// --- 顶部导航 ---
.explore-header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  padding: calc(env(safe-area-inset-top, 0px) + 12px) $spacing-lg $spacing-md;
  background: $bg-overlay;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);

  .back-btn {
    width: 36px;
    height: 36px;
    border-radius: $radius-full;
    border: 1.5px solid $border-color;
    background: $bg-card;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: $text-primary;
    transition: all $transition-fast;
    flex-shrink: 0;

    &:active {
      transform: scale(0.9);
    }

    &:hover {
      border-color: $color-primary;
      color: $color-primary;
    }
  }

  .header-title {
    flex: 1;
    text-align: center;
    font-size: $font-size-lg;
    font-weight: 600;
    color: $text-primary;
    margin: 0;
  }

  .header-spacer {
    width: 36px;
    flex-shrink: 0;
  }
}

// --- 搜索栏 ---
.explore-search {
  padding: 0 $spacing-lg $spacing-md;

  .search-wrapper {
    position: relative;
  }

  .search-input {
    width: 100%;
    height: 40px;
    border-radius: $radius-xl;
    border: 1.5px solid $border-color;
    background: $bg-card;
    padding: 0 $spacing-lg 0 36px;
    font-size: $font-size-sm;
    color: $text-primary;
    outline: none;
    transition: border-color $transition-fast;
    box-sizing: border-box;

    &::placeholder {
      color: $text-placeholder;
    }

    &:focus {
      border-color: $color-primary;
    }
  }

  .search-icon {
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: $text-tertiary;
    font-size: 16px;
    pointer-events: none;
  }

  .search-clear {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    width: 22px;
    height: 22px;
    border-radius: $radius-full;
    border: none;
    background: $border-color;
    color: $text-tertiary;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;

    &:hover {
      background: $border-color-light;
      color: $text-secondary;
    }
  }
}

// --- 排序 Tab ---
.sort-tabs {
  display: flex;
  gap: $spacing-sm;
  padding: 0 $spacing-lg $spacing-md;

  .sort-tab {
    flex: 1;
    height: 36px;
    border-radius: $radius-full;
    border: 1.5px solid $border-color;
    background: $bg-card;
    font-size: $font-size-sm;
    font-weight: 500;
    color: $text-secondary;
    cursor: pointer;
    transition: all $transition-fast;

    &.active {
      border-color: $color-primary;
      background: $color-primary-light;
      color: $color-primary-dark;
      font-weight: 600;
    }

    &:hover:not(.active) {
      border-color: $color-primary;
    }

    &:active {
      transform: scale(0.97);
    }
  }
}

// --- 附近页操作区 ---
.nearby-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 $spacing-lg $spacing-md;
  gap: $spacing-sm;

  .nearby-center-info {
    flex: 1;
    min-width: 0;

    .nearby-label {
      font-size: $font-size-xs;
      color: $text-tertiary;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .random-explore-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 6px 14px;
    border-radius: $radius-full;
    border: 1.5px solid $color-primary;
    background: $color-primary-light;
    color: $color-primary-dark;
    font-size: $font-size-xs;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: all $transition-fast;
    flex-shrink: 0;

    &:active {
      transform: scale(0.95);
    }

    &:hover {
      box-shadow: $shadow-sm;
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .random-loading {
      animation: spin 1s linear infinite;
      display: inline-block;
    }
  }
}

// --- 角色筛选 Chip ---
.char-filter-bar {
  padding: 0 0 $spacing-md;

  .char-filter-scroll {
    display: flex;
    gap: $spacing-sm;
    padding: 0 $spacing-lg;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  .char-chip {
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
    flex-shrink: 0;
    transition: all $transition-fast;

    .chip-avatar {
      width: 20px;
      height: 20px;
      border-radius: $radius-full;
      object-fit: cover;
    }

    &.active {
      border-color: $color-primary;
      background: $color-primary-light;
      color: $color-primary-dark;
      font-weight: 600;
    }

    &:hover:not(.active) {
      border-color: $color-primary;
    }

    &:active {
      transform: scale(0.95);
    }
  }
}

// --- 打卡列表 ---
.explore-list {
  flex: 1;
  padding: 0 $spacing-lg $spacing-xl;
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

// --- 加载状态 ---
.explore-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-xxl 0;
  color: $text-tertiary;
  font-size: $font-size-sm;

  .loading-spinner {
    font-size: 24px;
    animation: spin 1s linear infinite;
    display: inline-block;
  }
}

// --- 空状态 ---
.explore-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-xxl 0;

  .empty-icon {
    font-size: 48px;
    opacity: 0.3;
  }

  .empty-text {
    font-size: $font-size-sm;
    color: $text-tertiary;
    margin: 0;
  }

  .empty-clear-btn {
    margin-top: $spacing-sm;
    padding: $spacing-sm $spacing-lg;
    border-radius: $radius-full;
    border: 1.5px solid $color-primary;
    background: $color-primary-light;
    color: $color-primary-dark;
    font-size: $font-size-sm;
    font-weight: 500;
    cursor: pointer;
    transition: all $transition-fast;

    &:active {
      transform: scale(0.95);
    }
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
