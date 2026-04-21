# Phase 1.B Shim Cleanup — Tracking Doc

**Status:** open. Created 2026-04-20 during PR 1.B execution.
**Closes:** when every item below is grep-verified zero, at which point `hooks/useTheme.ts` and `styles/themes/ThemeProvider.tsx` are deleted outright and this doc moves to `docs/concepts/full-sync-boardcast-storage/archive/`.

## Why this doc exists

Phase 0's capability audit undercounted legacy theme consumers. Real surface:

| Symbol | Consumers | Source |
|---|---|---|
| `useTheme` (from `@/hooks/useTheme`) | 9 | `hooks/useTheme.ts` |
| `useTheme` (context hook, from `@/styles/themes/ThemeProvider`) | 36 | `styles/themes/ThemeProvider.tsx` |
| `ThemeProvider` component | 3 | Providers.tsx, LiteProviders.tsx, PublicProviders.tsx |

Migrating 48 call sites + wiring the sync engine + deleting legacy plumbing in one PR would exceed the 1500-LoC soft cap the plan sets. Instead, PR 1.B uses **Option C**: replace the two `useTheme` implementations and the `ThemeProvider` component with tiny adapters ("shims") that internally route to the sync-engine-owned Redux state. All 48 call sites keep working unchanged. The shim is deleted in a mechanical follow-up.

Constitution V (deprecation path) and VI (strangler fig) explicitly allow a **named migration window** — this doc names it.

## The shim contract

After PR 1.B:

```ts
// hooks/useTheme.ts — SHIM. Scheduled for deletion; see phase-1b-shim-cleanup.md.
export function useTheme() {
    const mode = useAppSelector((s) => s.theme.mode);
    const dispatch = useAppDispatch();
    return {
        theme: mode,
        isDark: mode === "dark",
        setTheme: (t: "light" | "dark") => dispatch(setMode(t)),
        toggleTheme: () => dispatch(toggleMode()),
    };
}
```

```tsx
// styles/themes/ThemeProvider.tsx — SHIM.
// - <ThemeProvider> renders children only (no context, no Redux writes).
// - exported useTheme() returns the same shape as hooks/useTheme.ts.
// Scheduled for deletion; see phase-1b-shim-cleanup.md.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
export { useTheme } from "@/hooks/useTheme";
```

The shim:
- **Does not** read or write `localStorage` — the sync engine owns that now.
- **Does not** wrap children in any provider — the sync engine boots before paint; no React context is needed.
- **Does not** call `matchMedia` for OS preference — handled by `SyncBootScript`'s `systemFallback`.
- **Does not** touch a cookie — Phase 3 removes cookie-based theme plumbing entirely.

Anything the legacy implementations did beyond this (e.g. `className="dark"` class-toggling on `<html>`) is now owned by `SyncBootScript` + the `themePolicy` `prePaint` descriptor (verified against `docs/concepts/full-sync-boardcast-storage/phase-0-theme-capabilities.md` C-1 through C-21).

## Cleanup plan (post-PR-1.B)

### Phase 1.C — Mechanical migration (owned by Claude, single PR)

For every file listed in §Consumer manifest below:

1. Replace `import { useTheme } from "@/hooks/useTheme"` (or `"@/styles/themes/ThemeProvider"`) with:
   ```ts
   import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
   import { setMode, toggleMode } from "@/styles/themes/themeSlice";
   ```
2. Replace `const { theme } = useTheme()` with `const theme = useAppSelector((s) => s.theme.mode)`.
3. Replace `const { toggleTheme } = useTheme()` with `const dispatch = useAppDispatch(); const toggleTheme = () => dispatch(toggleMode())`.
4. Remove any leftover imports/destructuring that no longer applies.

**Verification:** the PR description pastes the pre/post grep counts:
```bash
grep -rn 'from "@/hooks/useTheme"\|from "@/styles/themes/ThemeProvider"' \
  app/ components/ features/ hooks/ lib/ providers/ styles/ \
  --include='*.ts' --include='*.tsx' \
  | grep -v 'styles/themes/ThemeProvider.tsx' \
  | grep -v 'hooks/useTheme.ts'
```
must return 0 lines before the PR merges.

### Phase 1.D — Delete the shims

