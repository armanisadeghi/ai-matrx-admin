# Media Capture — code-path rules

Cross-repo system-of-record: /Users/armanisadeghi/code/common-docs/systems/media/media-capture/FEATURE.md — read it before touching this feature in ANY repo.

The metadata schema v1, TUS wire contract, server contracts, org-folder rule, journal-recovery semantics and status live there. Execution plan: [docs/media-capture-plan.md](../../docs/media-capture-plan.md).

One platform capture system for **photos, video, and audio** from browser media devices, on desktop and mobile.

## Core-storage contract

Exactly one byte store, no capture-specific record store:

| Store | Holds | Single access path |
|---|---|---|
| `files.files` (universal handler) | ALL captured bytes (photo/video/audio) + `metadata.capture` | `upload/capture-uploader.ts` → `fileHandler.upload` |

- Rows land under `folderForCaptures(kind, orgId)` (`features/files/utils/folder-conventions.ts`) and `capture-uploader` waits for the chosen organization through `awaitEffectiveOrganizationId`, refusing (no bytes leave) when there is none; `inheritActiveScope` is unconditional. Rule and reason: the system-of-record. Guard: `upload/__tests__/capture-uploader.test.ts`. Persist `file_id`, never URLs. Render via `<InlineMediaRef>`. The `/camera` library collects captures by folder-path prefix + kind, so BOTH flat and org-namespaced captures surface (the whole-user-tree read has no org filter).
- Output `width`/`height`/`duration_ms` live in canonical `files.files` columns (server probe). `metadata.capture` is the snake_case discriminated union v1 defined in the common-docs system of record — never persist device IDs, group IDs, or hardware labels.
- Inventing a capture table or a second byte path is the named failure class.

## Layout

```
features/media-capture/
  core/       capture-types (+ buildPhotoCaptureMetadata) · geometry (sourceRect) · constraints · mime-selection   [pure, unit-tested — LIVE]
  runtime/    camera-stream-manager (the ONE getUserMedia({video}) site) · mediaCaptureDiagnostics (aggregating registry)   [LIVE]
  recording/  media-recorder-controller · video-recorder · chunk-journal · journal-recovery (the ONE assemble+save flow)   [LIVE]
  upload/     capture-uploader (validate → CloudFolders.CAPTURES_* → fileHandler.upload; failures → diagnostics ring w/ retry payload)   [LIVE]
  hooks/      usePhotoCapture · useCaptureUploadFeed (Redux→diagnostics upload feed host)   [LIVE]
  components/ CameraPreview · CaptureStudio · CaptureControls · CaptureDeviceRail · RecordingHud · CaptureReview ·
              DeviceFallbackInput · CameraPage · CaptureLibrary · CameraControlTab · CameraAdminDiagnostics ·
              CaptureModeBar (the shared Photo·Video·Upload row with the spring-slide active thumb — sole remaining
              consumer: commerce-intake IntakeCaptureScreen v1; superseded by the @ai-matrx/capture mode row, DELETE
              when the v1 chrome swap is approved; transform-only, reduced-motion snap)   [LIVE]
```

Routes: `app/(core)/camera/` (LIVE — SSR auth gate, `createRouteMetadata` letter "Ca", skeleton loading; body via `<PageHeader>` + `h-full overflow-hidden bg-textured`; Capture Studio + the full `CaptureLibrary` management lens over the existing cloud-files tree/`useFolderContents` — no second query stack) and admin-gated `/camera/admin` (LIVE — `<FeatureAdminPage>` map + read-only `CameraAdminDiagnostics`; never acquires a camera). Dev harness: `/demos/media-capture` (real primitives — profiles, mount/unmount leak check, diagnostics readout). Devices layer: `features/media-devices/` (shared with audio). Recording shares `features/audio/captureLock.ts`, `micStream.ts`, and the audio session registry.

**Production consumer:** the PDF scanner's `features/pdf/scanner/components/CaptureView.tsx` runs on this runtime (environment facing, `maximum-available`, full-frame canvas capture at q0.92, per-shot Blob; native takePhoto disabled there — WYSIWYG requires output dims === stream `videoWidth×videoHeight`).

## Invariants

