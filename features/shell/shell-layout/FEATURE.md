# Shell layout — custom Sidebar, Header, Dock and landing

**Purpose:** the pure foundation of custom layouts (project custom-experience; plan and contract in
`common-docs/projects/custom-experience/`). An organization or a person stores a Layout; this
folder reads it and turns it into the menu trees the shell already renders. No React, no IO, no
database here.

## Files

| File | What it is |
|---|---|
| `contract.ts` | THE FROZEN CONTRACT — stored shapes (`ShellLayoutBody`, `ShellNode`, `HeaderButton`), limits, reserved controls, slots, cookies. Changed only by amendment. |
| `looks.ts` | THE LOOK REGISTRY (amendment 2026-10-20): `SHELL_LOOKS` (`standard`, `meet-matrx`), `isShellLookId`, `shellLookAttributes` (no attribute for standard), the domain tile hues `SHELL_LOOK_DOMAIN_HUES` + `shellLookHue`, and `shellLookRowProps` (row + tile attributes; empty without a look). |
| `shell-looks.css` | Which shell boxes wear a look's tokens (sidebar/dock tiles, active row tint, utility rows — Side Chat, search, admin block, footer, Settings, route menus — as the quieter slate `--look-utility-tile`, a short sidebar bottom fade, canvas glow under the header band, launchpad widget cards). The look's own CSS is `@ai-matrx/design-system` `look-meet-matrx.css`, which also dresses page surfaces by itself (DS Card, outline Tile, neutral Chip/Badge) and host surfaces that opt in with `data-look-surface="card" \| "icon" \| "chip"` (dashboard cards, `KpiTile`, metric counts). Every rule is scoped to a look attribute. |
| `editor/LookPane.tsx` | The Look cards (preview drawn by the look's own rules) — the editor's Look tab and Settings › Layout › Look. |
| `editor/AccentPane.tsx` | The accent color (amendment 2026-10-20, lane Q): the design system's curated swatches (`@ai-matrx/design-system/accents` `ACCENTS`), "Default" (a person follows the organization's brand color), a custom hex used on Enter/blur, and a one-line WCAG AA warning for light or dark that never blocks. Under the Look panes in the editor (person and organization) and Settings › Layout › Look. |
| `retired-nav-ids.ts` | Every nav id that left the menu → its successor id (or `null`). `resolveRetiredNavId` follows the chain. |
| `catalog.ts` | THE placeable-destination catalog: `buildShellCatalog({ isAdmin })`, `getCatalogEntry`, `defaultSidebarTree`, `defaultDockTree`, `defaultHeaderButtons`, `SHELL_CATALOG_VERSION`, `CATALOG_ADDED_IN`. |
| `validate.ts` | `parseShellLayoutBody(text)` (never throws) and `serializeShellLayoutBody(body)`. |
| `resolve.ts` | `resolveShellLayout(...)` → the Sidebar/Dock as `ShellNavItem[]` trees, the Header buttons, the landing, What's new. |
| `shellLayout.typed-table.ts` | The `shell_layout` typed table (organization scope; `slot` unique: `org` / `person:<uuid>`; `body`, `note`, `saved_at`). |
| `seed.ts` | `parseShellBootSeed` — the seed's `shell` key; malformed → null, with a warning naming it. |
| `shellLayoutSlice.ts` | The `shellLayout` slice (held raw rows, `status`, `organizationId`, `standardView`, `reserved`) + `shellLayoutPolicy` (warm-cache) + `seedShellLayoutState`. |
| `held.ts` | `resolveHeldShellLayout(held, viewer)` — the ONE function the server pick and the client selector both call. |
| `server.ts` | `pickShellLayoutServer(seed, search)` (the (core) layout) and `shellLandingAfterSignIn(supabase)` (password sign-in). |
| `useResolvedShellLayout.ts` | `selectResolvedShellLayout` + hook — the renderers' one data source; `selectHoldsShellLayout`, `selectShellStandardView`, `selectShellNavReserved`. |
| `ShellLayoutSync.tsx` | The island: installs a late streamed seed, follows the tab's active organization, keeps the two cookies in step; `setShellStandardViewCookie`. |
| `service.ts` | Records-store reads/writes: `readShellLayouts`, `saveShellLayout` (compare-and-swap), `clearShellLayout`, `listShellLayoutVersions`, `previewShellLayoutVersion`, `restoreShellLayoutVersion`. |
| `knob.ts` | `SHELL_MEMBERS_MAY_CUSTOMIZE_KNOB` — `shell.members_may_customize` (boolean, default true, organization rung only). |
| `editor/tree.ts` | The editors' pure verbs: catalog tree, tick (brings defaults) / untick / tri-state, move (before/after/inside/top, depth ≤ 3, Dock flat ≤ 8), nudge, rename, re-icon, own rows, header buttons. |
| `editor/regions.ts` | A body's regions as seen (absent = default), `startingBody`, `addPageToBody` (Add to my menu: catalog page → its row, already placed → moved there, record → `record`, else `link`), What's new verbs. |
| `editor/ShellLayoutEditor.tsx` | THE editor (Sidebar / Header / Dock tabs, checklist + arrange tree, live preview, Save, Reset, History "Set active", the organization's "Members may customize" switch). |
| `editor/ArrangeTree.tsx`, `CatalogChecklist.tsx`, `HeaderPane.tsx`, `AddOwnRow.tsx`, `IconPicker.tsx`, `rowDisplay.ts` | Its parts (dnd-kit + DragCursorMonitor; row ⋯ menu = keyboard/touch twin of every drag). |
| `editor/ShellLayoutMount.tsx` | Records provider for the editors (active organization, or the organization being edited). |
| `editor/AddToMyMenu.tsx` | Add to my menu: `AddToMyMenuTile` (the chat `AddToMyMenu` host slot in the Intelligence dropdown) and `AddToMyMenuButton` (beside every `PinButton`). |
| `editor/OrgLayoutSection.tsx` | Organization settings › Layout (owner/admin). |
| `useShellLayoutStore.ts` | THE door for the editors (lane C): `person`, `organization`, `canEditOrganization`, `save(target, body, note)`, `clear(target)`, `versions(target)`, `preview(target, v)`, `restore(target, v, seenVersion)`. Under a records provider. |

## Permanent ids

Every node in `constants/nav-data.ts` (all three levels, the admin rows, `settingsItem`) carries a
literal dotted id (`"data.tables"`, `"industries.education.kits"`). Generated rows take theirs from
a stable source key, never a label: Marketing from the pillar key plus the entry's route segment,
Education tools from the registry slug. Dock rows and the AI Work rows reuse the id of the menu
node they mirror. Ids are never reused; one leaves the menu only with a row in
`retired-nav-ids.ts`. Guard: `features/shell/__tests__/nav-ids.test.ts` (missing, duplicate,
vanished or unregistered id) over `nav-ids.known.json`, the list of every id ever shipped. Added a
node? `NAV_IDS_WRITE=1 pnpm jest features/shell/__tests__/nav-ids.test.ts` appends it.

## The catalog

One flat entry per menu node (primary, Settings, admin rows only for admins) plus every
Tools-grid tile (`tile.*`, a window launcher, hidden by default; its icon is named back from the
tile's Lucide component, else the window icon). `defaultVisible` is true exactly for the built-in
Sidebar. New destinations a customized layout should hear about: bump `SHELL_CATALOG_VERSION` and
list their ids in `CATALOG_ADDED_IN` at the new number (now version 2: `account.authenticator`, `data.library`,
`web.search-tools`). Enforced: `features/shell/__tests__/nav-ids.test.ts` fails on any menu or tile id that is in
neither the frozen version-1 list (`nav-ids.catalog-v1.json`, never edited) nor `CATALOG_ADDED_IN`, and on a
version left unbumped. What's new never offers what a region the body does not carry already shows by default.

## Reading a stored body

A body that is not a v1 layout (bad JSON, not an object, another `schemaVersion`) is refused whole
and the default renders. Smaller defects are repaired and named in `problems`: nodes deeper than
three levels, duplicate node ids (unique per region), malformed or unknown kinds are dropped; a
retired ref follows its successor; an unknown ref is kept and flagged; missing reserved header
controls (Search, Notifications) are put back in their default places; a Dock over 8 rows is cut.
An editor saves only a body with no problems.

## Resolution order

Guests → the default, always. Standard view → the default (`source: "standard-view"`). Else the
person's body wins whole, else the organization's, else the default. Inside the winning body a
region it does not carry is the default for that region (never the organization's). Refs the
viewer's catalog cannot answer (unknown, or admin-only for a non-admin) are dropped from render and
named in `problems`. Catalog entries newer than the body's `basedOnCatalogVersion` that are neither
dismissed nor placed come back in `whatsNew` — never injected into the tree. An empty group still renders (its
label, and one "Add pages…" row that runs the `edit-sidebar` nav action).
The ONE per-field exception is the `accent`: the person's own (unless locked), else the organization's
brand color, else none (`shellAccentOf`). An editor's first copy of the organization's body never takes its
accent, so the brand color keeps reaching her until she picks her own.

## The resolved shape (for the renderers)

`sidebar` and `dock` are nav-data trees: top rows are `ShellNavItem`, rows below are
`ShellNavChild`, so `Sidebar`, `NavFlyoutGroup`, `partitionNavChildren`, `navItemsForViewer`, the
phone drawer and `MobileDockItems` take them with only their data source swapped. A nav row is a
copy of its nav-data node (so the default tree resolves identical to `primaryNavItems`); a row
moved away from its default parent drops its old flyout subheading. Default regions return the
nav-data arrays themselves. A row with `tileId` launches a Tools-grid tile: its `href` is a
`#tile.*` anchor that never navigates, so a renderer must run the tile for it.

## Boot path (zero cost for the uncustomized)

- **DB:** `iam.core_boot_seed()` carries `shell` = `iam.shell_layout_seed(<the seeded page's org ids>)`:
  null when no `shell_layout` row exists for her or the page's organizations. The lookup is index-only
  (`custom.record_pNN_table_slug_idx`: table records by `(organization_id, data->>'slug')`, one per
  partition) and its plan is generic and cached per connection (`plan_cache_mode`). `iam.shell_layout_seed`
  is a declared client door (definer; reads only her active memberships and her own `person:` slot).
- **Server pick:** `(core)/layout.tsx` → `pickShellLayoutServer` → `initialReduxState.shellLayout`. No request
  of its own. `matrx_shell_view=standard` → default. Seed late + `matrx_shell=1` → the nav column renders a
  fixed skeleton (`reserved`) until the streamed seed lands. Every sign-in path sets `matrx_shell=1` when the
  person or any of her organizations holds a layout (`markShellLayoutDeviceAtSignIn`), so a new device reserves
  too; a request with no cookie and a missed seed still paints the default, then swaps. Guests and other route
  groups: slice unseeded = default.
- **Late answers never win:** a write stamps `localWriteAt`; a store answer (`shellLayoutLoaded`, the sync
  engine's `fromServer` fetch) carries `requestedAt` and is dropped when it was asked before the last write.
- **Dock visibility:** the phone dock is hidden on every route by default (`styles/shell.css` §13, `.shell-root:not([data-show-dock])`).
  A layout whose winning body carries its own `dock` shows it: `resolved.customDock` / `heldShellShowsDock` →
  `data-show-dock` on `.shell-root` (AppShell for the first frame, `ShellLayoutSync` after a save, preview or reset).
  Nobody else's phone changes. Guard: `__tests__/dock-shown.test.ts`.
- **Empty groups** resolve with href `EDIT_SIDEBAR_HREF` (`addPagesHref.ts`): their label opens their menu ("Add
  pages…") in `NavFlyoutGroup` and the phone drawer, never a page.
- **Renderers:** `ShellSidebarNav`, `PrimaryMobileNavigationDrawer`, `ShellDockItems`, `ShellHeaderButtons`
  (orders the five server-rendered controls + custom 44px buttons; mandate → `useOpenMandateWindow`),
  `HeaderPhoneOverflow` rows. Default = the nav-data arrays themselves (`ShellSidebarNav.test.tsx` proves the
  markup is today's). Tile rows (`tileId`) run `useRunNavTile`, never navigate.
- **Local-first:** `shellLayoutPolicy` (IndexedDB + localStorage, identity-scoped, broadcast on save / clear /
  load / Standard view). The device copy fills only a gap the server left; `remote.fetch` (`iam.shell_layout_seed`)
  revalidates on boot and on focus (≥ 60 s) and replaces what is held; saves are compare-and-swap.
- **Standard view:** the switch in the Settings menu of the account rail (only when a layout is held).
- **Landing:** every sign-in path with no destination of her own (the default `/dashboard` counts as none) lands on `shellLandingAfterSignIn`.

## Editors and entry points (lane C)

- **One window** `shellLayoutEditorWindow` (`useOpenShellLayoutEditor()({ region, target, organizationId })`; phone:
  fullscreen). Doors: "Edit sidebar…" at the bottom of the Sidebar (`SidebarLayoutSlots.tsx`), "Edit sidebar… /
  Customize header… / Customize dock…" in the account rail's Settings menu beside Standard view, Settings ›
  Appearance › Layout (`features/settings/tabs/LayoutTab.tsx`, also the sign-in landing choice), and
  Organization settings › Layout (target `organization`, owner/admin).
- **Live preview:** an unsaved draft goes to the slice's `previewBody`; `resolveHeldShellLayout` draws it in place of
  every stored layout, so the real Sidebar/Header/Dock show it. Cleared on save, discard and close. Never persisted.
- **Saving** refuses a body with `problems`. History lists record versions; "Set active" = `restore` (one new version).
  Every by-id read (history, preview, version) runs in the ROW's organization (`lib/records/clientInOrganization.ts`):
  the store answers a row asked for under another organization with nothing. History says "No saved versions yet"
  or why it could not be read. An archived organization's refusal is mapped to plain words (`plainLayoutRefusal`);
  Organization settings › Layout offers no editor for an archived organization. The window title follows the tab.
  Every save goes through ONE lane per tab (`saveLane.ts`): one write at a time, each reading the version the last
  one left and building its body (`save(target, (now) => body, note)`) when its turn comes, so a person's own quick
  edits never refuse each other. `{ optimistic: true }` (Settings › Layout's Look and accent) draws the choice at once
  through `previewBody` and steps aside when the queue settles; a refused write falls back and the caller toasts it.
- **Accent swatches:** the no-accent swatch is "Default" (`DEFAULT_SWATCH_LABEL`; "Standard" is the Look card). Under
  an accent the shell's selection tokens (`--shell-pill-*`, `--shell-nav-selected-text`, styles/shell.css) and the
  glass tint (design-system `accent.css`) derive from `--primary`; with none they keep the literal built-in blue.
- **Reset:** the section (region back to default), "Use organization's layout" (clear person), "Reset to standard"
  (person with an org layout saves an EMPTY body — `standardPersonBody()`, every region the growing default — so it
  wins without freezing her out of later additions; else clear). Org reset and the members switch confirm with a toast.
- **Add to my menu** saves the person's layout at once. The page's record comes from the current-record primitive
  (`features/shell/current-record/currentRecord.ts`: `EntityModeHeader` / `RecordPageHeader` declare the name, and
  `token`/`id` when the caller passes `record.token`/`record.id`; `<DeclareCurrentRecord token id />` for routes like
  `/agents/[id]`).
- **Lock:** `shell.members_may_customize` off → `personAllowed: false` (amendment in REGISTER.md); the server pick
  reads the knob only when a person layout AND the predicted organization's layout both exist; `ShellLayoutSync`
  follows it on the client. A locked member (her organization HAS a layout) sees one line saying the organization's
  layout is in use; Save is off with the reason, no live preview, no "Reset to standard".
- **What's new** (`WhatsNewSlot`, top of the Sidebar, only for a person with her own custom sidebar): "New: X" — Add
  (into the sidebar; the body moves to today's catalog version once nothing newer is left) / Dismiss
  (`dismissedNew`); "Your organization updated its menu" — Review / Dismiss, keyed in localStorage by the
  organization layout's version (first sight records it silently).
- **Landing:** every sign-in path ends in `signInDestination` (utils/auth/FEATURE.md); `/dashboard` counts as none.

## Change log

- `2026-10-22` — claude (lane S, audit fixes): History reads in the row's organization (+ empty/error states, launchpad
  history too); a customized Dock is shown on phones; catalog version 2 + the CATALOG_ADDED_IN guard; Reset to
  standard stores an empty body; locked members get no Save; empty groups never navigate; archived orgs get no editor;
  title follows the tab; in-app header links read "Page"; org reset/lock toasts. Guards `row-organization`,
  `dock-shown`, `catalog-additions`, `editor-honesty` tests + `nav-ids.test.ts`.

- `2026-10-20` — claude (lane R): the save lane (serialized CAS saves; optimistic Look/accent), the custom color used once per Enter+blur, the "Default" swatch, accent-derived selection states. Guards `__tests__/save-lane.test.tsx`, `__tests__/accent-selection-states.test.ts`.
- `2026-10-20` — claude (lane Q): the accent color and the organization's brand color — `accent` field
  (`{id}` curated or `{hex}`; validate/serialize via `@ai-matrx/design-system/accents` `parseAccentRef`),
  per-field resolution, `heldShellAccent` (agrees with the resolver), the design system's
  `accentAttributes` stamped on `.shell-root` in the first frame (attribute + both themes' tokens; nothing
  when none), `ShellLayoutSync` keeping `.shell-root` and `<html>` (portals) in step, `AccentPane`, the
  organization's "Look and brand color…" door. Guard: `__tests__/accent.test.tsx`.
- `2026-10-20` — claude (lane K): the Look — `look` region (validate/resolve/serialize), the look registry, the
  `data-shell-look` stamp on `.shell-root` from the seeded slice (`heldShellLook`, agrees with the resolver;
  live-updated by `ShellLayoutSync`), gradient tiles on sidebar/dock rows only under a look, the editor's Look
  tab + Settings › Layout › Look. Guard: `__tests__/look.test.tsx`.
- `2026-10-20` — claude (lane M): utility rows are tiles under the look (slate, success ring when ON); the
  sidebar's bottom fade no longer washes out the last tile; page surfaces wear the look through the design
  system (`data-look-surface`); dock tiles render-tested. Guard: `__tests__/look.test.tsx`.
- `2026-10-19` — claude (lane A): catalog, validator, resolver, permanent nav ids + guard.
- `2026-10-19` — claude (lane B): storage, boot seed `shell`, server pick, live renderers, sync policy,
  cookies + reserve, Standard view, landing, editor door.
- `2026-10-19` — claude (lane C): editor window, live preview, history, Add to my menu + current-record primitive,
  organization layout + lock knob (`personAllowed` amendment), What's new, Settings › Layout, landing on every
  sign-in path.
- `2026-10-19` — claude (lane G): empty groups render with "Add pages…"; store answers asked before a save are
  dropped (no default flash after Save); sign-in sets `matrx_shell`; Organization settings › Layout anchor.
