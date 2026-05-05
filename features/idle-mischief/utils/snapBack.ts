// features/idle-mischief/utils/snapBack.ts
//
// Restoration helpers. Each act registers a "cleanup" function and
// snapBack() runs them all in parallel. Acts also use rememberOriginal()
// to track real DOM transforms so they can be reset cleanly.

const cleanups = new Set<() => void>();
const originalTransforms = new WeakMap<HTMLElement, string>();
const originalOpacity = new WeakMap<HTMLElement, string>();

export function registerCleanup(fn: () => void): () => void {
  cleanups.add(fn);
  return () => cleanups.delete(fn);
}

export function rememberTransform(el: HTMLElement) {
  if (!originalTransforms.has(el)) {
    originalTransforms.set(el, el.style.transform || "");
  }
}

export function rememberOpacity(el: HTMLElement) {
  if (!originalOpacity.has(el)) {
    originalOpacity.set(el, el.style.opacity || "");
  }
}

export function restoreTransform(el: HTMLElement) {
  const orig = originalTransforms.get(el);
  if (orig !== undefined) {
    el.style.transform = orig;
    originalTransforms.delete(el);
  }
}

export function restoreOpacity(el: HTMLElement) {
  const orig = originalOpacity.get(el);
  if (orig !== undefined) {
    el.style.opacity = orig;
    originalOpacity.delete(el);
  }
}

export function runAllCleanups() {
  for (const fn of Array.from(cleanups)) {
    try {
      fn();
    } catch {
      // never let one act's bug stop the others from cleaning up
    }
  }
  cleanups.clear();
}
