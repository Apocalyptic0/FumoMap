<template>
  <div class="login-view">
    <div class="auth-card">
      <!-- Logo -->
      <div class="auth-header">
        <h1 class="auth-logo">FumoMap</h1>
        <p class="auth-subtitle">欢迎回来</p>
      </div>

      <!-- 表单 -->
      <form class="auth-form" @submit.prevent="handleLogin">
        <div class="field-group">
          <label class="field-label">邮箱</label>
          <input
            v-model="email"
            type="email"
            class="field-input"
            placeholder="请输入邮箱"
            autocomplete="email"
            :disabled="loading"
          />
        </div>

        <div class="field-group">
          <label class="field-label">密码</label>
          <input
            v-model="password"
            type="password"
            class="field-input"
            placeholder="请输入密码"
            autocomplete="current-password"
            :disabled="loading"
          />
        </div>

        <button
          type="submit"
          class="auth-btn"
          :class="{ 'auth-btn--loading': loading }"
          :disabled="loading"
        >
          <span v-if="loading" class="btn-loading">⟳</span>
          <span v-else>登录</span>
        </button>
      </form>

      <!-- 底部链接 -->
      <div class="auth-footer">
        <span class="footer-text">没有账号？</span>
        <router-link to="/register" class="footer-link">去注册</router-link>
      </div>

      <!-- 跳过登录（本地模式） -->
      <button class="skip-btn" @click="skipLogin">
        暂不登录，使用本地模式
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useUserStore } from '@/stores/userStore'
import { validateEmail, validatePassword, createRateLimiter } from '@/utils/security'

const router = useRouter()
const userStore = useUserStore()

const email = ref('')
const password = ref('')
const loading = ref(false)

const rateLimiter = createRateLimiter(3000)

async function handleLogin() {
  // 前端校验
  const emailCheck = validateEmail(email.value)
  if (!emailCheck.valid) {
    showToast(emailCheck.message)
    return
  }
  const passCheck = validatePassword(password.value)
  if (!passCheck.valid) {
    showToast(passCheck.message)
    return
  }

  // 节流
  if (!rateLimiter.canProceed()) {
    showToast('操作过于频繁，请稍后再试')
    return
  }

  loading.value = true
  try {
    const result = await userStore.login(email.value.trim(), password.value)
    if (result.success) {
      showToast({ message: '登录成功', type: 'success' })
      router.replace('/')
    } else {
      showToast(result.message || '登录失败')
    }
  } catch (e: any) {
    console.error('[LoginView] 登录异常:', e)
    showToast(e?.message || '网络连接失败，请检查网络')
  } finally {
    loading.value = false
  }
}

function skipLogin() {
  router.replace('/')
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;
@use '@/styles/auth.scss';

.login-view {
  width: 100%;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(160deg, #FDFBFF 0%, rgba(212, 202, 240, 0.3) 50%, #FDFBFF 100%);
  padding: $spacing-lg;
}

.auth-form {
  gap: $spacing-lg;
}

.auth-btn {
  margin-top: 0;
}

.skip-btn {
  display: block;
  width: 100%;
  margin-top: $spacing-md;
  padding: $spacing-sm 0;
  border: none;
  background: none;
  color: $text-tertiary;
  font-size: $font-size-xs;
  cursor: pointer;
  transition: color $transition-fast;

  &:hover {
    color: $text-secondary;
  }
}
</style>
