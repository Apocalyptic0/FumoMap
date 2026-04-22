<template>
  <div class="image-carousel">
    <van-swipe :autoplay="0" :show-indicators="images.length > 1" indicator-color="#B8A9E8">
      <van-swipe-item v-for="(img, index) in images" :key="index">
        <img :src="img" class="carousel-image" alt="打卡图片" />
      </van-swipe-item>

      <!-- 无图片时的占位 -->
      <van-swipe-item v-if="images.length === 0">
        <div class="carousel-placeholder">
          <span class="placeholder-icon">📷</span>
          <span class="placeholder-text">暂无图片</span>
        </div>
      </van-swipe-item>
    </van-swipe>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  images: string[]
}>()
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.image-carousel {
  width: 100%;
  height: 45vh;
  background: $border-color-light;

  :deep(.van-swipe) {
    width: 100%;
    height: 100%;
  }

  :deep(.van-swipe-item) {
    width: 100%;
    height: 100%;
  }

  .carousel-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .carousel-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: $spacing-sm;
    background: $border-color-light;

    .placeholder-icon {
      font-size: 48px;
      opacity: 0.5;
    }

    .placeholder-text {
      font-size: $font-size-sm;
      color: $text-tertiary;
    }
  }
}
</style>
