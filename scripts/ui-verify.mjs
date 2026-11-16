/* ============================================================
   第 11 周 · 任务 2「轨道 B」的真实浏览器验证

   目的：证明 UI 是由 React State 驱动的，而不是靠手动 DOM 操作。
   做法：起本地 HTTP 服务跑 dist/ 生产构建 + CDP 驱动真实 Chrome，
        每一步只做「用户会做的动作」，再从两个地方取证：
          ① 页面（DOM 里看得见的结果）
          ② window.__TODO_DEBUG__()（React 真正持有的 State 数组）
        两者必须一致 —— 这才叫 State 驱动。

   用法：node scripts/ui-verify.mjs <distDir> <outJson>
   依赖：本机装有 Chrome（路径见 CHROME 常量）
   ============================================================ */

import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { spawn, execFileSync } from 'node:child_process';

const distDir = process.argv[2] ?? 'dist';
const outFile = process.argv[3] ?? '_work/ui-verify.json';
const shotDir = join(dirname(outFile), 'shots');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9491;
const CDP_PORT = 9501;
const VIEW = { width: 900, height: 1100 };

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    const buf = await readFile(join(distDir, p));
    res.writeHead(200, { 'Content-Type': MIME[extname(p).toLowerCase()] ?? 'application/octet-stream' });
    res.end(buf);
  } catch {
    res.writeHead(404).end('not found');
  }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const appUrl = `http://127.0.0.1:${PORT}/index.html`;

const profile = join(process.env.TEMP, 'w11_' + Math.random().toString(36).slice(2, 10));
const chrome = spawn(
  CHROME,
  [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--disable-sync', '--mute-audio', '--hide-scrollbars',
    '--force-device-scale-factor=2',
    `--window-size=${VIEW.width},${VIEW.height}`,
    `--remote-debugging-port=${CDP_PORT}`, '--remote-allow-origins=*',
    `--user-data-dir=${profile}`, 'about:blank',
  ],
  { stdio: 'ignore' },
);

async function waitChrome() {
  for (let i = 0; i < 200; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
      if (r.ok) return (await r.json()).Browser;
    } catch { /* 还没起来 */ }
    await sleep(120);
  }
  throw new Error('chrome did not start');
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  const listeners = [];
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id !== undefined && pending.has(m.id)) {
      const { resolve, reject } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
    } else if (m.method) {
      listeners.forEach((f) => f(m));
    }
  });
  const ready = new Promise((res, rej) => {
    ws.addEventListener('open', res);
    ws.addEventListener('error', rej);
  });
  const send = (method, params = {}) => {
    const mid = ++id;
    ws.send(JSON.stringify({ id: mid, method, params }));
    return new Promise((resolve, reject) => {
      pending.set(mid, { resolve, reject });
      setTimeout(() => {
        if (pending.has(mid)) {
          pending.delete(mid);
          reject(new Error('timeout ' + method));
        }
      }, 30000);
    });
  };
  const evalJs = async (expression, awaitPromise = false) => {
    const r = await send('Runtime.evaluate', {
      expression, returnByValue: true, awaitPromise, userGesture: true,
    });
    if (r.exceptionDetails) {
      const d = r.exceptionDetails;
      throw new Error('page threw: ' + (d.exception?.description ?? d.text));
    }
    return r.result.value;
  };
  const shot = async (file) => {
    const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(file, Buffer.from(data, 'base64'));
  };
  return { ready, send, evalJs, shot, on: (f) => listeners.push(f), ws };
}

/* 页面侧的辅助函数：只读 DOM、模拟用户输入，不做任何业务计算 */
const HELPERS = `
function rows() { return Array.prototype.slice.call(document.querySelectorAll('#todo-list .todo-item')); }
function texts() { return rows().map(function (li) { return li.querySelector('.todo-text').textContent; }); }
function inputEl() { return document.querySelector('#todo-input'); }
function counter() { return document.querySelector('#todo-count').textContent; }
function stateTexts() {
  var read = window.__TODO_DEBUG__;
  if (!read) return null;
  return read().map(function (t) { return t.text; });
}
function stateLen() {
  var read = window.__TODO_DEBUG__;
  return read ? read().length : -1;
}
function setInput(v) {
  var el = inputEl();
  var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(el, v);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}
function clickAdd() { document.querySelector('#add-btn').click(); }
function tick() { return new Promise(function (r) { requestAnimationFrame(function () { requestAnimationFrame(r); }); }); }
`;

const results = { appUrl, browser: null, view: VIEW, steps: [], consoleErrors: [], consoleLog: [] };
const errors = [];

