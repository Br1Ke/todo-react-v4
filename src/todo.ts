/**
 * 纯数据层：所有业务规则都在这里，完全不碰 DOM。
 *
 * 这样做的好处是「能被单测直接调用」—— 不需要浏览器、不需要 jsdom。
 * 每个函数都遵守两条约定：
 *   1. 不改入参（不改数组、不改数组里的对象），返回新数组；
 *   2. 对「外部世界来的脏数据」用 unknown 接住，先校验再使用，绝不写 any。
 */

import type { AddError, AddTodoResult, ClearResult, Filter, MutateResult, Todo } from './types';

/** 任务文本长度上限 */
export const MAX_TEXT = 100;

/** 脚本注入的粗筛规则（数据层负责拦截，渲染层还会再编码一次） */
const UNSAFE_PATTERN = /<\s*script/i;
/** 纯数字串：用来把 dataset 里的字符串收敛成正整数 id */
const DIGITS = /^\d+$/;

/* ============================================================
   输入收敛
   ============================================================ */

/**
 * 把任意输入收敛成「去掉首尾空白的字符串」。
 * null / undefined / 对象 / 数组 / 含 NaN 的数字一律收敛成空串，
 * 交给上层按「空值」处理 —— 这样下游不需要再判断类型。
 */
export function normalizeText(raw: unknown): string {
  if (raw === null || raw === undefined) {
    return '';
  }
  if (typeof raw === 'string') {
    return raw.trim();
  }
  if (typeof raw === 'number') {
    // NaN / Infinity 不是合法内容；有限数字才当文本用
    return Number.isFinite(raw) ? String(raw).trim() : '';
  }
  if (typeof raw === 'boolean') {
    return String(raw);
  }
  return '';
}

/**
 * 把 id 收敛成正整数；收不了就返回 null。
 * 这一条就是 W8 那个 bug 的「归属地」：dataset 里取出来的是字符串，
 * 以前直接拿去和数字 === 比较，永远不相等；现在统一在这里转。
 */
