# Radix tooltip — `TooltipPrimitive.Portal` audit

**Result:** Every `TooltipPrimitive.Content` in the repo lives in `components/ui/tooltip.tsx` and is already wrapped in `TooltipPrimitive.Portal`. All other usage goes through `TooltipContent` from `@/components/ui/tooltip`, so tooltip content is portaled at the shared component.

**Imports of `@radix-ui/react-tooltip`:** only `components/ui/tooltip.tsx` and `features/applet/builder/modules/smart-parts/apps/AppSlugChecker.tsx` (the latter only adds an extra `Portal` around `TooltipContent` — redundant, not missing a portal).

## Checklist

- [ ] **Regression guard:** Any new code that uses `TooltipPrimitive.Content` directly must wrap it in `TooltipPrimitive.Portal` (prefer importing `TooltipContent` from `@/components/ui/tooltip` instead).
- [ ] **Optional cleanup:** `features/applet/builder/modules/smart-parts/apps/AppSlugChecker.tsx` — remove redundant outer `TooltipPrimitive.Portal` wrappers; `TooltipContent` already portals internally.