The 13 enforced invariants live in [docs/media-capture-plan.md](../../docs/media-capture-plan.md) §5 and are normative here. Highlights: one gUM(video) site; captureLock before any MediaRecorder (takeover = discard); mic only via micStream clones; camera stops on last lease release, never prompts at boot; intrinsic dims never from element offsets; `canvas.toBlob` only (no base64); tracked object URLs revoked on every terminal path; emitted Blob MIME is authoritative; one video file per capture.

## Pure capture core (`core/`)

`core/` is pure TS, zero DOM side effects, unit-tested (`pnpm jest features/media-capture/core`):

- `capture-types.ts` — metadata union v1 + `FramingMode` / `CaptureQualityProfile` / capture state + terminal `CaptureErrorKind`s; `isCaptureMetadata` strict validator (rejects unknown/camelCase keys and any deviceId/groupId/label at any depth).
- `geometry.ts` — `sourceRect(...)`: identity for full-frame; exact object-cover crop for viewport-crop; throws on degenerate dims. Header documents the three-sizes separation rule.
- `constraints.ts` — `buildVideoConstraints` (profiles; maximum-available over-asks ideal 4096, no aspectRatio), `summarizeTrackState` (requested/capability/effective, no device identifiers), `isCompatibleQualityChange` (reacquire only on deviceId/facingMode change).
- `mime-selection.ts` — concrete-string recording ladders (`selectRecordingMime`, null = browser default) + `extensionForMime` (audio types delegate to `features/audio/utils/audio-mime.ts` — never fork that map).
- `video-file-inspection.ts` — the ONE metadata probe for user-picked video files. It returns the file's video MIME plus a finite positive integer duration, with a bounded 10-second fallback for codecs that never settle metadata; captured recordings bypass the probe and keep their engine-owned facts.

## Camera runtime (`runtime/`)

`runtime/camera-stream-manager.ts` — framework-free singleton, the ONE legal `getUserMedia({video})` call site (ESLint `cameraGetUserMediaChokepointBan` in `eslint.config.mjs` enforces; legal exceptions carry an inline justified disable). The mic twin of `features/audio/micStream.ts`, minus keepalive:

- `acquireCameraLease({deviceId?, facingMode?, profile})` → ref-counted `CameraLease` (`id`, live `stream` getter, `getTrackSummary()` requested/capability/effective via `summarizeTrackState`, `on("reconfigured")`, `supportsTorch()` / `setTorch(on)` (phone flashlight on the shared track; holders re-apply after "reconfigured"), `release()`).
- **Compatibility policy:** equal deviceId+facingMode+profile share the stream. Incompatible acquire: no pin → reacquire at the new spec, stop old tracks, fire `"reconfigured"` to every holder with the new stream; pinned → reject with typed `CameraBusyError` (carries `pinOwner`). Never a silent wrong-spec stream.
- `pinForRecording(leaseId, ownerLabel)` / `unpin()` — pin blocks incompatible acquires; releasing the pinned lease auto-unpins.
- **Camera stops IMMEDIATELY on last release** — no keepalive, no boot prompt.
- Preferred device via injected `setPreferredCameraResolver` (wired to Redux by the provider layer; applied next-acquire, caller spec wins).
- Interruptions: `subscribeCameraInterruption` (`ended|muted|unmuted|permission-revoked`); `pagehide` leak scream + hard stop; `notifyCameraPermissionRevoked()` for the device layer.
- Permission: real gUM outcomes → `noteCameraPermissionOutcome` (denial only for NotAllowedError/SecurityError); `installCameraPermissionAcquirer()` registers the label-unlock acquirer with the device manager — explicit install by the provider layer, never an import side effect.
- **Combined camera+mic prompt** — `acquireCameraLease(spec, { combineMicPrompt: true })`: recording surfaces where the mic is first-class (video + voice notes) get ONE `getUserMedia({video, audio})` browser prompt instead of a camera prompt at open plus a mic prompt mid-action. Applied only when `shouldCombineMicPrompt(micState)` says a mic prompt would actually appear (`prompt`/`unknown`; never when granted — pointless — or denied — audio would fail the whole call). Audio tracks are split off into the mic singleton via `adoptWarmAudioStream` (micStream keepalive clears the light; the grant stays banked) and reported via `noteMicPermissionOutcome`; a combined-call denial retries ONCE video-only so a mic denial never takes the camera down (bounded, never a constraint-fallback loop). **Surfaces pre-check `queryCameraPermission()` before acquiring** — a known-denied state renders an inline how-to-re-enable explainer instead of another gUM call.
- **iOS Safari re-prompts per browser session by design** — no code removes that; the durable-grant path there is install-to-home-screen (standalone PWA), which the app already supports (`app/manifest.webmanifest/route.ts`, `display: "standalone"`, linked from `app/config/metadata.ts`). Within a session, the combined prompt + the surfaces' video-mode mic warm-hold (`acquireMicStream` held while in video mode) keep it to one prompt per medium.
- Before the combined `getUserMedia({video, audio})` the manager calls `prepareAudioSessionForCapture()` (`@ai-matrx/browser-audio` ≥ 0.4.1; WebKit refuses audio capture while the audio session category is `"playback"`), and every path that adopts no audio track calls `releaseAudioSessionForCapture()` so a failed prompt never leaves the page on `"play-and-record"`. See `features/audio/FEATURE.md` § Audio device + permission system.
- `getCameraStreamState()` / `subscribeCameraStream` — referentially stable snapshots (`useSyncExternalStore`-safe); `cameraStreamDebug()`.

