import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: './',
  // 关闭 ESLint 检查
  server: {
    hmr: {
      overlay: false
    }
  },
  build: {
    rollupOptions: {
      // 禁用 ESLint 插件
      plugins: []
    }
  }
})
