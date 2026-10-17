/**
 * Show a person what they just inserted: focus moves to it and it flashes
 * (`.matrx-insert-flash` in app/globals.css).
 *
 *   - Text in a textarea: the inserted range is selected and the field flashes.
 *   - Anything that renders as elements (a chip in the rich editor, a new
 *     content block): the elements that appear inside `container` within a
 *     moment are flashed and the first is scrolled into view.
 */

const FLASH_CLASS = "matrx-insert-flash";
const FLASH_MS = 1900;
const WATCH_MS = 700;

/** Flash one element (a message just added, a block just opened). */
export function flashElement(element: Element) {
  flash(element);
}

function flash(element: Element) {
  element.classList.remove(FLASH_CLASS);
  // Restart the animation when the same element flashes twice in a row.
  void (element as HTMLElement).offsetWidth;
  element.classList.add(FLASH_CLASS);
  window.setTimeout(() => element.classList.remove(FLASH_CLASS), FLASH_MS);
}

/** The range that changed between two texts (start, end in `after`). */
export function changedRange(before: string, after: string): { start: number; end: number } | null {
  if (before === after) return null;
  let start = 0;
  const max = Math.min(before.length, after.length);
  while (start < max && before[start] === after[start]) start += 1;
  let tail = 0;
  while (
    tail < before.length - start &&
    tail < after.length - start &&
    before[before.length - 1 - tail] === after[after.length - 1 - tail]
  ) {
    tail += 1;
  }
  return { start, end: after.length - tail };
}

/** Select what was inserted into a textarea and flash the field. */
export function flashTextareaRange(textarea: HTMLTextAreaElement, range: { start: number; end: number }) {
  requestAnimationFrame(() => {
    if (!textarea.isConnected) return;
    textarea.focus({ preventScroll: true });
    // Leading/trailing newlines are layout, not the thing inserted.
    const value = textarea.value;
    let { start, end } = range;
    while (start < end && /\s/.test(value[start] ?? "")) start += 1;
    while (end > start && /\s/.test(value[end - 1] ?? "")) end -= 1;
    textarea.setSelectionRange(start, end);
    flash(textarea);
  });
}

/**
 * Flash the elements that appear in `container` right after an insert. Small
 * additions only: an element taller than most of the container is a re-render
 * of the whole document, not the thing inserted.
 */
export function flashNewElements(container: HTMLElement | null) {
  if (!container || typeof MutationObserver === "undefined") return;
  let scrolled = false;
  const observer = new MutationObserver((records) => {
    const added: Element[] = [];
    for (const record of records) {
      record.addedNodes.forEach((node) => {
        if (node instanceof Element) added.push(node);
      });
    }
    if (added.length === 0) return;
    requestAnimationFrame(() => {
      const limit = Math.max(container.getBoundingClientRect().height * 0.6, 48);
      const targets = added.filter((el) => {
        if (!el.isConnected || added.some((other) => other !== el && other.contains(el))) return false;
        const height = el.getBoundingClientRect().height;
        return height > 0 && height < limit;
      });
      targets.forEach(flash);
      if (!scrolled && targets[0]) {
        scrolled = true;
        targets[0].scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    });
  });
  observer.observe(container, { childList: true, subtree: true });
  window.setTimeout(() => observer.disconnect(), WATCH_MS);
}

/**
 * Run an insert and show its result: in a textarea the inserted text is
 * selected and the field flashes; anywhere else the new elements under
 * `container` flash and `focusEditor` puts the caret back in the editor.
 */
export function showInsertion({
  run,
  before,
  textarea,
  container,
  focusEditor,
}: {
  run: () => unknown;
  /** The field's text before the insert. */
  before: string;
  /** The showing textarea, if the insert lands in one. */
  textarea: HTMLTextAreaElement | null;
  container: HTMLElement | null;
  focusEditor?: () => void;
}) {
  const field = textarea && textarea.isConnected ? textarea : null;
  if (!field) flashNewElements(container);
  void Promise.resolve(run()).then(() => {
    if (field) {
      // Two frames: the controlled field takes its new value on the next render.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const range = changedRange(before, field.value);
          if (range) flashTextareaRange(field, range);
        }),
      );
    } else {
      focusEditor?.();
    }
  });
}
