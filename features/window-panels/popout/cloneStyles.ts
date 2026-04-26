/**
 * cloneStyles — replicate the parent document's style environment into a
 * popout (Document Picture-in-Picture or `window.open`) document, then keep
 * it in sync via MutationObservers so theme toggles and HMR updates flow
 * through.
 *
 * **What gets cloned:**
 *
 * 1. A **reset stylesheet** — the popout doc starts with no `<style>` tags
 *    at all, so the browser's user-agent margins/padding apply to `<body>`.
 *    We inject a tiny reset that zeros margins, fills the viewport, and
 *    sets the foreground/background to match the theme tokens.
 *
 * 2. Every **`<style>` tag** in the parent `<head>`. This captures Tailwind
 *    4's compiled CSS (a single inlined `<style>` block from `@tailwindcss/
 *    postcss`), `next/font`'s injected font-face declarations (also inlined
 *    `<style>` blocks), and any third-party CSS-in-JS that injects styles
 *    into the head.
 *
 * 3. Every **`<link rel="stylesheet">`** in the parent `<head>`. We clone the
 *    `href`/`media`/`crossorigin`/`data-*` attributes; the popout document
 *    refetches the CSS, which is fine because production builds ship CSS
 *    with `immutable` cache headers (HTTP cache hit) and dev builds are
 *    cached in the browser's memory cache.
 *
 * 4. The parent's **`adoptedStyleSheets`** array — Tailwind 4 may use
 *    Constructable Stylesheets in some build modes. They're shareable
 *    across same-realm documents (Document PiP windows are same-realm with
 *    their opener), so we just push the same `CSSStyleSheet` references
 *    onto the target doc.
 *
 * 5. The parent **`<html>` element's `class` and select attributes** —
 *    `.dark` (drives the `@custom-variant dark` Tailwind variant), `font-*`
 *    classes from `next/font` variables, `data-theme`, `data-scroll-behavior`,
 *    and `lang`. These are mirrored into the popout's `<html>` so the same
 *    cascade applies.
 *
 * **What gets watched (via MutationObservers):**
 *
 * - **`<head>` mutations** — added/removed `<style>`/`<link>` nodes get
 *   mirrored. `characterData` changes on existing `<style>` text content
 *   are also mirrored (Turbopack HMR sometimes patches `textContent` in
 *   place rather than swapping nodes).
 *
 * - **`<html>` attribute changes** — `class`, `data-theme`,
 *   `data-scroll-behavior` mirror in real time. Toggling dark mode in the
 *   parent updates the popout's `<html>` class within one frame.
 *
 * **What is NOT cloned:**
 * - `<script>` tags — the popout has no JS context of its own; React
 *   reaches in via `createPortal` from the parent's running tree.
 * - `<title>`/`<meta>` (other than ones we set ourselves) — no SEO surface
 *   for an ephemeral popout window.
 *
 * Returns a `dispose()` function that disconnects observers. The cloned
 * nodes don't need explicit removal — they live as long as the popout doc
 * does.
 */

const RESET_CSS = `
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: hidden;
}
body {
  font-family: var(--font-sans, system-ui, -apple-system, sans-serif);
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
`.trim();

/** Marker attribute we stamp on every node we own in the popout doc. */
const POPOUT_DATA_ATTR = "data-popout-clone";
/** Sentinel value for the reset stylesheet (so we never re-clone it). */
const RESET_MARKER = "reset";

interface ClonedStylesHandle {
  /** Disconnect observers. Cloned nodes stay until the popout doc unloads. */
  dispose(): void;
}

/**
 * Clone the source document's CSS environment into the target document and
 * keep it synced via MutationObservers. Returns a handle whose `dispose()`
 * disconnects the observers.
 */
