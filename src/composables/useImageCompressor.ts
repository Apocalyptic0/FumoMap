import { ref } from 'vue'
import imageCompression from 'browser-image-compression'

interface CompressOptions {
  maxSizeMB?: number
  maxWidthOrHeight?: number
}

export function useImageCompressor(options?: CompressOptions) {
  const compressing = ref(false)
  const progress = ref(0)
  const error = ref<string | null>(null)

  const defaultOptions = {
    maxSizeMB: options?.maxSizeMB ?? 0.3,
    maxWidthOrHeight: options?.maxWidthOrHeight ?? 800,
  }

  /**
   * 压缩图片文件并转为 base64
   */
  async function compressToBase64(file: File): Promise<string | null> {
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

      // 转为 base64
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          compressing.value = false
          progress.value = 100
          resolve(reader.result as string)
        }
        reader.onerror = () => {
          reject(new Error('读取压缩图片失败'))
        }
        reader.readAsDataURL(compressed)
      })
    } catch (e) {
      compressing.value = false
      error.value = '图片压缩失败，请重试'
      console.error('[ImageCompressor]', e)
      return null
    }
  }

  /**
   * 批量压缩图片
   */
  async function compressMultiple(files: File[]): Promise<string[]> {
    const results: string[] = []
    for (const file of files) {
      const base64 = await compressToBase64(file)
      if (base64) {
        results.push(base64)
      }
    }
    return results
  }

  return {
    compressing,
    progress,
    error,
    compressToBase64,
    compressMultiple,
  }
}
