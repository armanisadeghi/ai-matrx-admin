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
/**
 * Attributes we strip from clones (root + descendants) so they don't get
 * targeted by `querySelector` calls in unrelated features. If we left
 * these on, code elsewhere doing `document.querySelector('[data-testid="x"]')`
 * could hit our clone instead of the real element while mischief is running.
 *
 * `for` is stripped because cloned `<label for="some-id">` after we strip
 * the id leaves a dangling reference.
 */
const CLONE_STRIP_ATTRS = [
  "id",
  "name",
  "for",
  "data-testid",
  "data-test",
  "data-test-id",
  "data-cy",
  "data-qa",
];

export function cloneAndHide(original: HTMLElement): HTMLElement {
  const r = original.getBoundingClientRect();
  const clone = original.cloneNode(true) as HTMLElement;

  // Strip identifying / test-targeting attributes on the clone root + every
  // descendant so other features' querySelector calls can't accidentally
  // match the clone instead of the real element.
  for (const attr of CLONE_STRIP_ATTRS) {
    if (clone.hasAttribute(attr)) clone.removeAttribute(attr);
    clone
      .querySelectorAll<HTMLElement>(`[${attr}]`)
      .forEach((n) => n.removeAttribute(attr));
  }
  // Strip aria-controls / aria-labelledby / aria-describedby — these are
  // ID references that point at real elements which the clone now
  // duplicates. AT may double-announce or get confused.
  for (const attr of ["aria-controls", "aria-labelledby", "aria-describedby"]) {
    if (clone.hasAttribute(attr)) clone.removeAttribute(attr);
    clone
      .querySelectorAll<HTMLElement>(`[${attr}]`)
      .forEach((n) => n.removeAttribute(attr));
  }
  // Hide the clone from assistive tech entirely — it's a visual clone, not
  // semantic content. Prevents screen readers from announcing duplicate
  // sidebars / windows / buttons.
  clone.setAttribute("aria-hidden", "true");
  clone.setAttribute("inert", "");
  // Disable anything inside the clone that could fire a network request,
  // submit a form, or auto-play media.
  clone.querySelectorAll<HTMLElement>("iframe, video, audio").forEach((n) => {
    try {
      // iframe src removal stops the embedded page from loading; video/audio
      // stops auto-play.
      n.removeAttribute("src");
    } catch {}
  });

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
