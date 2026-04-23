<template>
  <div class="home-view">
    <!-- 地图 -->
    <MapView
      ref="mapViewRef"
      :center="displayCenter"
      :marks="filteredMarks"
      :get-character="characterStore.getCharacterById"
      :show-location-marker="true"
      @marker-click="onMarkerClick"
      @map-move="onMapMove"
    />

    <!-- 顶部搜索栏（z-index 高于搜索面板） -->
    <div class="map-search-bar glass-effect">
      <!-- 用户头像入口 -->
      <button class="profile-btn" @click="goToProfile" title="个人主页">
        <img :src="userStore.currentUser.avatarUrl" class="profile-avatar" alt="我的头像" />
      </button>

      <div class="search-wrapper">
        <span class="search-icon">🔍</span>
        <input
          ref="searchInputRef"
          class="search-input"
          type="text"
          placeholder="搜索角色或地点..."
          v-model="searchKeyword"
          @focus="onSearchFocus"
          @input="onSearchInput"
        />
        <button v-if="searchKeyword" class="search-clear" @click="clearSearch">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <!-- 取消按钮（搜索面板打开时显示） -->
      <button v-if="showSearchPanel" class="cancel-btn" @click="closeSearchPanel">
        取消
      </button>
      <!-- 角色筛选按钮 -->
      <button
        v-else
        class="filter-btn"
        :class="{ active: filterCharIds.length > 0, 'filter-open': showFilterPanel }"
        @click="toggleFilterPanel"
        title="角色筛选"
      >
        <span v-if="filterCharIds.length > 0" class="filter-badge">{{ filterCharIds.length }}</span>
        <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
        </svg>
      </button>
    </div>

    <!-- 角色筛选下拉面板（独立于搜索面板） -->
    <transition name="filter-drop">
      <div v-if="showFilterPanel" class="filter-panel glass-effect">
        <div class="filter-panel-header">
          <span class="filter-panel-title">按角色筛选</span>
          <button v-if="filterCharIds.length > 0" class="filter-clear-btn" @click="clearFilter">
            清除筛选
          </button>
        </div>
        <div class="filter-chip-list">
          <button
            v-for="char in charactersWithMarks"
            :key="char.id"
            class="filter-chip"
            :class="{ active: filterCharIds.includes(char.id) }"
            @click="toggleCharFilter(char.id)"
          >
            <img :src="char.avatarUrl" :alt="char.name" class="chip-avatar" />
            <span>{{ char.name }}</span>
            <svg v-if="filterCharIds.includes(char.id)" class="chip-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </button>
        </div>
      </div>
    </transition>

    <!-- 筛选面板遮罩 -->
    <transition name="fade">
      <div v-if="showFilterPanel" class="filter-overlay" @click="showFilterPanel = false"></div>
    </transition>

    <!-- 搜索面板（从搜索栏下方开始） -->
    <SearchPanel
      :visible="showSearchPanel"
      :results="searchResults"
      @close="closeSearchPanel"
      @select="onSearchResultSelect"
    />

    <!-- 标记信息弹窗 -->
    <MarkerPopup :mark="selectedMark" />

    <!-- 右下角按钮组 -->
    <div class="map-actions">
      <button class="locate-btn" @click="handleLocate" :disabled="geoLoading">
        <span v-if="geoLoading" class="locate-loading">⟳</span>
        <span v-else>📍</span>
      </button>
      <FumoFab />
    </div>

    <!-- 定位提示 -->
    <transition name="fade">
      <div v-if="geoError" class="geo-toast glass-effect" @click="geoError = null">
        {{ geoError }}
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, provide, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { DEFAULT_CENTER } from '@/types'
import type { Mark, GeoPosition } from '@/types'
import MapView from '@/components/MapView.vue'
import MarkerPopup from '@/components/MarkerPopup.vue'
import FumoFab from '@/components/FumoFab.vue'
import SearchPanel from '@/components/SearchPanel.vue'
import { useMarkStore } from '@/stores/markStore'
import { useCharacterStore } from '@/stores/characterStore'
import { useUserStore } from '@/stores/userStore'
import { useGeolocation } from '@/composables/useGeolocation'

const route = useRoute()
const router = useRouter()
const markStore = useMarkStore()
const characterStore = useCharacterStore()
const userStore = useUserStore()
const { position, loading: geoLoading, error: geoError, locate } = useGeolocation()

