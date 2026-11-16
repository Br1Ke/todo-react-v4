/**
 * 任务 3 ③：修补后的测试
 *
 * 在 AI 版的基础上做两类改动：
 *   修（针对「断言有效性」）—— 把 toBeDefined / toBeTruthy / 只断长度 改成断具体业务结果；
 *   补（针对「边界覆盖」）—— 补齐 AI 漏掉的维度②超长、③类型、④越界、⑤状态前置，以及重复的真实用例。
 * 每条用例上方标出它属于哪个维度，方便和 AI 版逐条对照。
 */

import { describe, expect, test } from 'vitest';
import { addTodo, MAX_TEXT, removeTodo, toggleTodo } from '../src/todo';
import type { Todo } from '../src/types';

const base: Todo[] = [
  { id: 1, text: 'A 任务', done: false },
  { id: 2, text: 'B 任务', done: true },
];

describe('addTodo（修补后）', () => {
  test('正常路径：内容、id、done 都要断言到', () => {
    const result = addTodo(base, '买牛奶');

    expect(result.ok).toBe(true);
    expect(result.error).toBeNull();
    expect(result.todos).toHaveLength(3);
    // AI 版这里只断了 length，补上具体内容
    expect(result.added).toEqual({ id: 3, text: '买牛奶', done: false });
    expect(result.todos[2]).toEqual({ id: 3, text: '买牛奶', done: false });
  });

  test('正常路径：不改原数组', () => {
    const source: Todo[] = [...base];
    const result = addTodo(source, '新任务');

    expect(source).toEqual(base);
    expect(result.todos).not.toBe(source);
  });

  // 维度①（修补 AI 的「toBeDefined」）
  test('维度①：null / undefined / 空串 / 纯空格都被拒绝，且列表不变', () => {
    for (const bad of [null, undefined, '', '   ', '\u3000']) {
      const result = addTodo(base, bad);
      expect(result.ok).toBe(false);
      expect(result.error).toBe('empty');
      expect(result.todos).toEqual(base);
    }
  });

  // 维度②：AI 版完全没测
  test('维度②：超长文本被拒绝；恰好 100 字放行', () => {
    const tooLong = addTodo(base, 'a'.repeat(MAX_TEXT + 1));
    expect(tooLong.ok).toBe(false);
    expect(tooLong.error).toBe('too-long');

    const ok = addTodo([], 'a'.repeat(MAX_TEXT));
    expect(ok.ok).toBe(true);
  });

  // 维度③：AI 版完全没测
  test('维度③：NaN 与对象这类错误类型按空值处理', () => {
    for (const bad of [NaN, { text: 'x' }, ['x']]) {
      const result = addTodo(base, bad);
      expect(result.ok).toBe(false);
      expect(result.error).toBe('empty');
    }
  });

  // 维度⑥：修 AI 那条「连续添加两条不同任务」的假用例
  test('维度⑥：真正测重复 —— 同名 / 大小写不同 / 带首尾空格都算重复', () => {
    const first = addTodo([], 'Buy Milk');
    expect(first.ok).toBe(true);

    for (const dup of ['Buy Milk', 'buy milk', '  BUY MILK ']) {
      const result = addTodo(first.todos, dup);
      expect(result.ok).toBe(false);
      expect(result.error).toBe('duplicate');
      expect(result.todos).toHaveLength(1);
    }
  });

  // 维度⑨：AI 版只断了 ok=false，补上「没有原样存入」
  test('维度⑨：含 script 的内容被拒绝，列表里不会出现原样脚本', () => {
    const result = addTodo(base, '<script>alert(1)</script>');

    expect(result.ok).toBe(false);
    expect(result.error).toBe('unsafe');
    expect(result.todos).toEqual(base);
    expect(result.todos.some((todo) => todo.text.includes('<script>'))).toBe(false);
  });
});

describe('toggleTodo（修补后）', () => {
  test('正常路径：done 真的翻转，其它项不受影响', () => {
    const result = toggleTodo(base, 1);

    expect(result.ok).toBe(true);
    expect(result.todos[0]).toEqual({ id: 1, text: 'A 任务', done: true });
    expect(result.todos[1]).toEqual({ id: 2, text: 'B 任务', done: true });
  });

  test('正常路径：不改原数组、不改原对象', () => {
    const source: Todo[] = [{ id: 1, text: 'A 任务', done: false }];
    const result = toggleTodo(source, 1);

    expect(source[0].done).toBe(false);
    expect(result.todos).not.toBe(source);
    expect(result.todos[0]).not.toBe(source[0]);
  });

  // 维度③：AI 版没测
  test('维度③：非法 id 返回 invalid-id', () => {
    for (const bad of ['', 'abc', '12abc', '0', '-1', null, undefined, NaN]) {
      const result = toggleTodo(base, bad);
      expect(result.ok).toBe(false);
      expect(result.error).toBe('invalid-id');
    }
  });

  // 维度④：保留 AI 的用例，补上 error 与列表不变的断言
  test('维度④：不存在的 id 返回 not-found，列表不变', () => {
    const result = toggleTodo(base, 999);

    expect(result.ok).toBe(false);
    expect(result.error).toBe('not-found');
    expect(result.todos).toEqual(base);
  });

  // 维度⑤：AI 版没测 —— 对已删除的任务操作
  test('维度⑤：删掉之后再切换返回 not-found，而不是抛异常', () => {
    const removed = removeTodo(base, 2);
    expect(removed.ok).toBe(true);

    const result = toggleTodo(removed.todos, 2);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('not-found');
  });
});
