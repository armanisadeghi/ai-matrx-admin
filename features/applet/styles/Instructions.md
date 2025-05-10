# Color System Usage Guide

## Core Concepts

1. **Never use arbitrary colors** - Always use Tailwind's standard color palette (e.g., `text-gray-100` not `text-white`).
2. **Use the COLOR_VARIANTS system** - Reference colors by key instead of hardcoding.

## Quick Reference

### ❌ Don't:
```tsx
// Don't use "white" or "black"
<div className="text-white bg-black">...</div>

// Don't use arbitrary color values
<div className="text-[#ffffff]">...</div>

// Don't hardcode color classes
<button className="bg-blue-500 text-white">...</button>
```

### ✅ Do:
```tsx
// Use Tailwind's gray scale instead of white/black
<div className="text-gray-100 bg-gray-900">...</div>

// Use the COLOR_VARIANTS system
<div className={COLOR_VARIANTS.text[color]}>...</div>

// Use getAppIcon for icons with color
{getAppIcon({
  icon: applet.appletIcon,
  size: 24,
  color: appletAccentColor || accentColor || "blue",
  className: "text-gray-100"
})}
```

## Common Substitutions

| Instead of    | Use This                   | Notes                                |
|---------------|----------------------------|--------------------------------------|
| `text-white`  | `text-gray-100`           | Lightest gray, visually white        |
| `text-black`  | `text-gray-900`           | Darkest gray, visually black         |
| `bg-white/20` | `bg-gray-100/20`          | Semi-transparent white               |
| `bg-black/50` | `bg-gray-900/50`          | Semi-transparent black               |
| `from-black`  | `from-gray-900`           | For gradients                        |

## Icon Usage

Always use the `getAppIcon` helper:

```tsx
getAppIcon({
  icon: iconName,         // From ICON_OPTIONS
  size: 24,               // Size in pixels
  color: "blue",          // A color key from COLOR_VARIANTS
  className: "additional-classes"
})
```

## For Colored Components

Use the proper COLOR_VARIANTS category:
- `buttonBg` - Background colors for buttons
- `text` - Text colors
- `border` - Border colors
- `background` - Background colors for containers
- `accentBg/accentText/accentBorder` - For accent elements