export function parseId(raw: unknown): number | null {
  if (typeof raw === 'number') {
    return Number.isSafeInteger(raw) && raw > 0 ? raw : null;
  }
  if (typeof raw !== 'string') {
    return null;
  }
  const text = raw.trim();
  if (!DIGITS.test(text)) {
    return null; // ''、'12abc'、'1.5'、'1e3'、'-3' 全部拒绝
  }
  const value = Number(text);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

/** 文本里是否含疑似脚本片段 */
export function isUnsafeText(text: string): boolean {
  return UNSAFE_PATTERN.test(text);
}

/* ============================================================
   查询
   ============================================================ */

/** 按文本找重复（忽略大小写与首尾空白，由调用方先 normalize） */
export function findDuplicate(todos: readonly Todo[], text: string): Todo | undefined {
  const key = text.toLowerCase();
  return todos.find((item) => item.text.toLowerCase() === key);
}

/** 下一个可用 id：现有最大 id + 1 */
export function nextIdFor(todos: readonly Todo[]): number {
  return todos.reduce((max, item) => (item.id > max ? item.id : max), 0) + 1;
}

/** 按筛选状态取视图数据；不修改入参 */
export function filterTodos(todos: readonly Todo[], filter: Filter): Todo[] {
  switch (filter) {
    case 'active':
      return todos.filter((item) => !item.done);
    case 'completed':
      return todos.filter((item) => item.done);
    case 'all':
      return [...todos];
  }
}

/* ============================================================
   四个操作
   ============================================================ */

function failAdd(error: AddError, message: string, todos: readonly Todo[]): AddTodoResult {
  return { ok: false, todos: [...todos], added: null, error, message };
}

/**
 * 添加任务。
 * 契约：
 *   合法文本（trim 后非空、≤ MAX_TEXT、不含 <script>、不与已有任务重名）→ 追加一条，id 自动取 maxId+1；
 *   空值 / 超长 / 不安全 / 重复 → 拒绝，返回对应 error，todos 原样（浅拷贝）返回。
 * 无论成功失败都不修改入参数组。
 */
export function addTodo(todos: readonly Todo[], rawText: unknown): AddTodoResult {
  const text = normalizeText(rawText);

  if (text === '') {
    return failAdd('empty', '任务内容不能为空，请输入至少一个非空白字符。', todos);
  }
  if (text.length > MAX_TEXT) {
    return failAdd('too-long', `任务内容最多 ${MAX_TEXT} 个字符，当前 ${text.length} 个。`, todos);
  }
  if (isUnsafeText(text)) {
    return failAdd('unsafe', '任务内容包含不允许的脚本片段，已拒绝保存。', todos);
  }
  if (findDuplicate(todos, text) !== undefined) {
    return failAdd('duplicate', `「${text}」已经在列表里了，没有重复添加。`, todos);
  }

  const added: Todo = { id: nextIdFor(todos), text, done: false };
  return { ok: true, todos: [...todos, added], added, error: null, message: '' };
}

/**
 * 切换完成状态。
 * 契约：
 *   id 合法且命中 → 只把这一条的 done 取反，其余项保持同一引用；
 *   id 不合法（null / '' / 'abc' / 0 / 负数）→ invalid-id；
 *   id 合法但不存在（例如已被删除）→ not-found。
 */
export function toggleTodo(todos: readonly Todo[], rawId: unknown): MutateResult {
  const id = parseId(rawId);
  if (id === null) {
    return { ok: false, todos: [...todos], error: 'invalid-id', message: '任务 id 不合法。' };
  }

  const target = todos.find((item) => item.id === id);
  if (target === undefined) {
    return {
      ok: false,
      todos: [...todos],
      error: 'not-found',
      message: `没有找到 id=${id} 的任务。`,
    };
  }

  return {
    ok: true,
    todos: todos.map((item) => (item.id === id ? { ...item, done: !item.done } : item)),
    error: null,
    message: '',
  };
}

/** 删除任务；失败原因与 toggleTodo 一致 */
export function removeTodo(todos: readonly Todo[], rawId: unknown): MutateResult {
  const id = parseId(rawId);
  if (id === null) {
    return { ok: false, todos: [...todos], error: 'invalid-id', message: '任务 id 不合法。' };
  }
  if (!todos.some((item) => item.id === id)) {
    return {
      ok: false,
      todos: [...todos],
      error: 'not-found',
      message: `没有找到 id=${id} 的任务。`,
    };
  }
  return {
    ok: true,
    todos: todos.filter((item) => item.id !== id),
    error: null,
    message: '',
  };
}

/** 清除所有已完成任务，返回清掉的条数（没有已完成时返回 0，且不产生新数组引用也无所谓） */
export function clearCompleted(todos: readonly Todo[]): ClearResult {
  const kept = todos.filter((item) => !item.done);
  return { todos: kept, removed: todos.length - kept.length };
}

/* ============================================================
   反序列化：把 localStorage 里的脏数据收敛成 Todo[]
   ============================================================ */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * 把 JSON.parse 出来的 unknown 收敛成合法的 Todo[]。
 * 规则：非数组 → 空数组；逐项校验 text 是非空字符串、done 只认 true；
 *       id 收不成正整数或与前面重复 → 依次补号。
 * 返回的每一项都是全新对象，id 唯一且为正整数。
 */
export function deserializeTodos(raw: unknown): Todo[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  // Array.isArray 会把类型收窄成 any[]，这里显式收敛成 unknown[]，避免 any 扩散
  const items: unknown[] = raw;

  const staged: { id: number | null; text: string; done: boolean }[] = [];
  for (const item of items) {
    if (!isRecord(item)) {
      continue;
    }
    const rawText = item['text'];
    if (typeof rawText !== 'string') {
      continue;
    }
    const text = rawText.trim();
    if (text === '') {
      continue;
    }
    staged.push({ id: parseId(item['id']), text, done: item['done'] === true });
  }

  let next = staged.reduce((max, s) => (s.id !== null && s.id > max ? s.id : max), 0) + 1;
  const used = new Set<number>();
  const out: Todo[] = [];
  for (const s of staged) {
    let id = s.id;
    if (id === null || used.has(id)) {
      id = next;
      next += 1;
    }
    used.add(id);
    if (id >= next) {
      next = id + 1;
    }
    out.push({ id, text: s.text, done: s.done });
  }
  return out;
}

/** Filter 的运行时校验：来自 localStorage / URL 的值不一定合法 */
export function parseFilter(raw: unknown): Filter {
  return raw === 'active' || raw === 'completed' || raw === 'all' ? raw : 'all';
}