const mapViewRef = ref<InstanceType<typeof MapView> | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)
const selectedMark = ref<Mark | null>(null)

// 搜索与筛选状态
const searchKeyword = ref('')
const showSearchPanel = ref(false)
const showFilterPanel = ref(false)
const filterCharIds = ref<string[]>([])

// 地图中心：独立于定位坐标，避免 locate() 完成后自动飞回
const displayCenter = ref<GeoPosition>({ ...DEFAULT_CENTER })

// 提供地图中心坐标给子组件（FumoFab 使用）
const mapCenter = ref<GeoPosition>({ ...DEFAULT_CENTER })
provide('mapCenter', mapCenter)

// --- 搜索与过滤逻辑 ---

/** 有打卡记录的角色列表（用于筛选面板） */
const charactersWithMarks = computed(() => {
  const charIdsWithMarks = new Set<string>()
  markStore.marks.forEach((m) => m.characterIds.forEach((id) => charIdsWithMarks.add(id)))
  return characterStore.characters.filter((c) => charIdsWithMarks.has(c.id))
})

/** 搜索结果：按关键词过滤 */
const searchResults = computed(() => {
  let results = markStore.marks

  // 关键词搜索
  const kw = searchKeyword.value.toLowerCase().trim()
  if (kw) {
    results = results.filter((m) => {
      if (m.locationName.toLowerCase().includes(kw)) return true
      if (m.description.toLowerCase().includes(kw)) return true
      if (m.tags.some((t) => t.toLowerCase().includes(kw))) return true
      return m.characterIds.some((id) => {
        const char = characterStore.getCharacterById(id)
        return (
          char &&
          (char.name.toLowerCase().includes(kw) ||
            char.nameEn.toLowerCase().includes(kw))
        )
      })
    })
  }

  return [...results].sort((a, b) => b.createdAt - a.createdAt)
})

/** 传给 MapView 的标记：受角色筛选影响 */
const filteredMarks = computed(() => {
  if (filterCharIds.value.length > 0) {
    return markStore.marks.filter((m) =>
      m.characterIds.some((id) => filterCharIds.value.includes(id))
    )
  }
  return markStore.marks
})

function onSearchFocus() {
  showSearchPanel.value = true
}

function onSearchInput() {
  if (!showSearchPanel.value && searchKeyword.value.trim()) {
    showSearchPanel.value = true
  }
}

function clearSearch() {
  searchKeyword.value = ''
  searchInputRef.value?.focus()
}

function closeSearchPanel() {
  showSearchPanel.value = false
  searchKeyword.value = ''
  searchInputRef.value?.blur()
}

// Esc 键关闭面板
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (showSearchPanel.value) closeSearchPanel()
    if (showFilterPanel.value) showFilterPanel.value = false
  }
}

function onSearchResultSelect(mark: Mark) {
  showSearchPanel.value = false
  searchKeyword.value = ''
  selectedMark.value = mark
  displayCenter.value = { lat: mark.lat, lng: mark.lng }
  mapViewRef.value?.flyTo({ lat: mark.lat, lng: mark.lng })
}

function toggleFilterPanel() {
  showFilterPanel.value = !showFilterPanel.value
}

function toggleCharFilter(charId: string) {
  const idx = filterCharIds.value.indexOf(charId)
  if (idx >= 0) {
    filterCharIds.value.splice(idx, 1)
  } else {
    filterCharIds.value.push(charId)
  }
}

function clearFilter() {
  filterCharIds.value = []
}

function goToProfile() {
  router.push('/profile')
}

// --- 地图交互 ---

function onMarkerClick(mark: Mark) {
  selectedMark.value = selectedMark.value?.id === mark.id ? null : mark
}

function onMapMove(center: GeoPosition) {
  mapCenter.value = center
}

async function handleLocate() {
  const pos = await locate()
  displayCenter.value = pos
  mapViewRef.value?.flyTo(pos)
}

// 当 position 更新时（定位成功），更新蓝点但不移动地图
watch(position, (newPos) => {
  mapViewRef.value?.updateLocationMarker(newPos)
})

onMounted(async () => {
  const queryLat = Number(route.query.lat)
  const queryLng = Number(route.query.lng)
  if (queryLat && queryLng) {
    // 从详情页返回：地图直接定位到标记坐标，不做动画
    displayCenter.value = { lat: queryLat, lng: queryLng }
    // 静默获取当前位置用于蓝点（不影响地图中心）
    locate()
  } else {
    const pos = await locate()
    displayCenter.value = pos
  }

  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
})
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;
@use '@/styles/map.scss' as *;

