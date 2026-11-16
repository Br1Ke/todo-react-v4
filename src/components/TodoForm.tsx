/**
 * TodoForm —— 纯受控组件。
 *
 * 自己只管「输入框里现在是什么」（局部 UI 状态 text），
 * 点提交时通过 onAdd 把文本「向上抛」给 TodoApp；
 * 父组件返回 true 才清空输入框，被拒绝（空/重复/超长/含脚本）时保留用户输入。
 */

import { useState } from 'react';
import type { FormEvent } from 'react';

export interface TodoFormProps {
  /** 把输入文本交给父组件；返回 true 表示已写入 State */
  readonly onAdd: (text: string) => boolean;
  /** 父组件根据业务规则给出的提示，空串表示无错误 */
  readonly message: string;
}

export default function TodoForm({ onAdd, message }: TodoFormProps) {
  const [text, setText] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const accepted = onAdd(text);
    if (accepted) {
      setText('');
    }
  }

  return (
    <>
      <form className="composer" id="todo-form" autoComplete="off" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="todo-input">
          新任务内容
        </label>
        <input
          id="todo-input"
          className="composer-input"
          type="text"
          name="title"
          placeholder="今天要做什么？"
          aria-describedby="composer-hint"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <button type="submit" className="btn btn-primary" id="add-btn">
          添加
        </button>
      </form>

      <p className="hint" id="composer-hint">
        按 Enter 或点「添加」加入列表
      </p>
      <p className="error" id="error-box" role="alert" hidden={message === ''}>
        {message}
      </p>
    </>
  );
}
