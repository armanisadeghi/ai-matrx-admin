---
name: new-package
subject: policies/typescript-package-standard
type: Skill
title: "new-package — create or majorly grow an @ai-matrx package, the right way"
description: "Runbook for creating or majorly growing an @ai-matrx TypeScript npm package. Use when invoked as /new-package <name or capability>, or for a new @ai-matrx/* package, extracting code into one, or a major growth wave. NOT for a routine fix inside an existing package (THE SAME-SESSION LAW)."
tags: [packages, typescript, npm, extraction, runbook, architecture]
timestamp: 2026-08-30
---

<!-- SYNCED COPY — do not edit here.
     Canonical: common-docs/skills/new-package/SKILL.md
     This file is distributed to every consuming repo by
     common-docs/meta/scripts/sync_skills.py. Edit the canonical, run the
     sync, and commit each repo. Edits made here are overwritten and lost. -->

# new-package — create or majorly grow an @ai-matrx package, the right way

<!-- rules:stamp -->
> Rules from `common-docs/policies/typescript-package-standard.md` — edit there, never here (`python3 common-docs/meta/scripts/one_home.py --write`).

1. **Solved once = a package.** Code any other app could use lives in a package, never in an app.
   Every NEW package name is approved by Arman first; growing an existing one needs no approval.
2. **A package is REAL only when all four hold**: the host imports it and no
   in-app copy remains; it builds, type-checks and tests alone with no app imports; app inputs
   are injected; one documented entry point per section, internals not importable.
3. **Zero duplicate code** — no copy in any app or in another package.
   **Proven twice**: a package is proven by deleting the code it replaces AND
   by a second app using it. Until both, it is unproven.
4. **One capability per package, no grab-bags.** Two packages that never live apart are one
   package. Split by capability, merge what always ships together.
   Lines come from responsibility, never from today's import counts: a package is separate only if some
   app could need it without the rest, and its job is nameable in one sentence.
   Never propose a package without that one-sentence job and the design reason an app would use it
   alone; "current consumers" is not evidence. Method: layer by layer, each with a
   charter (must include / never include), proof it works standalone in an empty app, and a census of
   every outside copy of its logic. A creator/consumer client split is coming, so agents/workflows
   creation stays apart from running. Program history: `projects/npm-package-extraction/HANDOFF.md`.
5. **Few packages, many sections; pay only for what you use**. Importing one
   section never loads another; unused parts cost zero, measured in a built consumer.
   **Optional parts are sections, never separate packages** (set on sync): a
   part most apps never use lives as its own section of its owning package, and its heavy
   outside libraries are *optional* peer dependencies, so an app that doesn't import that
   section neither downloads nor bundles them. Proven per part: a built consumer of a sibling
   section contains none of its code, and a plain install does not fetch its libraries.
6. **Dependencies point one way** — lower layers never import higher ones; no cycles.
7. **Ownership lines:** auth = sign-in, session, organizations; api = ALL server communication;
   data = ALL database communication (live updates included); files = files; chat = runs all AI;
   agents = only creating agents and workflows.
8. **Everything ships inside** — UI, hooks, framework bindings, default implementations; the host
   injects only identity (auth source, org/env values, navigation, notifications).
9. **Siblings are ordinary dependencies** (`workspace:*` in source, `latest` when packed); every app
   consumes `latest` — never pinned (THE LATEST LAW).
10. **Publish before anyone imports.** No app imports an export that is not on npm yet.
11. **The tarball is the proof** — `npm pack` + unpack of the published version, never the version
    number or the source.
12. **Fix where it lives, same session** — a package bug is fixed in the package, published, and
    the consumer updated in the same session (THE SAME-SESSION LAW).
13. **Rules are enforced when code is written and committed; releases get reports.** A package that
    breaks a rule is refused at authoring and commit time (its `build`, `check:package`, the
    pre-commit hook). In the release path the same check only reports, loudly, and the package
    publishes anyway: nothing stops a triggered release (Arman, 2026-10-22). App-side findings are
    reported, never a CI gate.
14. **Required is a dependency; optional is a slot.** If a package cannot do its core job without
    something, that something is a direct dependency. If it only works better with it, it is a
    plug-in slot that ships a working generic default. An app's better version of a required piece
    moves into a package; it is never passed in. Chat never depends on agent creation.
15. **Below sign-in, nothing knows the active organization.** A package under `auth` receives the
    organization as an input; it never looks it up.
