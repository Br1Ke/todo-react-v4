/**
 * 任务 3：AI 生成的测试（Vitest）
 *
 * 这是按结构化 Prompt 让 AI 生成的第一版，**原样保留**，用于审查。
 * 它本身是「全绿」的 —— 问题恰恰在这里：绿不等于测到了。
 * 具体缺陷见《第9周AI协作记录》里「审查报告」的①有效性审查与②边界审查。
 */

import { describe, expect, test } from 'vitest';
import { addTodo, toggleTodo } from '../src/todo';
import type { Todo } from '../src/types';

const base: Todo[] = [
  { id: 1, text: 'A 任务', done: false },
  { id: 2, text: 'B 任务', done: true },
];

describe('addTodo', () => {
  // 正常路径
  test('正常路径：合法文本可以添加', () => {
    const result = addTodo(base, '买牛奶');
    // ← 缺陷：只断了长度，没断内容与 id
    expect(result.todos.length).toBe(3);
    expect(result.added).toBeDefined();
  });

  // 维度1（空值）
  test('维度1：null 应该被拦截', () => {
    const result = addTodo(base, null);
    // ← 缺陷：result 永远存在，这条断言永远是绿的
    expect(result).toBeDefined();
  });

  // 维度1（空值）：纯空格
  test('维度1：纯空格应该被拦截', () => {
    const result = addTodo(base, '   ');
    // ← 缺陷：断言强度不足，没断 ok / error / 列表长度
    expect(result.todos).not.toBe(undefined);
  });

  // 维度9（安全）
  test('维度9：包含 script 的内容应该被拦截', () => {
    const result = addTodo(base, '<script>alert(1)</script>');
    expect(result.ok).toBe(false);
  });

  // 维度6（重复）：这条其实是「连续添加两条不同的任务」，并没有测重复
  test('维度6：连续添加任务', () => {
    const first = addTodo(base, '任务甲');
    const second = addTodo(first.todos, '任务乙');
    expect(second.todos.length).toBe(4);
  });
});

describe('toggleTodo', () => {
  test('正常路径：切换一个任务', () => {
    const result = toggleTodo(base, 1);
    // ← 缺陷：只断长度不变，没断 done 是否真的翻转、没断其它项不受影响
    expect(result.todos.length).toBe(2);
    expect(result.ok).toBeTruthy();
  });

  test('不存在的 id 应该返回失败', () => {
    const result = toggleTodo(base, 999);
    expect(result.ok).toBe(false);
  });
});
