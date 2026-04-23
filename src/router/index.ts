import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/HomeView.vue'),
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

export default router
