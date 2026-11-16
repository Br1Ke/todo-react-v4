/**
 * 让 TodoApp 可以把「当前 State」挂到 window 上，供控制台核对
 * 「页面列表」与「State 数组」是否一致（任务 2 轨道 B 的验证手段）。
 *
 * 这不是业务逻辑，只是调试/验收用的观测口：
 * 如果 UI 是 State 驱动的，那么它打印出来的数组一定与页面渲染结果同源。
 */

import type { Todo } from './types';

declare global {
  interface Window {
    /** 调试用：返回 React 当前持有的 todos（只读视图） */
    __TODO_DEBUG__?: () => readonly Todo[];
  }
}

export {};
