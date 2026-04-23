# Image Studio — FEATURE.md

Drop one image in, get 60+ platform-perfect sizes out.

## Routes

| Route | Type | Purpose |
|---|---|---|
| `/image-studio` | Landing (pure Server Component) | Hero, stat row, feature grid, preset legend, workflow steps, CTAs. Zero client JS. |
| `/image-studio/convert` | Interactive tool | Multi-file drop zone + preset catalog + per-variant tile grid + export panel. Main UX. |
| `/image-studio/presets` | Cached catalog | Browsable reference for every preset (pure server-rendered). |
| `/image-studio/library` | Per-user Supabase data | Variants the user has saved — grouped by session, public URLs. |

All four live under `app/(a)/image-studio/` and follow the `(a)` route rules — static shell, Suspense boundaries, dimension-matched skeletons.

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
└── library/
    ├── layout.tsx
    ├── page.tsx            Server Component + Suspense-fetched user data
    └── loading.tsx

features/image-studio/
├── FEATURE.md
├── index.ts                       barrel
├── presets.ts                     catalog (60+ presets, 10 categories, 6 bundles)
├── types.ts                       types shared with API
├── hooks/
│   └── useImageStudio.ts          central client state
├── components/
│   ├── ImageStudioShell.tsx       3-column interactive shell
│   ├── StudioDropZone.tsx         drag-drop + paste
│   ├── StudioFileCard.tsx         per-file row with variant grid
│   ├── StudioVariantTile.tsx      single variant tile (+ pending/error)
│   ├── PresetCatalog.tsx          picker + read-only + legend
│   ├── ExportPanel.tsx            format, quality, bulk actions
│   ├── StudioLandingHero.tsx      landing page Server Component
│   └── LibraryGrid.tsx            library page display
├── server/
│   └── library.ts                 server-only Supabase lister (react cache())
└── utils/
    ├── download-bundle.ts         JSZip client-side zipper
    ├── format-bytes.ts
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

## How to extend

- **Add a new preset**: add an entry to the right array in `features/image-studio/presets.ts`. That's it — the catalog, convert tool, and reference page all read from the same source.
- **Add a new format**: extend `OutputFormat` in `presets.ts`, add a `case` in `encode()` in the process route, add a badge row in `ExportPanel.tsx`.
- **Add a one-click bundle**: append to `RECOMMENDED_BUNDLES`.
- **Agent-generated filenames / alt text**: the `StudioSourceFile.filenameBase` is already editable per file. Wire an agent up to set that field + add a future `altText` field alongside it.

## Known follow-ups

- Cropping / reframing before output (we have `ImageCropper` in `components/official/image-cropper/` that could plug into a per-variant override step).
- Folder picker UI (currently a text input — a future iteration can reuse `FileUploadWindow`'s FolderPicker).
- Agent integration for naming + meta — state is already structured to accept per-file/per-variant string fields.
- Deleting items from the library (the save API writes — the library page currently only reads).

## Change Log

- **2026-04-23** — Initial release: landing + convert + presets + library routes; 60+ presets across 10 categories; multi-file processing; ZIP bundle download; Save to library.
