#!/usr/bin/env node
/**
 * Real walk (owner, 2026-10-22): Copy on a user message copies the WHOLE message — its variable,
 * its image as an @reference (`@[name](file:<uuid>)`) and its text — and pasting that copy into
 * the composer gives back the image chip, not a plain name.
 *
 * Chat Plumbing Test Agent (Haiku, common-docs operations/real-tests/CHEAP-TEST-AGENTS.md) as
 * admin@admin.com. usage: node chat-copy-whole-message.mjs <origin> <shots-dir>
 * Prints the clipboard text and the conversation id (delete it after the walk).
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { mintSessionCookies } from "./session-cookies.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const origin = (process.argv[2] || "https://www.aimatrx.com").replace(/\/$/, "");
const shots = process.argv[3] || fs.mkdtempSync("/tmp/chat-copy-walk-");
fs.mkdirSync(shots, { recursive: true });
const AGENT = "ccab43ad-05e4-45d6-a49f-8e5605ed66f5";
const isLocal = /^http:\/\/[a-z0-9-]+\.localhost:\d+$/.test(origin);
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
};

function logoPng() {
  const zlib = require("node:zlib");
  const w = 48, h = 48;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = y * (w * 4 + 1) + 1 + x * 4;
    const inner = x > 10 && x < 38 && y > 10 && y < 38;
    raw[o] = inner ? 20 : 220; raw[o + 1] = inner ? 120 : 180; raw[o + 2] = inner ? 90 : 60; raw[o + 3] = 255;
  }
  const table = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; }
  const crc = (buf) => { let r = 0xffffffff; for (const b of buf) r = table[(r ^ b) & 0xff] ^ (r >>> 8); return (r ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

async function signedInContext(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin });
  if (isLocal) {
    const out = execFileSync("pnpm", ["-s", "dev-login", `/chat/a/${AGENT}`], { cwd: new URL("../..", import.meta.url).pathname, encoding: "utf8" });
    const url = out.match(/OPEN\s*:\s*(\S+)/)?.[1] ?? out.match(/(http:\/\/\S+dev-login\S+)/)?.[1];
    if (!url) throw new Error("dev-login printed no URL");
    const p = await ctx.newPage();
    await p.goto(url, { waitUntil: "load", timeout: 420000 });
    await p.close();
  } else {
    const { cookies } = await mintSessionCookies();
    await ctx.addCookies(cookies);
  }
  return ctx;
}

const shot = (page, name) => page.screenshot({ path: path.join(shots, `${name}.png`) });

async function paste(page, { b64, text }) {
  await page.evaluate(({ data, words }) => {
    const dt = new DataTransfer();
    if (data) {
      const bin = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
      dt.items.add(new File([bin], "brand-logo.png", { type: "image/png" }));
    }
    if (words) dt.setData("text/plain", words);
    const target = document.querySelector("textarea[data-agent-main-input]") || document.querySelector("textarea");
    target.focus();
    target.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  }, { data: b64 ?? null, words: text ?? null });
}

const browser = await chromium.launch({ headless: true });
let conversationId = null;
try {
  const ctx = await signedInContext(browser);
  const page = await ctx.newPage();
  await page.goto(`${origin}/chat/a/${AGENT}`, { waitUntil: "load", timeout: 300000 });
  const variable = page.locator('[placeholder^="Enter a one-line"]').first();
  await variable.waitFor({ timeout: 180000 });
  await variable.click();
  await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
  await variable.fill("Say ok.");
  await paste(page, { b64: logoPng().toString("base64") });
  await page.waitForTimeout(8000);
  const box = page.locator("textarea[data-agent-main-input]").first();
  await box.click();
  await page.keyboard.type("The brand logo is attached");
  await shot(page, "1-before-send");
  await page.getByRole("button", { name: "Send message" }).first().click();
  await page.waitForTimeout(4000);
  await page.getByRole("button", { name: "Send message" }).first().waitFor({ timeout: 120000 });
  await page.waitForTimeout(3000);
  conversationId = page.url().match(/[0-9a-f-]{36}(?!.*[0-9a-f-]{36})/)?.[0] ?? null;

  const bubble = page.locator("[data-message-id]").filter({ hasText: "The brand logo is attached" }).first();
  await bubble.hover();
  await page.waitForTimeout(500);
  await bubble.locator("[data-copy-split-main]").first().click();
  await page.waitForTimeout(800);
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  await shot(page, "2-after-copy");
  console.log("CLIPBOARD-BEGIN\n" + clip + "\nCLIPBOARD-END");
  check("copy carries the variable", /Test Request: Say ok\./.test(clip));
  check("copy carries the image as an @reference", /@\[brand-logo\.png\]\(file:[0-9a-f-]{36}\)/.test(clip));
  check("copy ends with the typed text", clip.trim().endsWith("The brand logo is attached"));

  await box.click();
  await paste(page, { text: clip });
  await page.waitForTimeout(3000);
  const composer = await page.evaluate(() => {
    const ta = document.querySelector("textarea[data-agent-main-input]");
    const root = ta?.closest("form") ?? ta?.parentElement?.parentElement?.parentElement?.parentElement ?? document.body;
    return { value: ta?.value ?? null, chipText: root.innerText };
  });
  await shot(page, "3-after-paste");
  check("pasted text keeps the words, not the reference", !!composer.value && composer.value.includes("The brand logo is attached") && !composer.value.includes("file:"), JSON.stringify(composer.value));
  check("pasted reference came back as the image chip", /brand-logo/.test(composer.chipText), composer.chipText.slice(0, 300));
  check("copy names the sent context when the bubble shows it", !/items?\b/.test(await bubble.innerText()) || /Sent with this message: /.test(clip), clip.split("\n").find((l) => l.startsWith("Sent with")) ?? "(no chip shown)");

  // A NEW chat with the same agent: the pasted variable line fills its declared variable.
  console.log(JSON.stringify({ conversationId }));
  const page2 = await ctx.newPage();
  await page2.goto(`${origin}/chat/a/${AGENT}`, { waitUntil: "load", timeout: 300000 });
  const fresh = page2.locator('[placeholder^="Enter a one-line"]').first();
  await fresh.waitFor({ timeout: 180000 });
  await fresh.fill("");
  await page2.locator("textarea[data-agent-main-input]").first().click();
  await paste(page2, { text: clip });
  await page2.waitForTimeout(3000);
  const filled = await fresh.inputValue();
  const words = await page2.locator("textarea[data-agent-main-input]").first().inputValue();
  await shot(page2, "4-paste-into-new-chat");
  check("pasted Test Request line fills the agent's variable", filled === "Say ok.", JSON.stringify(filled));
  check("the filled variable line is not left in the text", !words.includes("Test Request") && words.includes("The brand logo is attached"), JSON.stringify(words));
  console.log(JSON.stringify({ conversationId, url: page.url(), shots, results }));
} finally {
  await browser.close();
}
process.exit(results.every((r) => r.ok) ? 0 : 1);
