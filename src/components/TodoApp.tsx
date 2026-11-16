/**
 * TodoApp —— 唯一持有 State 的组件（容器组件 / container）。
 *
 * 职责边界：
 *   1. 用 useState 持有 todos 与 filter；
 *   2. 所有增删改都调用 src/todo.ts 里的纯函数，再 setState —— 绝不原地改数组或对象；
 *   3. 用 useEffect 把 State 同步到 localStorage（取代 V3.0 里「改完 DOM 再手动刷新」）；
 *   4. 把「数据」向下传给 TodoList，把「回调」向下传给 TodoForm / TodoList（事件向上传）。
 */

import { useEffect, useState } from 'react';
import type { Filter, Todo } from '../types';
import { addTodo, clearCompleted, filterTodos, removeTodo, toggleTodo } from '../todo';
import { loadFilter, loadTodos, saveFilter, saveTodos } from '../storage';
import TodoForm from './TodoForm';
import TodoList from './TodoList';

const FILTERS: readonly { readonly value: Filter; readonly label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'active', label: '未完成' },
  { value: 'completed', label: '已完成' },
];

export default function TodoApp() {
  // useState 定义：传函数做惰性初始化，只有首次渲染才读一次 localStorage
  const [todos, setTodos] = useState<Todo[]>(() => loadTodos(window.localStorage));
  const [filter, setFilter] = useState<Filter>(() => loadFilter(window.localStorage));
  const [message, setMessage] = useState('');

  // State 一变就写回存储：UI 与数据同源，不用再手动「刷新列表」
  useEffect(() => {
    saveTodos(window.localStorage, todos);
  }, [todos]);

  useEffect(() => {
    saveFilter(window.localStorage, filter);
  }, [filter]);

  // 验收用观测口：控制台里调用 __TODO_DEBUG__() 拿到的就是 React 真正持有的数组
  useEffect(() => {
    window.__TODO_DEBUG__ = (): readonly Todo[] => todos;
  }, [todos]);

  /** 添加：纯函数返回「新数组 + 失败提示」，这里只负责把它交给 setState */
  function handleAdd(rawText: string): boolean {
    const result = addTodo(todos, rawText);
    // 不可变更新：addTodo 内部是 [...todos, added]，绝不 push
    setTodos(result.todos);
    setMessage(result.message);
    return result.ok;
  }

  /** 切换完成：函数式更新，永远基于最新的 prev，且返回全新数组与新对象 */
  function handleToggle(id: number): void {
    setTodos((prev) => toggleTodo(prev, id).todos);
  }

  /** 删除 */
  function handleRemove(id: number): void {
    setTodos((prev) => removeTodo(prev, id).todos);
  }

  function handleClearCompleted(): void {
    setTodos((prev) => clearCompleted(prev).todos);
  }

  const visible: Todo[] = filterTodos(todos, filter);
  const remaining = todos.reduce((count, item) => (item.done ? count : count + 1), 0);
  const hasCompleted = todos.some((item) => item.done);

  return (
    <div className="app">
      <header className="app-header">
        <h1>待办事项</h1>
        <p className="subtitle">V4.0 · React 组件化 + State 驱动</p>
      </header>

      <TodoForm onAdd={handleAdd} message={message} />

      <section className="list-section" aria-labelledby="list-heading">
        <div className="list-head">
          <h2 id="list-heading">任务列表</h2>
          <span className="counter" id="todo-count">
            {`共 ${todos.length} 项 / 未完成 ${remaining} 项`}
          </span>
        </div>

        <div className="filter-bar" role="group" aria-label="筛选任务">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              className="filter-btn"
              aria-pressed={filter === item.value}
              data-filter={item.value}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <TodoList todos={visible} onToggle={handleToggle} onRemove={handleRemove} />

        {visible.length === 0 ? (
          <p className="empty" id="empty-state">
            还没有任务，先加一条吧。
          </p>
        ) : null}

        {hasCompleted ? (
          <button type="button" className="btn btn-edit" onClick={handleClearCompleted}>
            清除已完成
          </button>
        ) : null}
      </section>

      <footer className="app-footer">
        <p>
          数据保存在浏览器 localStorage，刷新后自动恢复。组件在 <code>src/components/</code>，
          业务纯函数在 <code>src/todo.ts</code>，单测在 <code>tests/</code>。
        </p>
      </footer>
    </div>
  );
}
