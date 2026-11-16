/**
 * 任务 2：手写单元测试（不依赖 AI）
 *
 * 覆盖 addTodo 与 toggleTodo 两个函数的契约：
 *   - 正常路径：合法输入下的返回值与不可变性
 *   - 错误处理：每个拒绝分支是否按契约返回对应 error
 *   - 边界：对照课件 9 维度里本周适用的 ①②③④⑤⑥⑨
 *
 * 每条用例上方注释标明它对应哪个维度，方便和任务 3 的 AI 版逐条对照。
 */

import { describe, expect, test } from 'vitest';
import { addTodo, MAX_TEXT, parseId, removeTodo, toggleTodo } from '../src/todo';
import type { Todo } from '../src/types';

const A: Todo = { id: 1, text: 'A 任务', done: false };
const B: Todo = { id: 2, text: 'B 任务', done: true };

describe('addTodo —— 正常路径', () => {
  test('合法文本：追加一条、内容正确、done 为 false、id 取最大 id + 1', () => {
    const result = addTodo([A, B], '买牛奶');

    expect(result.ok).toBe(true);
    expect(result.error).toBeNull();
    expect(result.added).toEqual({ id: 3, text: '买牛奶', done: false });
    expect(result.todos).toHaveLength(3);
    // 断言到具体内容，而不是只断长度
    expect(result.todos[2]).toEqual({ id: 3, text: '买牛奶', done: false });
  });

  test('首尾空白会被裁掉后再存', () => {
    const result = addTodo([A], '   写周报   ');

    expect(result.ok).toBe(true);
    expect(result.added?.text).toBe('写周报');
  });

  test('不改原数组：入参长度与内容都不变，且返回的是新数组', () => {
    const source: Todo[] = [A];
    const result = addTodo(source, '新任务');

    expect(source).toHaveLength(1);
    expect(source).toEqual([A]);
    expect(result.todos).not.toBe(source);
    expect(result.todos[1]).toEqual({ id: 2, text: '新任务', done: false });
  });

  test('空列表时 id 从 1 开始', () => {
    const result = addTodo([], '第一条');

    expect(result.added?.id).toBe(1);
  });
});

describe('addTodo —— 边界拦截', () => {
  // 维度① 空值与假值
  test('维度①：null / undefined 被拒绝，error 为 empty', () => {
    for (const bad of [null, undefined]) {
      const result = addTodo([A], bad);
      expect(result.ok).toBe(false);
      expect(result.error).toBe('empty');
      expect(result.todos).toHaveLength(1);
    }
  });

  // 维度② 格式与内容
  test('维度②：空字符串、纯空格、纯 Tab 都按空值处理', () => {
    for (const bad of ['', '   ', '\t\t', '\u3000']) {
      const result = addTodo([A], bad);
      expect(result.ok).toBe(false);
      expect(result.error).toBe('empty');
    }
  });

  test('维度②：恰好 100 字放行，101 字被拒（边界值两侧都测）', () => {
    const ok100 = addTodo([], 'a'.repeat(MAX_TEXT));
    expect(ok100.ok).toBe(true);
    expect(ok100.added?.text).toHaveLength(MAX_TEXT);

    const bad101 = addTodo([], 'a'.repeat(MAX_TEXT + 1));
    expect(bad101.ok).toBe(false);
    expect(bad101.error).toBe('too-long');
  });

  // 维度③ 类型不匹配
  test('维度③：NaN、对象、数组这类错误类型被当成空值拒绝', () => {
    for (const bad of [NaN, { text: 'x' }, ['x'], () => 'x']) {
      const result = addTodo([A], bad);
      expect(result.ok).toBe(false);
      expect(result.error).toBe('empty');
    }
  });

  // 维度⑥ 重复与幂等
  test('维度⑥：重复文本被拒绝（忽略大小写与首尾空白）', () => {
    const base = addTodo([], 'Buy Milk');
    expect(base.ok).toBe(true);

    for (const dup of ['Buy Milk', 'buy milk', '  BUY MILK  ']) {
      const result = addTodo(base.todos, dup);
      expect(result.ok).toBe(false);
      expect(result.error).toBe('duplicate');
      expect(result.todos).toHaveLength(1);
    }
  });

  // 维度⑨ 安全与注入
  test('维度⑨：含 <script> 的文本被拒绝，不会原样存进列表', () => {
    const result = addTodo([], '<script>alert(1)</script>');

    expect(result.ok).toBe(false);
    expect(result.error).toBe('unsafe');
    expect(result.todos).toHaveLength(0);
    expect(result.todos.some((todo) => todo.text.includes('<script>'))).toBe(false);
  });

  test('维度⑨：大小写混写的 <SCRIPT> 同样被拦', () => {
    const result = addTodo([], '正常文字 <SCRIPT src=x>');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('unsafe');
  });
});