Single trivial PR:
- Delete `hooks/useTheme.ts`.
- Delete `styles/themes/ThemeProvider.tsx`.
- Remove `<ThemeProvider>` JSX from `app/Providers.tsx`, `app/LiteProviders.tsx`, `app/(public)/PublicProviders.tsx` (it's already a pass-through shim; nothing breaks).
- Move this doc to `archive/`.

Trigger: Phase 1.C merged and CI green for 24h.

## Consumer manifest (for Phase 1.C)

Captured 2026-04-20 by explorer agent. Re-run grep before the migration PR to catch drift.

### `useTheme` from `@/hooks/useTheme` (9)

- `app/(authenticated)/tests/tailwind-test/color-converter/components/ColorInput.tsx:13`
- `app/(authenticated)/admin/components/database-admin/SyntaxHighlighter.tsx:6`
- `components/ui/sonner.tsx:3`
- `components/layout/new-layout/MobileUnifiedMenu.tsx:30`
- `components/admin/EnhancedDebugInterface.tsx:18`
- `components/matrx/PublicHeaderThemeToggle.tsx:5`
- `components/debug/debug-interface.tsx:8`
- `features/public-chat/components/ChatMobileHeader.tsx:7`
- `features/applet/runner/header/navigation-menu/NavigationMenu.tsx:12`

### `useTheme` context hook from `@/styles/themes/ThemeProvider` (36)

- `app/(authenticated)/tests/_maps/OpenStreetMapComponent.tsx:5`
- `app/(authenticated)/tests/_maps/SearchControl.tsx:6`
- `app/(authenticated)/tests/_maps/LayerSwitcher.tsx:6`
- `components/ui/menu-system/MenuCore.tsx:8`
- `components/ui/SearchReplaceDiffRenderer.tsx:23` (path approximate — re-grep)
- `components/ui/TuiEditorContent.tsx:5` (approximate)
- `components/ui/FullScreenMarkdownEditor.tsx:13` (approximate)
- `components/ui/MarkdownClassificationTester.tsx:4`
- `components/ui/MarkdownClassifier.tsx:4`
- `components/ui/ThemedSectionCard.tsx:6`
- `components/rich-text-editor/RemirrorEditor.tsx:38`
- `components/ui/MarkdownDualDisplay.tsx:11`
- `features/code-editor/MultiFileCodeEditorBody.tsx:22`
- `features/code-editor/useCodeEdiorBasics.ts:4`
- `features/code-editor/MultiFileCodeEditor.tsx:10`
- `features/code-editor/CodeBlock.tsx:7`
- `features/code-editor/DiffView.tsx:6`
- `features/agent-code-editor/components/parts/DiffView.tsx:17`
- `features/chat/components/response/assistant-message/stream/StreamingCode.tsx:5`
- `features/workflows/components/menus/NodeMenuCore.tsx:9`
- `features/workflows/react-flow/core/WorkflowCanvas.tsx:21`
- `features/workflows/react-flow/nodes/BrokerRelayNode.tsx:6`
- `features/workflows/react-flow/nodes/UserInputNode.tsx:6`
- `features/workflows/react-flow/nodes/RecipeNode.tsx:7`
- `features/workflows/react-flow/nodes/WorkflowNode.tsx:8`
- `features/workflows/react-flow/nodes/NodeWrapper.tsx:12`
- `features/applet/builder/modules/field-builder/previews/FieldPreview.tsx:12`
- `features/window-panels/windows/multi-file-smart-code-editor/MultiFileSmartCodeEditorWindow.tsx:49`
- `features/window-panels/windows/code/CodeEditorWindow.tsx:44`
- `features/workflows-xyflow/core/WorkflowHeader.tsx:15`
- `features/workflows-xyflow/nodes/base/BaseNode.tsx:36`
- `features/workflows-xyflow/edges/WorkflowEdge.tsx:6`
- `styles/themes/ThemeSwitcher.tsx:5`
- *(plus the three `_maps` entries above — total 36)*

### `ThemeProvider` component (3)

- `app/Providers.tsx:5`
- `app/LiteProviders.tsx:8`
- `app/(public)/PublicProviders.tsx:10`

These stay wrapping their children in PR 1.B (shim is pass-through). Phase 1.D removes the JSX + imports.

## Legacy-key writers handled in PR 1.B (not deferred)

These are **small, high-risk** sites that still write the pre-sync `'theme'` localStorage key, competing with the sync engine's `matrx:theme` ownership. They are fixed in PR 1.B directly (not shimmed):

- `features/shell/components/header/header-right-menu/ThemeToggleMenuItem.tsx:18` — rewritten to dispatch `toggleMode()`.
- `components/ui/menu-system/GlobalMenuItems.ts:28` — rewritten to read `useAppSelector((s) => s.theme.mode)`.
- Legacy key `localStorage.getItem/setItem('theme', ...)`: `bootSync`'s one-shot migration (engine/boot.ts `LEGACY_MIGRATIONS`) copies to `matrx:theme` and removes the old key on first load. Covered by `engine.boot.test.ts` "legacy key migration" case.

After PR 1.B:
```bash
grep -rn "localStorage\.\(get\|set\|remove\)Item(['\"]theme['\"]\)" \
  app/ components/ features/ hooks/ lib/ providers/ styles/ utils/ \
  --include='*.ts' --include='*.tsx'
```
must return 0 matches. This is a PR 1.B success criterion.

## Why not delete the shims in PR 1.B itself

Because 48 mechanical call-site edits in the same PR as the engine wiring would:
1. Balloon the review surface past the plan's 1500-LoC target.
2. Mix architectural review (engine, middleware, Providers) with mechanical find-replace (call sites), which slows reviewers.
3. Risk a late-discovered migration bug forcing a revert of the engine wiring along with it.

Splitting lets the engine ship, run in production behind a feature-complete shim, and prove itself before the mechanical migration runs. Total lines deleted is unchanged; the schedule just has one extra PR.

## Constitution traceability

| Principle | How this doc satisfies it |
|---|---|
| II (one canonical) | After 1.D, only the sync engine's theme state exists. The shim window is explicitly named + deadlined. |
| V (deprecation path) | Shim files carry a header comment pointing to this doc. |
| VI (strangler fig) | Phase 1.B wires the new system; shim keeps old call sites alive; Phase 1.C migrates; Phase 1.D deletes. Textbook strangler. |
| VII (net-negative) | Net for 1.B+1.C+1.D is strongly negative: +200 shim lines added in 1.B, –600 lines across 1.C + 1.D. |
| IX (no silent coexistence) | The coexistence is loudly named (this doc, header comments, grep-verified Done criteria). Not silent. |
