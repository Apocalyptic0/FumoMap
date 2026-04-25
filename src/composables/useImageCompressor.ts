import { ref } from 'vue'
import imageCompression from 'browser-image-compression'

interface CompressOptions {
  maxSizeMB?: number
  maxWidthOrHeight?: number
}

/**
 * 压缩结果：同时包含 File 对象（用于上传）和 base64（用于本地预览/localStorage）
 */
export interface CompressResult {
  file: File        // 压缩后的 File 对象，可直接上传到 Supabase Storage
  base64: string    // data URI，用于本地展示
}

export function useImageCompressor(options?: CompressOptions) {
  const compressing = ref(false)
  const progress = ref(0)
  const error = ref<string | null>(null)

  const defaultOptions = {
    maxSizeMB: options?.maxSizeMB ?? 0.3,
    maxWidthOrHeight: options?.maxWidthOrHeight ?? 1200,
    fileType: 'image/webp' as const,
  }

  /**
   * 压缩图片文件，返回压缩后的 File + base64
   */
  async function compress(file: File): Promise<CompressResult | null> {
    compressing.value = true
    progress.value = 0
    error.value = null

    try {
      const compressed = await imageCompression(file, {
        ...defaultOptions,
        useWebWorker: true,
        onProgress: (p: number) => {
          progress.value = p
        },
      })

      // 转为 base64（用于本地预览）
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(new Error('读取压缩图片失败'))
        reader.readAsDataURL(compressed)
      })

      compressing.value = false
      progress.value = 100
      return { file: compressed, base64 }
    } catch (e) {
      compressing.value = false
      error.value = '图片压缩失败，请重试'
      console.error('[ImageCompressor]', e)
      return null
    }
  }

  /**
   * 压缩图片文件并转为 base64（兼容 P0 调用方式）
   */
  async function compressToBase64(file: File): Promise<string | null> {
    const result = await compress(file)
    return result?.base64 ?? null
  }

  /**
   * 批量压缩图片
   */
  async function compressMultiple(files: File[]): Promise<CompressResult[]> {
    const results: CompressResult[] = []
    for (const file of files) {
      const result = await compress(file)
      if (result) {
        results.push(result)
      }
    }
    return results
  }

  return {
    compressing,
    progress,
    error,
    compress,
    compressToBase64,
    compressMultiple,
  }
}