`components/CameraPreview.tsx` — the canonical live `<video>` for a lease's stream: `framing` `full-frame` (object-contain) / `viewport-crop` (object-cover), always via inline styles (the global mobile `img,video,iframe{height:auto}` rule beats Tailwind — the legacy `camera-view.tsx` workaround, replicated + cited); `mirror` is a preview-only CSS transform; intrinsic dims (`videoWidth/videoHeight`, never element offsets) reported via `onIntrinsicSize` on loadedmetadata/resize/orientationchange; muted + autoplay + playsInline. Renders only — never acquires/releases leases.

## Photo capture + Capture Studio

- `hooks/usePhotoCapture.ts` — **canvas primary everywhere**: `sourceRect(...)` region of the SOURCE frame drawn to a canvas sized to the SOURCE crop (never element offsets), `canvas.toBlob("image/jpeg", q)` → `capture-<ISO>.jpg` File. `ImageCapture.takePhoto()` is a feature-detected enhancement, opt-in (`allowNativeTakePhoto`) and full-frame ONLY, with canvas fallback on any error — viewport-crop and the scanner's WYSIWYG path never use it. Core (`capturePhotoFromVideo`) is DI'd (canvas factory) and geometry-tested.
- `components/DeviceFallbackInput.tsx` — `<input type="file" accept="image/*" capture>` normalized to the same contract (`source: "capture-input"`): EXIF orientation applied + metadata stripped via `createImageBitmap({imageOrientation:"from-image"})` → canvas re-encode; oversized images (>24 MP) downscale to the pixel budget instead of OOMing.
- `upload/capture-uploader.ts` — validates with `isCaptureMetadata` BEFORE upload (throws loudly on unknown keys / hardware identifiers), folder from `CloudFolders.CAPTURES_PHOTOS/VIDEOS/AUDIO` (added to `features/files/utils/folder-conventions.ts`, private by rule), bytes via `fileHandler.upload` only; a resolve without `fileId` is an upload failure.
- `components/CaptureStudio/CaptureControls/CaptureReview` — preview (viewport-crop default, full-frame toggle, front-camera mirror preview-only) → shutter → review (retake / download / save). Tracked object URLs revoked on retake/replace/unmount and on the save-swap to `<InlineMediaRef>` by file_id. Terminal `CaptureError` kinds surfaced: `permission-denied`, `device-removed`, `stream-ended`, `not-supported` (added to the kind union); permission/not-supported offer the OS-camera fallback. Facing flip on mobile, device select (deviceManager cameras) on desktop.
- The PDF scanner runs on this runtime (details: `features/pdf/FEATURE.md`); no legacy camera components or shims remain.
- Tests: `npx jest features/media-capture --no-coverage` (geometry integration + uploader contract + prior core/runtime suites).

## Recording + chunk journal + TUS client

`recording/` is framework-free (no React/Redux):

