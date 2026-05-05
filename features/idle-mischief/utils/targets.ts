// features/idle-mischief/utils/targets.ts
//
// Pure DOM target discovery. No React, no Redux. Acts use these to find
// real UI elements to play with. All filters are tolerant of unusual
// browser/iframe states (zero viewport, scrolled regions).

export interface TargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function isInViewport(el: Element): boolean {
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return false;
  const vw = window.innerWidth || document.documentElement.clientWidth || 0;
  const vh = window.innerHeight || document.documentElement.clientHeight || 0;
  if (vw === 0 || vh === 0) return true;
  if (r.bottom < 0 || r.top > vh) return false;
  if (r.right < 0 || r.left > vw) return false;
  return true;
}

function isVisible(el: Element): boolean {
  const style = window.getComputedStyle(el as HTMLElement);
  if (style.visibility === "hidden") return false;
  if (style.display === "none") return false;
  if (parseFloat(style.opacity || "1") < 0.05) return false;
  return true;
}

export function findSidebar(): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    "[data-mischief-sidebar], aside.shell-sidebar",
  );
}

/** Sidebar in this app collapses to a narrow rail; treat <80px as "closed". */
export function isSidebarOpen(sidebar: HTMLElement | null): boolean {
  if (!sidebar) return false;
  return sidebar.offsetWidth >= 80;
}

export function findWindowEls(): HTMLElement[] {
  const els = Array.from(
    document.querySelectorAll<HTMLElement>("[data-mischief-window]"),
  );
  return els.filter(isVisible);
}

/**
 * All visible buttons on the page. Random sample up to `limit`. Falls back
 * to "any visible" if viewport filtering wipes everything.
 */
export function findButtons(limit = 10): HTMLElement[] {
  const all = Array.from(
    document.querySelectorAll<HTMLElement>("button:not([disabled])"),
  );
  let visible = all.filter((b) => isInViewport(b) && isVisible(b));
  if (visible.length === 0) visible = all.filter((b) => isVisible(b));
  const shuffled = visible.slice().sort(() => Math.random() - 0.5);
  return shuffled.slice(0, limit);
}

/**
 * Visible buttons in document order — for sequenced effects like Roll Call
 * where ordering matters. NOT randomized.
 */
export function findButtonsInOrder(limit = 30): HTMLElement[] {
  const all = Array.from(
    document.querySelectorAll<HTMLElement>("button:not([disabled])"),
  );
  let visible = all.filter((b) => isInViewport(b) && isVisible(b));
  if (visible.length === 0) visible = all.filter((b) => isVisible(b));
  return visible.slice(0, limit);
}

/**
 * Small visible square-ish elements suitable for "icon" effects: things
 * that look like icons (sidebar nav buttons, header icons). Keeps anything
 * roughly square and < 80px on either dimension.
 */
export function findIconLikeElements(limit = 30): HTMLElement[] {
  const all = Array.from(
    document.querySelectorAll<HTMLElement>(
      "button, a, [role='button'], [role='menuitem']",
    ),
  );
  const visible = all.filter((el) => {
    if (!isVisible(el)) return false;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    if (r.width > 80 || r.height > 80) return false;
    // Aspect ratio close to square
    const aspect = r.width / r.height;
    if (aspect < 0.5 || aspect > 2) return false;
    return true;
  });
  return visible.slice(0, limit);
}

export function findSidebarIcons(limit = 6): HTMLElement[] {
  const sidebar = findSidebar();
  if (!sidebar) return [];
  const svgs = Array.from(sidebar.querySelectorAll<SVGElement>("svg"));
  const visible = svgs.filter(
    (s) => isInViewport(s) && isVisible(s),
  ) as unknown as HTMLElement[];
  return visible.slice(0, limit);
}

export function rectOf(el: Element): TargetRect {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, width: r.width, height: r.height };
}
