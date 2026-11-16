/**
 * 存储层：只负责「把 Todo[] 读出来 / 写回去」，不做业务判断。
 *
 * 依赖注入一个 StorageLike，而不是直接摸 window.localStorage：
 * 这样单测里可以塞一个假对象，不需要 jsdom，也能模拟「存储被禁用」「存储满了」。
 */

import type { Filter, Todo } from './types';
import { deserializeTodos, parseFilter } from './todo';

export const TODOS_KEY = 'todo.v2.todos';
export const FILTER_KEY = 'todo.v2.filter';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** 读取任务列表；任何异常都退回空数组，绝不让页面崩掉 */
export function loadTodos(storage: StorageLike): Todo[] {
  let raw: string | null;
  try {
    raw = storage.getItem(TODOS_KEY);
  } catch (error: unknown) {
    // 例如隐私模式下 localStorage 被禁用
    console.warn('[todo] 读取 localStorage 失败，本次从空列表开始', error);
    return [];
  }

  if (raw === null) {
    return []; // 没存过是「空」，不是「错误」
  }

  let parsed: unknown;
  try {
    // JSON.parse 的返回类型是 any，这里立刻收敛成 unknown，避免 any 往下游扩散
    parsed = JSON.parse(raw);
  } catch (error: unknown) {
    console.warn('[todo] 本地数据不是合法 JSON，已忽略并重置', error);
    return [];
  }

  return deserializeTodos(parsed);
}

/** 写回任务列表；返回是否写入成功 */
export function saveTodos(storage: StorageLike, todos: readonly Todo[]): boolean {
  try {
    storage.setItem(TODOS_KEY, JSON.stringify(todos));
    return true;
  } catch (error: unknown) {
    console.warn('[todo] 写入 localStorage 失败，本次修改不会被保存', error);
    return false;
  }
}

export function loadFilter(storage: StorageLike): Filter {
  try {
    return parseFilter(storage.getItem(FILTER_KEY));
  } catch (error: unknown) {
    console.warn('[todo] 读取筛选状态失败，回退到 all', error);
    return 'all';
  }
}

export function saveFilter(storage: StorageLike, filter: Filter): boolean {
  try {
    storage.setItem(FILTER_KEY, filter);
    return true;
  } catch (error: unknown) {
    console.warn('[todo] 筛选状态未能保存', error);
    return false;
  }
}
