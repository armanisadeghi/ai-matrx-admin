# components/icons

Pre-composed TapTargetButton components, CSS-only SearchToolbar, and SearchGroup.

## TapButtons — `tap-buttons.tsx`

One import, one tag. SVG path, wrapper variant, and aria label are baked in.

```tsx
import { PlusTapButton, SearchTapButton } from "@/components/icons/tap-buttons";

<PlusTapButton />                          // glass (default)
<PlusTapButton variant="transparent" />    // hover-only bg
<PlusTapButton variant="group" />          // inside TapTargetButtonGroup
<PlusTapButton variant="solid" />          // solid bg
```

Pass-through props: `onClick`, `as`, `htmlFor`, `ariaLabel`, `disabled`, `className`, `strokeWidth`.

**Available:**
`MenuTapButton` `PlusTapButton` `SearchTapButton` `SettingsTapButton` `MaximizeTapButton` `ArrowDownUpTapButton` `BellTapButton` `UploadTapButton` `UndoTapButton` `RedoTapButton` `CopyTapButton` `TrashTapButton` `ChevronLeftTapButton` `PanelLeftTapButton` `PanelRightTapButton` `SquarePenTapButton` `XTapButton` `FilterTapButton`

### Spacing rules

- **Individual buttons:** NEVER add padding, gap, or margin around them. They have invisible built-in tap targets (h-11 w-11 outer, h-8 w-8 visible) that handle spacing.
- **Groups** (TapTargetButtonGroup, SearchGroup): The glass pill goes edge-to-edge, so the group component itself includes small outer margin. Add no extra padding.

---

## SearchToolbar — `SearchToolbar.tsx`

CSS-only expandable search input alongside TapButtons. Hidden checkbox drives state — zero JS for toggle.

```tsx
import { SearchToolbar } from "@/components/icons/SearchToolbar";

<SearchToolbar
  id="my-search"
  left={<><FilterTapButton /><ArrowDownUpTapButton /></>}
  right={<PlusTapButton />}
  mode="responsive"
  spread={true}
  placeholder="Search..."
/>
```

| Prop | Default | Description |
|---|---|---|
| `id` | auto | Unique ID for the checkbox toggle |
| `left` | — | Buttons to the left of search |
| `right` | — | Buttons to the right of search |
| `mode` | `"responsive"` | `"inline"` (stays in place), `"full-width"` (takes over), `"responsive"` (inline on desktop, full-width on mobile) |
| `spread` | `true` | Distribute buttons evenly on mobile (<640px) |
| `placeholder` | `"Search..."` | Input placeholder text |
| `inputName` | `"search"` | Input name attribute |

### Presets — `search-toolbar-presets.tsx`

```tsx
import { MobileFilterBar, DesktopToolbar, MinimalSearchBar } from "@/components/icons/search-toolbar-presets";

<MobileFilterBar />     // ( < ) ( Filter ) ( Sort ) ( 🔍→input ) ( + )
<DesktopToolbar />      // ( ≡ ) ( Filter ) ( ⚙ ) ( ⤢ ) ( 🔍→input ) ( + )
<MinimalSearchBar />    // ( 🔍→input ) ( + )
```

---

## SearchGroup — `SearchToolbar.tsx`

Glass pill group with built-in expandable search. Icons live inside a shared glass border. When search is tapped, behavior depends on the `expand` prop.

```tsx
import { SearchGroup, SearchGroupTrigger } from "@/components/icons/SearchToolbar";

<SearchGroup id="my-group" placeholder="Search...">
  <FilterTapButton variant="group" />
  <ArrowDownUpTapButton variant="group" />
  <SearchGroupTrigger id="my-group" />
  <SettingsTapButton variant="group" />
</SearchGroup>
```

### `expand` prop (default `true`)

**`expand={true}`** — Pill grows to fill available space. Icons stay visible. The search trigger icon collapses and an input field appears in-flow next to the remaining icons. Best when the group has room to grow (e.g., centered between side buttons).

**`expand={false}`** — Pill stays fixed size. All icons fade out and the input overlays in the same space. Zero layout shift. Best for tight layouts or standalone groups.

### `fill` prop (default `false`)

When `true`, the group stretches to full width on mobile (<640px) with icons evenly distributed. Useful when the group is the primary element in a mobile row.

### Layout pattern: centered group with side buttons

```tsx
<div className="flex items-center w-full">
  <ChevronLeftTapButton />
  <SearchGroup id="x" expand placeholder="Search...">
    <FilterTapButton variant="group" />
    <SearchGroupTrigger id="x" />
    <SettingsTapButton variant="group" />
  </SearchGroup>
  <PlusTapButton />
</div>
```

The group gets `flex: 1` when expanded, filling the space between the pinned side buttons.

### Group presets

```tsx
import { FilterSearchGroup, ToolsSearchGroup } from "@/components/icons/search-toolbar-presets";

<FilterSearchGroup />   // [ Filter | Sort | Search | Settings ]
<ToolsSearchGroup />    // [ Filter | Sort | Search | Maximize | Settings ]
```

---

## Adding new buttons

1. Add a named export to `tap-buttons.tsx` using the `Wrap` helper.
2. SVG paths: `viewBox="0 0 24 24"`, `strokeLinecap="round"`, `strokeLinejoin="round"`, open strokes only — no filled shapes, no `<rect>`, no closed `Z` paths.
3. Set a sensible `ariaLabel` default. Name: `{LucideName}TapButton`.
4. No state, no hooks, no `'use client'`.

## Files

| File | Purpose |
|---|---|
| `tap-buttons.tsx` | Pre-composed icon buttons |
| `SearchToolbar.tsx` | SearchToolbar + SearchGroup + SearchGroupTrigger |
| `search-toolbar.css` | Scoped CSS (`.stb-` prefix) for search expand/collapse |
| `search-toolbar-presets.tsx` | Ready-to-use toolbar and group presets |
