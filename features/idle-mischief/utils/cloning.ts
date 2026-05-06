// features/idle-mischief/utils/cloning.ts
//
// THE rules for the entire mischief subsystem:
//
//   1. We NEVER call motion's animate() (or any other animator) on a real
//      DOM element. Animations always target a clone.
//
//   2. We NEVER mutate inline `style` or `class` on real DOM elements.
//      Hiding the original is done purely by setting a `data-*` attribute
//      that a stylesheet rule (injected once at module load) targets.
//
//      Why this matters: `providers/persistance/PersistentDOMConnector.tsx`
//      installs a MutationObserver on `document.body` with
//      `attributeFilter: ['style', 'data-placeholder-for', 'data-component-id', 'class']`.
//      Any mutation to those attributes fires its callback, which then
//      reconciles `[data-component-id]` containers — moving DOM around
//      and potentially corrupting persistent component placement. By
//      using `data-mischief-original` (NOT in the filter) for the hide,
//      our mutations are invisible to that observer.
//
//   3. Clones are tagged with `data-mischief-clone="1"` and originals with
//      `data-mischief-original="1"` so the document-wide sweep in
//      `restoreAll()` can find + clean any straggler if a registry path
//      ever fails.

import { registerPortal, snapshot } from "./snapshot";

export const CLONE_ATTR = "data-mischief-clone";
export const ORIGINAL_ATTR = "data-mischief-original";

/**
 * Inject a single stylesheet rule (once per page load) that hides every
 * element marked `data-mischief-original`. Setting / removing the data
 * attribute is the ONLY mutation we make on real elements during the show
 * — and that attribute is NOT in PersistentDOMConnector's observer filter,
 * so the observer never fires from us.
 *
 * Idempotent: only injects on first call.
 */
const MISCHIEF_STYLESHEET_ID = "__mischief-stylesheet__";

function ensureMischiefStylesheet() {
  if (typeof document === "undefined") return;
  if (document.getElementById(MISCHIEF_STYLESHEET_ID)) return;
  const style = document.createElement("style");
  style.id = MISCHIEF_STYLESHEET_ID;
  style.textContent = `
    [data-mischief-original] {
      visibility: hidden !important;
      pointer-events: none !important;
    }
  `;
  document.head.appendChild(style);
}

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
 * these on, code elsewhere doing `document.querySelector('[data-...]')`
 * could hit our clone instead of the real element while mischief is running.
 *
 * Critical entries (NEVER remove without thinking carefully):
 *
 *  - `data-component-id` / `data-placeholder-for`
 *      Used by `providers/persistance/PersistentDOMConnector.tsx`. That
 *      file runs a `MutationObserver` on `document.body` watching for
 *      ANY `style` attribute change in the subtree. When we set our
 *      clone's inline style, the observer fires and scans for
 *      `[data-component-id]`. If a clone carries a duplicate id, the
 *      observer's reconciliation does `placeholder.innerHTML = ''` and
 *      reparents the clone — DESTROYING the real persistent component.
 *      Stripping these on clones makes us invisible to that observer.
 *
 *  - `id`
 *      Cloned IDs duplicate; CSS like `#foo` and JS lookups like
 *      `getElementById` would resolve to the clone (or undefined behavior).
 *
 *  - `name`
 *      Cloned form fields would participate in form submission.
 *
 *  - `for`
 *      Stale label/input association after we strip the id.
 *
 *  - `data-testid` family
 *      Test framework selectors must point at real elements.
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
  "data-component-id",
  "data-placeholder-for",
];

export function cloneAndHide(original: HTMLElement): HTMLElement {
  // First call wins — sets up the stylesheet rule that does the actual
  // hide via [data-mischief-original]. No-op on subsequent calls.
  ensureMischiefStylesheet();

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

  // Snapshot the original BEFORE marking it (snapshot captures inline
  // style verbatim — but here we don't actually need it since we're not
  // touching inline style on the original anymore. We still snapshot so
  // restoreElement has the original's class/parent/sibling refs in case
  // some later act ever does need to mutate.)
  snapshot(original);

  // Mark the original. Setting this attribute is the ONLY mutation we
  // make on the real element during the show — and crucially, this
  // attribute is NOT in PersistentDOMConnector's observer filter, so the
  // observer doesn't fire when we set it. The CSS rule injected by
  // ensureMischiefStylesheet() does the actual visibility:hidden hide.
  original.setAttribute(ORIGINAL_ATTR, "1");

  return clone;
}