- `media-recorder-controller.ts` — THE canonical MediaRecorder state machine for video AND audio (locked decision 5; `useSimpleRecorder` runs on it — no second MIME/lifecycle machine anywhere). Constructor-confirmed ladder fallthrough over `recordingMimeCandidates` (all-fail → typed `UnsupportedCodecError` + `unsupported-codec` terminal); `recorder.mimeType` and the emitted-Blob MIME are authoritative (`getAuthoritativeMime`); start/pause/resume/stop/cancel with EXACTLY ONE terminal event per controller; pause-aware monotonic elapsed via `performance.now()` (never chunk arrival); timeslice `onChunk(blob, sequence)`; max-duration + estimated-size (emitted bytes + bitrate extrapolation) hard stops with distinct terminal reasons.
- `chunk-journal.ts` — crash-safety IndexedDB `mtx-capture-journal`: `chunks` keyed `[capture_id, sequence]` (stored as raw bytes + MIME), `manifests` keyed `capture_id` (status recording/finalized/discarded, mime, emitted_bytes, created/expires, last_sequence, source_feature, has_audio). `navigator.storage.estimate()` preflight rejects a start under `JOURNAL_MIN_FREE_BYTES` (typed `StorageQuotaError` → `storage-quota` terminal). Retention 48h (`purgeExpired`). **Recovery semantics (invariant 11):** durability is promised ONLY for emitted chunks; `finalized` = whole, `recording` = interrupted partial; `readChunks` reports `missingSequences` LOUDLY; the studio phrases recovery as "Recovered N of M segment(s)", never as whole. The TUS resume-URL store is a SEPARATE DB (`mtx-tus-urls`) — never merge them.
- `video-recorder.ts` — orchestrators `startVideoRecording` (pinned lease + optional mic clone) and `startAudioRecording` (same engine — NOT a parallel recorder). Mic discipline on EVERY exit path (stop/cancel/takeover/track-end/pagehide/start-failure): `acquireMicStream()` ONCE → clone the track → stop ONLY the clone → `releaseMicStream()` exactly once (double-release guarded; unit-tested with spies). `claimCapture({id: MEDIA_CAPTURE_LOCK_ID})` before the recorder; **takeover = discard** (journal dropped, no partial blob ever delivered). Registers `beginRecordingSession({source: "media-capture"})` (new `AudioSessionSource` member). Environment exits (camera/mic `ended`, permission-revoked, `pagehide`) stop-and-PRESERVE the journal; the final Blob is always assembled FROM the journal (single source of truth), result `{blob, mime (authoritative), durationMs, hasAudio, partial}`.

Studio: `CaptureStudio` has a photo/video/audio mode switch (`CaptureControls`), record/pause/resume/stop/cancel with the controller-fed elapsed timer, mic on/off for video, and a recovery banner on open (`listRecoverable()` → Finish & save / Discard, loud partial phrasing). Review (`CaptureReview`) plays video/audio through `useOutputSinkRef` and joins the audio system via `useMediaElementPlaybackSession`. Metadata via `buildVideoCaptureMetadata` / `buildAudioCaptureMetadata` (`core/capture-types.ts`) — `recorder_mime_type` is the FINAL Blob MIME, `source_settings` from the lease's `getTrackSummary().effective`; saved through `capture-uploader` into `Captures/Videos|Audio`.

**Transport:** large captures upload via the TUS client in the file handler — policy + status in [features/files/handler/FEATURE.md](../files/handler/FEATURE.md) § Transport policy. The client is unit-tested against an injected HttpStack; live-device verification is tracked in the system-of-record's Open list.

Tests: `npx jest features/media-capture --no-coverage` (controller ladder/elapsed/caps, journal append/finalize/recovery/expiry/quota, mic-release exit paths, plus prior suites).

## Management surfaces + Media control window