describe('toggleTodo —— 正常路径', () => {
  test('命中时只把这一条的 done 取反，其余项不变', () => {
    const result = toggleTodo([A, B], 1);

    expect(result.ok).toBe(true);
    expect(result.error).toBeNull();
    expect(result.todos).toEqual([
      { id: 1, text: 'A 任务', done: true },
      { id: 2, text: 'B 任务', done: true },
    ]);
  });

  test('连续调用两次回到原状态（可逆）', () => {
    const once = toggleTodo([A], 1);
    const twice = toggleTodo(once.todos, 1);

    expect(twice.todos).toEqual([A]);
  });

  test('不改原数组、也不改原对象：旧数组里该条目的 done 保持原值', () => {
    const source: Todo[] = [A];
    const result = toggleTodo(source, 1);

    expect(source).toEqual([A]);
    expect(source[0].done).toBe(false);
    expect(result.todos).not.toBe(source);
    expect(result.todos[0]).not.toBe(source[0]);
  });

  test('回归 W8 的 bug：从 DOM 拿到的字符串 id 也能命中', () => {
    // dataset.id 是 string，W8 里直接和数字比较导致永久不命中
    const result = toggleTodo([A, B], '2');

    expect(result.ok).toBe(true);
    expect(result.todos[1].done).toBe(false);
  });
});

describe('toggleTodo —— 边界拦截', () => {
  // 维度④ 越界与不存在
  test('维度④：不存在的 id 返回 not-found，列表不变', () => {
    const result = toggleTodo([A, B], 999);

    expect(result.ok).toBe(false);
    expect(result.error).toBe('not-found');
    expect(result.todos).toEqual([A, B]);
  });

  // 维度③ 类型不匹配
  test('维度③：非法 id 一律 invalid-id（不从字符串里猜数字）', () => {
    for (const bad of [
      '',
      '  ',
      'abc',
      '12abc',
      '1.5',
      '1e3',
      '0',
      '-3',
      null,
      undefined,
      NaN,
      {},
    ]) {
      const result = toggleTodo([A], bad);
      expect(result.ok).toBe(false);
      expect(result.error).toBe('invalid-id');
    }
  });

  // 维度⑤ 状态前置条件：对已删除的任务操作
  test('维度⑤：删掉之后再切换，返回 not-found 而不是抛异常', () => {
    const removed = removeTodo([A, B], 2);
    expect(removed.ok).toBe(true);

    const result = toggleTodo(removed.todos, 2);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('not-found');
  });

  test('空列表上切换任意 id：not-found', () => {
    const result = toggleTodo([], 1);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('not-found');
  });
});

describe('parseId —— W8 bug 的归属地', () => {
  test('合法输入收敛成正整数', () => {
    expect(parseId('3')).toBe(3);
    expect(parseId(' 42 ')).toBe(42);
    expect(parseId(7)).toBe(7);
  });

  test('非法输入返回 null，绝不返回 NaN', () => {
    for (const bad of ['', 'abc', '12abc', '0', '-1', '1.5', null, undefined, NaN, Infinity, {}]) {
      expect(parseId(bad)).toBeNull();
    }
  });
});
