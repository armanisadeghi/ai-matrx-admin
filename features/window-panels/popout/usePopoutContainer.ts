"use client";

/**
 * usePopoutContainer — return the element Radix portals (Tooltip, Popover,
 * Dropdown, Dialog, Select, AlertDialog, HoverCard) should mount into.
 *
 * **The problem this solves:** by default every Radix `Portal` mounts to
 * `document.body`. When a tooltip-trigger lives inside a popped-out window
 * but the popover content portals to the *parent* document, the tooltip
 * appears in the wrong window — typically invisible to the user.
 *
 * **The fix:** wrappers around Radix primitives call this hook and pass
 * the result as `<Primitive.Portal container={...} />`. Inside a popout,
 * the result is the popout's `<body>`. Outside a popout, the result is
 * `undefined`, which Radix interprets as "use the default" — meaning no
 * behavior change for any of the thousands of existing usages.
 *
 * **Why `undefined` instead of `null`?** Radix's `container` prop accepts
 * `HTMLElement | null | undefined`. Passing `null` actively tries to
 * portal into a `null` target and crashes. Passing `undefined` falls
 * through to the default (`document.body`). The `?? undefined` coerces
 * the `null` we get from `PopoutContext` outside a popout into the
 * Radix-friendly default-fallthrough value.
 */
import { usePopout } from "./PopoutContext";

export function usePopoutContainer(): HTMLElement | undefined {
  return usePopout().popoutContainer ?? undefined;
}
