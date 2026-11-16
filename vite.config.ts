import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * 第 11 周：V4.0 React 工程配置。
 * - dev  ：起开发服务器，直接加载 src/main.tsx（Vite 负责 TS → JS、JSX → 渲染调用）
 * - build：先由 npm 脚本跑 tsc --noEmit 做类型检查，再由 vite build 产出 dist/
 * - test ：Vitest 复用同一份配置
 *          · 纯逻辑测试跑在 node 环境（不需要浏览器）
 *          · 组件测试用文件顶部的 `@vitest-environment jsdom` 单独切换环境
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: false,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2022',
  },
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    environment: 'node',
    reporters: 'default',
  },
});
