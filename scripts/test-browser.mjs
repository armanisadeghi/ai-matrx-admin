#!/usr/bin/env node
// test-browser.mjs — a persistent headless Chromium per runner name, driven by short CLI commands.
// Replaces the Claude desktop in-app pane for test runners (the pane hides itself under load).
//
//   node scripts/test-browser.mjs start --name r1 [--route /dashboard] [--width 1440 --height 900]
//   node scripts/test-browser.mjs goto <url> --name r1
//   ... click "<text|css>" | type "<sel>" "<text>" | press <key> | text [sel] | screenshot <path>
//   ... eval "<js>" | heap | console [--errors] | wait-text "<text>" [--timeout s] | stop
//
// --name defaults to $MATRX_PREVIEW_SESSION. State: $TMPDIR/matrx-test-browser/<name>.{sock,json}.
// Sign-in uses `pnpm dev-login` (single-use nonce for <name>.localhost:3001); no credential is ever printed.
import net from 'node:net';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { releaseWalkSlot } from './lib/walk-release.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const STATE = path.join(process.env.TMPDIR || os.tmpdir(), 'matrx-test-browser');
const IDLE_MS = 30 * 60 * 1000;
const CMD_TIMEOUT_MS = 90 * 1000;

function parseArgs(argv) {
  const pos = [], flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const nxt = argv[i + 1];
      if (nxt === undefined || nxt.startsWith('--')) flags[k] = true;
      else { flags[k] = nxt; i++; }
    } else pos.push(a);
  }
  return { pos, flags };
}
const sockPath = (n) => path.join(STATE, `${n}.sock`);
const metaPath = (n) => path.join(STATE, `${n}.json`);
const safeName = (n) => /^[A-Za-z0-9_-]{1,40}$/.test(n || '');