- **`runtime/mediaCaptureDiagnostics.ts`** — framework-free AGGREGATING registry (audioSessionRegistry discipline: lazy wiring, referentially stable snapshot, subscribe, `__reset`): camera stream state (subscribed), captureLock owner, media-capture recording sessions (filtered from the audio registry), capture upload/transport state (FED via `feedUploadState` from the `useCaptureUploadFeed` client host — the registry never imports Redux), on-demand journal summaries (`refreshCaptureJournals`), and a bounded recent-failure ring (`recordCaptureFailure`, MAX 50) with retry payloads (File + metadata) in a side table (`getCaptureRetryPayload` / `dismissCaptureFailure`). It owns nothing — never a second source of truth.
- **Failure wiring:** `capture-uploader` records every terminal upload failure WITH a retry payload (the one cloud chokepoint); the studio records camera-acquire and recording terminal errors; `journal-recovery` records recovery failures. Retry = surfaces re-invoke `uploadCapture` from the payload, then dismiss the entry.
- **`recording/journal-recovery.ts`** — `finishJournalRecovery(entry)` is THE assemble+save flow (read chunks → metadata → `uploadCapture` → discard journal, journal preserved on failure). The studio banner AND the /camera library both run it — never fork a second recovery.
- **`/camera` (full list page)** — `components/CaptureLibrary.tsx`: kind filter chips (All/Photos/Videos/Audio; `metadata.capture.artifact_kind` authoritative, mime tiebreak) over all three `Captures/*` folders via the EXISTING files layer; upload-state chips (in-flight from the cloudFiles slice, failed with Retry from the diagnostics ring, TUS resume-pending count via `listStoredTusUploads`); Recovery section (shared flow); tiles open `/files/f/[fileId]` and carry the canonical `FileRightClickMenu` (rename/move/share/download/delete — nothing reimplemented).
### The manage half

The capture side has observability (above) and the same **management** surface the audio side has. Three shared components are the whole story — the library and the Camera tab render the SAME code, so they can never drift:

- **`components/CaptureItemActions.tsx`** — THE per-capture action menu, on library tiles and Camera-tab rows. It is a thin HOST over the canonical files stack, never a second mutation path: the menu is `<FileContextMenu>` (Preview / Download / Copy link / Rename / Visibility / info / versions / Delete via `useFileMenuActions` → `useFileActions` thunks); **Move…** and **Share…** are the two items `FileContextMenu` deliberately leaves to its host, supplied here with `openFolderPicker` + `useFileMutation().move` and the canonical `<PermissionsDialog>`; rename opens the canonical `<RenameDialog>`. **Transcribe** (video/audio only) rides the menu's `extraMenuItems` slot → `transcribeCloudFile` (`features/audio/services/speechApi.ts`, `POST /audio/transcribe-file`) **by `file_id`** — bytes never round-trip through the browser — and the result renders through the existing `<ContentActionBar />` (copy / read aloud / save to notes / export). Empty transcription is reported as "no speech detected", never as an empty transcript. Mobile: Drawer, not Dialog.
- **`components/CaptureRecoverySection.tsx`** — the ONE recoverable-journal surface, now rendered in BOTH the library and the Camera tab (the tab previously could only *link* to /camera). Finish & save runs the shared `finishJournalRecovery`; the toast repeats that flow's own "Recovered N of M segment(s)" note verbatim.
- **`components/CaptureTransportStrip.tsx`** — the ONE upload/transport strip (in-flight %, failed uploads with Retry from the diagnostics ring's retained payload, TUS resume-pending), extracted from the library and shared with the tab. A retry whose payload has fallen off the bounded ring says so instead of silently dismissing.
- **`components/CaptureThumb.tsx`** — the leaf over `<InlineMediaRef>` for persisted capture thumbnails. It isolates the `ref=` hand-off from the React Compiler and opts ID-backed images into the authenticated blob cache, so iOS reloads never depend on a cross-site file-session cookie. Reach for this component, never a raw `<InlineMediaRef ref={file.id}>` inside a card that also reads other fields of `file`.
- **Camera tab is now a capture surface, not a readout** (`components/CameraControlTab.tsx`), in the Recording tab's own order: **live capture** (pinging REC dot, kind icon, label, the recorder's REAL pause-aware elapsed clock, Stop) → **recovery** → **transport** → **this session's captures** (thumbnail, kind, status, per-item actions) → **Diagnostics**, collapsed behind a disclosure so the tab leads with what a user cares about. It still never acquires a camera or prompts.
- **Live clock plumbing** — `runtime/mediaCaptureDiagnostics.ts` gained `registerLiveCapture(info, readers)` / `getLiveCaptureProgress()` and a `liveCapture` snapshot field. The **readers stay OUT of the snapshot** (functions, and elapsed changes continuously) — surfaces poll on their own tick. `recording/video-recorder.ts` registers on start and unregisters inside `finish()`, the one funnel every terminal path already goes through, so no exit can leak a phantom live capture. Stop is routed through the audio session registry's control side-table (`control(id, "stop")`) — the Camera tab never holds a recorder handle.
- **The app-wide recording pill requires persistence controls.** `LiveCaptureIndicator` renders and guards navigation only when the owning surface registered `LiveCaptureControls`; low-level consumers such as product capture publish recorder identity for diagnostics but keep their own stop/save UI. Missing controls never fall back to `/camera`.

