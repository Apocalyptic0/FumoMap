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
      showToast(result.message)
    }
  } catch {
    showToast('网络连接失败，请检查网络')
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

.login-view {
  width: 100%;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(160deg, #FDFBFF 0%, rgba(212, 202, 240, 0.3) 50%, #FDFBFF 100%);
  padding: $spacing-lg;
}

.auth-card {
  width: 100%;
  max-width: 400px;
  background: $bg-card;
  border-radius: $radius-xl;
  padding: $spacing-xxl;
  box-shadow: $shadow-md;
}

.auth-header {
  text-align: center;
  margin-bottom: $spacing-xl;

  .auth-logo {
    font-size: $font-size-xxl;
    font-weight: 700;
    background: linear-gradient(135deg, $color-primary-dark, $color-primary);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0 0 $spacing-xs;
  }

  .auth-subtitle {
    font-size: $font-size-sm;
    color: $text-tertiary;
    margin: 0;
  }
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;

  .field-label {
    font-size: $font-size-sm;
    font-weight: 600;
    color: $text-secondary;
  }

  .field-input {
    width: 100%;
    height: 44px;
    padding: 0 $spacing-lg;
    border: 1.5px solid $border-color;
    border-radius: $radius-md;
    font-size: $font-size-base;
    color: $text-primary;
    background: $bg-primary;
    outline: none;
    transition: border-color $transition-fast;
    box-sizing: border-box;

    &::placeholder {
      color: $text-placeholder;
    }

    &:focus {
      border-color: $color-primary;
      box-shadow: 0 0 0 3px rgba(184, 169, 232, 0.15);
    }

    &:disabled {
      opacity: 0.6;
    }
  }
}

.auth-btn {
  width: 100%;
  height: 48px;
  border: none;
  border-radius: $radius-md;
  background: linear-gradient(135deg, $color-primary-dark, $color-primary);
  color: white;
  font-size: $font-size-base;
  font-weight: 600;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover:not(:disabled) {
    box-shadow: $shadow-md;
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  &--loading .btn-loading {
    display: inline-block;
    animation: spin 1s linear infinite;
  }
}

.auth-footer {
  text-align: center;
  margin-top: $spacing-lg;

  .footer-text {
    font-size: $font-size-sm;
    color: $text-tertiary;
  }

  .footer-link {
    font-size: $font-size-sm;
    color: $color-primary-dark;
    text-decoration: none;
    font-weight: 500;

    &:hover {
      text-decoration: underline;
    }
  }
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

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
