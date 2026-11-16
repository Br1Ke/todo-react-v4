/**
 * 任务 3：把「假 React」靶子代码交给 AI 后，AI 返回的**首版修复**。
 *
 * 这个文件按「原样保留」原则放在 review/ 下：
 *   - 不进 src/，因此不参与 npm run build 的类型检查；
 *   - 只被 review/business-rules.test.tsx 引用，用来跑「业务行为」审查。
 *
 * 它已经修掉的三件事（后面审查报告里的①）：
 *   1. 不再有任何 DOM 查询、也不再直接改写页面 HTML —— 渲染完全交给 React；
 *   2. 不再 push 原数组 —— setTodos((prev) => [...prev, newTodo])；
 *   3. toggle 不再原地改对象 —— map 出新的 {...t, completed: !t.completed}。
 *
 * 但它把两样业务规则弄丢了（②要抓的就是这个）：
 *   · 入库时没有 trim：守卫用的是 text.trim()，存进去的却是原始 text；
 *   · id 仍然用 Date.now()：同一毫秒内连加两条会撞 id。
 */

import { useState } from 'react';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

export default function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [text, setText] = useState('');

  function handleAdd() {
    if (text.trim() === '') return;
    const newTodo: Todo = { id: Date.now(), text: text, completed: false };
    setTodos((prev) => [...prev, newTodo]);
    setText('');
  }

  function handleToggle(id: number) {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  }

  function handleRemove(id: number) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div>
      <input value={text} onChange={(e) => setText(e.target.value)} />
      <button onClick={handleAdd}>添加</button>
      <ul>
        {todos.map((todo) => (
          <li key={todo.id} onClick={() => handleToggle(todo.id)}>
            <span className="text">{todo.text}</span>
            <span className="mark">{todo.completed ? '✔' : ''}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemove(todo.id);
              }}
            >
              删除
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
