# Bundle / Build-Time Optimization Tracker

Live working doc. Update the **Status** and **Notes** columns as we go. Add new rows when we find new candidates.

---

## Corrections — things I claimed that were wrong

| # | What I said | The truth |
|---|---|---|
| 1 | `onnxruntime-web` (133 MB on disk) is unused / a removal candidate | **Wrong.** It's a runtime dep of `@ricky0123/vad-react` (used by `voice/voice-assistant-ui/Assistant.tsx` and the `useVoiceChat*` hooks). The 133 MB on disk is mostly WASM, and the codebase points VAD's `onnxWASMBasePath` at the **jsdelivr CDN**, so the WASM doesn't ship in our bundle. The JS surface that *does* ship is small. Disk size ≠ bundle size — I conflated them. **Skip.** |
| 2 | Delete the 4 files in `features/code-editor/components/unused/` to reduce bundle size | **Misleading.** If a module has zero importers, Turbopack/webpack already strips it out of every bundle — they contribute **0 bytes** to runtime. The real (small) cost is build-time *parsing*: every file the analyzer touches, even if shaken later, takes time to lex, parse, resolve imports, walk the graph. So deleting them is a minor build-time win, not a bundle win. I'll only call this out when build-time matters; it does **not** belong on the bundle list. |
| 3 | Lobehub will require a hostile uninstall | You handled it cleanly by **inlining the 11 provider icons** into `model-provider-icons.tsx`. `pnpm why` now shows: `lucide-react 0.577.0` (single version), no `antd`, no `@lobehub/*`. ✅ The whole subtree is gone. |

---

## Ground rules going forward

1. **Disk size ≠ bundle size.** Many heavy packages ship native binaries, WASM, or assets that are loaded at runtime from CDN, not bundled. I'll only flag a package when I can show it's actually pulled into a client chunk via static import.
2. **No "delete the unused folder" suggestions** unless they're imported somewhere or there's a measured build-time impact.
3. **Always verify with `pnpm why`** before claiming something is or isn't in the dep tree.
4. **No more "rip it out" by default.** Inlining, replacing with a smaller equivalent, or just lazy-loading is usually better.

---

## Status board

Legend:  
`▢` not started  `→` in progress  `✓` done  `✗` decided no-go  `?` needs investigation

### Tier 1 — confirmed wins

