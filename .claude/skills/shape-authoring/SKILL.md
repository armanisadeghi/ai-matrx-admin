---
name: shape-authoring
subject: architecture/content-ir
description: "The complete rules for writing or editing a shape's component (kind component). Use when creating, editing, patching or fixing a kind component, calling any kindcomp_* tool, or when a shape renders empty, broken, cropped, cramped or ugly."
attach_with_tools: [kindcomp_get_context, kindcomp_create_component, kindcomp_update_code, kindcomp_patch_code, kindcomp_get_code, kindcomp_update_settings, kindcomp_resolve_incident, kindcomp_preview, kind_create]
---

<!-- SYNCED COPY — do not edit here.
     Canonical: common-docs/skills/shape-authoring/SKILL.md
     This file is distributed to every consuming repo by
     common-docs/meta/scripts/sync_skills.py. Edit the canonical, run the
     sync, and commit each repo. Edits made here are overwritten and lost. -->

# shape-authoring — the one rulebook for shape components

<!-- rules:stamp -->
> Rules from `common-docs/systems/architecture/content-ir/FEATURE.md` — edit there, never here (`python3 common-docs/meta/scripts/one_home.py --write`).

1. **Every schema declares `__kind`** at every object position: `const` + `required` where the identity is known, and declared but optional everywhere else. The only exceptions are the `boolean`/`number` scalar roots and the `json` kind. BEFORE triggers guarantee this on `kind_definition`, `kind_example`, `kind_instance` and `agent.definition.output_schema` (`wf_066`). Never add a write-time check that rejects an unmarked schema, because the trigger fixes it.
2. **Never strip `__kind` and never loosen a schema to fit the data.** Bring the data up to the schema with `content_ir.stamp_markers_from_schema`. Never reintroduce `injectKind: false`, and never hand-patch `emitted_json_schema`, because it is emitted from the kind's source. Guards: aidream `scripts/check_kind_marker_law.py --live` and matrx-frontend `pnpm check:kind-marker-law`.
3. **`__kind` is the first key.** An unfenced bound-agent stream is typed from its first key (`block_detector.root_kind_declaration`). `jsonb` reorders keys, so SQL that mints an instance builds it as text/`json` and reads the row back.
4. **An agent is never asked for plain JSON.** A structured result is a kind instance or it is markdown.
5. **A registered kind is not a payload with a `__kind` key.** `content_ir.evaluate_kind_activation` checks that its example validates, it has a real output component, and its schema is unique; the result is advice shown beside the switch (`warnings`), never a refusal (rule 24). The generic key/value view is not a component; activation changes go through `set_kind_activation`.
6. **Machine contracts are quarantined by residence.** They live in `content_ir.io_contract`. The family names `action_io`, `tool_io` and `agent_io` are reserved and never appear on a `kind_definition` row. `workflow_io` is a pinned slug set, and `data_only` is informational only: it never removes a form. Guard: `scripts/check_kind_family_law.py`.
7. **`directive_v` is a reserved prefix.** No hand-authored or user kind may start with it (enforced in `@kind`, kind authoring and the shape creator, and checked by `scripts/validate_kind_directive_registry.py` at zero). Capability is derived from the directive class and never stored.
8. **The position law has one home: `matrx_graph.content_ir.directives`.** Only `create`, `update`, `delete` and `action` execute, and only at an agent's output root. Only `reference` and `secret` resolve inside content. A side effect found in content renders as a button and runs only on a human click.
9. **The directive ledger key is `sha256(namespace·type·item)` with `kind` excluded.** Changing how `type` is derived from the slug re-applies every past action. Keep `"matrx"` in `MATRX_OWNED_BLOCK_TYPES`, never seed a `kind_definition` row per directive, and never attach `__ir` to a `matrx` block, or directives render as raw JSON.
10. **Shared logic lives once, in `aidream/apps/shared/content-ir-core` (kernel) and `content-ir-react` (route, resolver, shared views).** No consumer keeps a local copy of a parser, a route decision or the directive decoder. The kernel refuses React, and the render layer refuses Next.js, Redux and Supabase. Consumers ride the npm `latest` tag, and versions live in each package's CHANGELOG.
11. **Detection is identical in Python and TypeScript.** A container never hides a kind: when a region closes, balanced JSON objects with a non-empty `__kind` become their own instances, in document order. XML owns its body until its root closes, and a ```` ```matrx ```` fence is a container. Shared conformance vectors pin markdown-fence nesting. A change to one runtime lands with the other and its vectors.
12. **A streaming partial follows the partial wire contract.** Partials ride `metadata.__ir_partial`. The `state` is `partial`, `superseded` or `retracted`, and exactly one terminal state ends every partial, so a skeleton can never stick. Every partial is closed into valid JSON. The key is absent on most events: consumers carry state forward, never reset on absence.
13. **Runtime wrappers delegate, never reimplement.** `node_outcome` renders its inner kind through the ordinary route. Elided payloads ride once, through `output_ref`.
14. **A skipped check is never a pass.** A degraded verdict carries a named `KindDegradedReason`. Only `catalog_unreachable` is a loud skip, `KindContractViolation` is non-retryable, and an invalid typed output is never stored as a success.
15. **Enforcement is the code constant `matrx_graph.kinds.KIND_ENFORCEMENT`, never an environment variable.** The DB `admission_config` ratchet coexists with it on purpose.
16. **Undeclared keys never sit at a payload's root.** They go in a declared map (for example `extras`).
17. **A primitive binds; it does not get a new component.** A shape that maps onto an existing primitive binds through the primitive plus `props_transform`. Block-type string values, routes, dispatch outcomes and stored content bytes are frozen, and a rename that changes one is a defect.
18. **Every emitted kind declares a disposition.** A kind with none gets no storage and files an `ops.system_error` row (`kind_disposition_undeclared`). New kind data lands in records, never in `content_ir.kind_instance`.
19. **A missing or broken component is replaced at once and reviewed afterwards.** The replacement shows a "just built" mark and a one-click way back to the plain data view. This never replaces a working, registered component without review.
20. **Reuse before you mint.** Well-known kinds (web results, citations, address, rating) are reused through provider translation functions, never re-minted under a new name. `metadata.maturity = verified` is earned only by the verification pass.
21. **Every active shape has a skill, and a hand-written one is never overwritten**. Generated skills come from the non-AI template (`kind_create_skill`) and carry `metadata.created_via`; a weekly refresh regenerates only those. A shape with no description gets a concise one from a weekly batch run on a fast model.
22. **Shapes picked in chat: up to a knob (default 10) go to the model in full; past it, the model gets each shape's name and description and loads the ones it uses**. Picks travel as `output_kinds` (kind slugs) on start, chat and continue requests, never as skill ids; an omitted field means the chat's saved picks (`chat.conversation.metadata.run_configuration.outputKinds`). The server alone resolves shape → skill (aidream `services/tooling/output_kinds.py`, knob `chat.output_kinds.full_body_max`).
23. **An agent locked to a structured output schema answers in its own shape; a different picked shape is never an error**. The picker warns at the moment of selection, and a saved conflicting pick shows the same warning; the server drops picks the agent cannot honor and sends a visible warning (`output_kind_locked`), never a failed run. The agent's schema is never modified per request.
24. **Every kind, kind component, surface and converter is born ACTIVE**, from every screen, tool, seed script or automation. Switching one off is a deliberate act; turning one on is never refused. Never write `is_active=False` on create and never add a check that blocks activation or disables the Activate button.
25. **A streamed shape's render state is a one-way ratchet:** markdown text → JSON found → `__kind` found → kind resolved and its component rendering. Once forward it never goes back (no re-mount, no generic or text flash) because a chunk is partial, unparseable or fails validation; hold the last good render and fall back only on strong, repeated evidence (the stream ended and the final value is invalid). Mount count stays 1 per block; test with token-by-token replay including mid-key and mid-`__kind` splits.
26. **Rich content helps, never hinders**. Every surface offers copy as markdown and copy as plain text one click away; formatting buttons work in every mode including raw markdown; editing happens in place. Replacing a UI never ships without full parity verified by screenshot in EVERY mode, and "done" means a clipboard capture plus a screenshot of the visible button, not a green guard. Judge each surface from the user's seat (copy, select, format, edit in place, every mode, window panels, phone) and audit every surface for consistency; copy never puts raw `<artifact>` tags on the clipboard. Every rename or cleanup ships with its full inventory (tools, routes, DB, tokens, copy, docs, tests) and is done 100%, never half-way; the [domain tree](/policies/domain-tree.md) wins on names and placement. The basics come before any side work, and when Arman says "focus on my vision" every other lane drops.
27. **A kind's name and schema are ONE shared contract per slug; how it looks layers user → org → system, most personal wins**. Anyone fixes a bad render for themselves in one click, org admins for their organization, and super admins get a link to the admin pages for a global change (never admin power on a user route). The fix ladder starts at "kind not registered".
<!-- rules:stamp-end -->

A shape component is React (TSX) stored in the platform and compiled in the reader's browser. It
renders one item an agent produced. **This file is the whole contract.** An import, prop, action
or pattern that is not written here does not exist — do not guess one.

Each block below is the single home of its rule. To change a rule, change its block.

<workflow>
1. `kindcomp_get_context` with the kind (or component_id) — FIRST, every time. It returns the
   kind's schema, the example payload your component receives, the other components, and open
   render incidents.
2. Write the COMPLETE component against the example payload, following every block below.
3. Save: `kindcomp_create_component` (new), `kindcomp_update_code` (whole source),
   `kindcomp_patch_code` (small exact edits).
4. A save can be REFUSED with a sentence (unknown import, banned global, no `data` read). Fix
   exactly what it names and save again — never work around it.
5. Fixing a crash: read the incident from step 1, fix, save, then `kindcomp_resolve_incident`.
6. Every save comes back with screenshots (light and dark, desktop and phone) and findings. Read the
   screenshots; fix what the findings name, save again. `kindcomp_preview` shows other data, one
   theme or width, the sandbox frame, or a streaming replay.
</workflow>

<props_contract>
export default function MyShape({ data, kind, config, runAction, itemState }) { … }

- `data` — the item. EVERY field is read from it: `data.title`, `data.items?.map(…)`. Flat props
  (`props.title`) are never provided; a component reading them renders empty with no error.
  Read-only — never mutate it, never write results into it.
- `props_transform` (optional) reshapes the value before mounting; its output STILL arrives as
  `data`.
- `kind`, `config` — the kind slug and this component's config.
- `runAction(key, input)` — the ONLY way anything leaves the component (see <actions>).
- `itemState` — what actions saved onto this item; `{}` when nothing yet. Survives reload.
- `onResolve`, `uiOptions` — only inside a picker the page opened; ignore otherwise.
- One default export. Hooks only at the top level of components.
</props_contract>

<available_imports>
Only these module paths may be imported, with exactly these names. Anything else is refused at save.

Kit (use FIRST — see <kit>):
"@/components/kind-kit/KindHeaderBar"
"@/components/kind-kit/KindPanel"
"@/components/kind-kit/KindPanelGrid"
"@/components/kind-kit/SortableList"
"@/components/kind-kit/TagList"
"@/components/kind-kit/StreamingSkeleton"
"@/components/kind-kit/KindActionButton"
"@/components/kind-kit/KindImage"
"@/components/kind-kit/KindFile"
"@/components/kind-kit/KindVideo"
"@/components/kind-kit/KindAudio"
"@/components/kind-kit/KindEmbed"
"@/components/kind-kit/KindLocale"

Copy:
"@/components/agent-copy/CopyButtons"
"@/components/agent-copy/CopyForAiButton"

Text:
"@/components/Markdown"
"@/components/MarkdownStream"
"@/components/markdown"
"@/components/mardown"

UI controls (prefer the design system; the ui/* paths are the same parts):
"@ai-matrx/design-system/controls"
"@ai-matrx/design-system"
"@/components/ui/accordion"
"@/components/ui/alert"
"@/components/ui/avatar"
"@/components/ui/badge"
"@/components/ui/button"
"@/components/ui/card"
"@/components/ui/checkbox"
"@/components/ui/collapsible"
"@/components/ui/dialog"
"@/components/ui/dropdown-menu"
"@/components/ui/input"
"@/components/ui/label"
"@/components/ui/popover"
"@/components/ui/progress"
"@/components/ui/radio-group"
"@/components/ui/scroll-area"
"@/components/ui/select"
"@/components/ui/separator"
"@/components/ui/sheet"
"@/components/ui/skeleton"
"@/components/ui/slider"
"@/components/ui/switch"
"@/components/ui/table"
"@/components/ui/tabs"
"@/components/ui/textarea"
"@/components/ui/tooltip"
"@/lib/utils"

Icons:
"lucide-react"
"@ai-matrx/icons"
"@/components/official/icons/IconResolver"

Libraries:
"react"
"recharts"
"motion/react"
"date-fns"
"lodash"
"react-katex"
"react-pdf"          (PDFs from data: URIs or bytes only — never a URL)
"xlsx"
"three"
"@react-three/fiber"

Applets (page only — they do not run inside the sealed frame; do not use in shapes):
"@/applets"
"@ai-matrx/applets/react"

Libraries load only when imported. `props_transform` cannot import them.
</available_imports>

<kit>
The kit makes every shape correct and consistent by construction. Hand-rolling a header, panel,
grid, sortable list, chip list, skeleton, action button or image is a defect.

- `KindHeaderBar` — the one compact header: `title` (required), `icon?`, `subtitle?`,
  `stats?: [{label, value, icon?}]`, `streaming?`, `copy?` (CopyButtons props, `label` required),
  `actions?`, `size?: 'sm'|'md'`, `className?`. It has NO padding of its own: the host frame pads
  it. Put it inside your own bordered card and you pad it to match your rows
  (`className="px-3 py-2"` beside `px-3` rows), or the icon touches the card edge.
- `KindPanelGrid` — auto-fit grid of equal-height panels: `minColumnWidth?` (default 280, never
  smaller for text), `maxColumns?`, `gap?: 'sm'|'md'|'lg'`.
- `KindPanel` — `title` (required), `icon?`, `count?`, `badge?`, `streaming?`, `actions?` (≤2),
  `menuItems?: [{label, onSelect, icon?, disabled?, destructive?, separatorBefore?}]`,
  `subline?` (full width under the header), `footer?` (pinned to the bottom), `variant?:
  'card'|'bare'`, `dense?`.
- `SortableList` — drag to reorder with displacement and a drop placeholder: `items`,
  `onReorder(items)` (required), `getKey?`, `renderItem?(item, {index, isDragging})`,
  `onRemove?`, `emptyState?`.
- `TagList` / `KeywordChip` — chips that wrap, never truncate. TagList: `items` (strings or
  `{label, key?, meta?}`), `selected?`, `onToggle?`, `onRemove?`, `onEdit?`, `onAdd?` (renders the
  add input), `addPlaceholder?`. KeywordChip: `label`, `meta?`, `selected?`, `onSelect?`,
  `onRemove?`, `tone?: 'default'|'primary'|'muted'`.
- `StreamingSkeleton`, `useStreamingValue`, `streamList`, `streamText` — see <streaming>.
- `KindActionButton` — see <actions>. `KindImage`, `KindFile`, `KindVideo`, `KindAudio`, `KindEmbed`, `useKindLocale` — see <media>.

Import each by its exact path with the named export: `import { KindPanel } from "@/components/kind-kit/KindPanel"`.
</kit>

<copy>
Every shape has a copy bar in its header (`KindHeaderBar copy={…}`); rows and panels that hold
something worth copying get their own small `CopyButtons`.

`CopyButtons`: `label` (REQUIRED), `human?: string | () => string` (plain text or markdown you
build), `agent?: () => ({ kind, location, description, data, summary? })` (Copy for AI),
`json?: () => value`, `size?: 'xs'|'icon'|'sm'`, `export?: { items: [{ id, label, filename,
content: () => string }] }` (downloads), `hide?: ('copy'|'ai'|'export')[]`.
There is no `content` or `data` prop. Pass builder functions so text is built at click time.
`CopyForAiButton`: `label` and `agent` required; `size?`, `compact?`.
</copy>

<actions>
`runAction(key, input)` never throws. It resolves `{ok: true, result}` or `{ok: false, error}`;
show `error` small beside the control that caused it.

| key | does | input |
|---|---|---|
| `run_shortcut` | runs AI on this item | `{ shortcutId, scope?, variables?, display?, expect?, saveAs?, label? }` |
| `save_item_state` | keeps a person's pick or edit | `{ patch: { key: value } }` (`null` deletes a key) |
| `open_file` | opens a saved file in the platform viewer | `{ file_id }` |
| `share_file` | opens the share window for a saved file | `{ file_id }` |
| `download` | saves a file to the reader's device | `{ filename, content, mime? }` (text you built) or `{ filename, base64, mime? }` or `{ file_id }` |
| `print` | opens the platform print window | `{ title, markdown }` or `{ title, html }` |
| `fetch_image` | an image's bytes (`KindImage` and `KindFile` call it for you) | `{ url }` or `{ file_id }` |
| `apply_surface_write` | writes a value into the page around the shape | `{ target, value }` |
| `list_surface_write_targets` | which page fields accept writes | `{}` |

`run_shortcut`:
- `shortcutId` — a named constant at the top of the file. Never a raw agent id.
- `scope: { selection, content, … }` — TEXT the agent can read (a short markdown rendering of
  the piece), never the raw object.
- No `saveAs` → the shortcut opens in its own window (a conversation the person continues).
- `saveAs: "idea_3_brief"` → runs in the background and the platform saves the product onto
  this item as `itemState.idea_3_brief`. Key per piece: `<piece>_<n>_<what>`.
- `expect: "json"` (default) | `"text"` | `"image"` (an image shortcut; saves an image ref).
- Chains: await step 1 with `saveAs`, pass its product into step 2's `scope`, `saveAs` again.

Render saved results in place, next to the piece they belong to; keep the button available to
run again (re-running replaces the value). Where the item has no saved record (a preview),
`saveAs` and `save_item_state` refuse with a sentence; opening in a window still works.

`KindActionButton` is the button for any action — busy state, double-click guard, error line,
confirm:
```tsx
<KindActionButton runAction={runAction} action="run_shortcut"
  input={() => ({ shortcutId: BRIEF_SHORTCUT, scope: { selection: ideaText(idea) }, saveAs: `idea_${idea.number}_brief` })}
  label="Visual brief" confirm="Writes a detailed brief. Uses credits." />
