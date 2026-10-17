# FEATURE.md — `cloud-computer`

**Status:** `active`
**Tier:** `2`
**Last updated:** `2026-10-16`

---

## Purpose

The person's ONE persistent cloud Linux machine, shared by all their agents, shown as the
**Computer** tab of the chat canvas. Plan: `common-docs` `projects/cloud-computer/PLAN.md`.

---

## Entry points

- Composer "+" › Environment › **Computer** (`ResourcePickerMenu`, item `cloud_computer`) →
  `useOpenCloudComputerCanvas` → canvas type `cloud_computer` → `CanvasBody` → `ComputerView`.
- The composer's browser pill and every Cloud Browser opener land here for a machine run
  (`cloud-browser/hooks/useOpenCloudBrowserCanvas.ts` → `browserBelongsToComputer`).
- `ComputerView({ conversationId? })` is self-contained (no canvas coupling) so the agent
  dashboard can mount it; `conversationId` only binds Take control to that chat's agent.

## Files

| File | Role |
|---|---|
| `service.ts` | `GET/POST /browser-manager/cloud-computer[/wake]`; `lastKnownCloudComputer()` caches the last read for the synchronous browser-opener decision. |
| `useCloudComputer.ts` | One read on mount, 2 s poll only while waking (5 min cap). `autoWake` wakes an off/never-made machine once per mount. |
| `ComputerView.tsx` | Waking → screen. The screen is the Cloud Browser run ON the machine (`useCloudBrowser(…, "sandbox")`). |
| `ScaledFrame.tsx` | One live Selkies iframe scaled to any box; measures on the next animation frame. |
| `useOpenCloudComputerCanvas.ts` | Canvas item + `cloudComputerCanvasSourceId(conversationId)`. |

---

## Key flows

1. **Open = wake.** Opening the tab IS the person asking for their computer: an off machine
   is woken with initiation `"user"` (no Wake press). "Waking up…" shimmers in the same
   centred slot (no layout shift). Failed/expired → Try again, never an automatic re-wake.
   Clicks from "+" to a live picture: **3** ("+", Environment, Computer); was 4 plus a
   second Cloud Browser tab.
2. **Ready → the machine's Chrome.** Only after `ready`, the screen loads a snapshot limited
   to `execution_target = 'sandbox'` and, if none is live, starts one with that explicit
   target (the server keeps explicit targets). It never adopts or starts a fleet run.
3. **Watching** = bounded screenshot session; no stills while any person holds control, and a
   refused still backs off (`useScreenshotSession.paused`).
4. **Take control** = takeover flow (`useCloudBrowserTakeover`) then ONE control stream,
   holding the run's viewer seat (`cloud-browser/runViewer.ts`).

## Invariants & gotchas

- **One viewer per run.** A newer control claim supersedes older ones server-side; two mounted
  viewers froze the one being typed in (2026-10-16). Hold the seat before opening a stream.
- **A gone stream is a state.** Renew 404/410 or `superseded`/`taken_over` (`isStreamGone`)
  stops the renew loop and shows "Take control again"; it never keeps renewing a dead claim.
- **One chip.** The Computer view clears the `cloud_browser_profile` value chip; the composer
  pill (from `@ai-matrx/chat`) is the only browser chip and toggles this tab.

## Related features

- `features/cloud-browser/` — run, stream, takeover, screenshots (reused, never forked).
- `features/canvas/` — host pane.

## Change log

- **2026-10-16** — Open wakes the machine; screen is the machine's run only (sandbox target);
  one viewer seat per run; browser openers route machine runs here; quiet screenshot back-off;
  superseded stream → Take control again; ResizeObserver loop fix. Created this file.
