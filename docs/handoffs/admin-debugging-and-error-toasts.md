# Handoff — Admin debugging on every page + readable, holdable error toasts

Status as of 2026-10-10. Work done 2026-09-28 → 2026-09-30, re-verified against `origin/main` on 2026-10-10.
Owner: none (ownerless). Repo: `matrx-frontend`, plus the chat package in `aidream/apps/shared/chat`.

---

## 1. Vision

### Original ask (Arman, 2026-09-28)
1. **The admin Error Inspector is broken — fix it.** Check that the recent change removing admins' ability to see user data on normal pages is not the cause. The system must still **recognize admins, keep that in Redux, and use it for extra debugging and special functionality.**
2. **Error toasts disappear too fast.** "Errors aren't like positive things." An error toast stays **at least 5 seconds**.
3. **A toast must not close while hovered, and its close timer restarts every time you hover it again.** Today the copy icon on a toast is lost forever unless you are very fast.
4. **Set up the Alchemy package here.** It gives copyable text with context for AI.

### Refinements and decisions made along the way (and why)
- **Admin identity is not admin power.** On 2026-09-25 Arman ruled: *"Admin privileges cannot ever extend beyond the admin sections of the system."* That change made `selectIsAdmin` / `selectIsSuperAdmin` false outside `/administration`, which silently switched off every admin debug tool on user pages. Capture and persistence never stopped; only the admin's view of it did. The fix keeps both rulings true by adding a **third category, ADMIN DEBUGGING**: tools that show the admin's *own browser session* (errors, Redux, debug panels, technical error detail) and grant **no data and no mutating control**. They work on every page. Anything that edits or reveals other people's data stays on the lane-gated power selectors.
- **"Hover" means "held".** The Alchemy copy menu renders in a portal *outside* the toaster, so a pointer inside the open menu is not "over the toast". A toast is therefore held while (a) the pointer is over any toast stack, (b) **keyboard** focus is inside it, or (c) a popup menu opened from a toast is still open. Mouse-click focus deliberately does **not** hold, because a closing menu returns focus to its trigger and that would pin every toast until the person clicked elsewhere.
- **The 5 s floor applies to warnings too.** A warning is not a positive message either.
- **Alchemy was already wired into error toasts** (commit `66cd037705`, 2026-09-25). It was unreachable only because the toast closed first, so item 4 became "make the existing Alchemy menu usable", not a new integration.
- **Added after this work by another session (2026-10-05, `81aa8d3f60f`):** a non-error toast that carries an action (Undo, Open, Retry) stays at least **8 s** (`MIN_ACTION_TOAST_MS`). It is consistent with this vision and should be kept.

---

## 2. Current state (gap analysis)

### Done and verified
| Area | Where | Evidence |
|---|---|---|
| Admin-debugging selectors | `lib/redux/selectors/userSelectors.ts` → `selectIsAdminDebugger`, `selectIsSuperAdminDebugger` (re-exported by `lib/redux/slices/userSlice.ts`) | Present on main 2026-10-10 |
| Error Inspector on user pages | `features/admin/error-inspector/ErrorInspectorBadge.tsx`, `ErrorInspectorWindow.tsx`; shell entries `features/shell/components/header/header-right-menu/ErrorInspectorMenuItem.tsx`, `features/shell/components/controls/SidebarErrorInspectorToggle.tsx` | 2026-09-30, `/notes` as admin@admin.com: window opens; a thrown error and an unhandled rejection appeared with full detail |
| Other debug tools moved to the debugging gate | Admin indicator (`components/admin/controls/*Indicator*.tsx`, `AdminIndicatorMenuItem.tsx`, `SidebarAdminIndicatorToggle.tsx`), `hooks/useDebugContext.ts`, `components/errors/ErrorBoundaryView.tsx` admin panel, `features/overlays/boundary/OverlayErrorFallback.tsx`, canvas / PDF / audio-capture / flashcard debug triggers, `CaptureInspectorWindow.tsx`, `ChatDebugWindow.tsx`, `SidebarWindowToggle.tsx`, `SidebarApiVersionToggle.tsx`, right-click Admin Tools (`features/context-menu-host/on-open.tsx`) | ~30 files reference the debugger selectors on main |
| Chat package carries the same split | `aidream/apps/shared/chat/src/host/prefs.ts` (`superAdminDebugger`, fed by `lib/redux/chat-host-from-app.ts`); used in `cx-chat/components/ChatHeaderControls.tsx`, `cx-chat/components/user-input/ConversationInput.tsx`, `agents/components/inputs/smart-input/RunControlsTabPanel.tsx` | Survived the 2026-10-07 move of chat to `@ai-matrx/chat` |
| Power stays shut | "Surface Context Admin" editor and admin rich-document actions use `selectIsSuperAdmin` (lane-gated); the RunControls *creator tab* stays on power | Code read 2026-10-10 |
| Error/warning toast floor 5 s | `lib/toast.ts` → `MIN_ERROR_TOAST_MS`, applied in `errorOnWallClock`, `toastErrorAlreadyCaptured`, `recordToast.error/warning`, `toast.warning` | Browser: visible at 4.6 s, gone by 6 s |
| Hold + full restart | `lib/toast.ts` → `toasterIsHeld`, `holdTrackedToasts`, `releaseTrackedToasts`, `arm`, `restart`; `components/ui/sonner.tsx` → `useToastHold` | Browser: held 8 s under pointer; held 7 s with menu open; full 5 s after menu closed |
| Alchemy menu on every error toast | `components/errors/errorToastAlchemy.tsx` (decorator registered in `components/ui/sonner.tsx`), `components/errors/ErrorAlchemyMenu.tsx` → `CopyButtons` → `@ai-matrx/design-system/content-transfer` `MatrxCopyMenu` | Menu shows Copy/Download, "Error for AI", "Error with fix request", "Prepare for AI" |
| Tests | `lib/__tests__/toast-hold-and-error-minimum.test.tsx` (proven RED without the fix), `lib/__tests__/record-toast-lifetime.test.tsx`, `components/ui/__tests__/toaster-stale-sweep.test.tsx` | Passing at last run |
| Guard | `pnpm check:admin-lane` (`scripts/check-admin-lane.ts`) | Clean 2026-09-30. **Red again on 2026-10-10** — see Regressions |