try {
  results.browser = await waitChrome();
  const target = await (
    await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' })
  ).json();
  const cdp = connect(target.webSocketDebuggerUrl);
  await cdp.ready;
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: VIEW.width, height: VIEW.height, deviceScaleFactor: 2, mobile: false,
  });

  cdp.on((m) => {
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      errors.push((d.exception?.description ?? d.text ?? '').split('\n')[0]);
    }
    if (m.method === 'Runtime.consoleAPICalled') {
      const text = (m.params.args ?? []).map((a) => a.value ?? a.description ?? '').join(' ');
      results.consoleLog.push({ type: m.params.type, text });
    }
  });

  await cdp.send('Page.navigate', { url: appUrl });
  await sleep(800);
  await cdp.evalJs('localStorage.clear(); "ok"');
  await cdp.send('Page.reload', { ignoreCache: true });
  await sleep(900);

  async function step(name, fn) {
    const before = errors.length;
    let data = null;
    let err = null;
    try {
      data = await cdp.evalJs(`(async () => { ${HELPERS} ${fn} })()`, true);
    } catch (e) {
      err = String(e.message);
    }
    results.steps.push({ name, error: err, newErrors: errors.slice(before), data });
    console.log(`[${name}] ${err ? 'THREW ' + err : 'ok'}`);
    return data;
  }

  /* ---- 步骤 1：空状态 ---- */
  await step('s1_fresh', `
    return { rows: rows().length, counter: counter(), stateLen: stateLen(), emptyShown: !!document.querySelector('#empty-state') };
  `);

  /* ---- 步骤 2：输入「任务A」点添加 —— 对应表格第 1 行 ---- */
  await step('s2_add_A', `
    setInput('任务A'); await tick();
    var typed = inputEl().value;
    clickAdd(); await tick();
    return {
      typedBeforeClick: typed,
      inputValueAfter: inputEl().value,
      rows: rows().length,
      texts: texts(),
      stateTexts: stateTexts(),
      counter: counter(),
    };
  `);

  /* ---- 步骤 3：控制台打印 todos（真实 console.log，输出会被 CDP 抓到）---- */
  await step('s3_print_state', `
    var arr = window.__TODO_DEBUG__();
    console.log('[轨道B] React State todos =', JSON.stringify(arr));
    await tick();
    return {
      printedJson: JSON.stringify(arr),
      pageTexts: texts(),
      sameAsPage: JSON.stringify(arr.map(function (t) { return t.text; })) === JSON.stringify(texts()),
    };
  `);

  /* ---- 步骤 4：点「完成」（复选框）—— 对应表格第 3 行 ---- */
  await step('s4_toggle', `
    var li = rows()[0];
    var check = li.querySelector('.todo-check');
    check.click(); await tick();
    var span = rows()[0].querySelector('.todo-text');
    var cs = getComputedStyle(span);
    return {
      firstRowClass: rows()[0].className,
      textDecoration: cs.textDecorationLine || cs.textDecoration,
      textColor: cs.color,
      checked: rows()[0].querySelector('.todo-check').checked,
      stateDone: window.__TODO_DEBUG__().map(function (t) { return t.done; }),
      counter: counter(),
    };
  `);

  /* 再补两条任务并截图（任务 1 的「跑通页面截图」） */
  await step('s5_seed_for_shot', `
    setInput('准备周会材料'); await tick(); clickAdd(); await tick();
    setInput('评审 V4.0 的组件拆分'); await tick(); clickAdd(); await tick();
    return { texts: texts(), stateTexts: stateTexts(), counter: counter() };
  `);

  await mkdir(shotDir, { recursive: true });
  await cdp.shot(join(shotDir, 'react-page.png'));
  console.log('shot: react-page.png');

  /* ---- 步骤 6：删除 —— 对应表格第 4 行 ---- */
  await step('s6_delete', `
    var beforeRows = rows().length, beforeState = stateLen();
    var delBtn = rows()[0].querySelector('.btn-del');
    delBtn.click(); await tick();
    return {
      beforeRows: beforeRows,
      beforeStateLen: beforeState,
      afterRows: rows().length,
      afterStateLen: stateLen(),
      texts: texts(),
      stateTexts: stateTexts(),
      counter: counter(),
    };
  `);

  /* ---- 步骤 7：刷新后仍一致（State → localStorage → State） ---- */
  await cdp.send('Page.reload', { ignoreCache: true });
  await sleep(900);
  await step('s7_after_reload', `
    return { rows: rows().length, texts: texts(), stateTexts: stateTexts(), counter: counter() };
  `);
} catch (e) {
  results.fatal = String((e && e.stack) || e);
  console.error('FATAL ' + results.fatal);
} finally {
  results.consoleErrors = errors;
  await mkdir(dirname(outFile), { recursive: true });
  await writeFile(outFile, JSON.stringify(results, null, 2), 'utf8');
  console.log('wrote ' + outFile);
  try { server.close(); } catch { /* ignore */ }
  try { execFileSync('taskkill', ['/PID', String(chrome.pid), '/T', '/F'], { stdio: 'ignore' }); } catch { /* ignore */ }
  process.exit(0);
}