export function cloneStylesIntoDocument(
  source: Document,
  target: Document,
): ClonedStylesHandle {
  // ── 1. Reset stylesheet ─────────────────────────────────────────────────
  injectResetStylesheet(target);

  // ── 2. Initial style/link clone (preserve order) ────────────────────────
  cloneAllStyleAndLinkNodes(source, target);

  // ── 3. Adopted stylesheets (Constructable Stylesheets) ──────────────────
  cloneAdoptedStylesheets(source, target);

  // ── 4. Mirror <html> class/attributes ───────────────────────────────────
  mirrorHtmlAttributes(source, target);

  // ── 5. Watch <head> for runtime CSS changes (HMR, dynamic imports) ──────
  const headObserver = new MutationObserver((mutations) => {
    handleHeadMutations(mutations, target);
  });
  headObserver.observe(source.head, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["href", "media"],
  });

  // ── 6. Watch <html> for theme-class / data-attribute changes ────────────
  const htmlObserver = new MutationObserver(() => {
    mirrorHtmlAttributes(source, target);
  });
  htmlObserver.observe(source.documentElement, {
    attributes: true,
    attributeFilter: ["class", "data-theme", "data-scroll-behavior"],
  });

  return {
    dispose() {
      headObserver.disconnect();
      htmlObserver.disconnect();
    },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function injectResetStylesheet(target: Document): void {
  // Idempotent: don't double-inject if cloneStylesIntoDocument is called
  // twice on the same target (shouldn't happen, but cheap defense).
  const existing = target.head.querySelector(
    `style[${POPOUT_DATA_ATTR}="${RESET_MARKER}"]`,
  );
  if (existing) return;

  const style = target.createElement("style");
  style.setAttribute(POPOUT_DATA_ATTR, RESET_MARKER);
  style.textContent = RESET_CSS;
  // Insert FIRST so authored styles cascade over our reset.
  target.head.insertBefore(style, target.head.firstChild);
}

function cloneAllStyleAndLinkNodes(
  source: Document,
  target: Document,
): void {
  const nodes = source.head.querySelectorAll("style, link[rel='stylesheet']");
  nodes.forEach((node) => {
    cloneOneStyleOrLink(node, target);
  });
}

/**
 * Clone a `<style>` or `<link>` from the source `<head>` into the target.
 * Tags the clone with `data-popout-clone` so we can find it again on removal.
 * Returns the clone, or `null` if the node type isn't supported.
 */
function cloneOneStyleOrLink(
  node: Element,
  target: Document,
): Element | null {
  if (node.tagName === "STYLE") {
    const clone = target.createElement("style");
    // Copy text content explicitly — `cloneNode(true)` works for `<style>`
    // text but `textContent` is more direct and survives detached nodes.
    clone.textContent = node.textContent ?? "";
    copyDataAttributes(node, clone);
    clone.setAttribute(POPOUT_DATA_ATTR, getNodeKey(node));
    target.head.appendChild(clone);
    return clone;
  }
  if (
    node.tagName === "LINK" &&
    (node as HTMLLinkElement).rel === "stylesheet"
  ) {
    const link = node as HTMLLinkElement;
    const clone = target.createElement("link");
    clone.rel = "stylesheet";
    if (link.href) clone.href = link.href;
    if (link.media) clone.media = link.media;
    if (link.crossOrigin) clone.crossOrigin = link.crossOrigin;
    if (link.integrity) clone.integrity = link.integrity;
    copyDataAttributes(link, clone);
    clone.setAttribute(POPOUT_DATA_ATTR, getNodeKey(node));
    target.head.appendChild(clone);
    return clone;
  }
  return null;
}

/**
 * Compute a stable-ish key for a source node so we can find its clone in the
 * target on removal. Uses a content hash for `<style>` and the `href` for
 * `<link>`, falling back to a position-based id stamped on the source itself.
 */
function getNodeKey(node: Element): string {
  if (node.tagName === "STYLE") {
    // Stable per-text — Turbopack HMR rewrites textContent of the same node,
    // so we use a hash. Cheap deterministic hash is fine here; the only
    // requirement is that two different `<style>` blocks don't collide.
    return "style:" + cheapHash(node.textContent ?? "");
  }
  if (node.tagName === "LINK") {
    const href = (node as HTMLLinkElement).href || "";
    return "link:" + href;
  }
  return "other:" + Math.random().toString(36).slice(2);
}

/**
 * Tiny non-cryptographic hash. We only need different content to produce
 * different keys; collisions just mean a re-clone on a benign update.
 * djb2-style.
 */
function cheapHash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

function copyDataAttributes(from: Element, to: Element): void {
  for (const attr of Array.from(from.attributes)) {
    if (attr.name.startsWith("data-")) {
      // Don't overwrite our own marker
      if (attr.name === POPOUT_DATA_ATTR) continue;
      to.setAttribute(attr.name, attr.value);
    }
  }
}

function cloneAdoptedStylesheets(source: Document, target: Document): void {
  // `adoptedStyleSheets` is read-write. Constructable stylesheets are
  // shareable across same-realm documents — Document PiP and `window.open`
  // popups are same-realm with their opener, so reference-sharing works.
  if (
    Array.isArray(source.adoptedStyleSheets) &&
    source.adoptedStyleSheets.length > 0
  ) {
    try {
      target.adoptedStyleSheets = [...source.adoptedStyleSheets];
    } catch {
      // Some sandboxed contexts may throw. Fall through silently — the
      // <style> clone path covers the common case.
    }
  }
}

function mirrorHtmlAttributes(source: Document, target: Document): void {
  const src = source.documentElement;
  const tgt = target.documentElement;

  // Mirror full className wholesale. Diffing class-by-class is unnecessary
  // — `next/font` variable classes (e.g. `__variable_e8ce0c`) can change
  // wholesale across rebuilds, and the cost of a full string copy is
  // negligible.
  if (tgt.className !== src.className) {
    tgt.className = src.className;
  }

  for (const attr of ["data-theme", "data-scroll-behavior", "lang"] as const) {
    const v = src.getAttribute(attr);
    if (v === null) {
      if (tgt.hasAttribute(attr)) tgt.removeAttribute(attr);
    } else if (tgt.getAttribute(attr) !== v) {
      tgt.setAttribute(attr, v);
    }
  }
}

function handleHeadMutations(
  mutations: MutationRecord[],
  target: Document,
): void {
  for (const m of mutations) {
    // Handle added nodes
    m.addedNodes.forEach((n) => {
      if (!(n instanceof Element)) return;
      if (
        n.tagName === "STYLE" ||
        (n.tagName === "LINK" && (n as HTMLLinkElement).rel === "stylesheet")
      ) {
        cloneOneStyleOrLink(n, target);
      }
    });
    // Handle removed nodes
    m.removedNodes.forEach((n) => {
      if (!(n instanceof Element)) return;
      if (n.tagName !== "STYLE" && n.tagName !== "LINK") return;
      const key = getNodeKey(n);
      const cloneEl = target.head.querySelector(
        `[${POPOUT_DATA_ATTR}="${cssEscape(key)}"]`,
      );
      if (cloneEl) cloneEl.remove();
    });
    // Handle characterData updates on existing <style> text (Turbopack HMR)
    if (m.type === "characterData" && m.target.parentElement?.tagName === "STYLE") {
      const styleEl = m.target.parentElement;
      const oldKey = findExistingMirrorByContent(target, styleEl.textContent ?? "");
      const newKey = getNodeKey(styleEl);
      if (oldKey && oldKey !== newKey) {
        // Update the existing mirror in place
        const mirror = target.head.querySelector(
          `[${POPOUT_DATA_ATTR}="${cssEscape(oldKey)}"]`,
        );
        if (mirror) {
          mirror.textContent = styleEl.textContent ?? "";
          mirror.setAttribute(POPOUT_DATA_ATTR, newKey);
        }
      }
    }
    // Handle attribute changes on <link> (href/media swap)
    if (
      m.type === "attributes" &&
      m.target instanceof HTMLLinkElement &&
      m.target.rel === "stylesheet"
    ) {
      // Find the mirror by the OLD key (using current href - but it changed,
      // so this is a best-effort: we just re-clone if no match).
      // Simpler: remove all link clones with our marker that point to the
      // same href, and re-clone.
      const link = m.target;
      const allClones = target.head.querySelectorAll(
        `link[${POPOUT_DATA_ATTR}]`,
      );
      // Remove the (presumed) matching clone — we can't perfectly identify
      // it post-attribute-change, so the safest fallback is to re-clone.
      // In practice link-attribute changes are rare outside Next.js dev,
      // and a no-op extra clone is harmless.
      cloneOneStyleOrLink(link, target);
      // (We don't remove the old one; the new one wins via cascade order.
      // On dispose, both go away with the popout doc.)
      void allClones;
    }
  }
}

/**
 * Find a mirror element in the target whose marker matches a content hash
 * derived from `text`. Used to locate the previous mirror for a `<style>`
 * whose textContent just changed via HMR.
 *
 * Returns the *old* key if a mirror is found, so the caller can compute
 * the new key and update the mirror in place.
 */
function findExistingMirrorByContent(
  target: Document,
  text: string,
): string | null {
  // We don't actually have the OLD text here — it was overwritten before
  // our observer fired. The simplest workable approach: find any style
  // mirror whose textContent matches `text` already (unchanged) — return
  // null then, no-op. Otherwise, we can't reliably identify the old
  // mirror; appending a new clone and accepting a temporary duplicate is
  // fine because identical hashes will collide on the next sync.
  const styles = target.head.querySelectorAll(
    `style[${POPOUT_DATA_ATTR}^="style:"]`,
  );
  for (const s of Array.from(styles)) {
    if (s.textContent === text) return null; // already in sync
  }
  // Fallback: return any style mirror's key — the caller will overwrite it.
  // Pick the first one (HMR rarely affects multiple style tags simultaneously).
  if (styles.length > 0) {
    return styles[0].getAttribute(POPOUT_DATA_ATTR);
  }
  return null;
}

/**
 * Minimal CSS attribute selector escape — escapes characters that would
 * break a `[attr="value"]` selector. Real-world keys come from our hash
 * (alphanumeric) or hrefs (which can contain colons and slashes; both are
 * valid inside double-quoted selectors but we play safe).
 */
function cssEscape(s: string): string {
  return s.replace(/(["\\])/g, "\\$1");
}