16. **A moved path stays a pointer.** When code moves into a package, the old app path becomes a
    one-line re-export or is deleted in the same change; a second body anywhere is a defect. The
    copy guards in `check-package-twins` record today's copies as a baseline that may only shrink.
17. **No package owners.** Anyone fixes any package in the session that needs it; a breaking
    release queues the matching fix in every consuming repo at once (THE CATCH-UP RULE).
18. **Cleanups never tighten working code.** Removing a copy or a leak keeps every existing export
    path and its behaviour; a new guard starts green on today's tree.
19. **One build standard** (`projects/package-build-architecture/PLAN.md`): ESM split once per side,
    `check-ships-once` + `check-reexport-order` in `build`, server-safe entries import sibling
    subpaths only. Guard `apps/shared/scripts/check-package-standard.mjs` (shrink-only allowlist)
    refuses the author's commit; at release it only annotates (nothing stops a triggered release).
<!-- rules:stamp-end -->

**Invocation: `/new-package <name or capability>`.** Use for: a NEW `@ai-matrx/*` package,
extracting existing code into one, or a major growth wave on a shipped one.
**NOT for:** a routine fix/addition inside an existing package — that is
[THE SAME-SESSION LAW](/policies/typescript-package-standard.md) (fix in-package, release,
adopt, one session; no ceremony).

## Step 0 — which side?

A **Python** package (pip, `aidream/packages/matrx-*`) → STOP: walk the Gate in
`aidream/docs/packages/PACKAGE_DOCTRINE.md` instead. This skill governs **TypeScript
`@ai-matrx/*` npm packages** only (authored at `aidream/apps/shared/<name>`).

## Step 1 — the law stack (read ALL before designing anything)

1. [`/policies/typescript-package-standard.md`](/policies/typescript-package-standard.md) —
   the ENTIRE policy: THE ALL-INCLUSIVE LAW, THE LATEST LAW, THE CATCH-UP RULE, THE
   SAME-SESSION LAW, ONE SYSTEM ONE VERSION, mechanics, gates, release procedure.
2. [`/projects/npm-package-extraction/DECISIONS.md`](/projects/npm-package-extraction/DECISIONS.md)
   — C1–C31 are SETTLED; re-litigating one is an error. Headline: C8 split-out · C9 full
   elimination · C10 persistence boundary · C19 inlined SVGs · C21 direct-on-main + fleet
   testing prompt · C22 hard parts in the package · C23 all-inclusive · C25 bindings at the
   first real consumer · C26 token contract · C28 catch-up · C29 same-session.
3. [`/policies/package-vs-implementation.md`](/policies/package-vs-implementation.md) —
   the package is CAPABLE, the implementation CHOOSES; broken in both directions before.
4. **The exemplar: `aidream/apps/shared/tap-target`** — the retrofit register's one
   "passes" row (own CSS shipped, inlined glyphs, 20-line host setup). Copy its shape.
5. Touching a shipped package? Current live state first:
   [`/projects/npm-package-extraction/ALL-INCLUSIVE-RETROFIT.md`](/projects/npm-package-extraction/ALL-INCLUSIVE-RETROFIT.md)
   + [`STATUS.md`](/projects/npm-package-extraction/STATUS.md).

## Step 2 — census LIVE, then the design doc (before any code)

Per C14: pull latest `main` in every touched repo first; any measurement older than a day
is unverified. Census the real code: source files, line counts, literal-import consumer
counts, the coupling edges to invert.

Write `<NAME>-PACKAGE-DESIGN.md` in `/projects/npm-package-extraction/`. It MUST declare:

- **Scope + the three C23 tests** (likely to fail / needs tuning / must be perfect → IN the
  package) and what ships COMPLETE: polished UI, hooks, integrations, a working DEFAULT for
  every port — hosts inject only identity (auth source, org/env values, navigation, sinks).
- **What it deliberately does NOT absorb** (C8) — every proposal states its split-outs.
- **Persistence boundary** (C10), one of: owns-persistence · persistence-injected ·
  no-persistence.
- **The port table**: required/optional, a defined degradation for each, a shipped default
  for each (C22/C23).
- **Demanded schema** (owns-persistence packages): the exact RPC/table contract + a
  falsifiable probe (the associations `assertDemandedSchema` precedent — it must be able
  to FAIL).
- **Wire shapes verified against aidream SERVER source** — never guessed from a client.
- **Sibling deps**: ordinary dependencies, never peers (only react/react-dom/react-native
  stay peers); the graph stays a DAG — `node aidream/scripts/check_ts_sibling_graph.mjs`.
