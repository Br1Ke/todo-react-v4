/**
 * TodoItem —— 单条任务的叶子组件。
 *
 * 完全受控：勾选状态读 todo.done，外观由 todo.done 决定（is-done 类给出删除线），
 * 自己既不保存「是否完成」，也不直接改动这条数据 ——
 * 只把 id 抛给父组件，由父组件用不可变更新产生新数组。
 *
 * key 用 todo.id：React 靠它做列表 diff，所以 id 必须稳定且唯一。
 */

import type { Todo } from '../types';

export interface TodoItemProps {
  readonly todo: Todo;
  readonly onToggle: (id: number) => void;
  readonly onRemove: (id: number) => void;
}

export default function TodoItem({ todo, onToggle, onRemove }: TodoItemProps) {
  return (
    <li className={todo.done ? 'todo-item is-done' : 'todo-item'}>
      <input
        type="checkbox"
        className="todo-check"
        checked={todo.done}
        onChange={() => onToggle(todo.id)}
        aria-label={`切换「${todo.text}」的完成状态`}
      />
      <span className="todo-text">{todo.text}</span>
      <button type="button" className="btn btn-del" onClick={() => onRemove(todo.id)}>
        删除
      </button>
    </li>
  );
}
