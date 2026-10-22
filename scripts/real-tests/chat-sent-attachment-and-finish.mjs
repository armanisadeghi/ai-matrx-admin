#!/usr/bin/env node
/**
 * Real walk for two chat defects (owner, 2026-10-22):
 *  1. A message sent with an image shows the image on the sent bubble (from send on),
 *     and the composer marks the conversation file as kept ("Kept for every message").
 *  2. An answer the server finished always shows complete with no working orb — after
 *     switching away and back mid-stream, and after the connection drops mid-stream.
 *
 * Uses the Chat Plumbing Test Agent (Haiku, common-docs operations/real-tests/CHEAP-TEST-AGENTS.md)
 * as admin@admin.com. usage: node chat-sent-attachment-and-finish.mjs <origin> <shots-dir>
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { mintSessionCookies } from "./session-cookies.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const origin = (process.argv[2] || "https://www.aimatrx.com").replace(/\/$/, "");
const shots = process.argv[3] || fs.mkdtempSync("/tmp/chat-walk-");
fs.mkdirSync(shots, { recursive: true });
const AGENT = "ccab43ad-05e4-45d6-a49f-8e5605ed66f5";
const isLocal = /^http:\/\/[a-z0-9-]+\.localhost:\d+$/.test(origin);
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
};

// A small real PNG (a 64x64 logo-like square), written to disk once.
function logoPng() {
  const zlib = require("node:zlib");
  const w = 64, h = 64;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const o = y * (w * 4 + 1) + 1 + x * 4;
      const inner = x > 12 && x < 52 && y > 12 && y < 52;
      raw[o] = inner ? 30 : 200; raw[o + 1] = inner ? 90 : 170; raw[o + 2] = inner ? 160 : 120; raw[o + 3] = 255;
    }
  }
  const crc = (buf) => { let c, crcTable = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcTable[n] = c >>> 0; } let r = 0xffffffff; for (const b of buf) r = crcTable[(r ^ b) & 0xff] ^ (r >>> 8); return (r ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

async function signedInContext(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  if (isLocal) {
    const out = execFileSync("pnpm", ["-s", "dev-login", `/chat/a/${AGENT}`], { cwd: new URL("../..", import.meta.url).pathname, encoding: "utf8" });
    const url = out.match(/OPEN\s*:\s*(\S+)/)?.[1];
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
const orbCount = (page) => page.locator('[class*="top-[3px]"]').count();
async function waitIdle(page, ms = 120000) {
  await page.getByRole("button", { name: "Send message" }).first().waitFor({ timeout: ms });
}

async function pasteImage(page, b64) {
  await page.evaluate((data) => {
    const bin = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
    const file = new File([bin], "brand-logo.png", { type: "image/png" });
    const dt = new DataTransfer();
    dt.items.add(file);
    const target = document.querySelector("[data-agent-main-input] textarea, textarea[data-agent-main-input], [data-agent-main-input]") || document.querySelector("textarea");
    target.focus();
    target.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  }, b64);
}

const browser = await chromium.launch({ headless: true });
try {
  const ctx = await signedInContext(browser);
  const page = await ctx.newPage();
  await page.goto(`${origin}/chat/a/${AGENT}`, { waitUntil: "load", timeout: 300000 });
  const variable = page.locator('[placeholder^="Enter a one-line"]').first();
  await variable.waitFor({ timeout: 180000 });
  await variable.click();
  await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
  await variable.fill("Give me the formatted reply.");
  await pasteImage(page, logoPng().toString("base64"));
  await page.waitForTimeout(8000); // upload settles (the chip holds Send while resolving)
  await shot(page, "1-before-send");
  await page.getByRole("button", { name: "Send message" }).first().click();
  await page.waitForTimeout(1500);
  await shot(page, "2-just-sent");
  const sentStrip = await page.evaluate(() => {
    const bubble = document.querySelector('[data-user-message-style]');
    if (!bubble) return { bubble: false };
    const clamp = bubble.querySelector(".max-h-24");
    const tiles = [...bubble.querySelectorAll("button, [role=button]")].filter((b) => /brand-logo|image/i.test(b.getAttribute("aria-label") || b.textContent || ""));
    return { bubble: true, tiles: tiles.length, hidden: tiles.some((t) => clamp && clamp.contains(t)) };
  });
  check("sent bubble shows the image right after send", sentStrip.bubble && sentStrip.tiles > 0 && !sentStrip.hidden, JSON.stringify(sentStrip));
  await waitIdle(page);
  await page.waitForTimeout(3000);
  await shot(page, "3-after-answer");
  const kept = await page.locator("[data-kept-attachment]").count();
  check("composer marks the sent image as kept for every message", kept > 0, `kept chips: ${kept}`);
  const conversationUrl = page.url();
  check("first answer finished (no orb)", (await orbCount(page)) === 0);

  // 2a. Switch away mid-stream and back.
  const box = page.locator("[data-agent-main-input]").first();
  await box.click();
  await page.keyboard.type("Give me the formatted reply again, longer.");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(700);
  await page.goto(`${origin}/chat/a/${AGENT}`, { waitUntil: "load", timeout: 300000 });
  await page.waitForTimeout(12000);
  await page.evaluate(() => history.back());
  await page.waitForTimeout(15000);
  await shot(page, "4-after-switch-back");
  check("after switching away mid-stream and back: answer complete, no orb", (await orbCount(page)) === 0);

  // 2b. Connection drops mid-stream (the reader dies without an end event).
  await box.click();
  await page.keyboard.type("Give me the formatted reply once more.");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(800);
  await ctx.setOffline(true);
  await page.waitForTimeout(20000);
  await ctx.setOffline(false);
  await page.waitForTimeout(45000);
  await shot(page, "5-after-offline");
  check("after the connection dropped mid-stream: answer complete, no orb", (await orbCount(page)) === 0);
  console.log(JSON.stringify({ conversationUrl, shots, results }));
} finally {
  await browser.close();
}
process.exit(results.every((r) => r.ok) ? 0 : 1);
