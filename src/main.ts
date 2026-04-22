import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'

// 全局样式
import './styles/global.scss'

// Leaflet CSS
import 'leaflet/dist/leaflet.css'

// Vant 基础样式（按需引入组件的样式会自动加载）
import 'vant/lib/index.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