- **Styling per C26** (structural CSS ships; token CONTRACT enforced; default token sheet;
  token VALUES host-owned) and **icons per C19** (own inlined SVGs, no icon-library dep).
- **Open questions WITH recommendations** at the bottom.

## Step 3 — Arman's approval, per package, by name (C5)

Creating a package is an architecture decision: the NAME and scope are his explicit call,
raised single-topic — never embedded in a broader plan's approval. Interview format: facts
→ your recommendation → options; at most two decisions per turn; record answers into
DECISIONS.md immediately. No code before the go.

This never conflicts with the PACKAGE-FIRST LAW (Arman, 2026-10-06): reusable code MUST become
a package AND the new package needs his go first. Both, always. Growing an existing package
needs no approval.

## Step 4 — build

Author at `aidream/apps/shared/<name>`. The policy's Authoring rules section is the
contract; the traps that have actually bitten:

- **Behavior ports VERBATIM; only coupling seams invert.** A real defect found in the
  original is fixed in-package AND CHANGELOG'd — never silently, never "preserved."
- Dual ESM+CJS with matching `.d.ts`/`.d.cts`; no framework imports in package source.
- `"use client"` per-entry, never global; tsup `treeshake: false` or the banner drops —
  verify the stamp per chunk.
- **Module-level mutable state is BANNED** → `globalThis` under
  `Symbol.for("ai-matrx.<pkg>.<name>")` (dual-loader graphs split module state).
- TS strict + `exactOptionalPropertyTypes` + `noUncheckedIndexedAccess`, zero `any`;
  branded types for identity values; host-generated JSON boundaries typed over `unknown`.
- **THE HOST-BUILD LAW: a package never fans out `import()` edges.** Every `import()` in a
  package's dist becomes a chunk in EVERY host build that reaches the package, so a map of N
  lazy imports = N chunks per host. Incident 2026-10-07: icons 0.3.5 adopted Lucide's
  `dynamicIconImports` (2,118 `import()` calls) to shrink the first screen; frontend build
  output doubled (1.35 → 2.6 GB, +1,800 chunks) and Vercel compile went ~4.5 → 9–14 min.
  First-screen size and build time pull in OPPOSITE directions: lazy-load a heavy set
  through ONE `import()` of the whole set, never one per item. Never add or "optimize" a
  dynamic import in a package without reading the frontend `code-splitting` skill (rule 3).

## Step 5 — gates (ALL of them, before release)

Strict typecheck · behavioral tests · publint + attw · **packed-tarball canary**: install
the `.tgz` into an empty project and `import` AND `require` every public entry · the host
app's typecheck/tests/build · a real browser smoke for device/permission behavior. · **host
build cost**: `grep -c 'import(' dist/*.js` must not grow by more than a handful per release
— a jump is the fan-out class above, and a bundle-size budget will never catch it (it
rewards the fan-out). A green
source build is NOT package proof.

## Step 6 — release

Bump + CHANGELOG — **with a `Consumer action` section whenever adoption requires host
changes (C28)**; a breaking release without one is a defect. Commit, push, then tag
`npm/<DIRECTORY-name>/v<version>` — the directory name, not the npm name (the
`npm/matrx-agents/v*` lesson). Trusted publishing does the rest. A **brand-new** package
needs Arman's one-time 2FA bootstrap publish + trusted-publisher binding — hand it to him
as a guided session (one link, what to click, what to report); it is the only manual
release that package will ever have.

## Step 7 — adoption IS the definition of done (C9, same session)

Publication is not done. Same session (C29): swap a real consumer, **DELETE the
originals**, prove zero remnants by re-grep, run the host type gate + touched suites, live
smoke the render paths. Per C21 the swap lands direct on main and ships with a
**fleet-testing prompt** for Arman's Sonnet/Codex agents (concrete routes, actions,
expected behavior, known deltas, bug classes to hunt); register the QA re-test row. A
package whose swap has not run is a bullshit package — two live copies is the named
disaster (the scraper lesson).

## Step 8 — the paper trail (same session)

Package README (external consumer guide) + `FEATURE.md` beside the code · a row in
`aidream/apps/shared/README.md`'s catalog · the campaign
[`STATUS.md`](/projects/npm-package-extraction/STATUS.md) board ·
close/open the register rows you touched. Commit and push everything — unpushed work
doesn't exist.
