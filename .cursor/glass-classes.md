# Glass Effect Classes

All classes are self-contained — background, blur, saturate, and border are all included. You do not need to add separate border classes unless you want to override or remove the border.

---

## Core Tiers

| Class | Use when... | Bg opacity | Blur | Saturate | Border included? | Shadow included? |
|---|---|---|---|---|---|---|
| `mx-glass-nano` | Button/chip/icon **inside** a glass container | 8% | 3px | 115% | Yes — subtle | No |
| `mx-glass-micro` | Second-level nesting, light panel-within-panel | 14% | 5px | 120% | Yes — subtle | No |
| `mx-glass-subtle` | Outermost containers, headers, sidebars | 22% | 7px | 125% | Yes — subtle | No |
| `mx-glass` | Standard cards, panels, popovers | 36% | 10px | 135% | Yes — full | Yes — sm |
| `mx-glass-strong` | Modals, drawers, sheets (don't nest inside glass) | 56% | 14px | 140% | Yes — full | Yes — lg |

---

## Pre-composed Variants

| Class | Use when... | What it is |
|---|---|---|
| `mx-glass-pill` | Icon buttons, tags, small rounded chips on glass | Micro-tier values + `border-radius: 9999px` |
| `mx-glass-input` | Text inputs / search fields inside glass containers | Nano bg, 4px blur — focuses up to micro bg |
| `mx-glass-header` | Fixed top bar (content scrolls behind it) | Subtle-tier values + gradient fade `::after` |
| `mx-glass-footer` | Fixed bottom bar | Subtle-tier values + gradient fade `::before` |
| `mx-glass-overlay` | Modal/dialog backdrop scrim | Strong-tier values |
| `mx-glass-modal` | Dialog content panel | Strong-tier values |
| `mx-glass-sheet` | Side sheet sliding in from edge | Strong-tier values |
| `mx-glass-drawer` | Bottom drawer/sheet | Strong-tier values, no bottom border |
| `mx-glass-scrim` | Very light blur behind a bottom sheet, no tint | 2px blur, 110% sat, near-transparent bg |

---

## Displacement (Opt-in)

| Class | What it does | When to use |
|---|---|---|
| `mx-glass-displaced` | Adds SVG `feDisplacementMap` optical scatter | Add to a bg-only wrapper or icon container with no text children — the filter warps **all** pixels of the element including children |

> Do not put `mx-glass-displaced` directly on an element with text. Wrap a `<div>` that is purely visual (a bg layer), or use it on icon-only buttons where slight warping is acceptable.

---

## Nesting Rules

```
mx-glass-subtle (header)
  └── mx-glass-nano    ← buttons, inputs inside the header

mx-glass (card)
  └── mx-glass-nano    ← chips, badges, icon buttons inside the card
  └── mx-glass-micro   ← inner panels, sub-sections inside the card

mx-glass-strong (modal)
  └── mx-glass-micro   ← inputs, secondary panels inside the modal
```

**Never place `mx-glass-subtle` or higher inside another glass element.** Two levels of nano + subtle = ~0.30 effective opacity (clearly transparent). Old values would hit ~0.75 when nested once.

---

## Text on Glass

Use `text-glass-foreground` for body/label text sitting on glass surfaces. It sits between `text-muted-foreground` and `text-foreground` — readable without being solid.

| Token | Light | Dark | Best for |
|---|---|---|---|
| `text-foreground` | 16% L | 90% L | Headings, primary labels |
| `text-glass-foreground` | 28% L | 82% L | Body text, secondary labels on glass |
| `text-muted-foreground` | 46% L | 68% L | Hints, placeholders, tertiary text |

---

## "Do I need to add a border class separately?"

No — every class includes its own border. The tiers use one of two border variables:

- `nano`, `micro`, `subtle`, `pill`, `input` → subtle border (`rgba(255,255,255, 0.18)` light / `rgba(255,255,255, 0.06)` dark)
- `glass`, `strong`, `overlay`, `modal`, `sheet`, `drawer` → full border (`rgba(255,255,255, 0.35)` light / `rgba(255,255,255, 0.10)` dark)

To **remove** the border: add `border-0` or `border-transparent`.  
To **override** the border color: add a standard Tailwind `border-*` class after the glass class.
