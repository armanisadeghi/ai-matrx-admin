#!/usr/bin/env node
// check-mandate-host-values — EVERY MANDATE THE FRONTEND CALLS WHOSE PROVISION
// DECLARES MAPPED-ONLY VALUES HAS A FILE THAT SENDS THEM.
//
// A mapped-only value (`mapped_offer`, pass_by_name=False) reaches a Holder
// only when the call site SUPPLIES it as an offered value on the mandate door
// (`variables`) — pushed context never counts. A frontend place that calls such
// a mandate but sends nothing leaves every mapping a binding author draws
// empty, silently. The census of 2026-10-18 found 9 such places by hand; this
// finds the next one by machine.
//
// HOW
//   1. features/mandates/host-values/mapped-only-values.json — mandate key →
//      {provision, mapped_only[]}, dumped from aidream's declare_provision
//      registry (regenerate: see that file's sibling sites.ts header).
//   2. Every tracked app source file (features/ components/ app/ lib/ hooks/
//      providers/; tests excluded) is scanned for a reference to each key:
//      `MANDATE_KEYS.<a>__<b>`, the literal "<a>.<b>", or a constant aliased
//      to either (`export const X = MANDATE_KEYS.<a>__<b>` → every file naming X).
//   3. A key passes when at least one referencing file SENDS offered values:
//      `variables`, `hostValues`, `provideHostValues(` / `useMandateHostValues(`,
//      `initialVariableValues`, or `contextItems=` (ProTextareaAgentPanel turns
//      its items into `variables` on the mandate door).
//   4. A key that fails and is NOT in the baseline fails the check. The
//      baseline (UNWIRED_BASELINE below) only shrinks: a baseline key that now
//      passes is reported so it can be deleted.
//
// Run: node scripts/check-mandate-host-values.mjs [--self-test]
//   --self-test plants an unwired call site in a temp copy of the scan and
//   proves the check goes RED, then GREEN without it.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAPPED = JSON.parse(
  readFileSync(path.join(ROOT, "features/mandates/host-values/mapped-only-values.json"), "utf8"),
);
const SCAN_ROOTS = ["features", "components", "app", "lib", "hooks", "providers"];

// Frontend-referenced mandates that send no offered values yet. Each is a
// known gap with a home; the list only shrinks. (2026-10-18)
export const UNWIRED_BASELINE = new Set([
  "alchemy.prepare_content",
  "ambient.spoken_summary",
  "code_editor.dynamic_context_edit",
  "code_editor.prompt_app_ui_edit",
  "content_ir.component_artisan",
  "content_plan.brief_writer",
  "conversation.action_auditor",
  "conversation.decision_ledger",
  "conversation.drift_auditor",
  "conversation.outcome_summarizer",
  "conversation.vision_interviewer",
  "education.grade_work_guidance",
  "education.page_guidance",
  "education.planner_guidance",
  "education.practice_oral_guidance",
  "education.progress_guidance",
  "education.tutor_guidance",
  "messaging.action_item_extraction",
  "messaging.conversation_catch_up",
  "messaging.conversation_summary",
  "messaging.reply_drafting",
  "podcast_client.topic_ideas",
  "transcripts.clean_with_context",
  "transcripts.clean_with_context_variable",
  "transcripts.clean_without_context",
]);

// A file that NAMES a key without calling it (a label on a followed-work step,
// a link) is not a call site. "file::key", each with its reason.
const REFERENCE_ONLY = new Set([
  // Labels the battle's pairwise-judge step in the followed-work timeline; the
  // judge runs server-side (aidream evaluators), never from this file.
  "features/ai-watch/followed-work-resolve.ts::evaluators.comparative_judge",
]);

