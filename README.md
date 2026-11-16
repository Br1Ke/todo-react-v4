# 第11周 · Todo V4.0（React 组件重构）

> **课程**：基于Web的编程 · 第 11 周作业（V4.0）
> **作者**：吴子牛　**学号**：2024041009　**班级**：软件工程01
> **仓库**：https://github.com/Br1Ke/todo-react-v4
> **分支**：`main`（默认）/ `feature/w11-react`（本周开发分支）

把第 10 周的 V3.0（Vite + TypeScript + 原生 DOM）迁移到 React，让 **State 驱动 UI**。

## 怎么验收（30 秒）

```bash
npm install
npm run test     # 45 条全绿：40 条 V3.0 回归 + 5 条组件级 UI
npm run build    # tsc --noEmit && vite build
```

`src/todo.ts`、`src/storage.ts`、`src/types.ts` 与 `tests/` 下三个测试文件
都是从第 10 周**原样搬过来**的（未改一行），所以测试全绿证明的是
「迁移没破坏业务逻辑」，而不是「测试被改到能过」。

## 相对 V3.0 改了什么

| | V3.0 | V4.0 |
|---|---|---|
| 渲染 | `src/app.ts` 里手写 `createElement` / `innerHTML` | React 组件，声明式渲染 |
| 状态 | 模块级变量 + 手动刷新列表 | `useState`，改 State 即改 UI |
| 组织 | 单文件 | `src/components/` 下 4 个组件 |
| 业务逻辑 | `src/todo.ts` 纯函数 | **原样保留，未改一行** |
| 单测 | `tests/*.test.ts` | **原样保留，未改一行**（40 条回归） |

关键点：**业务纯函数与单测都没有改动**，所以 `npm run test` 全绿这件事，
证明的是「迁移没有破坏业务逻辑」，而不是「测试被改到能过」。

## 目录

```
src/
├─ components/          # 任务 1 拆出的 4 个组件
│  ├─ TodoApp.tsx       # 唯一持有 State 的容器组件
│  ├─ TodoForm.tsx      # 受控输入，事件向上传
│  ├─ TodoList.tsx      # 列表容器，纯展示
│  └─ TodoItem.tsx      # 单条任务，纯受控
├─ todo.ts              # 业务纯函数（沿用 V3.0）
├─ storage.ts           # localStorage 读写（沿用 V3.0）
├─ types.ts             # 类型契约（沿用 V3.0）
├─ global.d.ts          # window.__TODO_DEBUG__ 的类型声明
└─ main.tsx             # 入口，只做挂载

tests/                  # Track A：单测回归
├─ handwritten.test.ts  #   ┐
├─ ai-generated.test.ts #   ├ 与 V3.0 完全相同（未改）
├─ ai-reviewed.test.ts  #   ┘
└─ react-ui.test.tsx    # Track B：组件级 UI 行为测试

review/                 # 任务 3：审查 AI 的首版修复
├─ ai-fixed-TodoApp.tsx # 原样保留 AI 输出
└─ business-rules.test.tsx # 对照实验：同一组断言，AI 版红 / V3.0 绿
```

## 命令

```bash
npm install
npm run dev        # 开发服务器
npm run build      # tsc --noEmit && vite build
npm run test       # 45 条测试（40 条回归 + 5 条 UI）

# 启动/关闭「State 驱动」的真实浏览器验证（需要本机 Chrome）
npm run build && node scripts/ui-verify.mjs dist _work/ui-verify.json

# 任务 3 的对照实验（预期 3 红 3 绿）
npx vitest run --config vitest.review.config.ts
```