| # | Item | What's actually true | My recommendation | Your notes | Status |
|---|---|---|---|---|---|
| 1 | `@lobehub/icons` removal | One file (`ModelSelection.tsx`) was importing 11 brand icons; that pulled in `antd`, `antd-style`, `@ant-design/icons{,-svg}`, plus 2 duplicate `lucide-react` major versions | Inline the 11 SVGs and drop the dep | Done — extracted icons into `features/chat/components/input/model-provider-icons.tsx` and removed the package | ✓ |
| 2 | ~~`monaco-editor` value→type imports~~ | **False alarm — already done.** The exact regex `from\s+['"]monaco-editor['"]` finds only 4 files, and all 4 are already `import type`. My earlier "13 files" count was actually `@monaco-editor/react` (the small React wrapper, not the same package). Also: in `monaco-config.ts` Monaco is loaded from CDN (`cdn.jsdelivr.net`) via `loader.config()` — Monaco's runtime is **never bundled**. Bundle impact already zero. | No-op. Moved to Tier 3. | | ✗ |
| 3 | `pdfjs-dist` deduplication | No file in the repo imports `from "pdfjs-dist"` directly (verified). The two PDF previewers import `pdfjs` as a named export from `react-pdf`. Top-level `pdfjs-dist@5.5.207` was completely unused; `react-pdf@10.4.1` ships its own `pdfjs-dist@5.4.296` (locked, not a peer range). | Remove `"pdfjs-dist"` line from `package.json` `dependencies`. After `pnpm install`, only `5.4.296` remains active. No code changes needed. | Done — `pnpm why pdfjs-dist` now shows a single `5.4.296` via `react-pdf`. Verified working on PDF previewer routes. | ✓ |
| 9 | Global shell static-import audit (`Providers.tsx`, `DeferredSingletons.tsx`, `PublicProviders.tsx`) | These 3 files are in the static dep graph of *every* authenticated/public route. The legacy lobehub cut (22→9 min) proved the shell is the highest-leverage place. **First pass (incorrect):** wrapped leaf widgets in `next/dynamic({ ssr: false })` from inside the wrappers themselves. This was wrong on two counts: (1) `app/Providers.tsx` is a Server Component and `next/dynamic({ ssr: false })` is invalid there; (2) even when valid (PublicProviders, DeferredSingletons), it pushes the lazy-loading concern UP into the wrapper instead of DOWN into each leaf — every consumer of the leaf widget would have to repeat the dance. **Corrected pattern (the "thin shell + Impl" pattern):** the wrapper stays a static-import shell. Each heavy leaf widget is rewritten as a 2-file pair — `<Name>.tsx` is a tiny `"use client"` shell that statically imports nothing heavy, optionally gates on a cheap selector or local listener, and renders `<Name>Impl />` via `next/dynamic({ ssr: false, loading: () => null })`; `<Name>Impl.tsx` holds all the heavy imports + JSX. Refactored 7 leaf widgets this way: `RecoveryWindow` (selector-gated on `isOpen`), `GlobalTaskShortcut` (keydown listener stays in shell, modal lazy on first ⌘⇧T), `AudioRecoveryToast` (gated on `hasRecoveredData`), `AuthSessionWatcher` (supabase listener in shell, modal lazy on `SIGNED_OUT`), `AnnouncementProvider` (gated on `shellDataLoaded`), `UnifiedOverlayController` (the 860-LOC windowRegistry now lives behind dynamic), `LegacyPromptOverlaysController` (24+ promptRunnerSlice selectors now behind dynamic), and `CloudFilesPickerHost` (split into `cloudFilesPickerOpeners.ts` for the imperative API + `CloudFilesPickerHostImpl.tsx` for the dialog body). `RecoveryNudge`, `CreateTaskFromSourceDialog`, and `PersistentDOMConnector` were skipped — each is <90 LOC with no unique heavy imports, so refactoring them adds files for zero benefit. The other shell-level fixes from the first pass remain in place: barrel-of-barrels `@/lib/redux/brokerSlice` replaced with direct `@/lib/redux/brokerSlice/slice` import + `await import()` inside the idle callback; `fetchFullContext` lazy-imported inside its idle callback; `InitialReduxState` is `import type`. | **Rule going forward:** anything in the static dep graph of `app/Providers.tsx`, `app/DeferredSingletons.tsx`, or `(public)/PublicProviders.tsx` MUST be either (a) trivial (no heavy unique deps), (b) `import type`-only, or (c) a thin shell that internally `next/dynamic`s its `<Name>Impl` sibling. The build-time contract is documented inline at the top of `DeferredSingletons.tsx` and reiterated by example in each refactored leaf widget. **Never** add `dynamic()` from inside a Server Component (`Providers.tsx` is one) and **never** wrap leaf widgets in `dynamic()` from a wrapper file — that's the wrong layer. | Awaiting build-time measurement after the corrected refactor. | → |

### Tier 2 — needs investigation, no claim yet

| # | Item | What I actually know | What I'd need to verify before recommending anything | Your notes | Status |
|---|---|---|---|---|---|
| 4 | `react-pdf` pulled into a non-PDF route | `BinaryFilePdfPreview.tsx` and `PdfPreview.tsx` both `import { Document, Page, pdfjs } from "react-pdf"` directly. Their authoring comments say "lazy-loaded by parent." | Confirm parents (`BinaryFileViewer`, `FilePreview.tsx`) use `dynamic(() => import('./PdfPreview'), { ssr: false })`. If yes → already optimal, skip. If no → wrap. | | ? |
| 5 | `@tabler/icons-react` (50+ files) and `react-icons/*` (70+ files) | Both support per-icon tree-shaking when imported by sub-path. | Check `next.config.ts` for `experimental.optimizePackageImports`. If `@tabler/icons-react` is missing, adding it could shrink chunks meaningfully. | | ? |
| 6 | `framer-motion` | Heavy library, used in many files. Already tree-shakes per-export reasonably well. | Worth checking the analyzer's biggest chunks for the `motion` cost before assuming a problem. | | ? |
| 7 | `react-syntax-highlighter` | 8 files importing it. Default import pulls every language grammar (huge). | Check whether files use the deep import (`react-syntax-highlighter/dist/cjs/light` + register-only-needed-languages) vs. the default heavy entry. If they use the heavy entry, switching to `light` build is a known big win. | | ? |
| 8 | `@xyflow/react` (2.7 MB) | 80+ files import it. It's the workflow canvas — that whole feature genuinely needs it. | Verify the workflow routes are the only ones pulling it (no accidental import from a globally-loaded shell). | | ? |