// ---------------------------------------------------------------- daemon
async function serve(name) {
  const { chromium } = await import(path.join(REPO, 'node_modules/playwright/index.mjs'));
  const width = +process.env.TB_WIDTH || 1440, height = +process.env.TB_HEIGHT || 900;
  const startUrl = process.env.TB_URL;
  delete process.env.TB_URL;
  const browser = await chromium.launch({ headless: true, args: ['--enable-precise-memory-info'] });
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  const logs = [];
  page.on('console', (m) => (logs.length > 5000 && logs.splice(0, 1000), logs.push({ type: m.type(), text: m.text().slice(0, 2000) })));
  page.on('pageerror', (e) => logs.push({ type: 'error', text: `pageerror: ${String(e.message).slice(0, 2000)}` }));
  page.on('framenavigated', (f) => { if (f === page.mainFrame()) logs.push({ type: 'nav', text: f.url().replace(/nonce=[^&]*/, 'nonce=***') }); });
  let idle;
  const bump = () => { clearTimeout(idle); idle = setTimeout(() => shutdown(), IDLE_MS); };
  async function shutdown() {
    // Free the live-walk-cap slot at once; waiting for the server's 10-minute idle rule kept the cap full (MKT-174).
    try { await releaseWalkSlot(page.url()); } catch {}
    try { server.close(); } catch {}
    try { await browser.close(); } catch {}
    try { fs.unlinkSync(sockPath(name)); } catch {}
    try { fs.unlinkSync(metaPath(name)); } catch {}
    process.exit(0);
  }
  const sel = (s) => page.locator(s).first();
  const handlers = {
    async goto({ url }) { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); return { url: page.url().replace(/nonce=[^&]*/, 'nonce=***'), title: await page.title() }; },
    async click({ target }) {
      // CSS when it looks like a selector (. # [ > : or a bare tag), otherwise visible text; each falls back to the other.
      const looksCss = /[.#\[\]>:=]/.test(target) || /^(button|a|input|textarea|select|svg|li|tr|td|th|h[1-6])$/.test(target);
      const byText = () => page.getByText(target, { exact: false }).locator("visible=true").first().click({ timeout: 6000 });
      const byCss = () => sel(target).click({ timeout: 6000 });
      const [first, second] = looksCss ? [byCss, byText] : [byText, byCss];
      try { await first(); return { clicked: looksCss ? "css" : "text" }; } catch { await second(); return { clicked: looksCss ? "text" : "css" }; }
    },
    async type({ selector, text }) { const l = sel(selector); await l.click({ timeout: 8000 }); await l.pressSequentially(text, { delay: 15 }); return { typed: text.length }; },
    async press({ key }) { await page.keyboard.press(key); return { pressed: key }; },
    async text({ selector }) { return { text: selector ? await sel(selector).innerText({ timeout: 8000 }) : await page.innerText('body') }; },
    async screenshot({ file }) { await page.screenshot({ path: file }); return { file }; },
    async eval({ js }) { const v = await page.evaluate(`(async()=>{return (${js})})()`).catch(() => page.evaluate(js)); return { value: v === undefined ? null : v }; },
    async heap() {
      const v = await page.evaluate(() => {
        if (window.__matrxTestMemory?.heapMb) return { mb: window.__matrxTestMemory.heapMb(), via: '__matrxTestMemory' };
        return performance.memory ? { mb: Math.round(performance.memory.usedJSHeapSize / 1048576), via: 'performance.memory' } : { mb: null, via: 'none' };
      });
      return v;
    },
    async console({ errors }) {
      const out = logs.filter((l) => !errors || l.type === 'error');
      return { count: out.length, entries: out.slice(-100) };
    },
    async 'wait-text'({ text, timeout }) {
      const t0 = Date.now();
      await page.waitForFunction((t) => document.body.innerText.includes(t), text, { timeout: (timeout || 30) * 1000, polling: 250 });
      return { waitedMs: Date.now() - t0 };
    },
    async stop() { setTimeout(shutdown, 50); return { stopped: true }; },
  };
  fs.mkdirSync(STATE, { recursive: true });
  try { fs.unlinkSync(sockPath(name)); } catch {}
  const server = net.createServer((c) => {
    let buf = '';
    c.on('data', async (d) => {
      buf += d;
      if (!buf.includes('\n')) return;
      const req = JSON.parse(buf.split('\n')[0]); buf = '';
      bump();
      try {
        const r = await Promise.race([
          handlers[req.cmd](req.args || {}),
          new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout after ${CMD_TIMEOUT_MS / 1000}s`)), (req.args?.timeout ? req.args.timeout * 1000 + 5000 : CMD_TIMEOUT_MS))),
        ]);
        c.end(JSON.stringify({ ok: true, ...r }) + '\n');
      } catch (e) { c.end(JSON.stringify({ ok: false, error: String(e.message).split('\n')[0] }) + '\n'); }
    });
  });
  server.listen(sockPath(name));
  fs.writeFileSync(metaPath(name), JSON.stringify({ pid: process.pid, started: Date.now() }));
  bump();
  if (startUrl) {
    try { await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 90000 }); } catch (e) { logs.push({ type: 'error', text: `start goto: ${e.message.split('\n')[0]}` }); }
  }
}

// ---------------------------------------------------------------- client
function send(name, cmd, args, limitMs = CMD_TIMEOUT_MS + 10000) {
  return new Promise((resolve, reject) => {
    const c = net.connect(sockPath(name));
    let buf = '';
    const to = setTimeout(() => { c.destroy(); reject(new Error('command timed out')); }, limitMs);
    c.on('connect', () => c.write(JSON.stringify({ cmd, args }) + '\n'));
    c.on('data', (d) => (buf += d));
    c.on('end', () => { clearTimeout(to); try { resolve(JSON.parse(buf)); } catch { reject(new Error('bad reply')); } });
    c.on('error', (e) => { clearTimeout(to); reject(new Error(e.code === 'ENOENT' || e.code === 'ECONNREFUSED' ? `no session "${name}" — run start --name ${name}` : e.message)); });
  });
}

async function main() {
  const { pos, flags } = parseArgs(process.argv.slice(2));
  const [cmd, ...rest] = pos;
  if (cmd === '__serve') return serve(rest[0]);
  const name = flags.name || process.env.MATRX_PREVIEW_SESSION;
  if (!cmd || !safeName(name)) { console.error('usage: test-browser.mjs <start|goto|click|type|press|text|screenshot|eval|heap|console|wait-text|stop> --name <runner> ...'); process.exit(2); }

  if (cmd === 'start') {
    if (fs.existsSync(sockPath(name))) {
      const r = await send(name, 'heap', {}, 5000).catch(() => null);
      if (r?.ok) { console.log(`already running: ${name}`); return; }
    }
    const route = flags.route || rest[0] || '/dashboard';
    const dl = spawnSync('bash', ['scripts/dev-login.sh', route], { cwd: REPO, env: { ...process.env, MATRX_PREVIEW_SESSION: name }, encoding: 'utf8' });
    const m = /OPEN\s*:\s*(\S+)/.exec(dl.stdout || '');
    if (!m) { console.error(`dev-login failed: ${(dl.stderr || dl.stdout || '').replace(/nonce=\w+/g, 'nonce=***').trim().slice(0, 400)}`); process.exit(1); }
    fs.mkdirSync(STATE, { recursive: true });
    const child = spawn(process.execPath, [fileURLToPath(import.meta.url), '__serve', name], {
      detached: true, stdio: 'ignore',
      env: { ...process.env, TB_URL: m[1], TB_WIDTH: String(flags.width || 1440), TB_HEIGHT: String(flags.height || 900) },
    });
    child.unref();
    const t0 = Date.now();
    for (;;) {
      if (Date.now() - t0 > 60000) { console.error('browser did not start'); process.exit(1); }
      if (fs.existsSync(sockPath(name))) { const r = await send(name, 'heap', {}, 5000).catch(() => null); if (r?.ok) break; }
      await new Promise((r) => setTimeout(r, 300));
    }
    // wait for sign-in redirect to land
    await send(name, 'wait-text', { text: '', timeout: 1 }).catch(() => {});
    const u = await send(name, 'eval', { js: 'location.pathname' }).catch(() => ({}));
    console.log(`started ${name} at ${u.value ?? '?'} (idle auto-stop 30 min)`);
    return;
  }

  const a = {};
  switch (cmd) {
    case 'goto': a.url = rest[0]; if (/^\//.test(a.url)) { const h = await send(name, 'eval', { js: 'location.origin' }); a.url = h.value + a.url; } break;
    case 'click': a.target = rest[0]; break;
    case 'type': a.selector = rest[0]; a.text = rest[1]; break;
    case 'press': a.key = rest[0]; break;
    case 'text': a.selector = rest[0]; break;
    case 'screenshot': a.file = path.resolve(rest[0]); break;
    case 'eval': a.js = rest[0]; break;
    case 'console': a.errors = !!flags.errors; break;
    case 'wait-text': a.text = rest[0]; a.timeout = flags.timeout ? +flags.timeout : 30; break;
    case 'heap': case 'stop': break;
    default: console.error(`unknown command ${cmd}`); process.exit(2);
  }
  const t0 = Date.now();
  let r;
  try { r = await send(name, cmd, a, a.timeout ? a.timeout * 1000 + 15000 : undefined); } catch (e) { console.error(e.message); process.exit(1); }
  if (!r.ok) { console.error(`FAIL ${cmd}: ${r.error}`); process.exit(1); }
  const ms = Date.now() - t0;
  if (cmd === 'text') console.log(r.text);
  else if (cmd === 'heap') console.log(`${r.mb} MB (${r.via})`);
  else if (cmd === 'console') { console.log(`${r.count} ${flags.errors ? 'error ' : ''}entries`); for (const e of r.entries) console.log(`[${e.type}] ${e.text}`); }
  else if (cmd === 'eval') console.log(typeof r.value === 'string' ? r.value : JSON.stringify(r.value));
  else { const { ok, ...rest2 } = r; console.log(`ok ${cmd} ${ms}ms ${JSON.stringify(rest2)}`); }
}
main().catch((e) => { console.error(e.message); process.exit(1); });
