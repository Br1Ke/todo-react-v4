/**
 * 第 9 周 · 契约层
 *
 * 这里只有类型，没有任何运行时代码 —— 编译之后会被整段擦除。
 * 它的作用是：把「一条任务长什么样」「过滤器有哪些合法值」「操作失败时返回什么」
 * 写成编译器能检查的契约。
 */

/** 一条任务。readonly 表示外面拿到之后不应该原地改字段。 */
export interface Todo {
  readonly id: number;
  readonly text: string;
  readonly done: boolean;
}

/**
 * 筛选状态：用字面量联合类型收束，写错一个字母编辑器立刻报错。
 * 对应课件「场景 C：状态收束」。
 */
export type Filter = 'all' | 'active' | 'completed';

/** addTodo 可能失败的原因（同样是字面量联合，便于穷尽判断） */
export type AddError = 'empty' | 'too-long' | 'duplicate' | 'unsafe';

/** 修改类操作（toggle / remove）可能失败的原因 */
export type MutateError = 'invalid-id' | 'not-found';

/**
 * addTodo 的结果。
 * 用「总是带 todos」的形状，而不是成功/失败两个不同形状的联合：
 * 这样调用方拿到结果就能直接渲染 todos，不必先做类型收窄；
 * 失败原因放在 error 里，成功时 error 为 null。
 */
export interface AddTodoResult {
  readonly ok: boolean;
  /** 成功时是「新增后的新数组」，失败时是原数组的浅拷贝；两种情况都不改入参 */
  readonly todos: Todo[];
  /** 成功时是新增的那条任务 */
  readonly added: Todo | null;
  readonly error: AddError | null;
  /** 给界面显示的中文提示，成功时为空串 */
  readonly message: string;
}

export interface MutateResult {
  readonly ok: boolean;
  readonly todos: Todo[];
  readonly error: MutateError | null;
  readonly message: string;
}

export interface ClearResult {
  readonly todos: Todo[];
  /** 本次清掉了几条 */
  readonly removed: number;
}
