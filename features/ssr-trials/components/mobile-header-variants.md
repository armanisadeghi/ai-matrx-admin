# Mobile Header Bar Variants

> Permanent anchors on every variant:
> `≡` = Hamburger menu (left edge) · `◉` = Avatar (right edge)

---

## Anatomy

```
╭─────────────────────────────────────────────────────╮
│  ≡  │        ◄ flexible zone ►        │  ◉  │
╰─────────────────────────────────────────────────────╯
      ▲                                       ▲
  always                                  always
```

The **flexible zone** is what changes per variant. Left and right anchors are constant.

---

## Variant 1 · Generic (Fully Custom)

You own the entire flexible zone. Pass whatever you want.

```
┌─────────────────────────────────────────────────────┐
│  ≡  │           { your content here }         │  ◉  │
└─────────────────────────────────────────────────────┘
```

**Props:** `children` — raw slot, no opinions.

---

## Variant 2 · Generic Structured

Optional back chevron, centered title, optional right-side action icons.

```
┌─────────────────────────────────────────────────────┐
│  ≡  │  ‹  │       Title       │  ⊕  ⟐  ⋯  │  ◉  │
└─────────────────────────────────────────────────────┘
       opt              ▲              opt
                    centered
```

**With dropdown:**

```
┌─────────────────────────────────────────────────────┐
│  ≡  │  ‹  │   ⌄ Dropdown ⌄   │  ⊕  ⟐  ⋯  │  ◉  │
└─────────────────────────────────────────────────────┘
```

**Desktop** — icons render inline.
**Mobile** — icons collapse into `⋯` which opens a bottom sheet:

```
┌─────────────────────────────────────────────────────┐
│  ≡  │  ‹  │       Title       │     ⋯     │  ◉  │
└─────────────────────────────────────────────────────┘
                                       │
                        ┌──────────────┘
                        ▼
            ╭───────────────────────╮
            │  ░░░░░░░░░░░░░░░░░░░ │  ← glass bg
            │                       │
            │   ⊕  New Item         │
            │   ⟐  Filter          │
            │   ✎  Edit            │
            │   ⌫  Delete          │
            │                       │
            ╰───────────────────────╯
              bottom drawer / sheet
```

**Props:**

```
back?        → boolean | () => void
title?       → string
dropdown?    → { label, options[], onSelect }
actions?     → { icon, label, onPress }[]    ← auto sheet on mobile
```

> Pass `actions[]` and the sheet + glass background + responsive
> collapse is all handled for you. Override with `renderSheet` if needed.

---

## Variant 3 · Two-Way Toggle

A centered toggle with exactly 2 options. Think Apple Notes (Notes / Folders).

```
┌─────────────────────────────────────────────────────┐
│  ≡  │  ‹  │  ┌────────┬────────┐  │  ⋯  │  ◉  │
│     │     │  │▓▓ Notes │ Folders│  │     │     │
│     │     │  └────────┴────────┘  │     │     │
└─────────────────────────────────────────────────────┘
                  ▲ active    inactive
```

Toggled state:

```
┌─────────────────────────────────────────────────────┐
│  ≡  │  ‹  │  ┌────────┬────────┐  │  ⋯  │  ◉  │
│     │     │  │  Notes  │▓Folders│  │     │     │
│     │     │  └────────┴────────┘  │     │     │
└─────────────────────────────────────────────────────┘
```

**Props:**

```
back?        → boolean | () => void
toggle       → {
                  options: [
                    { icon?, label, value },
                    { icon?, label, value }
                  ],
                  active: value,
                  onChange: (value) => void
               }
actions?     → { icon, label, onPress }[]
```

---

## Variant 4 · Icon & Title (Centered)

A single icon + title lockup in the center. Clean, branded feel.

```
┌─────────────────────────────────────────────────────┐
│  ≡  │  ‹  │       ✦ Page Title        │  ⋯  │  ◉  │
└─────────────────────────────────────────────────────┘
                     ▲
               icon + title
               centered lockup
```

Without back or actions (minimal):

```
┌─────────────────────────────────────────────────────┐
│  ≡  │            ✦ Dashboard              │  ◉  │
└─────────────────────────────────────────────────────┘
```

**Props:**

```
back?        → boolean | () => void
icon         → ReactNode | string
title        → string
actions?     → { icon, label, onPress }[]
```

---

## Variant 5 · Four Pills

Four horizontally-distributed pill buttons. Good for top-level category switching.

```
┌─────────────────────────────────────────────────────┐
│  ≡  │ (▓All▓) ( Msgs ) ( Tasks ) ( Files ) │  ◉  │
└─────────────────────────────────────────────────────┘
         ▲ active
```

Another state:

```
┌─────────────────────────────────────────────────────┐
│  ≡  │ ( All ) ( Msgs ) (▓Tasks▓) ( Files ) │  ◉  │
└─────────────────────────────────────────────────────┘
                              ▲ active
```

**Props:**

```
pills        → {
                  options: [
                    { icon?, label, value, badge? }   ← exactly 4
                  ],
                  active: value,
                  onChange: (value) => void
               }
```

> No back/actions — pills fill the zone. If you need those, use Variant 2.

---

## Variant 6 · Three Small Tabs

Three compact tabs, underline-style. Lighter than pills, good for sub-navigation.

```
┌─────────────────────────────────────────────────────┐
│  ≡  │      Recent      Starred     Archive      │  ◉  │
│     │      ━━━━━━                                │     │
└─────────────────────────────────────────────────────┘
              ▲ active (underline)
```

Switched:

```
┌─────────────────────────────────────────────────────┐
│  ≡  │      Recent      Starred     Archive      │  ◉  │
│     │                   ━━━━━━━                  │     │
└─────────────────────────────────────────────────────┘
```

**Props:**

```
tabs         → {
                  options: [
                    { label, value, badge? }          ← exactly 3
                  ],
                  active: value,
                  onChange: (value) => void
               }
```

> No back/actions — tabs fill the zone. Same constraint as pills.

---

## Summary Table

```
 #  │ Variant              │ Back │ Actions/⋯ │ Center Content
────┼──────────────────────┼──────┼───────────┼──────────────────────
 1  │ Generic              │  —   │     —     │ Anything (raw slot)
 2  │ Generic Structured   │  ✓   │     ✓     │ Title + opt. dropdown
 3  │ Two-Way Toggle       │  ✓   │     ✓     │ 2-option toggle
 4  │ Icon & Title         │  ✓   │     ✓     │ Icon + label lockup
 5  │ Four Pills           │  ✗   │     ✗     │ 4 pill buttons
 6  │ Three Small Tabs     │  ✗   │     ✗     │ 3 underline tabs
────┴──────────────────────┴──────┴───────────┴──────────────────────
```

---

## Shared Behaviors

**Hamburger `≡`** — Always present, left edge. Opens main navigation drawer.

**Avatar `◉`** — Always present, right edge. Opens profile / account sheet.

**Actions overflow `⋯`** — When `actions[]` is provided on a supported variant:
- **Desktop:** Icons render inline in the right zone.
- **Mobile:** Icons collapse behind a `⋯` button → opens a glass-background bottom drawer with labeled rows.
- This is **fully automatic** unless you pass a custom `renderSheet`.

**Glass bottom drawer** — The overflow sheet enforces the shared glass aesthetic. No per-screen work needed.
