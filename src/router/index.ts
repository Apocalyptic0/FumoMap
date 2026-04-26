import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
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
router.beforeEach((to) => {
  if (to.meta.guest) {
    const userStore = useUserStore()
    if (userStore.isCloudUser) {
      return { path: '/' }
    }
  }
})

export default router
