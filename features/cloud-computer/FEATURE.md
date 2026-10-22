# FEATURE.md — `cloud-computer`

**Status:** `active`
**Tier:** `2`
**Last updated:** `2026-10-22`

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
- Agents messenger (`/messenger/agents`) › agent details › **Computer** tab → `ComputerThumbnail` →
  `ComputerView variant="thumbnail"`; a press opens the one Computer tab.

## Files

| File | Role |
|---|---|
| `service.ts` | `GET/POST /browser-manager/cloud-computer[/wake]`; `lastKnownCloudComputer()` caches the last read for the synchronous browser-opener decision. |
| `useCloudComputer.ts` | One read on mount, 2 s poll only while waking (5 min cap). `autoWake` wakes an off/never-made machine once per mount. |
| `ComputerView.tsx` | Waking → screen. The screen is the Cloud Browser run ON the machine (`useCloudBrowser(…, "sandbox")`). |
| `AccountSetupPanel.tsx` | "Set up an account": the person signs up for an outside service themselves on the desktop (`POST /browser-manager/account-setup/start` opens the page on a profile kept for that account); one save (`POST /browser-manager/runs/{id}/account-setup/save`) puts the login in their Vault bound to that profile, then the authenticator key via `/api/authenticator/enroll`. What they type goes to the vault, never to an agent. |
| `ScaledFrame.tsx` | One live Selkies iframe scaled to any box; measures on the next animation frame. `interactive` turns input on in the same frame and makes it own the keyboard (focus on control start / press; a self-focusing field elsewhere hands it back). |
| `liveStream.ts` | Which held stream is the live picture (`liveStream`): any held stream on a watch-capable server, else only this revision's control stream. |
| `ComputerThumbnail.tsx` | The Computer at a glance for another surface: mounts `ComputerView variant="thumbnail"` only while on screen (`useInView`) and the page is visible; a press opens the Computer tab. |
| `useOpenCloudComputerCanvas.ts` | Canvas item; identity `CLOUD_COMPUTER_CANVAS_SOURCE_ID` — ONE per person, never per chat. |

---

## Key flows

1. **Open = wake.** Opening the tab IS the person asking for their computer: an off machine
   is woken with initiation `"user"` (no Wake press). "Waking up…" shimmers in the same
   centered slot (no layout shift). Failed/expired → Try again, never an automatic re-wake.
   Clicks from "+" to a live picture: **3** ("+", Environment, Computer); was 4 plus a
   second Cloud Browser tab.
2. **Ready → the machine's Chrome.** Only after `ready`, the screen loads a snapshot limited
   to `execution_target = 'sandbox'` and, if none is live, starts one with that explicit
   target (the server keeps explicit targets). It never adopts or starts a fleet run.
3. **Watching = the live stream.** When the run is live the tab mints ONE `mode:"view"` ticket
   and renders it in `ScaledFrame` with input off; thumbnail and enlarged view are that same
   frame. A server that only streams to the controller answers 409 (`isViewStreamUnavailable`):
   the tab falls back to stills (`useScreenshotSession`) and tries the view again on its next open.
4. **Take control = instant.** The takeover flow (`useCloudBrowserTakeover`), then input turns on
   in the already-open frame — no new ticket, no remount (keyed by `streamSessionId`). Stop
   releases control and keeps watching on the same connection. On the fallback server Take
   control opens the control stream as before. The renew loop runs only while in control.
