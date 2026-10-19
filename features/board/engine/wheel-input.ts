/**
 * Board — what a wheel event MEANS (pure).
 *
 * Browsers report a mouse wheel, a trackpad swipe and a trackpad pinch all as
 * `wheel` events. The board answers each the way that input's owners expect:
 *
 *   mouse wheel      → zoom at the cursor (Miro, Google Maps; the owner's call)
 *   trackpad swipe   → pan (every Mac canvas: Figma, FigJam, tldraw, Freeform)
 *   trackpad pinch   → zoom (the browser sends it as ctrl+wheel)
 *
 * The owner-facing knob is `WheelMode`: "auto" (above), "zoom" (every scroll
 * zooms) or "pan" (every scroll pans; ctrl/⌘ zooms — Figma's default).
 *
 * Telling a mouse from a trackpad has no API. The signals every canvas uses:
 *   - line/page delta modes only come from wheels (Firefox mice);
 *   - a trackpad produces horizontal delta and fractional or small steps;
 *   - a wheel notch is a large, whole, vertical-only step (≥ ~40px);
 * and one gesture is one device — a trackpad swipe's inertia tail has small
 * deltas that must not flip to "mouse" halfway, so a classification sticks for
 * the rest of a burst of events.
 */

export type WheelMode = "auto" | "zoom" | "pan";
export type WheelIntent = "zoom" | "pan";
export type WheelDevice = "mouse" | "trackpad";

export interface WheelSample {
  deltaX: number;
  deltaY: number;
  deltaMode: number;
  ctrlKey: boolean;
  metaKey: boolean;
  /** Event time, ms. */
  timeStamp: number;
}

/** Events closer together than this belong to one gesture. */
export const GESTURE_GAP_MS = 120;
const MOUSE_NOTCH_MIN_PX = 40;

export function classifyDevice(e: WheelSample): WheelDevice {
  if (e.deltaMode !== 0) return "mouse";
  if (e.deltaX !== 0) return "trackpad";
  const dy = Math.abs(e.deltaY);
  if (!Number.isInteger(e.deltaY)) return "trackpad";
  return dy >= MOUSE_NOTCH_MIN_PX ? "mouse" : "trackpad";
}

/** Stateful classifier: one decision per gesture burst. */
export class WheelInterpreter {
  private device: WheelDevice | null = null;
  private lastAt = -Infinity;

  constructor(public mode: WheelMode = "auto") {}

  intent(e: WheelSample): WheelIntent {
    // A pinch (or a deliberate ctrl/⌘ scroll) always zooms.
    if (e.ctrlKey || e.metaKey) return "zoom";
    if (this.mode === "zoom") return "zoom";
    if (this.mode === "pan") return "pan";
    const fresh = e.timeStamp - this.lastAt > GESTURE_GAP_MS;
    this.lastAt = e.timeStamp;
    if (fresh || this.device === null) this.device = classifyDevice(e);
    else if (this.device === "mouse" && classifyDevice(e) === "trackpad" && e.deltaX !== 0) {
      // Horizontal motion inside a "mouse" burst can only be a trackpad.
      this.device = "trackpad";
    }
    return this.device === "mouse" ? "zoom" : "pan";
  }
}

/**
 * Who a wheel event belongs to.
 *
 *   camera — the board pans / zooms (empty space; a gesture the board owns, even over a tile with
 *            its own scroll; or a pinch / ctrl-⌘-wheel anywhere — Figma: pinch always zooms).
 *   native — the element that owns the gesture scrolls itself.
 *   block  — the element that owns the gesture is at its end: nothing moves, and the scroll must
 *            not chain out to the board or the page (preventDefault).
 *   ignore — chrome and the focus layer own their input entirely.
 *
 * THE RULE (Arman, 2026-10-19): a scroll starts and ends with the thing it started with. The first
 * wheel event of a gesture picks the owner (`WheelLatch`); it never switches because one of them
 * ran out.
 */
export type WheelRoute = "camera" | "native" | "block" | "ignore";

export function routeWheel(at: {
  overChrome: boolean;
  /** Pinch, or a wheel with ctrl / ⌘ held. */
  zoomGesture: boolean;
  /** The latched owner of this gesture. */
  owner: "board" | "element";
  /** The element owner can still scroll the way this event goes. */
  elementCanScroll: boolean;
}): WheelRoute {
  if (at.overChrome) return "ignore";
  if (at.zoomGesture || at.owner === "board") return "camera";
  return at.elementCanScroll ? "native" : "block";
}

/** A wheel / trackpad gesture ends when no wheel event arrives for this long. Trackpad momentum
 * events keep arriving (gaps of ~16 ms), so momentum stays with the gesture's owner. */
export const WHEEL_GESTURE_LATCH_MS = 200;

/** True when `el` is a scroll container with room to scroll `delta` along the axis. */
export function canScrollAlong(el: HTMLElement, vertical: boolean, delta: number): boolean {
  const style = getComputedStyle(el);
  const overflow = vertical ? style.overflowY : style.overflowX;
  if (overflow !== "auto" && overflow !== "scroll") return false;
  if (vertical) return delta > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 0;
  return delta > 0 ? el.scrollLeft + el.clientWidth < el.scrollWidth - 1 : el.scrollLeft > 0;
}

/** Innermost element from `target` up to (and including) `limit` that can scroll that way. */
export function innermostScroller(
  target: HTMLElement | null,
  limit: HTMLElement,
  vertical: boolean,
  delta: number,
): HTMLElement | null {
  for (let el = target; el && el !== limit.parentElement; el = el.parentElement) {
    if (canScrollAlong(el, vertical, delta)) return el;
  }
  return null;
}

/**
 * The gesture latch: the first wheel event of a gesture picks its owner — the innermost scroller
 * under the pointer that can scroll that way, else the board — and the gesture keeps it until the
 * stream of events pauses for `WHEEL_GESTURE_LATCH_MS`.
 */
export class WheelLatch {
  private owner: HTMLElement | null = null;
  private lastAt = -Infinity;

  /** `pick` runs only when a new gesture starts. Returns the element owner, or null = the board. */
  claim(timeStamp: number, pick: () => HTMLElement | null): HTMLElement | null {
    if (timeStamp - this.lastAt > WHEEL_GESTURE_LATCH_MS) this.owner = pick();
    this.lastAt = timeStamp;
    return this.owner;
  }
}

export const WHEEL_MODE_LABEL: Record<WheelMode, string> = {
  auto: "Mouse zooms, trackpad pans",
  zoom: "Scroll always zooms",
  pan: "Scroll always pans",
};
