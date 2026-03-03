# Header Variants — Usage Guide

## Setup

```tsx
// Import the CSS once in your layout or globals:
import "@/components/header-variants/header-variants.css";
```

All variants are `"use client"` components designed to be passed as children to `<PageHeader>`, which portals them into the header center slot.

---

## Variant 2 — Structured

Back + title + dropdown + responsive actions.

```tsx
import { PageHeader } from "@/components/PageHeader";
import { HeaderStructured, type HeaderAction } from "@/components/header-variants";

const actions: HeaderAction[] = [
  { icon: "Plus",              label: "New Item",  onPress: () => {} },
  { icon: "SlidersHorizontal", label: "Filter",    onPress: () => {} },
  { icon: "Trash2",            label: "Delete",    onPress: () => {}, destructive: true },
];

// Simple title + actions
<PageHeader>
  <HeaderStructured back title="Inventory" actions={actions} />
</PageHeader>

// Dropdown instead of static title
<PageHeader>
  <HeaderStructured
    dropdown={{
      options: [
        { label: "Grid",   value: "grid",   icon: "LayoutGrid" },
        { label: "List",   value: "list",   icon: "List" },
        { label: "Kanban", value: "kanban", icon: "Columns3" },
      ],
      selected: currentView,
      onSelect: setCurrentView,
    }}
    actions={actions}
  />
</PageHeader>
```

---

## Variant 3 — Toggle

Two-way toggle (like Apple Notes).

```tsx
import { HeaderToggle } from "@/components/header-variants";

<PageHeader>
  <HeaderToggle
    back
    options={[
      { icon: "StickyNote", label: "Notes",   value: "notes" },
      { icon: "Folder",     label: "Folders", value: "folders" },
    ]}
    active={view}
    onChange={setView}
    actions={[{ icon: "Search", label: "Search", onPress: openSearch }]}
  />
</PageHeader>
```

---

## Variant 4 — Icon & Title

Branded center lockup.

```tsx
import { HeaderIconTitle } from "@/components/header-variants";

// Minimal — no back, no actions
<PageHeader>
  <HeaderIconTitle icon="LayoutDashboard" title="Dashboard" />
</PageHeader>

// Full
<PageHeader>
  <HeaderIconTitle
    back
    icon="Settings"
    title="Settings"
    actions={[{ icon: "RotateCcw", label: "Reset All", onPress: handleReset }]}
  />
</PageHeader>
```

---

## Variant 5 — Pills

Four category pills. Fills the full zone — no back or actions.

```tsx
import { HeaderPills } from "@/components/header-variants";

<PageHeader>
  <HeaderPills
    options={[
      { icon: "Layers",        label: "All",   value: "all", badge: 12 },
      { icon: "MessageCircle", label: "Msgs",  value: "msgs" },
      { icon: "SquareCheck",   label: "Tasks", value: "tasks", badge: 3 },
      { icon: "File",          label: "Files", value: "files" },
    ]}
    active={category}
    onChange={setCategory}
  />
</PageHeader>
```

---

## Variant 6 — Tabs

Three underline tabs. Fills the full zone — no back or actions.

```tsx
import { HeaderTabs } from "@/components/header-variants";

<PageHeader>
  <HeaderTabs
    options={[
      { label: "Recent",  value: "recent", badge: 5 },
      { label: "Starred", value: "starred" },
      { label: "Archive", value: "archive" },
    ]}
    active={filter}
    onChange={setFilter}
  />
</PageHeader>
```

---

## Using Shared Primitives Standalone

You can use the building blocks independently:

```tsx
import { GlassButton, BottomSheet, GlassDropdown } from "@/components/header-variants";

// Glass button anywhere (44px tap target, 30px glass inner)
<GlassButton icon="Bell" onClick={toggleNotifications} ariaLabel="Notifications" />

// Bottom sheet anywhere
<BottomSheet
  open={isOpen}
  onClose={() => setOpen(false)}
  actions={myActions}
  title="Choose an action"
/>

// Glass dropdown on any trigger
<div style={{ position: "relative" }}>
  <button onClick={() => setOpen(true)}>Open menu</button>
  <GlassDropdown
    mode="actions"
    actions={myActions}
    open={isOpen}
    onClose={() => setOpen(false)}
    align="left"
  />
</div>
```

---

## Design Principles Enforced

| Principle | How it's enforced |
|---|---|
| No background on header | All variant roots have `background: transparent !important` |
| Glass only on interactive children | Only `.shell-glass`, `.hdr-glass-btn-inner`, and explicit glass classes carry `backdrop-filter` |
| 44×44 tap targets | `.hdr-glass-btn` is always 2.75rem transparent; inner is 1.875rem glass |
| Mobile → bottom sheet | `HeaderActions` renders `BottomSheet` on `<lg`, inline on `lg+` |
| Desktop → glass dropdown | Overflow actions use `GlassDropdown` positioned below trigger |
| Token consistency | All colors, shadows, blurs reference `--shell-*` tokens from `shell.css` |
| Spring physics | All interactive transitions use `--shell-ease-spring` |

---

## File Tree

```
header-variants/
├── index.ts                    # Barrel exports
├── types.ts                    # Shared TypeScript types
├── header-variants.css         # All component styles (import once)
├── shared/
│   ├── LucideIcon.tsx          # Dynamic icon from string name
│   ├── GlassButton.tsx         # Atomic 44px tap-target + glass inner
│   ├── HeaderBack.tsx          # Back chevron
│   ├── HeaderActions.tsx       # Responsive actions (desktop inline / mobile sheet)
│   ├── BottomSheet.tsx         # iOS-style glass bottom drawer
│   └── GlassDropdown.tsx       # Desktop floating glass menu
└── variants/
    ├── HeaderStructured.tsx    # V2: back + title/dropdown + actions
    ├── HeaderToggle.tsx        # V3: two-way toggle center
    ├── HeaderIconTitle.tsx     # V4: icon + title lockup center
    ├── HeaderPills.tsx         # V5: four pill buttons
    └── HeaderTabs.tsx          # V6: three underline tabs
```
