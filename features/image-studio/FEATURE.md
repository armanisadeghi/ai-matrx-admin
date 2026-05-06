# Image Studio — FEATURE.md

Four modes, one feature: **Convert** (resize to platform presets), **Edit** (full-featured editor with filters/text/shapes/AI assists), **Annotate** (screenshot markup), **Avatar** (dedicated circular crop), and **Generate** (text → image). Plus the historical landing/library/presets/from-base64 surfaces.

> **AI integrations.** Every AI assist surface in the modes (suggest edits, smart crop, redact PII, suggest annotations, generate from prompt, BG remove, upscale, inpaint, …) is enumerated in `features/image-studio/AI-AGENTS.md`. That doc is the source of truth for both the LLM agent shortcuts (Section A) and the deterministic Python endpoints (Section B). When an AI feature is wired but the underlying agent/endpoint isn't implemented yet, the UI surfaces a "ships next wave" toast — never a generic error.

## Routes

| Route | Type | Purpose |
|---|---|---|
| `/image-studio` | Landing (pure Server Component) | Hero, stat row, feature grid, preset legend, workflow steps, CTAs. Zero client JS. |
| `/image-studio/convert` | Interactive tool | Multi-file drop zone + preset catalog + per-variant tile grid + export panel. The original Image Studio UX. |
| `/image-studio/edit` | Interactive tool | Full-featured editor (Filerobot 5.0). Crop, rotate, resize, filters, fine-tune (brightness/contrast/HSV/warmth/blur/threshold/posterize/pixelate/noise), shapes (rect/ellipse/polygon/line/arrow), text, freehand pen, watermark. Layered AI toolbar adds Suggest edits, Remove BG, Upscale 2×/4×, AI edit by prompt. |
| `/image-studio/annotate` | Interactive tool | Screenshot markup (marker.js 2). Arrows, callouts, boxes, freehand, text, frames, blur/redact regions. AI toolbar: Suggest annotations, Redact PII, Detect faces. |
| `/image-studio/avatar` | Interactive tool | Dedicated circular-crop UX (react-easy-crop with `cropShape="round"`). 1:1 lock, zoom + rotation, Smart Crop button (face-detect Python endpoint). Outputs canonical 512² PNG into `Images/Avatars/`. |
| `/image-studio/generate` | Interactive tool | Text → image via the Python `/images/generate` endpoint. Prompt + size + count + style. Result tiles deep-link into Edit / Annotate / Avatar. |
| `/image-studio/presets` | Cached catalog | Browsable reference for every preset (pure server-rendered). |
| `/image-studio/library` | Per-user Supabase data | Variants the user has saved — grouped by session, public URLs. |
| `/image-studio/from-base64` | Interactive tool | Paste a base64 string (raw or `data:` URL) → preview + metadata + save to cloud as a hosted asset with a permanent share URL. Pure browser decode (no API hop), uploads via the cloud-files share-link primitive. |

All routes live under `app/(a)/image-studio/` and follow the `(a)` route rules — static shell, Suspense boundaries, dimension-matched skeletons. Edit / Annotate / Avatar / Generate use a shared `_shared/ModeImagePicker` landing when no source is provided via `?url=` or `?cloudFileId=`.

## Architecture

