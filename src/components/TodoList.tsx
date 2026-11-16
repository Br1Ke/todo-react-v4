/**
 * TodoList —— 纯展示组件（presentational）。
 *
 * 只做两件事：
 *   1. 把父组件算好的「已经筛选过的」数组渲染成列表；
 *   2. 把子项的点击事件原样向上转发（onToggle / onRemove），自己不保存任何状态。
 *
 * 注意它没有 useState —— 列表内容完全由 props 决定，这也正是
 * 「UI 由 State 驱动」的直接体现：todos 不变，渲染结果就不会变。
 */

import type { Todo } from '../types';
import TodoItem from './TodoItem';

export interface TodoListProps {
  /** 父组件筛选后的视图数据（只读，组件内不得修改） */
  readonly todos: readonly Todo[];
  /** 切换某条任务的完成状态 */
  readonly onToggle: (id: number) => void;
  /** 删除某条任务 */
  readonly onRemove: (id: number) => void;
}

export default function TodoList({ todos, onToggle, onRemove }: TodoListProps) {
  return (
    <ul className="todo-list" id="todo-list">
      {todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} onToggle={onToggle} onRemove={onRemove} />
      ))}
    </ul>
  );
}
