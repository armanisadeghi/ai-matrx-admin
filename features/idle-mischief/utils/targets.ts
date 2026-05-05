// features/idle-mischief/utils/targets.ts
//
// Pure DOM target discovery. No React, no Redux. Acts use these to find
// real UI elements to play with.

export interface TargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function isInViewport(el: Element): boolean {
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return false;
  // If we somehow get a 0-size viewport (some headless / iframe envs), don't
  // filter on edges — we'd reject everything.
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

export function findWindowEls(): HTMLElement[] {
  const els = Array.from(
    document.querySelectorAll<HTMLElement>("[data-mischief-window]"),
  );
  return els.filter(isVisible);
}

export function findButtons(limit = 10): HTMLElement[] {
  const all = Array.from(
    document.querySelectorAll<HTMLElement>("button:not([disabled])"),
  );
  let visible = all.filter((b) => isInViewport(b) && isVisible(b));
  // Fallback: if viewport filtering wiped everything out (rare, e.g. body
  // mid-resize, hidden test runners), accept any non-disabled buttons. The
  // animations are forgiving — better to play on something than nothing.
  if (visible.length === 0) {
    visible = all.filter((b) => isVisible(b));
  }
  const shuffled = visible.slice().sort(() => Math.random() - 0.5);
  return shuffled.slice(0, limit);
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
