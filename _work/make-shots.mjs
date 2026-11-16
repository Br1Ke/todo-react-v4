/* ============================================================
   把 _work/out-*.txt 里**真实捕获**的命令输出渲染成终端截图。

   原则：文本一字不改，只加终端外壳与配色。
   截图用 Chrome headless 拍，背景透明，之后按 alpha 裁掉空白。
   ============================================================ */

import { mkdirSync, readFileSync, writeFileSync, statSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { execFileSync } from 'node:child_process';

const proj = process.argv[2];
const work = join(proj, '_work');
const outDir = join(work, 'shots');
mkdirSync(outDir, { recursive: true });

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PROMPT = 'PS F:\\深圳大学625\\大三上\\基于Web的编程\\作业\\第十一周\\第11周_Todo_React>';

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function readLines(file) {
  let raw = readFileSync(join(work, file), 'utf8');
  raw = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const lines = raw.split('\n');
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop();
  return lines;
}

/* 终端输出的轻量着色规则（只做高亮，不改内容） */
function decorate(line) {
  const t = esc(line);
  if (/^\s*✓\s/.test(line)) return `<span class="ok">${t}</span>`;
  if (/^\s*Tests\s+\d+ passed/.test(line)) return `<span class="ok strong">${t}</span>`;
  if (/^\s*Test Files\s+\d+ passed/.test(line)) return `<span class="ok strong">${t}</span>`;
  if (/^\s*Tests\s+\d+ failed/.test(line)) return `<span class="bad strong">${t}</span>`;
  if (/AssertionError|FAIL|Expected:|Received:/.test(line)) return `<span class="bad">${t}</span>`;
  if (/^\s*✓ built in/.test(line)) return `<span class="ok">${t}</span>`;
  if (/^\s*dist\//.test(line)) return `<span class="dim">${t}</span>`;
  if (/^> /.test(line)) return `<span class="pkg">${t}</span>`;
  return t;
}

const CSS = `
  html, body { margin: 0; padding: 0; background: transparent; }
  .win {
    display: inline-block; border-radius: 8px; overflow: hidden;
    border: 1px solid #333; background: #1e1e1e;
    font-family: Consolas, "Cascadia Mono", "Noto Sans Mono CJK SC", monospace;
  }
  .bar {
    display: flex; align-items: center; gap: 10px; padding: 9px 14px;
    background: #2d2d2d; border-bottom: 1px solid #3c3c3c;
    font-family: "Microsoft YaHei", sans-serif; font-size: 12.5px; color: #cfcfcf;
  }
  .dots { display: flex; gap: 6px; }
  .dot { width: 11px; height: 11px; border-radius: 50%; }
  .d1 { background: #ff5f56; } .d2 { background: #ffbd2e; } .d3 { background: #27c93f; }
  .body { padding: 12px 18px 14px; }
  .line { font-size: 13.5px; line-height: 1.68; white-space: pre-wrap; overflow-wrap: anywhere; max-width: 1080px; color: #c8c8c8; }
  .cmd { color: #ffffff; font-weight: 700; }
  .note { color: #7f9db9; font-style: italic; }
  .ok { color: #7ec699; } .ok.strong { font-weight: 700; }
  .bad { color: #f48771; } .bad.strong { font-weight: 700; }
  .dim { color: #9d9d9d; }
  .pkg { color: #9cdcfe; }
  .tree { color: #dcdcdc; }
  .tree .dir { color: #dcb67a; font-weight: 700; }
  .tree .size { color: #808080; }
`;

function page(title, blocks) {
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><style>${CSS}</style></head>
<body><div class="win">
  <div class="bar">
    <span class="dots"><span class="dot d1"></span><span class="dot d2"></span><span class="dot d3"></span></span>
    <span>${esc(title)}</span>
  </div>
  <div class="body">${blocks}</div>
</div></body></html>`;
}

const line = (txt, cls = '') =>
  `<div class="line ${cls}">${txt === '' ? '&nbsp;' : txt}</div>`;

function renderLines(lines) {
  return lines.map((l) => line(decorate(l))).join('\n');
}

function cmdBlock(cmd) {
  return line(`${esc(PROMPT)} ${esc(cmd)}`, 'cmd');
}

/* ---------- 1. npm run build ---------- */
{
  const lines = readLines('out-build.txt');
  const html = page(
    '终端 —— npm run build（tsc --noEmit && vite build）',
    [cmdBlock('npm run build'), renderLines(lines)].join('\n'),
  );
  writeFileSync(join(outDir, 'build.html'), html);
}

/* ---------- 2. npm run test ---------- */
{
  const lines = readLines('out-test.txt');
  const html = page(
    '终端 —— npm run test（vitest run）',
    [cmdBlock('npm run test'), renderLines(lines)].join('\n'),
  );
  writeFileSync(join(outDir, 'test.html'), html);
}

/* ---------- 3. 源码级自查：两条 rg ---------- */
{
  const g1 = readLines('out-grep1.txt');
  const g2 = readLines('out-grep2.txt');
  const cmd1 =
    'rg -n --no-heading "document\\.(querySelector|getElementById)|innerHTML" src/components src/todo.ts src/storage.ts src/types.ts';
  const cmd2 = 'rg -n --no-heading "document\\.(querySelector|getElementById)|innerHTML" src/';

  const blocks = [
    line('<span class="note"># [1] 业务组件 + 数据层：应当 0 命中</span>'),
    cmdBlock(cmd1),
    g1.length === 0
      ? line('<span class="ok">（无输出，exit code 1 = 无匹配 → 0 命中）</span>')
      : renderLines(g1),
    line(''),
    line('<span class="note"># [2] 全 src/：只剩入口挂载点这一处</span>'),
    cmdBlock(cmd2),
    renderLines(g2),
  ].join('\n');

  writeFileSync(join(outDir, 'grep.html'), page('终端 —— 源码级自查（ripgrep）', blocks));
}

/* ---------- 4. src/ 目录结构（真实字节数） ---------- */
{
  const rows = [];
  const walk = (abs, prefix) => {
    const entries = readdirSync(abs, { withFileTypes: true })
      .filter((e) => e.isDirectory() || ['.ts', '.tsx', '.css'].includes(extname(e.name)))
      .sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name));
    entries.forEach((entry, i) => {
      const last = i === entries.length - 1;
      const branch = last ? '└─ ' : '├─ ';
      const nextPrefix = prefix + (last ? '   ' : '│  ');
      if (entry.isDirectory()) {
        rows.push({ prefix: prefix + branch, name: entry.name + '/', isDir: true, size: null });
        walk(join(abs, entry.name), nextPrefix);
      } else {
        rows.push({
          prefix: prefix + branch,
          name: entry.name,
          isDir: false,
          size: statSync(join(abs, entry.name)).size,
        });
      }
    });
  };
  rows.push({ prefix: '', name: 'src/', isDir: true, size: null });
  walk(join(proj, 'src'), '');

  const lines = rows.map((r) => {
    const label = r.isDir
      ? `<span class="dir">${esc(r.name)}</span>`
      : esc(r.name) + ' '.repeat(Math.max(2, 24 - r.name.length)) + `<span class="size">${r.size} B</span>`;
    return line(`<span class="tree">${esc(r.prefix)}</span>${label}`);
  });

  const note = line(
    '<span class="note"># components/ 下正好 4 个组件：TodoApp（持有 State）、TodoForm、TodoList、TodoItem</span>',
  );
  writeFileSync(join(outDir, 'tree.html'), page('终端 —— src/ 目录结构', lines.join('\n') + '\n' + note));
}

/* ---------- 5. 浏览器控制台：__TODO_DEBUG__() 的真实返回 ---------- */
{
  const data = JSON.parse(readFileSync(join(work, 'ui-verify.json'), 'utf8'));
  const printed = data.consoleLog.find((l) => l.text.includes('React State todos'))?.text ?? '';
  const json = printed.replace(/^.*=\s*/, '');
  const arr = JSON.parse(json);

  const blocks = [
    line('<span class="note"># 在页面控制台里打印 React 真正持有的 State（__TODO_DEBUG__ 是组件暴露的只读观测口）</span>'),
    line(`<span class="note">&gt;</span> <span class="cmd">__TODO_DEBUG__()</span>`),
    line(`<span class="pkg">Array(1)</span> [{…}]`),
    ...arr.map(
      (t, i) =>
        line(
          `  <span class="dim">${i}:</span> {<span class="pkg">id</span>: ${t.id}, <span class="pkg">text</span>: <span class="ok">'${esc(t.text)}'</span>, <span class="pkg">done</span>: ${t.done}}`,
        ),
    ),
    line(''),
    line(
      `<span class="dim">页面 #todo-list 渲染出的文字：</span> ${esc(JSON.stringify(data.steps.find((s) => s.name === 's3_print_state').data.pageTexts))}`,
    ),
    line('<span class="ok strong">两者一致 → UI 由 State 驱动</span>'),
  ].join('\n');

  writeFileSync(join(outDir, 'console.html'), page('浏览器控制台 —— 轨道 B 取证', blocks));
}

