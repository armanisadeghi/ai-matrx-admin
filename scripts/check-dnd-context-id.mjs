#!/usr/bin/env node
// scripts/check-dnd-context-id.mjs — EVERY <DndContext> CARRIES A STABLE `id`.
//
// dnd-kit numbers its screen-reader description ids from a module counter. Server and browser count
// differently, so a context without an `id` throws a hydration mismatch when it is server-rendered
// (the slide-rail bug). Fix: `id="…"` (fixed string) or `id={useId()}`.
//
//   pnpm check:dnd-context-id              scan the repo (exit 1 on a finding)
//   pnpm check:dnd-context-id --self-test  prove it fails without an id and passes with one
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

export function findings(file, text) {
  const out = [];
  for (const m of text.matchAll(/<DndContext(?=[\s>\/])/g)) {
    // The opening tag ends at the first `>` that is not part of `=>` and sits outside braces.
    let depth = 0;
    let end = m.index;
    for (let i = m.index + 1; i < text.length; i++) {
      const c = text[i];
      if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (c === ">" && depth === 0 && text[i - 1] !== "=") { end = i; break; }
    }
    const tag = text.slice(m.index, end);
    if (!/\sid=/.test(tag)) {
      out.push(`${file}:${text.slice(0, m.index).split("\n").length} <DndContext> has no id — add id="<stable-name>" or id={useId()} (hydration mismatch when server-rendered).`);
    }
  }
  return out;
}

function selfTest() {
  const red = findings("a.tsx", `<DndContext sensors={s} onDragEnd={(e) => go(e)}>x</DndContext>`);
  const green = [
    ...findings("a.tsx", `<DndContext id="a-dnd" sensors={s} onDragEnd={(e) => go(e)}>x</DndContext>`),
    ...findings("a.tsx", `<DndContext\n  id={useId()}\n  sensors={s}\n>`),
  ];
  if (red.length !== 1 || green.length !== 0) {
    console.error(`self-test FAILED: no-id findings=${red.length} (want 1), with-id findings=${green.length} (want 0)`);
    process.exit(1);
  }
  console.log("check:dnd-context-id self-test: a DndContext without an id is RED, with an id GREEN.");
}

if (process.argv.includes("--self-test")) {
  selfTest();
} else {
  const files = execFileSync("git", ["ls-files", "*.tsx"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).split("\n").filter(Boolean);
  const all = [];
  for (const f of files) {
    let text;
    try { text = readFileSync(f, "utf8"); } catch { continue; }
    if (!text.includes("<DndContext")) continue;
    all.push(...findings(f, text));
  }
  if (all.length) {
    console.error(`check:dnd-context-id: ${all.length} DndContext(s) without an id:\n${all.join("\n")}`);
    process.exit(1);
  }
  console.log(`check:dnd-context-id: every <DndContext> in ${files.length} tsx files has an id.`);
}