### Regressions found on 2026-10-10 (introduced by other sessions after this work)
`pnpm check:admin-lane` reports 16 findings in 10 files. Most read like debug or internal-only UI that reached for the "way in" selector (`select*Person`) because nobody knew the Debugger pair existed:
- `selectIsAdminPerson` / `selectIsSuperAdminPerson` used to gate UI: `features/agents/factory/components/BuildProgress.tsx:215`, `features/mandates/runs/RunFacts.tsx:46`, `features/marketing/social/useConnectionStates.ts:20`, `features/notifications/components/BellPanel.tsx:97`, `features/notifications/components/InboxWorkspace.tsx:130`, `features/notifications/components/PlacesStrip.tsx:94`.
- Server identity used on a user page: `app/(core)/review/page-cleanup/page.tsx:23`, `app/(oauth-review)/layout.tsx:16`.
- Admin-power RPC from user-side code: `features/agents/agent-creators/templates/templateArchive.ts:71` (`is_platform_admin`).
- New admin map without the lane: `app/(core)/applets/admin` (add it to `ADMIN_LANE_PATH_PREFIXES` in `utils/supabase/adminLane.ts`).

Triage rule for each: if it shows the admin extra *diagnostic* detail → switch to `selectIsAdminDebugger`/`selectIsSuperAdminDebugger`. If it shows other people's data or a write control → `selectIsSuperAdmin` (power) or move it under `/administration`. If it only offers the way into an admin page → add the file to `IDENTITY_ALLOWED` / `SERVER_IDENTITY_ALLOWED` in `scripts/check-admin-lane.ts` with a one-line reason.

### Partial
- **Real-mouse confirmation.** The in-app test browser cannot move a physical mouse, so hover was proven with dispatched `PointerEvent`s plus unit tests. Remaining: one person moves a real mouse over an error toast and into its copy menu on desktop Chrome and Safari.
- **Touch devices.** Not exercised. On iOS, `:hover` sticks after a tap, so a tapped toast may stay held until the next tap elsewhere. That is acceptable, but unverified.

### Not started
- **No guard prevents a new debug tool from using the power selectors again.** `check:admin-lane` stops identity being used as power, but not the reverse mistake (a debug panel gated on `selectIsSuperAdmin`, which goes invisible on user pages).
- **The 5 s / 8 s floors are code constants**, not Feature Knobs. Platform rule: behavioural values become knobs (admin default → org override → user override).

