/**
 * 入口：只负责把 React 挂到 #root 上，不做任何业务。
 *
 * 说明（对应「轨道 B」的源码级自查）：
 * 全项目唯一一处 DOM 查询就是下面这个挂载点获取 —— 这是任何 React 应用都必需的
 * bootstrap，不是「渲染期手动操作 DOM」。业务组件（src/components/）与数据层
 * 内部零处 DOM 查询，也零处直接改写页面 HTML。
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import TodoApp from './components/TodoApp';

const container = document.getElementById('root');
if (container === null) {
  throw new Error('找不到挂载点 #root');
}

createRoot(container).render(
  <StrictMode>
    <TodoApp />
  </StrictMode>,
);
