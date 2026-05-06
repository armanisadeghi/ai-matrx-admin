// features/idle-mischief/utils/snapshot.ts
//
// THE foundation of the idle-mischief subsystem.
//
// THE GOLDEN RULE: a real DOM element MUST be returned to its EXACT
// pre-mischief state when the user returns. No drift. No stuck transforms.
// No "settled in a different spot."
//
// How we achieve that:
//   1. snapshot(el)    — store the entire `style` attribute string verbatim,
//                        plus className/parent/nextSibling/rect. NEVER per
//                        property. Idempotent — first call wins.
//   2. registerPortal(node) — track clones/overlays so they get unmounted.
//   3. registerCleanup(fn) — non-DOM cleanup (RAF handles, listeners).
//   4. restoreAll()    — atomic sweep:
//                          a) cancel EVERY Web Animations API animation in
//                             the document (motion v12 writes there, NOT
//                             to inline style)
//                          b) run cleanup callbacks
//                          c) unmount portal nodes
//                          d) restore each element's snapshot byte-for-byte
//                          e) schedule ONE follow-up `cancel-only` pass at
//                             the next animation frame, for stragglers
//                             that began during the same tick we cancelled
//
// Why the follow-up pass: motion's animate() may queue an animation in
// the same microtask as our cancel; without a second pass on the next
// frame, that animation runs for one tick and leaves a sub-pixel offset.

const elementSnapshots = new Map<HTMLElement, ElementSnapshot>();
const portalNodes = new Set<HTMLElement>();
const cleanupCallbacks = new Set<() => void>();

interface ElementSnapshot {
  el: HTMLElement;
  /** Verbatim style attribute at snapshot time. null if not set. */
  inlineStyle: string | null;
  /** Class string at snapshot time. */
  className: string;
  /** Original parent node (for re-parenting check). */
  parent: ParentNode | null;
  /** The next sibling so we can re-insert at the same DOM position. */
  nextSibling: Node | null;
  /** Bounding rect at snapshot time — for clones / overlays / position math. */
  rect: DOMRect;
}

/**
 * Capture the element's full state. Idempotent — calling twice on the same
 * element returns the existing snapshot. The FIRST call wins so layered
 * acts don't poison each other's baseline.
 */
export function snapshot(el: HTMLElement): ElementSnapshot {
  const existing = elementSnapshots.get(el);
  if (existing) return existing;

  const snap: ElementSnapshot = {
    el,
    inlineStyle: el.getAttribute("style"),
    className: el.className,
    parent: el.parentNode,
    nextSibling: el.nextSibling,
    rect: el.getBoundingClientRect(),
  };
  elementSnapshots.set(el, snap);
  return snap;
}

/**
 * Cancel every WAAPI animation on `el` and its descendants. This is the
 * step that makes "stuck transforms" impossible — without it, restoring
 * inline styles is invisible to a running compositor-layer animation.
 */
function cancelAnimationsOn(el: HTMLElement): void {
  try {
    el.getAnimations({ subtree: true }).forEach((a) => {
      try {
        a.cancel();
      } catch {}
    });
  } catch {}
}

/**
 * Cancel every WAAPI animation in the entire document. The blast-radius
 * version. Used in restoreAll() to nuke anything we missed.
 */
function cancelAllDocumentAnimations(): void {
  try {
    document.getAnimations().forEach((a) => {
      try {
        a.cancel();
      } catch {}
    });
  } catch {}
}

/**
 * Restore a single element to its snapshotted state. Cancels animations
 * on it FIRST, then puts every byte back, then deletes the snapshot.
 */
export function restoreElement(el: HTMLElement) {
  const snap = elementSnapshots.get(el);
  if (!snap) return;

  // 0. Kill any WAAPI animation on this element + subtree. Without this,
  //    inline-style restore is invisible — the compositor keeps painting
  //    the animated transform.
  cancelAnimationsOn(el);

  // 1. Restore inline style verbatim.
  if (snap.inlineStyle === null) {
    el.removeAttribute("style");
  } else {
    el.setAttribute("style", snap.inlineStyle);
  }

  // 2. Restore class string.
  if (el.className !== snap.className) {
    el.className = snap.className;
  }

  // 3. Restore parent if we re-parented.
  if (snap.parent && el.parentNode !== snap.parent) {
    try {
      snap.parent.insertBefore(el, snap.nextSibling);
    } catch {
      // Parent may be gone (route change, etc.) — best effort.
    }
  }

  elementSnapshots.delete(el);
}

/**
 * Register a portal node (clone, overlay, particle wrapper) so it gets
 * unmounted on snap-back. The node should already be in the DOM.
 */
export function registerPortal(node: HTMLElement): void {
  portalNodes.add(node);
}

/** Manually unregister + remove a portal node. */
export function unregisterPortal(node: HTMLElement): void {
  portalNodes.delete(node);
  if (node.parentNode) node.parentNode.removeChild(node);
}

/**
 * Register a cleanup callback for things that aren't DOM (animation
 * controls, event listeners, RAF handles). Called once during restoreAll.
 */
export function registerCleanup(fn: () => void): () => void {
  cleanupCallbacks.add(fn);
  return () => cleanupCallbacks.delete(fn);
}

/**
 * THE atomic snap-back operation. Idempotent. Synchronous.
 *
 * Order matters:
 *   1. Cancel EVERY animation in the document (kills compositor-layer
 *      animations that don't appear in inline style).
 *   2. Run registered cleanup callbacks (cancels listeners, RAFs, etc.).
 *   3. Unmount portal nodes (snowflakes, eyes, walking-sidebar clone).
 *   4. Restore each snapshotted element byte-for-byte.
 *   5. Schedule a follow-up cancel pass on the next animation frame —
 *      catches motion animations that were queued in the same task as our
 *      cancel (sub-pixel jitter killer).
 */
export function restoreAll(): void {
  // 1. Nuclear option — kill every animation in the document.
  cancelAllDocumentAnimations();

  // 2. Cleanup callbacks (animation controls' .stop(), RAFs, listeners).
  for (const fn of Array.from(cleanupCallbacks)) {
    try {
      fn();
    } catch {}
  }
  cleanupCallbacks.clear();

  // 3. Unmount portals.
  for (const node of Array.from(portalNodes)) {
    try {
      if (node.parentNode) node.parentNode.removeChild(node);
    } catch {}
  }
  portalNodes.clear();

  // 4. Restore every snapshotted element.
  for (const el of Array.from(elementSnapshots.keys())) {
    try {
      restoreElement(el);
    } catch {}
  }
  elementSnapshots.clear();

  // 5. Follow-up pass: motion may queue an animation in the same task as
  //    our cancel call. Re-cancel on next animation frame + at 120ms to
  //    catch anything that slipped through.
  if (typeof requestAnimationFrame !== "undefined") {
    requestAnimationFrame(() => {
      cancelAllDocumentAnimations();
    });
  }
  setTimeout(() => {
    cancelAllDocumentAnimations();
  }, 120);
}

/** For debug: how many elements + portals are currently tracked. */
export function getSnapshotStats() {
  return {
    elements: elementSnapshots.size,
    portals: portalNodes.size,
    cleanups: cleanupCallbacks.size,
  };
}