5. **Typing reaches the machine.** Control on focuses the iframe; any editable field in the page
   that takes focus with no press/key in the page within 600 ms (the composer's autofocus) is
   refocused back to the iframe. Keys typed into the cross-origin frame never reach the page, so
   app shortcuts cannot fire. `allow` carries `keyboard-map`. Clicks map 1:1: the scale is a CSS
   transform on the iframe, the stream page itself is unscaled.
6. **One Computer tab.** The canvas identity is the machine's (`"cloud-computer"`), so the main chat,
   a chat window panel bound to the same machine, and every browser opener focus the one tab
   (2026-10-17: a window panel stacked a second one). The first opener's chat binds Take control.
7. **Our own status, never the stream's.** The frame src carries `?parent=<page origin>`; the stream
   page posts `{type:"matrx-stream", state:"connecting"|"connected"|"reconnecting"|"disconnected"}`
   to it; `connected` means a picture is on screen (the video peer is up AND a frame arrived after
   that connection; 2026-10-17 it fired on ICE alone and the page's black loader showed between).
   Only the endpoint's origin and the frame's own window are believed. Until `connected`,
   `ScaledFrame` covers the frame (absolute, no shift) with a shimmering "Connecting…" /
   "Reconnecting…" (or a still "Disconnected"). A page that never says `connected` stays covered until
   the connect deadline (the old 8 s silent reveal could drop the cover onto a black loader; removed
   2026-10-18). Every state is reported to the tab (`onStateChange`).
8. **Keyboard comes back.** While in control the row shows a Keyboard control ("Reconnect keyboard"):
   it focuses the frame and posts `{type:"matrx-stream-cmd", cmd:"keyboard-reset"}` (target origin =
   the endpoint's). Coming back to the page (window focus, visibility) refocuses the frame and posts
   `cmd:"focus"`; so does a press on the stream (window blur into the frame) or its letterbox.
   Anything that takes focus by itself while in control is handed back, except a dialog or menu.
   After a press on a page control (maximize, shrink, Keyboard, a tab) the keyboard goes back to the
   machine; a press that lands in a typing field or opens a dialog/menu keeps it (2026-10-18).
9. **No step-list poll.** The tab calls `useCloudBrowser(…, "sandbox", { followProgress: false })`: it
   never shows written progress, so it never reads `action_event` every 2 s.
10. **Chip says Computer.** Host slot `useCloudBrowserSurfaceKind` (registered in
   `providers/chatUiRegistrationBase.ts`, defined in `cloud-browser/hooks/useOpenCloudBrowserCanvas.ts`)
   answers "computer" when the slice's run is on the machine or the person has one.
11. **Honest states.** Machine up but its run still starting → "Waking up…" with no Watching pill
   and no Take control; run live, no picture yet → "Connecting…". A picture that goes away
   (`reconnecting`, or the connect deadline) first renews the claim: superseded (the person's other
   window took it) → "Opened somewhere else" + Take over, never an automatic take-back. Take control
   / Stop say "Taking control…" / "Stopping…" while the server works.

12. **Thumbnail = the same view.** `variant="thumbnail"` never wakes the machine (Asleep / Waking up… /
   Saving… / Could not start), mounts the screen only when the machine is `ready`, opens only a watch
   stream, takes only a FREE viewer seat (never steals it from the Computer tab) and says "On the
   Computer tab" while another viewer holds it, then reopens once the seat is free. No Take control.

## Invariants & gotchas

- **One viewer per run.** A newer control claim supersedes older ones server-side; two mounted
  viewers froze the one being typed in (2026-10-16). Hold the seat before opening a stream.
- **A gone stream is a state.** Renew 404/410 or `superseded`/`taken_over` (`isStreamGone`)
  stops the renew loop and shows "Take control again"; it never keeps renewing a dead claim.
- **The frame enters with a code.** The frame loads `streamFrameAddress(ticket)` (endpoint +
  the claim's one-use `?enter=`), never the bare endpoint: the page's claim cookie never reaches
  a cross-site frame, so the frame's own request must set its cookie (401 on local, 2026-10-17).
- **One chip.** The Computer view clears the `cloud_browser_profile` value chip; the composer
  pill (from `@ai-matrx/chat`) is the only browser chip and toggles this tab.

## Related features

- `features/cloud-browser/` — run, stream, takeover, screenshots (reused, never forked).
- `features/canvas/` — host pane.

## Change log

- **2026-10-22** — Dashboard thumbnail: `ComputerView variant="thumbnail"` + `ComputerThumbnail`, shown in
  the agents messenger's Computer tab (`@ai-matrx/chat` `renderComputer`). common-docs
  FIX-DASHBOARD-COMPUTER-2026-10-22.

- **2026-10-18 (c)** — Held Cloud folder deletes: `CloudFolderNotice` (in the Computer screen) shows a
  hold with **Delete N in cloud** / **Restore to folder** and the skipped-entry count (aidream
  `/browser-manager/cloud-computer/files[/resolve]`); `CloudComputerDeepLink` opens the tab from the
  `?cloudComputer=files` notice. common-docs FIX-SYNC-RESOLVE-2026-10-18.

- **2026-10-18 (b)** — Cold open overlap: the screen (and its sandbox run start) mounts once the
  machine is `starting` (`startsScreen`), so the run's activation joins the boot and Chrome launches
  the moment the machine answers; a provisioning Cloud Computer run is re-read every 750 ms
  (`provisioningPollMs`, fleet keeps 2 s). Measured: common-docs FIX-COLD-OPEN-2026-10-18.

- **2026-10-18** — Honest states (Waking up until the run is live, Connecting before the picture);
  second window → "Opened somewhere else" + Take over via a claim check on reconnect; keyboard handed
  back after page-control presses; no silent reveal; Taking control… / Stopping… labels.

- **2026-10-17 (c)** — Frame address carries the claim's one-use entry code
  (`streamFrameAddress`); fixes the 401 page on every cross-site (local) embed.

- **2026-10-17 (b)** — One Computer tab per machine; our own connection status over the frame
  (stream page contract); Keyboard reconnect + focus on return; plain control row (tap-target
  guard); no action_event poll; profile access asked once per profile (`cloud-browser/service.profileAccess`).

- **2026-10-17** — Watching is the live view stream (no white still); Take control turns input on
  in the same frame; the frame owns the keyboard while in control; composer pill reads Computer.

- **2026-10-16** — Open wakes the machine; screen is the machine's run only (sandbox target);
  one viewer seat per run; browser openers route machine runs here; quiet screenshot back-off;
  superseded stream → Take control again; ResizeObserver loop fix. Created this file.
