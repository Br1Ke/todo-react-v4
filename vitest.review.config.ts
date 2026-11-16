import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * 「审查 AI 修复」专用配置 —— 故意与主测试分开。
 *
 * 原因：这个配置文件里跑的是**对照组实验**，它预期会红：
 *   同一组业务断言，喂给「AI 首版修复」是红的，喂给 V3.0 的纯函数是绿的。
 * 所以它不能混进 `npm run test`（Track A 必须是全绿），要单独跑：
 *   npx vitest run --config vitest.review.config.ts
 */
export default defineConfig({
  plugins: [react()],
  test: {
    include: ['review/**/*.test.{ts,tsx}'],
    environment: 'node',
    reporters: 'default',
  },
});
