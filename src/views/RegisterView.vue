<template>
  <div class="register-view">
    <div class="auth-card">
      <!-- Logo -->
      <div class="auth-header">
        <h1 class="auth-logo">FumoMap</h1>
        <p class="auth-subtitle">开始你的幻想乡之旅</p>
      </div>

      <!-- 表单 -->
      <form class="auth-form" @submit.prevent="handleRegister">
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
          <span class="field-hint">支持 QQ邮箱 / Gmail / 163邮箱等</span>
        </div>

        <div class="field-group">
          <label class="field-label">密码</label>
          <input
            v-model="password"
            type="password"
            class="field-input"
            placeholder="至少6位密码"
            autocomplete="new-password"
            :disabled="loading"
          />
        </div>

        <div class="field-group">
          <label class="field-label">确认密码</label>
          <input
            v-model="confirmPassword"
            type="password"
            class="field-input"
            placeholder="再次输入密码"
            autocomplete="new-password"
            :disabled="loading"
          />
        </div>

        <div class="field-group">
          <label class="field-label">昵称</label>
          <input
            v-model="nickname"
            type="text"
            class="field-input"
            placeholder="给自己取个名字吧"
            maxlength="20"
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
          <span v-else>创建账号</span>
        </button>
      </form>

      <!-- 底部链接 -->
      <div class="auth-footer">
        <span class="footer-text">已有账号？</span>
        <router-link to="/login" class="footer-link">去登录</router-link>
      </div>
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
const confirmPassword = ref('')
const nickname = ref('')
const loading = ref(false)

const rateLimiter = createRateLimiter(3000)

async function handleRegister() {
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
  if (password.value !== confirmPassword.value) {
    showToast('两次密码输入不一致')
    return
  }
  const trimmedNickname = nickname.value.trim() || 'Fumo旅行者'

  // 节流
  if (!rateLimiter.canProceed()) {
    showToast('操作过于频繁，请稍后再试')
    return
  }

  loading.value = true
  try {
    const result = await userStore.register(email.value.trim(), password.value, trimmedNickname)
    if (result.success) {
      // 如果消息包含"验证邮件"，说明需要邮箱验证，跳转登录页
      if (result.message.includes('验证邮件')) {
        showToast({ message: result.message, type: 'success' })
        router.replace('/login')
      } else {
        showToast({ message: '注册成功', type: 'success' })
        router.replace('/')
      }
    } else {
      showToast(result.message)
    }
  } catch {
    showToast('网络连接失败，请检查网络')
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;
@use '@/styles/auth.scss';

.register-view {
  width: 100%;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(160deg, #FDFBFF 0%, rgba(212, 202, 240, 0.3) 50%, #FDFBFF 100%);
  padding: $spacing-lg;
}
</style>