```
For a chain pass `run={() => chain()}` instead of `action` + `input`. Every button that spends
credits or creates something passes `confirm`. Props: `label`, `icon?`, `busyLabel?`, `confirm?`,
`onDone?`, `onError?`, `variant?`, `compact?`, `disabled?`.

Platform image shortcuts: `c70e1694-9b84-4843-9999-cb5471478bb4` (idea → image prompt, text),
`a415f9f8-aa62-45f9-a532-5987da03ee59` (prompt → image, `expect: "image"`).
</actions>

<media>
- Every image renders with `<KindImage image={ref} alt="…" runAction={runAction} pending={busy && !ref} maxHeight={480} />`.
  `ref` is a saved image (an `itemState` value with `file_id`) or a web address (`"https://…"` or `{ url }`).
  It shows the whole image at its real proportions (never cropped), with expand (and share for a saved file).
  Never a bare `<img>` for either, and never build a URL from a `file_id`.
- Images inside `data` as `data:` URIs and inline `<svg>` render normally.
- Any other saved file (PDF, document, sheet, archive…): `<KindFile file={{ file_id, name, mime_type, size }} runAction={runAction} />`
  — a compact card with its type (an image shows a thumbnail), name, size, Open / Download / Share. `hide={["share"]}` drops buttons.
- A file the shape builds (CSV, Markdown, JSON): `runAction("download", { filename: "rows.csv", content })`, or a
  `CopyButtons export` item. Printing: `runAction("print", { title, markdown })`.
- Never save a `src`, URL or download link into item state — only the ref.
- Video: `<KindVideo video={ref} title="…" runAction={runAction} maxHeight={480} />`; audio:
  `<KindAudio audio={ref} title="…" runAction={runAction} />`. `ref` is `{ file_id, mime_type, width?, height?, duration? }`
  (a saved file) or a web address string / `{ url }`. Whole video at its real aspect, never cropped. In the frame a saved file
  shows a poster card and downloads nothing until Play; a web address opens the platform player in a window.
  Never a bare `<video>` / `<audio>` / `<source>`.
- Embeds (YouTube, Vimeo, Loom, Google Maps, Figma): `<KindEmbed url={link} title="…" runAction={runAction} />`. Never an
  `<iframe>` — the frame cannot open one; its Play opens the real embed in a window. Any other link becomes an Open card.
- The reader's language and time zone: `const { locale, timeZone, dir } = useKindLocale();` then
  `new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone })`, `Intl.NumberFormat(locale, …)`,
  `Intl.RelativeTimeFormat(locale)` (date-fns: pass the matching locale). Never hard-code `"en-US"` or UTC. The frame's
  `<html lang dir>` already follows the reader, so flow and alignment mirror for right-to-left languages; use logical
  classes (`ms-*`, `ps-*`, `text-start`) instead of left/right.
</media>

<links>
- Plain `<a href="…">` for web (`https:`), `mailto:`, `tel:` and in-app paths (`/crm/…`). The
  platform opens them in a new tab, inside the frame too. Links that arrive in `data` are fine;
  `javascript:`, `data:` and `blob:` links are refused.
</links>

<frame_rules>
A shape may run inside a sealed frame. Write every component so it works there:
- No `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon`, `eval`,
  `new Function`, dynamic `import()`, cookies, `localStorage`, `sessionStorage` — refused at save.
  Keep transient state in React state; keep durable state with `save_item_state`.
- No `window.parent`, `window.top`, no navigating or reading the page around you.
- Size against your own box: container queries (`@container` with `@sm:`, `@md:`, `@lg:`), never
  screen classes (`sm:`, `md:`, `lg:`).
- Dialogs, popovers, menus and tooltips work but are clipped to the shape's box. Anything that
  needs the whole screen goes behind an action.
- No `alert`, `confirm`, `prompt`, `window.open`, `window.print` — refused at save. Use dialogs,
  `KindActionButton confirm`, `<a href>`, and the `print` / `download` actions.
- The frame never scrolls; long content scrolls inside a panel (`max-h-* overflow-y-auto`).
</frame_rules>

<streaming>
The item arrives progressively while the agent streams. The component renders its full layout
immediately and fills in:
- Before data lands: `<StreamingSkeleton layout="list"|"cards"|"table"|"text" rows={3} />` that
  mimics the finished layout — never a spinner, never a blank box.
- `const { value, arrived } = useStreamingValue(data?.summary, "")` keeps the last defined value;
  call it unconditionally with a field read. `streamList(data?.items)` for arrays,
  `streamText(data?.body, "")` for strings.
- Render list items as each one parses, with stable keys. Every field access tolerates absence:
  never show `undefined`, `[object Object]` or a raw JSON dump.
</streaming>

<layout>
- Budget width from the CONTENT, never from how many things you want side by side. Text panels
  need ≥280px: use `KindPanelGrid` so four panels become 2×2 or one column when space is short.
- Text wraps; it is never truncated with an ellipsis.
- A header row holds the title, ONE count or badge and at most two controls; the rest go in the
  panel's overflow menu. Per-row actions appear on hover and focus.
- Side-by-side panels are equal height with footer actions pinned to the bottom.
- Dense, never cramped: minimal outer padding, tight inner spacing, full width.
- Prefer one excellent column over four unreadable ones.
</layout>

<design>
- **Unstyled element inside the sandbox frame? Check the daily stylesheet first.** On Vercel the
  frame's stylesheet (`public/kind-sandbox.css`) is rebuilt at most once a day: a Tailwind class used
  for the FIRST time in a repo file since the last rebuild is missing from it until the next one
  (the main app is unaffected). The release's build log has one `[kind-sandbox-css] REUSED …` or
  `BUILT …` line saying which happened. Fix now: put `[fresh-css]` in the next release message.
  Rule + reason: `features/content-ir/sandbox/build-kind-sandbox.ts` § THE DAILY STYLESHEET.
- Modern, professional, delicate. Semantic Tailwind tokens only: `bg-card`, `bg-muted`,
  `text-foreground`, `text-muted-foreground`, `border-border`, `text-primary` and their variants.
  No hex colors, no arbitrary values, no emojis in the interface.
- Correct in light and dark mode — tokens guarantee it; fixed colors break it.
- Interactive wherever the data invites it: reorder, inline edit, add and remove, one-click copy.
  Dragging always shows where the item will land (`SortableList` does this).
- In-app text is short labels, not sentences.
</design>

<before_saving>
- [ ] Every field read from `data`, null-guarded.
- [ ] Every import is in <available_imports>, by exact path and name.
- [ ] Kit used for header, panels, grid, lists, chips, skeleton, buttons, images.
- [ ] Header copy bar with a `label`.
- [ ] Renders a skeleton before data and fills in while streaming.
- [ ] Container queries, no screen-width classes; nothing truncated; nothing cropped.
- [ ] Results in `itemState`, never in `data`; shortcuts by named constant; credit-spending
      buttons confirm.
</before_saving>
