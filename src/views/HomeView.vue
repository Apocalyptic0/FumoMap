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
    <div class="map-search-bar glass-effect" :class="{ 'search-bar--active': showSearchPanel }">
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
      <!-- 角色筛选按钮（搜索面板关闭时显示） -->
      <button
        v-else
        class="filter-btn"
        :class="{ active: filterCharId }"
        @click="onFilterClick"
        title="角色筛选"
      >
        <img
          v-if="filterCharId"
          :src="filterCharAvatar"
          class="filter-btn-avatar"
          alt=""
        />
        <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
        </svg>
      </button>
    </div>

    <!-- 搜索面板（从搜索栏下方开始） -->
    <SearchPanel
      :visible="showSearchPanel"
      :results="searchResults"
      :characters="charactersWithMarks"
      :filter-char-id="filterCharId"
      @close="closeSearchPanel"
      @select="onSearchResultSelect"
      @filter="onFilterChar"
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
import { useRoute } from 'vue-router'
import { DEFAULT_CENTER } from '@/types'
import type { Mark, GeoPosition, Character } from '@/types'
import MapView from '@/components/MapView.vue'
import MarkerPopup from '@/components/MarkerPopup.vue'
import FumoFab from '@/components/FumoFab.vue'
import SearchPanel from '@/components/SearchPanel.vue'
import { useMarkStore } from '@/stores/markStore'
import { useCharacterStore } from '@/stores/characterStore'
import { useGeolocation } from '@/composables/useGeolocation'

const route = useRoute()
const markStore = useMarkStore()
const characterStore = useCharacterStore()
const { position, loading: geoLoading, error: geoError, locate } = useGeolocation()

const mapViewRef = ref<InstanceType<typeof MapView> | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)
const selectedMark = ref<Mark | null>(null)

// 搜索与筛选状态
const searchKeyword = ref('')
const showSearchPanel = ref(false)
const filterCharId = ref<string | null>(null)

// 地图中心：独立于定位坐标，避免 locate() 完成后自动飞回
const displayCenter = ref<GeoPosition>({ ...DEFAULT_CENTER })

// 提供地图中心坐标给子组件（FumoFab 使用）
const mapCenter = ref<GeoPosition>({ ...DEFAULT_CENTER })
provide('mapCenter', mapCenter)

// --- 搜索与过滤逻辑 ---

/** 角色筛选按钮的头像 */
const filterCharAvatar = computed(() => {
  if (!filterCharId.value) return ''
  return characterStore.getCharacterById(filterCharId.value)?.avatarUrl || ''
})

/** 有打卡记录的角色列表（用于筛选条） */
const charactersWithMarks = computed(() => {
  const charIdsWithMarks = new Set<string>()
  markStore.marks.forEach((m) => m.characterIds.forEach((id) => charIdsWithMarks.add(id)))
  return characterStore.characters.filter((c) => charIdsWithMarks.has(c.id))
})

/** 搜索结果：按关键词过滤 */
const searchResults = computed(() => {
  let results = markStore.marks

  // 角色筛选
  if (filterCharId.value) {
    results = results.filter((m) => m.characterIds.includes(filterCharId.value!))
  }

  // 关键词搜索
  const kw = searchKeyword.value.toLowerCase().trim()
  if (kw) {
    results = results.filter((m) => {
      // 地点名匹配
      if (m.locationName.toLowerCase().includes(kw)) return true
      // 描述匹配
      if (m.description.toLowerCase().includes(kw)) return true
      // 标签匹配
      if (m.tags.some((t) => t.toLowerCase().includes(kw))) return true
      // 角色名匹配
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

  // 按时间倒序
  return [...results].sort((a, b) => b.createdAt - a.createdAt)
})

/** 传给 MapView 的标记：受搜索和角色筛选影响 */
const filteredMarks = computed(() => {
  // 当搜索面板打开且有关键词/角色筛选时，只显示匹配的标记
  if (showSearchPanel.value && (searchKeyword.value.trim() || filterCharId.value)) {
    return searchResults.value
  }
  // 角色筛选独立于搜索面板也生效
  if (filterCharId.value && !showSearchPanel.value) {
    return markStore.marks.filter((m) => m.characterIds.includes(filterCharId.value!))
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
  filterCharId.value = null
  searchInputRef.value?.blur()
}

// Esc 键关闭搜索面板
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && showSearchPanel.value) {
    closeSearchPanel()
  }
}

function onSearchResultSelect(mark: Mark) {
  // 关闭面板，选中标记，地图飞到该标记
  showSearchPanel.value = false
  searchKeyword.value = ''
  selectedMark.value = mark
  displayCenter.value = { lat: mark.lat, lng: mark.lng }
  mapViewRef.value?.flyTo({ lat: mark.lat, lng: mark.lng })
}

function onFilterClick() {
  // 切换搜索面板并聚焦
  showSearchPanel.value = !showSearchPanel.value
  if (showSearchPanel.value) {
    setTimeout(() => searchInputRef.value?.focus(), 100)
  }
}

function onFilterChar(charId: string | null) {
  filterCharId.value = charId
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

  &.active {
    border-color: $color-primary;
    background: $color-primary-light;
    color: $color-primary-dark;
  }

  &:hover:not(.active) {
    border-color: $color-primary;
    color: $color-primary;
  }

  .filter-btn-avatar {
    width: 26px;
    height: 26px;
    border-radius: $radius-full;
    object-fit: cover;
  }
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