### Known issues / risks
- **`console.error` is not captured in development by design** (`lib/diagnostics/globalErrorCapture.ts`, "NON-DEV ONLY" block). On localhost only real failures appear in the inspector; on deployed builds console errors appear too. Do not "fix" this.
- **`selectIsAdminDebugger` can be misused.** It is plain identity. It must never gate data, a write, or another person's record. The rule is in the selector's doc comment only.
- **Pages with two Toasters** (e.g. `app/(auth-pages)/toast-copy-check/page.tsx` renders its own plus the layout's) show every toast twice. `toasterIsHeld` checks every stack, so holding works, but the duplication is cosmetic noise on that test page only.
- **Hidden-tab sweep.** `useStaleToastSweepOnReturn` in `components/ui/sonner.tsx` dismisses every toast when a tab comes back after more than 1 s hidden, including a held one. Intended, but it will confuse anyone testing in a browser pane that hides during screenshots.
- **Bare `sonner` imports are invisible** to the Error Inspector and bypass every rule above. Down from ~580 files to 4 (`rg "from \"sonner\"" --type ts`); finish them.

---

## 3. Architecture / orientation

```
Admin identity (Redux)
  state.userAuth.isAdmin / adminLevel    ← seeded at session boot from server layouts
        │
        ├─ ADMIN POWER     selectIsAdmin / selectIsSuperAdmin / selectAdminLevel
        │                  = identity AND state.userAuth.adminLaneOpen (true only under /administration
        │                  and ADMIN_LANE_PATH_PREFIXES in utils/supabase/adminLane.ts)
        ├─ ADMIN IDENTITY  select*Person      → ONLY the way into the admin section (allow-listed in check:admin-lane)
        └─ ADMIN DEBUGGING select*Debugger    → debug tooling on every page, no data power

Error capture (independent of admin state)
  captureError(...)  lib/diagnostics/errorCaptureStore.ts   ← adapters: Supabase proxy, stream, window errors,
        │                                                       React boundaries, toast.error/warning, …
        ├─ persisted for everyone: lib/diagnostics/persistCapturedErrors.ts → rpc log_client_error
        └─ shown to admins: features/admin/error-inspector/*  (gated on selectIsAdminDebugger)

Toasts
  toast / recordToast / toastErrorAlreadyCaptured   lib/toast.ts   (never import "sonner" directly)
        ├─ track(): hands sonner duration=Infinity; runs OUR wall-clock timer (arm/restart) with floors
        │           MIN_ERROR_TOAST_MS (error, warning) and MIN_ACTION_TOAST_MS (toasts with an action)
        ├─ error path → decorateError → errorToastDecorator (components/errors/errorToastAlchemy.tsx)
        │           puts <ErrorAlchemyMenu> in the toast's first free action/cancel slot
        └─ hold: toasterIsHeld() / holdTrackedToasts() / releaseTrackedToasts()
  <Toaster>  components/ui/sonner.tsx   ← useToastHold (document pointer/focus listeners), sweeps, decorator registration
```

Docs to update with any change: `features/admin/error-inspector/FEATURE.md` and `components/errors/FEATURE.md` (both have Change Log entries dated 2026-09-28).

---

## 4. Next steps (in order)

0. **Clear the 16 `check:admin-lane` findings (2–3 h)** using the triage rule under Regressions, then run `pnpm check:admin-lane` until it is clean.
1. **Real-mouse check (15 min).** Sign in locally as `admin@admin.com` (`pnpm dev-login /toast-copy-check`, open the printed `*.localhost:3001` URL). Click "Show timeout", hover the toast for 10 s, open its copy icon, move into the menu, choose "Error for AI", and confirm the clipboard holds the report. Repeat in Safari. Fix anything found in `lib/toast.ts` / `components/ui/sonner.tsx`.
2. **Add the missing guard (½ day).** Extend `scripts/check-admin-lane.ts` with a rule: a user-side file whose path or component name says debug/inspector/diagnostic/indicator/dev-trigger and that reads `selectIsAdmin`/`selectIsSuperAdmin` (not the Debugger pair) is a finding, unless allow-listed with a reason. Add a planted offender to `--self-test` and prove it RED then GREEN.
3. **Move the floors to Feature Knobs (½–1 day).** `MIN_ERROR_TOAST_MS` and `MIN_ACTION_TOAST_MS` become knobs (admin default 5000 / 8000 → org → user). Read them once at boot; keep the constants only as the knob defaults.
4. **Finish the bare-`sonner` sweep (1 h).** Convert the last 4 files to `@/lib/toast`.
5. **Touch-device pass.** On an iPhone, raise an error toast, tap the copy icon, use the menu, and confirm the toast leaves about 5 s after you're done.

---

## 5. Gotchas

- **Never gate debug tooling on `selectIsAdmin` / `selectIsSuperAdmin`.** It vanishes everywhere but `/administration`, silently. Use the Debugger pair. Never gate data or writes on the Debugger pair.
- **Never use `select*Person` for anything but the way into the admin section**; `pnpm check:admin-lane` fails on it. Run that check after touching admin gates. New `(core)/**/admin` maps must be added to `ADMIN_LANE_PATH_PREFIXES` or the check fails.
- **Chat code no longer lives in this repo.** Its debug gates are in `aidream/apps/shared/chat/src` and read `superAdminDebugger` through the host contract (`lib/redux/chat-host-from-app.ts`). Edit there, publish, then `pnpm sync:matrx-packages` here.
- **Don't pass a real duration to sonner.** Sonner pauses timers while the tab is hidden and defers dismissals through animation frames. `lib/toast.ts` deliberately hands it `Infinity` and times toasts itself. Read the header comment of `lib/toast.ts` before changing anything there.
- **Hover is tracked by events, not just `:hover`.** jsdom has no `:hover`, and a toast removed under the pointer fires no `pointerout`. That is why `heldByPointer` exists and why any pointer movement outside the toaster releases it. Keep both.
- **The browser test pane fires no pointer events from its hover action and may go hidden during screenshots.** Drive real `PointerEvent`s from page JavaScript, and expect the hidden-tab sweep to clear toasts.
- **Shared checkout:** commit with `git commit --only -- <your files>`. A sync job may sweep your files into a "local work not committed" commit; check `origin/main` before assuming your work is lost.
