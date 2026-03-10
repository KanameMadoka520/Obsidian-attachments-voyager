import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // 【必加】Tauri 要求打包后的文件必须用相对路径引用，不然会出现白屏找不到资源！
  base: './',
  server: {
    port: 5174,
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    exclude: ['.worktrees/**', 'node_modules/**', 'dist/**'],
  }
})
