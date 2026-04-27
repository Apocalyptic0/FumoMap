import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { watch } from 'vue'
import { useUserStore } from '@/stores/userStore'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/HomeView.vue'),
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { guest: true }, // 已登录云端用户访问时跳转首页
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/RegisterView.vue'),
    meta: { guest: true },
  },
  {
    path: '/create',
    name: 'Create',
    component: () => import('@/views/CreateView.vue'),
  },
  {
    path: '/mark/:id',
    name: 'MarkDetail',
    component: () => import('@/views/MarkDetailView.vue'),
    props: true,
  },
  {
    path: '/explore',
    name: 'Explore',
    component: () => import('@/views/ExploreView.vue'),
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/ProfileView.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 导航守卫：已登录云端用户不可访问 guest 页面（登录/注册）
// 同时等待 authReady，确保 isCloudUser 状态已初始化
router.beforeEach(async (to) => {
  const userStore = useUserStore()
  // 等待认证初始化完成（首次加载时 onAuthStateChange 可能尚未触发）
  if (!userStore.authReady) {
    await new Promise<void>((resolve) => {
      const unwatch = watch(() => userStore.authReady, (ready) => {
        if (ready) {
          unwatch()
          resolve()
        }
      })
      // 超时兜底 3s
      setTimeout(() => {
        unwatch()
        resolve()
      }, 3000)
    })
  }
  if (to.meta.guest && userStore.isCloudUser) {
    return { path: '/' }
  }
})

export default router
