// @vitest-environment jsdom
/**
 * 任务 3 · ② 业务行为验证：AI 修完之后，原来的业务规则还在吗？
 *
 * 设计成「对照组实验」，为的是让审查结论可复现、不靠嘴说：
 *
 *   上半场：同一组业务断言喂给「AI 首版修复」→ 预期 3 条全红；
 *   下半场：完全相同的断言喂给 V3.0 的纯函数 addTodo → 3 条全绿。
 *
 * 红的方向一致，就说明丢的不是「AI 不会写 React」，而是「AI 把业务规则改没了」。
 *
 * 单独跑：npx vitest run --config vitest.review.config.ts
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';

import AiFixedTodoApp from './ai-fixed-TodoApp';
import { addTodo, nextIdFor } from '../src/todo';
import type { Todo } from '../src/types';

/** 页面上第一条任务的文本（保留首尾空白，这样才能看出 trim 有没有丢） */
function firstText(): string {
  return document.querySelectorAll('li .text')[0]?.textContent ?? '';
}

/** 页面上被标记为已完成的行数 */
function doneCount(): number {
  return Array.from(document.querySelectorAll('li .mark')).filter((n) => (n.textContent ?? '') !== '')
    .length;
}

function rowCount(): number {
  return document.querySelectorAll('li').length;
}

async function addInUi(text: string): Promise<void> {
  const user = userEvent.setup();
  const input = document.querySelector('input');
  if (input === null) throw new Error('找不到输入框');
  await user.clear(input);
  await user.type(input, text);
  await user.click(screen.getByRole('button', { name: '添加' }));
}

beforeEach(() => {
  cleanup();
});

afterEach(() => {
  vi.restoreAllMocks();
});

/* ============================================================
   上半场：AI 首版修复 —— 预期全红
   ============================================================ */

describe('对「AI 首版修复」跑三条业务断言（预期红）', () => {
  test('规则1：入库文本应当 trim 后再保存', async () => {
    render(<AiFixedTodoApp />);
    await addInUi('  任务A  ');

    // V3.0 的契约：addTodo 会 normalizeText，存进去的是 '任务A'
    expect(firstText()).toBe('任务A');
  });

  test('规则2：id 必须唯一 —— 同一毫秒连加两条不能撞号', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    render(<AiFixedTodoApp />);

    await addInUi('任务A');
    await addInUi('任务B');
    expect(rowCount()).toBe(2);

    // 两条 id 相同 → 点第一条会把两条一起切换，这是撞号的可见症状
    const user = userEvent.setup();
    await user.click(document.querySelectorAll('li')[0] as HTMLLIElement);

    expect(doneCount()).toBe(1);
  });

  test('规则3：重复任务应当被拒绝', async () => {
    render(<AiFixedTodoApp />);
    await addInUi('任务A');
    await addInUi('任务A');

    expect(rowCount()).toBe(1);
  });
});

/* ============================================================
   下半场：V3.0 纯函数 —— 同样三条规则，预期全绿
   ============================================================ */

describe('对照组：V3.0 纯函数跑同样三条业务断言（预期绿）', () => {
  test('规则1：addTodo 会 trim 入库文本', () => {
    const result = addTodo([], '  任务A  ');
    expect(result.ok).toBe(true);
    expect(result.added?.text).toBe('任务A');
  });

  test('规则2：id 由 max+1 生成，不依赖 Date.now()，天然不撞号', () => {
    const first: Todo[] = [];
    const a = addTodo(first, '任务A');
    const b = addTodo(a.todos, '任务B');
    const ids = b.todos.map((item) => item.id);

    expect(new Set(ids).size).toBe(2);
    expect(b.added?.id).toBe(nextIdFor(a.todos));
  });

  test('规则3：重复任务被拒绝，error 为 duplicate', () => {
    const first = addTodo([], '任务A');
    const again = addTodo(first.todos, '任务A');

    expect(again.ok).toBe(false);
    expect(again.error).toBe('duplicate');
    expect(again.todos).toHaveLength(1);
  });
});