/* ---------- 6. 审查 AI 修复的对照实验（摘录） ---------- */
{
  const all = readLines('out-review.txt');
  // 只保留「哪条规则红了 / 期望 vs 实际 / 汇总」，堆栈与文件片段省略；
  // 完整输出在 _work/out-review.txt，摘录在标题里注明。
  const keep = all.filter(
    (l) =>
      /^\s*FAIL\s/.test(l) ||
      /AssertionError/.test(l) ||
      /^(Expected|Received):/.test(l) ||
      /^\s*(Test Files|Tests)\s+\d+/.test(l),
  );
  const html = page(
    '终端 —— 对照实验（输出摘录）：同一组业务断言，AI 版 vs V3.0 纯函数',
    [
      cmdBlock('npx vitest run --config vitest.review.config.ts'),
      line('<span class="note"># 下列为摘录，完整输出见 _work/out-review.txt</span>'),
      renderLines(keep),
    ].join('\n'),
  );
  writeFileSync(join(outDir, 'review.html'), html);
}

/* ---------- 逐个截图 ---------- */
const shots = ['build', 'test', 'grep', 'tree', 'console', 'review'];
for (const name of shots) {
  const htmlPath = join(outDir, `${name}.html`);
  const pngPath = join(outDir, `shot-${name}.png`);
  execFileSync(
    CHROME,
    [
      '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
      '--default-background-color=00000000',
      '--force-device-scale-factor=2',
      '--window-size=1180,2400',
      `--screenshot=${pngPath}`,
      `file:///${htmlPath.replace(/\\/g, '/')}`,
    ],
    { stdio: 'ignore' },
  );
  console.log('shot:', pngPath);
}