const SENDS = [
  /\bvariables\b/,
  /\bhostValues\b/,
  /\bprovideHostValues\(/,
  /\buseMandateHostValues\(/,
  /\binitialVariableValues\b/,
  /\bcontextItems=/,
];

function trackedSources() {
  const out = execFileSync("git", ["ls-files", "-z", "--", ...SCAN_ROOTS.map((r) => `:(top)${r}/`)], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
  return out
    .split("\0")
    .filter((f) => /\.(ts|tsx|mts|js|jsx|mjs)$/.test(f))
    .filter((f) => !/(__tests__|\.test\.|\.spec\.)/.test(f));
}


/** files: [{file, source}], keys: mandate keys → Map key → Set of files that reference it. */
export function referencesByKey(files, keys) {
  const known = new Set(keys);
  const byIdent = new Map([...known].map((k) => [k.replace(/\./g, "__"), k]));
  const refRe = /MANDATE_KEYS\.([A-Za-z0-9_]+)|["'`]([a-z0-9_]+(?:\.[a-z0-9_]+)+)["'`]/g;
  const aliasRe =
    /(?:const|let)\s+([A-Z][A-Z0-9_]*)\s*(?::[^=]+)?=\s*(?:MANDATE_KEYS\.([A-Za-z0-9_]+)|["'`]([a-z0-9_]+(?:\.[a-z0-9_]+)+)["'`])/g;
  const toKey = (ident, literal) => (ident ? byIdent.get(ident) : known.has(literal) ? literal : undefined);
  const refsByKey = new Map();
  const aliasToKey = new Map();
  const add = (key, file) => {
    if (REFERENCE_ONLY.has(`${file.file}::${key}`)) return;
    if (!refsByKey.has(key)) refsByKey.set(key, new Set());
    refsByKey.get(key).add(file);
  };
  for (const f of files) {
    for (const m of f.source.matchAll(refRe)) {
      const key = toKey(m[1], m[2]);
      if (key) add(key, f);
    }
    for (const m of f.source.matchAll(aliasRe)) {
      const key = toKey(m[2], m[3]);
      if (key) aliasToKey.set(m[1], key);
    }
  }
  // One alias hop: every file naming an alias references its key.
  if (aliasToKey.size) {
    const names = new RegExp(`\\b(${[...aliasToKey.keys()].join("|")})\\b`, "g");
    for (const f of files) {
      for (const m of f.source.matchAll(names)) add(aliasToKey.get(m[1]), f);
    }
  }
  return refsByKey;
}

/** files: [{file, source}] → {failing: [{key, provision, files}], passing: Set} */
export function evaluate(files) {
  const refsByKey = referencesByKey(files, Object.keys(MAPPED));
  const failing = [];
  const passing = new Set();
  for (const [key, refs] of refsByKey) {
    const { provision, mapped_only: mapped } = MAPPED[key];
    const all = [...refs];
    if (all.some((f) => SENDS.some((re) => re.test(f.source)))) passing.add(key);
    else failing.push({ key, provision, mapped, files: all.map((f) => f.file) });
  }
  // THE CHAIN BLIND SPOT (rules audit 2026-10-18). Page-guide keys
  // (`<module>.<screen>_guidance`) are called by the ambient launcher's
  // COMPUTED chain (ambientAssistantMandateChain in @ai-matrx/chat), so no app
  // file names them and they were never evaluated — 5 education job screens
  // "passed" while nothing sent their values. Every such key whose provision
  // declares values beyond the shared ambient page set is a call site; with no
  // referencing file that sends, it fails.
  const shared = new Set(MAPPED["ambient.page_guidance"]?.mapped_only ?? []);
  for (const [key, { provision, mapped_only: mapped }] of Object.entries(MAPPED)) {
    if (refsByKey.has(key) || !/_guidance$/.test(key)) continue;
    const own = mapped.filter((n) => !shared.has(n));
    if (own.length) failing.push({ key, provision, mapped: own, files: ["(ambient chain — no app file names this key)"] });
  }
  return { failing, passing };
}

function report(files) {
  const { failing, passing } = evaluate(files);
  const fresh = failing.filter((f) => !UNWIRED_BASELINE.has(f.key));
  const healed = [...UNWIRED_BASELINE].filter((k) => passing.has(k));
  for (const f of fresh) {
    console.error(
      `✗ ${f.key} (provision ${f.provision}) declares mapped-only values [${f.mapped.join(", ")}] ` +
        `but no file that calls it sends offered values:\n    ${f.files.join("\n    ")}\n` +
        `  → send them on the mandate door: useMandateHostValues / provideHostValues ` +
        `(features/mandates/host-values) or the launch's \`variables\`.`,
    );
  }
  for (const k of healed) console.error(`• ${k} now sends values — delete it from UNWIRED_BASELINE.`);
  return { fresh, healed, passing };
}

/**
 * The top level of one object literal starting at `open` (the index of its "{"): property names, and
 * the string literal each one carries (null = not a literal). `spread` is true on any `...x`.
 */
function objectLiteral(source, open) {
  const keys = new Map();
  let spread = false;
  let depth = 0;
  let i = open;
  let segment = "";
  const flush = () => {
    const t = segment.trim();
    segment = "";
    if (!t) return;
    if (t.startsWith("...")) {
      spread = true;
      return;
    }
    const m = /^(?:["'`]?)([A-Za-z_$][\w$]*)(?:["'`]?)\s*(?::\s*([\s\S]*))?$/.exec(t);
    if (!m) {
      spread = true; // a computed key: the set is not fully readable
      return;
    }
    const value = m[2] === undefined ? undefined : m[2].trim();
    const lit = value && /^(["'`])([^"'`$]*)\1$/.exec(value);
    keys.set(m[1], lit ? lit[2] : null);
  };
  for (; i < source.length; i++) {
    const c = source[i];
    if (c === '"' || c === "'" || c === "`") {
      const end = source.indexOf(c, i + 1);
      if (depth === 1) segment += source.slice(i, end + 1);
      i = end;
      continue;
    }
    if (c === "{" || c === "[" || c === "(") {
      depth++;
      if (depth === 1) continue;
    } else if (c === "}" || c === "]" || c === ")") {
      depth--;
      if (depth === 0) {
        flush();
        return { keys, spread, end: i };
      }
    } else if (c === "," && depth === 1) {
      flush();
      continue;
    }
    if (depth >= 1) segment += depth === 1 ? c : " ";
  }
  return null;
}

/**
 * WHAT THE FRONTEND SENDS, per mandate key (2026-10-19, for aidream's `check_provision_offers.py --wiring`).
 * A file is a caller when it references the key and matches SENDS. Each `variables: {…}` /
 * `variables={{…}}` literal in a caller that references ONE key is that key's offer: its property names,
 * and the literal string each carries. `sent: null` = some caller's offer is not a readable literal (a
 * variable, a spread, a file naming several keys), so "never sent" cannot be judged.
 */
export function sentByMandate(files, keys) {
  const refs = referencesByKey(files, keys);
  const keysPerFile = new Map();
  for (const [key, set] of refs) for (const f of set) keysPerFile.set(f.file, (keysPerFile.get(f.file) ?? 0) + 1);
  const out = {};
  for (const [key, set] of refs) {
    const callers = [...set].filter((f) => SENDS.some((re) => re.test(f.source)));
    // A file that names the key but sends nothing we can read may still call it (a launcher hook, a
    // context push) or hand the key to a caller that names it through a registry constant: then what is
    // sent is unknowable, and "never sent" is not judged. Only keys whose every reference is a readable
    // caller are judged.
    const opaque = [...set].some((f) => !callers.includes(f));
    if (opaque) {
      out[key] = { sent: null, values: {}, files: [...set].map((f) => f.file) };
      continue;
    }
    if (!callers.length) continue;
    let sent = new Set();
    const values = {};
    for (const f of callers) {
      const opens = [...f.source.matchAll(/\bvariables\s*[:=]\s*\{?\s*(?=\{)/g)].map((m) => m.index + m[0].length);
      if (keysPerFile.get(f.file) > 1 || !opens.length || /\b(hostValues|provideHostValues\(|useMandateHostValues\(|initialVariableValues|contextItems=)/.test(f.source)) {
        sent = null;
        break;
      }
      for (const at of opens) {
        const lit = objectLiteral(f.source, at);
        if (!lit || lit.spread) {
          sent = null;
          break;
        }
        for (const [name, value] of lit.keys) {
          sent.add(name);
          if (value === null) values[name] = null;
          else if (values[name] !== null) (values[name] ??= new Set()).add(value);
        }
      }
      if (sent === null) break;
    }
    out[key] = sent === null
      ? { sent: null, values: {}, files: callers.map((f) => f.file) }
      : {
          sent: [...sent].sort(),
          values: Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v === null ? null : [...v].sort()])),
          files: callers.map((f) => f.file),
        };
  }
  return out;
}

function load(list) {
  return list.map((file) => ({ file, source: readFileSync(path.join(ROOT, file), "utf8") }));
}

const sentJsonAt = process.argv.indexOf("--sent-json");
if (sentJsonAt !== -1) {
  // node scripts/check-mandate-host-values.mjs --sent-json <keys.json> — read by aidream's --wiring leg.
  const keys = JSON.parse(readFileSync(process.argv[sentJsonAt + 1], "utf8"));
  process.stdout.write(JSON.stringify(sentByMandate(load(trackedSources()), keys)));
} else if (process.argv.includes("--self-test")) {
  const files = load(trackedSources());
  const green = report(files);
  const planted = [
    ...files,
    {
      file: "features/__planted__/UnwiredWarRoom.tsx",
      // A call site of a mapped-only mandate that sends nothing.
      source: 'createManualInstance({ agentId, mandateKey: "podcast.metadata" });',
    },
  ].filter((f) => !/MANDATE_KEYS\.podcast__metadata\b|"podcast\.metadata"/.test(f.source) || f.file.includes("__planted__"));
  const red = report(planted);
  // The chain leg: a page-guide key no app file names is still evaluated.
  const chainSeen = evaluate(files).failing.some(
    (f) => f.key === "education.tutor_guidance" && f.files[0].startsWith("(ambient chain"),
  );
  const ok =
    chainSeen &&
    green.fresh.length === 0 &&
    red.fresh.some((f) => f.key === "podcast.metadata" && f.files.includes("features/__planted__/UnwiredWarRoom.tsx"));
  console.log(ok ? "self-test: RED on the planted site, GREEN on the tree ✓" : "self-test FAILED");
  process.exit(ok ? 0 : 1);
} else {
  const files = load(trackedSources());
  const { fresh, passing } = report(files);
  if (fresh.length) process.exit(1);
  console.log(`check-mandate-host-values: ${passing.size} frontend-called mandates with mapped-only values all send them ✓`);
}
