// features/idle-mischief/utils/cloning.ts
//
// THE rule for the entire mischief subsystem:
//   - We NEVER call motion's animate() (or any other animator) on a real
//     DOM element. Animations always target a clone.
//   - Clones are tagged with `data-mischief-clone="1"` so we can find +
//     remove ANY clone in the document, even if our registries somehow
//     missed it.
//   - Originals we hide are tagged with `data-mischief-original="1"` so
//     we can find + force-revert visibility on ANY element we touched,
//     even if our registries somehow missed it.
//
// These attribute-based sweeps make snap-back idempotent at the document
// level — restoreAll() can find + clean up every byte of mischief by
// scanning the DOM, not just by trusting in-memory state.

import { registerPortal, snapshot } from "./snapshot";

export const CLONE_ATTR = "data-mischief-clone";
export const ORIGINAL_ATTR = "data-mischief-original";

/**
 * Clone `original`, position the clone exactly over it (fixed-positioned),
 * hide the original via visibility:hidden + pointer-events:none, register
 * both with the snapshot system. Returns the clone for the caller to
 * animate.
 *
 * The clone carries `data-mischief-clone="1"` and the original is marked
 * with `data-mischief-original="1"` so a document-wide sweep can clean up
 * any stragglers if the registry path fails.
 */
export function cloneAndHide(original: HTMLElement): HTMLElement {
  const r = original.getBoundingClientRect();
  const clone = original.cloneNode(true) as HTMLElement;

  // Strip ids on the clone + descendants to avoid duplicates.
  if (clone.id) clone.removeAttribute("id");
  clone.querySelectorAll<HTMLElement>("[id]").forEach((n) =>
    n.removeAttribute("id"),
  );
  // Strip name attributes — would otherwise let the clone participate in
  // form submission.
  clone.querySelectorAll<HTMLElement>("[name]").forEach((n) =>
    n.removeAttribute("name"),
  );

  // Mark the clone so the sledgehammer sweep can find it.
  clone.setAttribute(CLONE_ATTR, "1");

  // Combine the clone's existing inline style with our positioning. We
  // keep the existing style and override layout-critical bits with
  // !important so nothing wins over us.
  const existingStyle = clone.getAttribute("style") || "";
  const overrideStyle = [
    `position: fixed`,
    `left: ${r.left}px`,
    `top: ${r.top}px`,
    `width: ${r.width}px`,
    `height: ${r.height}px`,
    `margin: 0`,
    `z-index: 2147483640`,
    `pointer-events: none`,
    `will-change: transform, opacity`,
    `transition: none`, // kill any inherited CSS transitions
  ]
    .map((s) => s + " !important")
    .join("; ");
  clone.setAttribute("style", `${existingStyle}; ${overrideStyle}`);
  document.body.appendChild(clone);
  registerPortal(clone);

  // Snapshot the original BEFORE mutating it.
  snapshot(original);
  // Mark + hide the original.
  original.setAttribute(ORIGINAL_ATTR, "1");
  original.style.visibility = "hidden";
  original.style.pointerEvents = "none";

  return clone;
}