**Rule:** anything that manages a capture is a LENS over `files.files`. No capture-specific mutation path, no ad hoc `.from()`, no second action menu.

- **Media control window** — `AudioControlWindow` retitled **"Media"** (overlayId `audioControlWindow`, window/component ids, and openers UNCHANGED — zero breakage); desktop tabs Playback / Recording / **Camera** / Devices, mobile stacked sections. Camera tab = `components/CameraControlTab.tsx` (read-only diagnostics: leases/spec, pin + lock owners, live sessions, transport summary, recoverable-journal count → /camera). Avatar-menu entry: label "Media", icon `MonitorSpeaker`. Registry/catalogue labels updated.
- **`/camera/admin`** — `app/(core)/camera/admin/page.tsx`: `<FeatureAdminPage>` (admin-gated, `routeScanPath: "app/(core)/camera"`) listing routes/panel/components/demo/docs/related features, plus `CameraAdminDiagnostics` (client, read-only): supported recording MIMEs (`recordingMimeCandidates` × `MediaRecorder.isTypeSupported`), permission states + device counts (labels only when already granted; never persisted), applied spec, lease/pin/lock owners, transport + TUS sessions, journals, failure ring. **Opening it never acquires a camera or prompts.** Add every new capture route/panel/component to this map.
- `@/features/files` public surface gained `selectVisibleUploads` / `selectAllFoldersArray` / `listStoredTusUploads` (read-only observability exports) for the feed + chips.

## Studio UX contract (2026-07-22)

The studio matches the audio recorder's bar. Three rules:

- **Devices are inline and canonical.** `CaptureDeviceRail` renders Camera / Microphone / Speaker capsules under the stage, always visible, sourced ONLY from `useAudioDevices()` (persisted via `userPreferences.mediaDevices`). It renders `DeviceMenuPanel` — the SAME popover body as the composer's mic picker (`components/audio/micDeviceMenuShared.tsx`); never a second device list, never raw `enumerateDevices`. A chosen camera re-acquires the lease; camera + mic capsules disable while recording (the lease is pinned) and say so. Denied permission shows an inline Grant button.
- **Recording is ceremonial, and every number is honest.** `RecordingHud` replaces the idle strip while recording: `text-3xl font-mono` monotonic timer (controller clock, never chunk-derived), `<AudioLevelIndicator>` fed by `useStreamAudioLevel(handle.getRecordingStream())` — the COMPOSED stream, so it reads 0 with the mic off — plus Duration and Estimated Size `<Progress>` gauges. The size gauge reads `controller.getEstimatedBytes()`, the same number `maxBytes` enforcement uses, so a gauge can never disagree with the hard stop it is about to trigger.
- **Review goes A-to-Z.** Playback routes through the selected speaker (`useOutputSinkRef`); after a successful save of video/audio, **Transcribe** calls `transcribeCloudFile({fileId})` → `POST /audio/transcribe-file` (server-side demux + chunking, bytes never re-uploaded) and renders the transcript with the shared `<ContentActionBar />` (Save to Notes/Tasks/File/copy — never rebuilt here). Transcription state carries its `file_id`, so a new capture can never display the previous one's transcript and a late response for an old file is discarded.

`useStreamAudioLevel` (`features/audio/useStreamAudioLevel.ts`) is the canonical level-meter hook — shared `AudioContext`, analysis-only, disconnect on every exit. New code consumes the hook, never an inline analyzer.

## Change log

- `2026-10-22` — page-pass 2026-10-22: type single-workspace tool page (capture + list), posture sharp after Apple Photo Booth / Loom, `/camera`. Header title stands alone (subtitle removed). `/camera` now mounts `matrx-user/camera` (emitter `cameraSurfaceScope.ts`: session values + captures status, counts, shown rows and an XML overview), the canonical page menu (Show captures: All/Photos/Videos/Audio) and the `capture_filter` ui target. `CaptureLibrary` exports `useCaptureItems()` (one files-layer read shared with the page) and takes a controlled filter; its hand-styled filter chips became the design-system capsule `Tabs`, and counts show only once loaded (was "(0)" beside a loading grid). Tile caption 10px → 12px.