```
app/(a)/image-studio/
├── layout.tsx              metadata + shell-hide-dock
├── page.tsx                landing (Server Component)
├── loading.tsx
├── error.tsx
├── convert/
│   ├── layout.tsx          sub-route metadata
│   ├── page.tsx            Server shell + dynamic(ImageStudioShell, ssr:false)
│   └── loading.tsx
├── presets/
│   ├── layout.tsx
│   ├── page.tsx            Server Component — static catalog render
│   └── loading.tsx
├── library/
│   ├── layout.tsx
│   ├── page.tsx            Server Component + Suspense-fetched user data
│   └── loading.tsx
└── from-base64/
    ├── layout.tsx          sub-route metadata
    ├── page.tsx            Server shell + dynamic(Base64DecoderShell, ssr:false)
    ├── FromBase64ShellClient.tsx
    └── loading.tsx

features/image-studio/
├── FEATURE.md
├── AI-AGENTS.md                   full catalog of AI agents + Python endpoints
├── index.ts                       barrel
├── presets.ts                     catalog (60+ presets, 10 categories, 6 bundles)
├── types.ts                       types shared with API
├── api/
│   └── python.ts                  typed REST clients for /images/* Python endpoints
│                                  (generate, edit, inpaint, bg-remove, upscale,
│                                  variants, face-detect, style-transfer)
├── hooks/
│   ├── useImageStudio.ts          central client state for /convert
│   └── useBase64Decoder.ts        base64 paste → blob → cloud share URL
├── modes/
│   ├── shared/
│   │   ├── types.ts               ImageSource, ModeShellProps, SaveResult
│   │   ├── use-image-source.ts    File | URL | cloudFileId → loadable URL
│   │   └── save-edited-image.ts   blob → cloud-files via useUploadAndShare
│   ├── edit/
│   │   ├── EditModeShell.tsx      Filerobot 5.0 editor + AI assist toolbar
│   │   └── EditAiToolbar.tsx      Suggest edits / Remove BG / Upscale / AI edit
│   ├── annotate/
│   │   └── AnnotateModeShell.tsx  marker.js 2 + AI assist toolbar
│   └── avatar/
│       └── AvatarModeShell.tsx    react-easy-crop circular crop + Smart Crop
├── components/
│   ├── ImageStudioShell.tsx       3-column interactive shell (Convert mode)
│   ├── StudioDropZone.tsx         drag-drop + paste
│   ├── StudioFileCard.tsx         per-file row with variant grid
│   ├── StudioVariantTile.tsx      single variant tile (+ pending/error)
│   ├── PresetCatalog.tsx          picker + read-only + legend
│   ├── ExportPanel.tsx            format, quality, bulk actions
│   ├── StudioLandingHero.tsx      landing page Server Component
│   ├── Base64DecoderShell.tsx     /from-base64 interactive body
│   └── LibraryGrid.tsx            library page display
├── constants/
│   └── describe.ts                describe-agent constants (preview size, folder)
├── server/
│   └── library.ts                 server-only Supabase lister (react cache())
└── utils/
    ├── download-bundle.ts         JSZip client-side zipper
    ├── decode-base64.ts           pure-browser base64 → Blob + magic-byte MIME sniff
    ├── build-describe-preview.ts  downscale source → small WebP for the agent
    ├── format-bytes.ts
    ├── crop-file.ts               server-equivalent client-side crop helper
    ├── compute-crop.ts            crop area geometry calculations
    └── slugify-filename.ts

app/api/images/studio/
├── process/route.ts         multi-variant Sharp batch processor (runtime: nodejs)
└── save/route.ts            persists selected variants to Supabase Storage
```

## Data flow

1. User drops images into `StudioDropZone`. Client creates `StudioSourceFile` entries with `objectUrl` previews.
2. User picks presets from `PresetCatalog` — bundles or individual tiles.
3. User clicks **Generate**. For each file, the client POSTs `file + spec` JSON to `/api/images/studio/process`. The server runs Sharp across every selected preset in parallel and returns base64 data URLs + metadata.
4. Tiles render variants with previews, dimensions, file size, compression ratio, and per-variant actions (download, copy URL).
5. User can:
   - Click **Download** on a tile → single file to disk.
   - Tick tiles + click **Selected** → JSZip bundle of just those.
   - Click **All** → JSZip bundle of everything.
   - Type a folder name + click **Save all to library** → POSTs all data URLs to `/api/images/studio/save` which writes them to Supabase under `{userId}/{folder}/{sessionUuid}/`.
6. The Library page (server component) lists every saved session by reading the user's storage folder.

## Preset catalog

10 categories, 60+ presets:

