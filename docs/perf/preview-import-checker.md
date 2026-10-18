# The pending-import checker — the preview's rescue without the loader pool (2026-10-18)

## What changed

The shared preview kept its 2026-10-07 protection (an `@ai-matrx` import the installed package does
not ship yet renders a loud stand-in in that one module instead of a 500 on every route), but no longer
pays for it with Turbopack's loader pool.

| Before | After |
|---|---|
| `next.config.js` sent **every** file mentioning `@ai-matrx/` (~11,000) through a webpack loader | the loader runs only on files listed as pending — normally none |
| Turbopack sized the loader child-process pool itself: 192 `webpack-loaders` children, 5.7 GB (2026-10-17 23:20, [machine-guard.md](./machine-guard.md)) | 0 `webpack-loaders` children under the preview with nothing pending; 1 while one planted file was pending |

## How it works

| Piece | Where |
|---|---|
| ONE checker process: single instance (pid file + command-line check), replaced when its source changes, started by `preview:start`, `preview:status` and the watchdog (every 30 s, watchdog rev 3) | `scripts/matrx-pending-checker.mjs` (`ensure`, `daemon`, `status`, `scan`) |
| Judge: the same `rescuePendingImports` the loader applies — one implementation, resolution shared with `check:matrx-imports` | `scripts/lib/matrx-pending-imports.mjs`, `scripts/lib/matrx-package-resolve.mjs` |
| Watch: Node `fs.watch` recursive (macOS FSEvents), one stream per top-level source folder, no new dependency; installs seen by polling the mtime of `node_modules/.modules.yaml` every 5 s | checker |
| Startup scan: every candidate file from `git ls-files -co --exclude-standard`; warm restarts reuse a stat-keyed cache (`.matrx/pending-imports/scan-cache.json`) | checker |
| Hand-off: `.matrx/pending-imports/pending.json` (checker) → `next.config.js` installs the loader with a `path` condition on exactly those files and writes `loaded.json` (what this server covers) | `scripts/lib/matrx-pending-rescue-state.cjs`, `withPendingImportRescue` in `next.config.js` |
| A file becomes pending while the server runs → the checker touches `next.config.js` (mtime only), and Next restarts its server to load the new list. Debounce 1.5 s, at most once per 20 s. Removing an entry never restarts | checker |
| Surfacing: one `[matrx-pending] …` line per import in `.matrx/pending-imports/checker.log` and the preview log; `pnpm preview:status` / `pnpm matrx-pending:status` list them; the stand-in's own red box and console error | |

Turbopack config is static, so a new rule can only take effect on a restart. Nothing in Next 16.4.2
can change rules, aliases or loader conditions while it runs. So the cost of each newly pending file is
one preview restart (everyone blips). In return, no loader pool runs the rest of the time.

## Evidence (2026-10-18)

- `node --test scripts/matrx-pending-checker.test.mjs`: 5 pass (also run by `pnpm check:matrx-pending:self-test`).
  The fixture is a temp repo with a fake installed package. Results: only the planted file is
  listed; the rule matches that path exactly, parentheses included; an uncovered running server gets
  exactly one restart; fixing the import clears the entry with no further restart; with no server
  running, nothing restarts. These mutations each turn the suite red: no regex escaping, no restart
  detection, listing files that have nothing pending.
- Live, on the shared preview: I planted `app/(lab)/lab/pending-import-plant/page.lab.tsx`, which imports
  `MatrxPendingPlantProbe` from `@ai-matrx/design-system/controls`. The checker logged it within 1 s and
  asked for a restart 1.5 s later, and the server came back with that file in `loaded.json`.
  `/lab/pending-import-plant` answered 200 with the stand-in text "Not published yet:
  MatrxPendingPlantProbe … not in @ai-matrx/design-system@0.86.199". `/lab/hello` (200) and `/login`
  (200) kept serving. The preview server ran 1 `webpack-loaders` child and 4 PostCSS children. Once I
  removed the plant, the checker logged "no pending @ai-matrx import any more" and nothing restarted.
- With nothing pending, the preview's children were PostCSS workers only (5, 1.3 GB). The 34
  `webpack-loaders` processes still on the machine belonged to a build-lab `next build`
  (`~/.cache/matrx-build-lab/wt-W5b`), not to the preview.
- Startup scan of 23,212 files on a loaded Mac: 17–24 s cold.

## Open

- The "every page's dev overlay" surfacing is not built. Today the stand-in shows only where the module
  renders; the log and `preview:status` carry the rest.
- Between an agent's save and the end of the restart (seconds plus a cold compile), routes that import
  that file still 500.
- The judge's "aidream source is at …" version reads lower than the installed one, e.g. 0.86.2 vs
  0.86.199. This was already true before this change; it comes from `sourceVersionOf`.