### Tier 3 — explicitly *not* on the list

| Item | Why I'm not recommending action |
|---|---|
| `monaco-editor` runtime | Loaded from CDN via `loader.config({ paths: { vs: 'cdn.jsdelivr.net/...' } })` in `monaco-config.ts`. Not bundled. Disk size is misleading. The 4 files importing `monaco-editor` directly are all `import type` (erased at compile). The wrapper `@monaco-editor/react` is small (~20 KB) and necessary. |
| `onnxruntime-web` | Used by voice assistant. WASM is CDN-loaded, JS surface is small. Disk size is misleading. |
| `dashjs`, `hls.js` | Found 0 static imports in app code. Likely transitive from a video lib. Need a `pnpm why` before any recommendation — but probably fine. |
| `three` | Only `components/ui/canvas-reveal-effect-impl.tsx` uses it. That file is already lazy-loaded by the wrapper pattern. Skip. |
| `mermaid` | Already lazy via the markdown diagram block. Skip. |
| `posthog-js` | Loaded through analytics provider; not a static client-bundle import. Skip. |
| `@babel/standalone` | Already lazy-loaded as of last round. ✓ |
| Files in `code-editor/components/unused/` | If unused, they don't ship. Deleting them is a build-time micro-optimization at best, not a bundle win. |

---

## Open questions for you

- **#9 shell audit** — corrected pattern is now in place. Push and watch the next Vercel build. The expected win is build *time*, not chunk size — every page entry's static graph just shed 7 heavy subtrees (notably the 860-LOC `windowRegistry` and the `promptRunnerSlice` selector set), each replaced by a 4-line `dynamic()` shell. Compare against the 7m21s baseline measured after the first pass.
- **Tier 2 items** — once the next analyzer report is in, pick the heaviest remaining offender. Likely candidates: any layout/page that *itself* statically imports something heavy, or `react-syntax-highlighter` if it's using the default heavy entry.

---

## Change log

- **2026-04-28 (am)** — Doc created. Lobehub removal verified done by Arman (inlined SVGs). Corrections recorded for `onnxruntime-web` and the "unused" folder claim.
- **2026-04-28 (pm)** — Monaco type-imports task closed as a false alarm (already optimal; runtime is CDN-loaded). `pdfjs-dist` removed from `package.json` dependencies; `pnpm install` reconciled to a single `5.4.296` via `react-pdf`. Verified working on PDF routes.
- **2026-04-28 (late pm)** — Global shell audit, first pass (#9). Refactored `app/DeferredSingletons.tsx`, `app/Providers.tsx`, and `app/(public)/PublicProviders.tsx`: dropped the `@/lib/redux/brokerSlice` barrel import, lazy-loaded `brokerActions` and `fetchFullContext` inside idle callbacks, and wrapped 12 leaf widgets in `next/dynamic({ ssr: false })` from inside the wrappers themselves. **This was wrong** — `Providers.tsx` is a Server Component (where `ssr: false` is invalid) and the dynamic gating belongs at the leaf level, not the wrapper level. Reverted all three wrappers to clean static-import shells.
- **2026-04-28 (evening)** — Global shell audit, corrected pass (#9). Adopted the "thin shell + Impl" pattern at the leaf level. For each of 7 heavy leaf widgets — `RecoveryWindow`, `GlobalTaskShortcut`, `AudioRecoveryToast`, `AuthSessionWatcher`, `AnnouncementProvider`, `UnifiedOverlayController`, `LegacyPromptOverlaysController` — split into two files: `<Name>.tsx` (tiny `"use client"` shell, optionally gated on a cheap selector or local event listener, renders `<Name>Impl />` via `next/dynamic({ ssr: false, loading: () => null })`) and `<Name>Impl.tsx` (the existing heavy body, default-exported). For `CloudFilesPickerHost`, split three ways: `cloudFilesPickerOpeners.ts` (pure-TS module-level opener registry + imperative API), `CloudFilesPickerHostImpl.tsx` (the heavy dialog body), and `CloudFilesPickerHost.tsx` (thin shell that re-exports the imperative API and renders the Impl dynamically) — preserves every existing import path. `RecoveryNudge`, `CreateTaskFromSourceDialog`, `PersistentDOMConnector`, and `AdminFeatureProvider` (which already followed the pattern) were left alone. ReadLints: clean across all 20 touched files.
