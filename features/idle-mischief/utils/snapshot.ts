// features/idle-mischief/utils/snapshot.ts
//
// THE foundation of the idle-mischief subsystem.
//
// THE GOLDEN RULE: a real DOM element MUST be returned to its EXACT
// pre-mischief state when the user returns. No drift. No stuck transforms.
// No "settled in a different spot."
//
// How we achieve that:
//   1. snapshot(el)         — store the entire `style` attribute string
//                             verbatim, plus className/parent/nextSibling/
//                             rect. NEVER per property. Idempotent — first
//                             call wins.
//   2. registerPortal(node) — track clones/overlays so they get unmounted.
//   3. registerCleanup(fn)  — non-DOM cleanup (RAF handles, listeners).
//   4. restoreAll()         — atomic sweep:
//                                a) run cleanup callbacks (which call
//                                   controls.stop() on motion handles)
//                                b) unmount portal nodes
//                                c) restore each element's snapshot
//                                   byte-for-byte; per-element subtree
//                                   animation cancel as a belt
//
// What we DELIBERATELY do NOT do:
//   - We do NOT cancel `document.getAnimations()` globally. That kills
//     legitimate page animations (CSS hover transitions, focus indicators,
//     third-party libraries) and leaves the page in a worse state than the
//     mischief itself.
//   - We do NOT animate real elements directly. Acts MUST use cloneAndHide()
//     for any visible animation; the real element only ever has
//     `visibility: hidden` set on it (and that's reverted byte-for-byte
//     by the snapshot restore). See utils/cloning.ts.

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
 * Cancel WAAPI animations on `el` and its descendants. Surgical — only
 * touches the element we're about to restore, so legitimate page animations
 * elsewhere are untouched.
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
 * Restore a single element to its snapshotted state. Cancels any
 * animations on the element + its subtree FIRST, then puts every byte
 * back, then deletes the snapshot.
 */
export function restoreElement(el: HTMLElement) {
  const snap = elementSnapshots.get(el);
  if (!snap) return;

  // 0. Kill any WAAPI animation on this element + subtree.
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

  // 4. Clean up the mischief marker (cloning.ts adds it on hidden originals).
  el.removeAttribute("data-mischief-original");

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
 *   1. Run registered cleanup callbacks (cancels listeners, RAFs, motion
 *      `controls.stop()`).
 *   2. Unmount portal nodes (clones, overlays, particles). Removing a
 *      detached element drops any animations that were running on it.
 *   3. Restore each snapshotted element byte-for-byte (and cancel its
 *      subtree animations as a belt).
 *   4. Sledgehammer sweep — scan the document for ANY element tagged
 *      with `data-mischief-clone` (orphan clones) or `data-mischief-original`
 *      (originals whose snapshot somehow didn't restore). Clean them up
 *      no matter what.
 *
 * Step 4 makes snap-back GUARANTEED idempotent at the document level. If
 * step 1-3 missed anything (race, exception, registry corruption), the
 * sweep catches it.
 */
export interface RestoreStats {
  cleanups: number;
  portals: number;
  snapshots: number;
  sweptClones: number;
  sweptOriginals: number;
}

export function restoreAll(): RestoreStats {
  const stats: RestoreStats = {
    cleanups: 0,
    portals: 0,
    snapshots: 0,
    sweptClones: 0,
    sweptOriginals: 0,
  };

  // 1. Cleanup callbacks (motion controls, RAFs, listeners).
  for (const fn of Array.from(cleanupCallbacks)) {
    try {
      fn();
      stats.cleanups++;
    } catch {}
  }
  cleanupCallbacks.clear();

  // 2. Unmount portals.
  for (const node of Array.from(portalNodes)) {
    try {
      if (node.parentNode) {
        node.parentNode.removeChild(node);
        stats.portals++;
      }
    } catch {}
  }
  portalNodes.clear();

  // 3. Restore every snapshotted element.
  for (const el of Array.from(elementSnapshots.keys())) {
    try {
      restoreElement(el);
      stats.snapshots++;
    } catch {}
  }
  elementSnapshots.clear();

  // 4. SLEDGEHAMMER — scan the entire document for orphan clones / hidden
  //    originals. This is the safety net for any case where the registry
  //    path failed: a thrown exception during cloneAndHide that left the
  //    DOM modified but snapshot uncaptured, a route change that orphaned
  //    a node, etc. Tagged attributes mean we can find them no matter what.
  if (typeof document !== "undefined") {
    // 4a. Remove every clone in the document.
    document.querySelectorAll<HTMLElement>("[data-mischief-clone]").forEach(
      (clone) => {
        try {
          if (clone.parentNode) {
            clone.parentNode.removeChild(clone);
            stats.sweptClones++;
          }
        } catch {}
      },
    );
    // 4b. Force-revert visibility on every tagged original. We blow away
    //     the visibility/pointer-events styles directly. setProperty with
    //     empty string removes the property; if neither was inline-set,
    //     this is a no-op.
    document
      .querySelectorAll<HTMLElement>("[data-mischief-original]")
      .forEach((el) => {
        try {
          el.style.visibility = "";
          el.style.pointerEvents = "";
          el.removeAttribute("data-mischief-original");
          stats.sweptOriginals++;
        } catch {}
      });
  }

  // Surface stats for devtools-driven debugging.
  if (typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>).__mischiefLastRestore =
      stats;
  }

  return stats;
}

/** For debug: how many elements + portals are currently tracked. */
export function getSnapshotStats() {
  return {
    elements: elementSnapshots.size,
    portals: portalNodes.size,
    cleanups: cleanupCallbacks.size,
  };
}
