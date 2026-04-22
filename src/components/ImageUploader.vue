<template>
  <div class="image-uploader">
    <div class="upload-grid">
      <!-- 已上传图片 -->
      <div
        v-for="(img, index) in images"
        :key="index"
        class="upload-item"
      >
        <img :src="img" class="upload-preview" alt="已上传图片" />
        <button class="upload-delete" @click="removeImage(index)">×</button>
      </div>

      <!-- 上传占位符 -->
      <div
        v-if="images.length < maxCount"
        class="upload-placeholder"
        @click="triggerUpload"
      >
        <div v-if="compressing" class="upload-loading">
          <van-loading size="24" color="#B8A9E8" />
          <span class="upload-progress">{{ progress }}%</span>
        </div>
        <template v-else>
          <span class="upload-icon">+</span>
          <span class="upload-text">添加图片</span>
        </template>
      </div>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      multiple
      class="upload-hidden-input"
      @change="handleFileChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useImageCompressor } from '@/composables/useImageCompressor'

const props = withDefaults(
  defineProps<{
    modelValue: string[]
    maxCount?: number
  }>(),
  {
    maxCount: 3,
  }
)

const emit = defineEmits<{
  'update:modelValue': [images: string[]]
}>()

const images = ref<string[]>([...props.modelValue])
const fileInput = ref<HTMLInputElement | null>(null)
const { compressing, progress, compressToBase64 } = useImageCompressor()

function triggerUpload() {
  fileInput.value?.click()
}

async function handleFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files) return

  const remaining = props.maxCount - images.value.length
  const files = Array.from(input.files).slice(0, remaining)

  for (const file of files) {
    const base64 = await compressToBase64(file)
    if (base64) {
      images.value.push(base64)
    }
  }

  emit('update:modelValue', [...images.value])
  // 重置 input，允许重复选择同一文件
  input.value = ''
}

function removeImage(index: number) {
  images.value.splice(index, 1)
  emit('update:modelValue', [...images.value])
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.image-uploader {
  .upload-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: $spacing-sm;
  }

  .upload-item {
    position: relative;
    aspect-ratio: 1;
    border-radius: $radius-md;
    overflow: hidden;

    .upload-preview {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .upload-delete {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 22px;
      height: 22px;
      border-radius: $radius-full;
      border: none;
      background: rgba(0, 0, 0, 0.5);
      color: white;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      line-height: 1;
    }
  }

  .upload-placeholder {
    aspect-ratio: 1;
    border-radius: $radius-md;
    border: 2px dashed $border-color;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    cursor: pointer;
    transition: all $transition-fast;
    background: $bg-primary;

    &:active {
      border-color: $color-primary;
      background: $color-primary-light;
    }

    .upload-icon {
      font-size: 28px;
      color: $text-tertiary;
      line-height: 1;
    }

    .upload-text {
      font-size: $font-size-xs;
      color: $text-tertiary;
    }

    .upload-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;

      .upload-progress {
        font-size: $font-size-xs;
        color: $color-primary;
      }
    }
  }

  .upload-hidden-input {
    display: none;
  }
}
</style>
