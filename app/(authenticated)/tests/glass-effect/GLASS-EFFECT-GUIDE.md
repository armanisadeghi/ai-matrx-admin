# Glass Effect System Guide

## Quick Start

All glass utilities live in `app/globals.css` inside `@layer utilities`. The CSS variables that control opacity/color are in `@layer base` under `:root` (light) and `.dark` (dark).

## The Two Files You Need

| What to change | File | Location |
|---|---|---|
| **Opacity / color values** | `app/globals.css` | Lines ~316 (`:root`) and ~451 (`.dark`) |
| **Blur, saturate, fade height** | `app/globals.css` | Lines ~652 (`@layer utilities`) |

---

## CSS Variables (control the tint color + opacity)

```css
/* app/globals.css — :root (light mode) */
--glass-bg:        rgba(255, 255, 255, 0.65);   /* standard glass */
--glass-bg-hover:  rgba(255, 255, 255, 0.78);   /* hover state */
--glass-bg-strong: rgba(255, 255, 255, 0.82);   /* modals, prominent */
--glass-bg-subtle: rgba(255, 255, 255, 0.50);   /* headers, docks */
--glass-border:    rgba(255, 255, 255, 0.50);

/* .dark (dark mode) — same structure, zinc-800 base */
--glass-bg:        rgba(39, 39, 42, 0.65);
--glass-bg-subtle: rgba(39, 39, 42, 0.50);
/* ... etc */
```

**To make glass more opaque:** increase the alpha value (e.g. 0.65 → 0.80).
**To make glass more see-through:** decrease it (e.g. 0.65 → 0.40).

---

## Utility Classes

| Class | Use case | Key properties |
|---|---|---|
| `.glass` | Buttons, cards, interactive elements | bg: standard, blur: 12px, border + shadow |
| `.glass-subtle` | Containers, docks, light overlays | bg: subtle, blur: 8px, no border |
| `.glass-strong` | Modals, active states, prominent | bg: strong, blur: 20px, border + shadow-lg |
| `.glass-pill` | Round icon buttons | Same as .glass + border-radius: 9999px |
| `.glass-input` | Text inputs, search fields | bg: subtle → standard on focus, border |
| `.glass-header` | Fixed/sticky header bar | bg: subtle, blur: 20px, + ::after fade gradient below |
| `.glass-footer` | Fixed/sticky footer/dock | bg: subtle, blur: 20px, + ::before fade gradient above |
| `.glass-overlay` | Modal/sheet backdrop | bg: black/30, blur: 8px |
| `.glass-modal` | Dialog content panel | bg: strong, blur: 24px, border + shadow-lg |
| `.glass-sheet` | Side sheet panel | bg: strong, blur: 24px, border |
| `.glass-drawer` | Bottom drawer panel | bg: strong, blur: 24px, border (no bottom border) |

---

## How the Fade Edge Works

The header/footer use pseudo-elements (`::after` / `::before`) to create a gradient fade so there's no hard line at the edge.

```css
.glass-header::after {
    content: '';
    position: absolute;
    left: 0; right: 0;
    top: 100%;                /* starts at bottom edge of header */
    height: 3.5rem;           /* how tall the fade is */
    background: linear-gradient(to bottom, var(--glass-bg-subtle), transparent);
    mask-image: linear-gradient(to bottom, black 10%, transparent);
    pointer-events: none;
    z-index: -1;
}
```

### Adjusting the fade

- **Height:** Change `height: 3.5rem` — bigger = more gradual fade
- **Mask stop:** `black 10%` means the first 10% is fully opaque before fading. Increase to keep the glass effect visible longer before it starts fading. Set to `black 0%` to start fading immediately.
- **Background:** The gradient goes from `var(--glass-bg-subtle)` to `transparent`. To make the fade start stronger, you could use `var(--glass-bg)` instead.

---

## How to Apply to a New Component

### Fixed header/footer (full-width chrome):
```tsx
<header className="fixed top-0 left-0 right-0 z-50 h-10 glass-header">
    {/* buttons inside use .glass for slightly stronger effect */}
    <button className="glass rounded-lg p-2">...</button>
</header>
```

### Floating dock (pill shape):
```tsx
<div className="fixed bottom-0 left-0 right-0 z-40 pb-safe">
    <div className="flex items-center gap-2 p-2 rounded-full glass-subtle">
        {/* individual controls get stronger glass */}
        <button className="glass-pill h-10 w-10">...</button>
        <div className="flex-1 glass rounded-full h-10">Search...</div>
        <button className="bg-primary rounded-full h-10 w-10">+</button>
    </div>
</div>
```

### Modal / Sheet / Drawer:
Already built into the UI components (`dialog.tsx`, `sheet.tsx`, `drawer.tsx`). Just use them normally:
```tsx
<Dialog>
    <DialogContent>  {/* automatically uses glass-modal */}
        ...
    </DialogContent>
</Dialog>
```

---

## Test Pages

| Page | URL (authenticated) | What it shows |
|---|---|---|
| Basic test | `/tests/glass-effect` | All classes, modals, colored scroll blocks |
| Variations playground | `/tests/glass-effect/variations` | Interactive sliders for opacity/blur/saturate, side-by-side comparisons, fade playground |

---

## Tips

1. **Glass needs contrast to be visible.** On a plain white/dark background, glass looks nearly invisible. It shines when colored content scrolls behind it.
2. **Don't use `position: relative` on glass-header/footer** — it will override Tailwind's `fixed` class (both are in `@layer utilities`, later wins).
3. **Nested `backdrop-filter`** inside a parent that also has `backdrop-filter` is unreliable in browsers. That's why the fade pseudo-elements only use a gradient background, not their own backdrop-filter.
4. **The `.glass:hover` state** is automatic — the CSS defines a hover rule that increases opacity.
5. **`hover:glass-strong` won't work** as a Tailwind variant prefix on custom utilities. Use the built-in `:hover` rules instead, or apply the stronger class conditionally with JS.
