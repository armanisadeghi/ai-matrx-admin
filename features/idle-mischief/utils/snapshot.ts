// features/idle-mischief/utils/snapshot.ts
//
// THE foundation of the idle-mischief subsystem.
//
// Before any act touches a real DOM element, it MUST call snapshot(el).
// The snapshot stores the element's complete state at that exact moment:
//   - the entire inline style attribute string (verbatim, NOT per-property)
//   - bounding rect (for portals / clones / position math)
//   - parent + nextSibling (in case we re-parented the element)
//   - any class/aria/attribute changes the act may have made
//
// On snap-back we restore that snapshot byte-for-byte. The element ends up
// EXACTLY where and how it started — no per-property tracking, no drift,
// no "did we miss a property" guesses.
//
// Acts MUST also register their portal nodes (clones, overlays, snowflakes)
// so they can be unmounted in one sweep when activity returns.

const elementSnapshots = new Map<HTMLElement, ElementSnapshot>();
const portalNodes = new Set<HTMLElement>();
const cleanupCallbacks = new Set<() => void>();

interface ElementSnapshot {
  el: HTMLElement;
  /** Verbatim style attribute at snapshot time. "" if not set. */
  inlineStyle: string | null;
  /** Class string at snapshot time. */
  className: string;
  /** Original parent node (for re-parenting check). */
  parent: ParentNode | null;
  /** The next sibling so we can re-insert at the same DOM position. */
  nextSibling: Node | null;
  /** Bounding rect at snapshot time — for clones / overlays / position math. */
  rect: DOMRect;
  /** Computed transform-origin (Motion v12 sometimes mutates this). */
  transformOrigin: string;
}

/**
 * Capture the element's full state. Idempotent — calling twice on the same
 * element returns the existing snapshot so the FIRST call wins. This is
 * critical: if act A snapshots btn, then act B starts and tries to snapshot
 * the same btn (now mid-animation), we want to restore to A's clean state.
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
    transformOrigin: el.style.transformOrigin || "",
  };
  elementSnapshots.set(el, snap);
  return snap;
}

/**
 * Restore a single element to its snapshotted state. Removes its snapshot
 * after restoring so a future snapshot() captures the new baseline.
 */
export function restoreElement(el: HTMLElement) {
  const snap = elementSnapshots.get(el);
  if (!snap) return;

  // Restore the inline style attribute byte-for-byte.
  if (snap.inlineStyle === null) {
    el.removeAttribute("style");
  } else {
    el.setAttribute("style", snap.inlineStyle);
  }

  // Restore class string.
  if (el.className !== snap.className) {
    el.className = snap.className;
  }

  // Restore parent if we re-parented.
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

/** Manually unregister a portal node (e.g. natural act completion). */
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
 * The atomic snap-back operation: cancel cleanups, unmount all portals,
 * restore every snapshotted element. Synchronous and idempotent.
 */
export function restoreAll(): void {
  // 1. Run cleanup callbacks (cancel animations, detach listeners)
  for (const fn of Array.from(cleanupCallbacks)) {
    try {
      fn();
    } catch {
      // never let one cleanup's bug stop the others
    }
  }
  cleanupCallbacks.clear();

  // 2. Unmount portals
  for (const node of Array.from(portalNodes)) {
    try {
      if (node.parentNode) node.parentNode.removeChild(node);
    } catch {}
  }
  portalNodes.clear();

  // 3. Restore every snapshotted element
  for (const el of Array.from(elementSnapshots.keys())) {
    try {
      restoreElement(el);
    } catch {}
  }
  elementSnapshots.clear();
}

/** For debug: how many elements + portals are currently tracked. */
export function getSnapshotStats() {
  return {
    elements: elementSnapshots.size,
    portals: portalNodes.size,
    cleanups: cleanupCallbacks.size,
  };
}