- **Social Media** (21): Facebook, Instagram, X/Twitter, LinkedIn, YouTube, TikTok, Pinterest, Snapchat
- **SEO & Link Previews** (6): Open Graph, Twitter Card, Schema.org, article hero/thumb
- **Favicons & App Icons** (9): favicon 16/32/192, Apple touch, Android Chrome 192/512, maskable, Chrome Web Store, extension
- **Logos & Branding** (4)
- **Avatars** (5): XL, large, medium, small, tiny
- **E-commerce** (7): Shopify, Amazon, Etsy product images
- **Web & Blog** (6): hero, card, inline
- **Email & Newsletter** (3)
- **Mobile App Assets** (4): iOS/Android icons, splash, screenshots
- **Print** (3): A4, business card, US Letter flyer

Plus 6 one-click bundles: Share Everywhere, Complete Favicon Set, Full Avatar Set, Logo Lockup, Product Listing, Instagram Complete.

Every preset declares: `id`, `name`, `usage` (where it's used), `width`, `height`, `aspect`, optional `spec` (Facebook / W3C / Apple / Amazon…), optional `defaultFormat`.

## Processing pipeline

`app/api/images/studio/process/route.ts` accepts multipart `file + spec`.
- Sharp pipeline: `.rotate()` (EXIF) → `.resize(cover, center)` → `.flatten(bg)` if non-alpha format → encode.
- JPEG: `mozjpeg: true, progressive: true, quality`
- WebP: `quality`
- AVIF: `quality`
- PNG: `compressionLevel: 9` (quality is not configurable — always lossless)
- Returns base64 data URLs so the client can preview + download WITHOUT storage writes.

`app/api/images/studio/save/route.ts` accepts JSON `{ folder, variants: [{ filename, dataUrl, presetId }] }`.
- Auth-gated against `supabase.auth.getUser()`.
- Writes each variant to `userContent/{userId}/{folder}/{sessionUuid}/{filename}`.
- Returns public URLs.

## SSR / perf

- Landing, presets, and library pages are **Server Components**. No client JS ships for the landing hero / feature grid / preset catalog / library display.
- `/convert` is a Server Component shell that dynamically imports the interactive `ImageStudioShell` with `ssr: false` (avoids SSR/client mismatch around `FileReader`, `URL.createObjectURL`, `react-dropzone`).
- Library uses `react.cache()` + `server-only` for per-request memoisation of the Supabase list query.
- Every route has a dimension-matched `loading.tsx`.

## Modes architecture

The four interactive modes (Edit, Annotate, Avatar, Generate) share a single
shape so any one of them can be mounted from a route OR a modal dialog
(e.g. Notes "edit this image" → Edit mode in a modal):

```ts
interface ModeShellProps {
  source: ImageSource | null;       // File | URL | cloudFileId
  defaultFolder?: string;           // where saves land in Cloud Files
  presentation?: "page" | "modal";
  onSave?: (result: SaveResult) => void;
  onCancel?: () => void;
}
```

`useImageSource` resolves the three source kinds to a single browser-loadable
URL (with object-URL lifecycle for `File` sources). `saveEditedImage` wraps
canvas/dataURL output as a `File` and pushes it through the standard
`useUploadAndShare` upload pipeline — so every mode produces a `cloud_file_id`
+ persistent share URL on save, no special storage code per mode.

### Edit mode (Filerobot 5.0.1)

`react-filerobot-image-editor` gives us crop, rotate, flip, resize, fine-tune
(brightness/contrast/HSV/warmth/blur/threshold/posterize/pixelate/noise),
filters, freehand pen, shapes (rect/ellipse/polygon/line/arrow), text,
watermark. Filerobot runs entirely in the browser via Konva — the route
`dynamic`-imports the shell with `ssr:false`. The editor reaches for
`window`/`document` on first paint, so SSR mounting is forbidden.

Sibling **AI assist toolbar** (above Filerobot's native UI) hosts:
- ✨ Suggest edits — `image-suggest-edits` agent (next wave)
- Remove BG — `bg-remove` Python endpoint
- Upscale 2× / 4× — `upscale` Python endpoint
- AI edit by prompt — `image-edit` Python endpoint (text instruction → image)

When an AI op returns a new `cloud_file_id`, the editor force-remounts on
the result so the user can keep editing the AI output.

### Annotate mode (marker.js 2)

`markerjs2` is class-based and imperative — we mount it onto an `<img>` ref
inside an effect, listen for the `render` event, and pipe the resulting
dataUrl through `saveEditedImage`. The original image isn't modified; the
output bakes the annotations on top.

AI assist (next wave): Suggest annotations, Redact PII, Detect faces.

### Avatar mode (react-easy-crop)

`cropShape="round"`, 1:1 lock, zoom + rotation. **Smart Crop** button calls
the `face-detect` Python endpoint and re-centers/zooms to fit detected faces.
Output is always a 512² PNG written into `Images/Avatars/` so downstream
`/api/images/upload?preset=avatar` can produce 400/128/48 variants.

### Generate mode

Text → image via the Python `/images/generate` endpoint. Result tiles deep-
link into Edit / Annotate / Avatar via `?cloudFileId=` query params, so the
flow is generate → keep editing without an upload round-trip.

## How to extend

- **Add a new preset**: add an entry to the right array in `features/image-studio/presets.ts`. That's it — the catalog, convert tool, and reference page all read from the same source.
- **Add a new format**: extend `OutputFormat` in `presets.ts`, add a `case` in `encode()` in the process route, add a badge row in `ExportPanel.tsx`.
- **Add a one-click bundle**: append to `RECOMMENDED_BUNDLES`.
- **Add a new AI agent**: add the row in the DB, register in `features/agents/constants/system-shortcuts.ts` (key: `image-<name>-01`, feature: `image-studio`), then call `useShortcutTrigger` from the relevant mode toolbar — see `useImageStudio.ts:describeFile` for the canonical pattern. The full registry of planned agents is in `AI-AGENTS.md`.
- **Add a new Python endpoint**: append a typed client to `features/image-studio/api/python.ts` following the existing pattern (typed body, `postJson`, response shape with `cloud_file_id`). The Python team's contract is documented at the top of that file.
- **Add a new mode**: create `features/image-studio/modes/<name>/<Name>ModeShell.tsx` implementing `ModeShellProps`, then add the route `app/(a)/image-studio/<name>/page.tsx` mirroring an existing one.
- **Mount a mode in a modal** (e.g. "edit this image" from Notes): import the mode shell directly and pass `presentation="modal"` plus your own `onSave`/`onCancel`. No new wiring needed — the shells are presentation-agnostic.

## From Base64 (paste → cloud asset)

`/image-studio/from-base64` is a small standalone tool, separate from the multi-file `/convert` flow.

1. User pastes a string into the textarea — either a `data:image/...;base64,...` URL or just the raw base64 payload. Whitespace, newlines, and the URL-safe alphabet (`-`/`_`) are normalised before decoding.
2. `decodeBase64Image()` (`utils/decode-base64.ts`) decodes via `atob`, then sniffs the actual MIME type from magic bytes (PNG `89 50 4E 47`, JPEG `FF D8 FF`, GIF, RIFF/WebP, ISOBMFF/AVIF, BMP, ICO, SVG via leading text). Magic bytes win over the declared header — a mismatch surfaces a yellow warning in the UI.
3. The resulting `Blob` is wrapped in an object URL and rendered into a square preview card with a checkered transparency background. Image dimensions are decoded asynchronously via an `<img>` element.
4. On Save, the blob is wrapped as a `File` and pushed through `useUploadAndShare` → `cloudUpload` (the same primitive every other feature uses), which:
   - Creates the canonical folder hierarchy `Images/Generated/{folder}` server-side.
   - Persists the file as a versioned cloud asset.
   - Returns a permanent `shareUrl` (NOT a signed Supabase URL — these don't expire) safe to paste into apps, notes, or DB columns.
5. The UI surfaces the share URL with copy / open / "open in Files" affordances.

**Why the decode is browser-only**: base64 is already a browser-native format (`<img src="data:...">` works directly), the cloud upload primitive does the cloud-document creation server-side, and skipping the server hop for the decode itself avoids re-uploading the same bytes through a Python endpoint just to have Python re-upload them to Supabase. The only network call is the existing share-link upload pipeline.

## Known follow-ups

- Folder picker UI (currently a text input — a future iteration can reuse `FileUploadWindow`'s FolderPicker).
- Deleting items from the library (the save API writes — the library page currently only reads).
- Wire AI-AGENTS.md Section A shortcuts to the toolbars (Suggest edits, Smart crop, Suggest annotations, Redact PII, Suggest filters). Each is a one-DB-row + one-button change once the shortcut row exists. Section B Python endpoints already have typed clients and UI buttons ready.
- Notes integration: image blocks that open Edit mode in a modal, plus `prompt-from-article` / `caption-context` / `suggest-image-spots` agents (see AI-AGENTS.md).

## Change Log

- **2026-05-05** — Removed orphaned `components/InitialCropDialog.tsx` (zero importers — the floating-window form `InitialCropWindow` had been the canonical initial-crop wrapper for some time). Updated SKILL.md and `InitialCropPanel.tsx` doc comments to drop stale Dialog references.
- **2026-05-05** — Image Manager Hub absorbed several Studio surfaces into `/image-manager` tabs: the studio crop+variants view embeds via `<EmbeddedImageStudio hideTitle>`, the `Base64DecoderShell` is wrapped as a "Paste base64" sub-tool inside the Upload tab, and the generated-images library at `Images/Generated/...` is exposed as a read-only Studio Library tab. The standalone routes (`/image-studio/from-base64`, `/image-studio/library`, `/image-studio/presets`) remain canonical for direct linking and deep workflows. See [`features/image-manager/FEATURE.md`](../image-manager/FEATURE.md).
- **2026-05-05** — Added Edit, Annotate, Avatar, and Generate modes:
  - `/image-studio/edit` — full-featured Filerobot 5.0 editor with sibling AI-assist toolbar (Suggest edits, Remove BG, Upscale 2×/4×, AI edit by prompt).
  - `/image-studio/annotate` — marker.js 2 screenshot markup with AI assist (Suggest annotations, Redact PII, Detect faces).
  - `/image-studio/avatar` — dedicated circular crop with Smart Crop (face-detect-driven).
  - `/image-studio/generate` — text → image via Python `/images/generate`; result tiles deep-link into the other modes.
  - New shared modes architecture under `features/image-studio/modes/` — `ModeShellProps` lets every mode mount as a page or as a modal dialog.
  - Typed Python image-ops client at `features/image-studio/api/python.ts` (generate, edit, inpaint, bg-remove, upscale, variants, face-detect, style-transfer). Falls back to friendly "ships next wave" UI when endpoints aren't yet implemented.
  - New `AI-AGENTS.md` enumerates every AI integration across all modes (LLM agents + Python endpoints), with prompts/variables/return shapes ready for the agent author and Python team.
  - Dependencies: `react-filerobot-image-editor 5.0.1`, `markerjs2 2.32.7`, `react-konva`, `konva`, `styled-components` (Filerobot peers).
- **2026-05-01** — Added `/image-studio/from-base64`: paste a base64 string (raw or `data:` URL) → preview the decoded image → save it as a cloud-hosted asset with a permanent share URL. Pure-browser decode + magic-byte MIME sniff; uploads through the existing `useUploadAndShare` primitive. Landing hero, `/convert` nav, and stat row updated.
- **2026-04-23** — Initial release: landing + convert + presets + library routes; 60+ presets across 10 categories; multi-file processing; ZIP bundle download; Save to library.
