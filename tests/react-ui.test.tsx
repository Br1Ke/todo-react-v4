// @vitest-environment jsdom
/**
 * 第 11 周 · 任务 2「轨道 B」的组件级证据。
 *
 * 与「轨道 A」的分工：
 *   - 轨道 A（handwritten / ai-generated / ai-reviewed）：测的是 src/todo.ts 的**纯函数**，
 *     证明业务规则在迁移到 React 之后一条没丢；
 *   - 轨道 B（本文件）：测的是**组件**——不调用任何内部函数，只做用户会做的动作
 *     （在输入框打字、点「添加」、点复选框、点「删除」），然后断言页面上看得见的结果。
 *
 * 这一轨要证明的是：UI 现在由 State 驱动，而不是靠手动 DOM 操作。
 * 如果组件里还残留 push / innerHTML / 直接改对象，这些用例会红。
 */

import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';

import TodoApp from '../src/components/TodoApp';
import type { Todo } from '../src/types';

/** 从 window 上的观测口读 React 当前持有的 todos */
function stateTodos(): readonly Todo[] {
  const read = window.__TODO_DEBUG__;
  if (read === undefined) {
    throw new Error('TodoApp 没有暴露 __TODO_DEBUG__');
  }
  return read();
}

/** 页面上所有任务的文字（按渲染顺序） */
function renderedTexts(): string[] {
  return Array.from(document.querySelectorAll('#todo-list .todo-text')).map(
    (node) => node.textContent ?? '',
  );
}

async function add(text: string): Promise<void> {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('新任务内容'), text);
  await user.click(screen.getByRole('button', { name: '添加' }));
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe('轨道 B：State 驱动的 UI 行为', () => {
  test('添加：输入框清空、列表多一项、State 与页面一致', async () => {
    render(<TodoApp />);
    expect(renderedTexts()).toEqual([]);

    await add('任务A');

    expect(screen.getByLabelText('新任务内容')).toHaveValue('');
    expect(renderedTexts()).toEqual(['任务A']);
    expect(stateTodos().map((item) => item.text)).toEqual(['任务A']);
  });

  test('切换完成：勾选后 is-done 生效，只有这一条变', async () => {
    const user = userEvent.setup();
    render(<TodoApp />);
    await add('任务A');
    await add('任务B');

    const before = stateTodos();
    await user.click(screen.getByRole('checkbox', { name: /任务A/ }));

    const after = stateTodos();
    expect(after[0]?.done).toBe(true);
    expect(after[1]?.done).toBe(false);

    // 不可变更新的证据：整个数组换了引用，但没被改的那一条保持同一引用
    expect(after).not.toBe(before);
    expect(after[1]).toBe(before[1]);

    const firstItem = document.querySelectorAll('#todo-list .todo-item')[0];
    expect(firstItem).toHaveClass('is-done');
  });

  test('删除：列表少一项，State 同步少一项', async () => {
    const user = userEvent.setup();
    render(<TodoApp />);
    await add('任务A');
    await add('任务B');
    expect(renderedTexts()).toEqual(['任务A', '任务B']);

    await user.click(screen.getAllByRole('button', { name: '删除' })[0]);

    expect(renderedTexts()).toEqual(['任务B']);
    expect(stateTodos().map((item) => item.text)).toEqual(['任务B']);
  });

  test('业务规则仍在：空白与重复输入被拒绝，列表不变、提示可见', async () => {
    render(<TodoApp />);
    await add('任务A');

    await add('   ');
    expect(screen.getByRole('alert')).not.toBeEmptyDOMElement();
    expect(renderedTexts()).toEqual(['任务A']);

    await add('任务A');
    expect(screen.getByRole('alert')).not.toBeEmptyDOMElement();
    expect(renderedTexts()).toEqual(['任务A']);
  });

  test('筛选只改变视图，不改动 State', async () => {
    const user = userEvent.setup();
    render(<TodoApp />);
    await add('任务A');
    await add('任务B');
    await user.click(screen.getByRole('checkbox', { name: /任务A/ }));

    const before = stateTodos();
    await user.click(screen.getByRole('button', { name: '未完成' }));

    expect(renderedTexts()).toEqual(['任务B']);
    // 视图被筛掉了，但 State 里两条都还在
    expect(stateTodos()).toHaveLength(2);
    expect(stateTodos()).toEqual(before);
  });
});