.home-view {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.search-wrapper {
  position: relative;
  flex: 1;
}

// 用户头像入口
.profile-btn {
  width: 36px;
  height: 36px;
  border-radius: $radius-full;
  border: 2px solid $color-primary-light;
  background: $bg-card;
  padding: 0;
  cursor: pointer;
  flex-shrink: 0;
  overflow: hidden;
  transition: all $transition-fast;

  .profile-avatar {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: $radius-full;
  }

  &:active {
    transform: scale(0.9);
  }

  &:hover {
    border-color: $color-primary;
    box-shadow: $shadow-sm;
  }
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

// 取消按钮
.cancel-btn {
  border: none;
  background: none;
  color: $color-primary;
  font-size: $font-size-sm;
  font-weight: 500;
  cursor: pointer;
  padding: $spacing-xs $spacing-sm;
  flex-shrink: 0;
  white-space: nowrap;

  &:hover {
    opacity: 0.8;
  }

  &:active {
    opacity: 0.6;
  }
}

// 角色筛选按钮
.filter-btn {
  width: 40px;
  height: 40px;
  border-radius: $radius-full;
  border: 1.5px solid $border-color;
  background: $bg-card;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  color: $text-tertiary;
  transition: all $transition-fast;
  position: relative;

  &.active {
    border-color: $color-primary;
    background: $color-primary-light;
    color: $color-primary-dark;
  }

  &.filter-open {
    border-color: $color-primary;
    color: $color-primary;
  }

  &:hover:not(.active) {
    border-color: $color-primary;
    color: $color-primary;
  }

  .filter-badge {
    font-size: 13px;
    font-weight: 700;
    color: $color-primary-dark;
  }
}

// 角色筛选下拉面板
.filter-panel {
  position: absolute;
  top: calc(env(safe-area-inset-top, 0px) + 64px);
  right: $spacing-lg;
  z-index: 1200;
  width: 280px;
  max-height: 360px;
  border-radius: $radius-lg;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .filter-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: $spacing-md $spacing-lg;
    border-bottom: 1px solid $divider-color;

    .filter-panel-title {
      font-size: $font-size-sm;
      font-weight: 600;
      color: $text-primary;
    }

    .filter-clear-btn {
      border: none;
      background: none;
      color: $color-primary;
      font-size: $font-size-xs;
      cursor: pointer;
      padding: 2px 4px;

      &:hover {
        text-decoration: underline;
      }
    }
  }

  .filter-chip-list {
    flex: 1;
    overflow-y: auto;
    padding: $spacing-sm;
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-xs;
    align-content: flex-start;

    .filter-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 6px 10px;
      border-radius: $radius-full;
      border: 1.5px solid $border-color;
      background: $bg-card;
      font-size: $font-size-xs;
      color: $text-secondary;
      cursor: pointer;
      white-space: nowrap;
      transition: all $transition-fast;

      .chip-avatar {
        width: 20px;
        height: 20px;
        border-radius: $radius-full;
        object-fit: cover;
      }

      .chip-check {
        color: $color-primary-dark;
        flex-shrink: 0;
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
}

// 筛选面板遮罩
.filter-overlay {
  position: absolute;
  inset: 0;
  z-index: 1150;
  background: transparent;
}

// 筛选面板动画
.filter-drop-enter-active {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.filter-drop-leave-active {
  transition: transform 0.15s ease, opacity 0.15s ease;
}
.filter-drop-enter-from {
  transform: translateY(-8px);
  opacity: 0;
}
.filter-drop-leave-to {
  transform: translateY(-8px);
  opacity: 0;
}

.locate-loading {
  animation: spin 1s linear infinite;
  display: inline-block;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.geo-toast {
  position: absolute;
  top: 80px;
  left: $spacing-lg;
  right: $spacing-lg;
  z-index: 1001;
  text-align: center;
  padding: $spacing-sm $spacing-md;
  border-radius: $radius-md;
  font-size: $font-size-sm;
  color: $text-secondary;
  cursor: pointer;
}

// 搜索栏布局微调：加 flex 布局让筛选按钮在同一行
:deep(.map-search-bar) {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  z-index: 1100;
}
</style>
