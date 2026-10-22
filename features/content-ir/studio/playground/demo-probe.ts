/**
 * The DOM half of a shape's live test: what a mounted shape actually drew. Shared by the Shape
 * Playground's demo cards and the headless shape preview (/shape-preview) so both judge a render
 * the same way; the verdict itself is `judgeDemo` in ./demo-health.
 */
import type { CapturedError } from "@/lib/diagnostics/errorCaptureStore";
import { imageProbe, type DemoProbe } from "./demo-health";

export type RenderMode = "frame" | "page";

export function errorMentions(entry: CapturedError, slug: string): boolean {
  if (entry.message.includes(slug)) return true;
  if (entry.relation?.includes(slug)) return true;
  const raw = entry.raw as { kind?: unknown } | undefined;
  return raw?.kind === slug;
}

/** The error state every kit media piece renders (`role="alert"` inside its `data-kind-*` root). */
export const MEDIA_PIECE_ERROR_SELECTOR = [
  "data-kind-image",
  "data-kind-video",
  "data-kind-audio",
  "data-kind-embed",
  "data-kind-file",
]
  .map((attr) => `[${attr}] [role="alert"]`)
  .join(", ");

export function probeBox(host: HTMLElement, mode: RenderMode): Omit<DemoProbe, "errors" | "ageMs"> {
  const frame = host.querySelector("iframe");
  // Frame mode with no frame yet (the setting is loading or refused): nothing rendered.
  if (mode === "frame" && !frame) return { height: 0, standIns: null, images: null };
  if (mode === "frame" && frame) {
    // A frame that never spoke shows its placeholder height — that is not a render.
    const heard = frame.getAttribute("data-matrx-kind-sandbox-heard") === "true";
    // Still starting by the frame's own clock (document loading, or loaded and not yet answered):
    // not a render, and not a failure yet either — the frame says "silent" when it gives up.
    const state = frame.getAttribute("data-matrx-kind-sandbox-state");
    const starting = !heard && (state === "starting" || state === "loaded");
    return { height: heard ? frame.getBoundingClientRect().height : 0, standIns: null, images: null, starting };
  }
  const shell = host.firstElementChild as HTMLElement | null;
  // The kind's loading placeholder (body or libraries still arriving) is not a render.
  const loading = host.querySelector("[data-kind-loading]") !== null;
  const height = shell && !loading ? shell.getBoundingClientRect().height - 8 : 0;
  const hostRect = host.getBoundingClientRect();
  const images = { total: 0, broken: 0, cropped: 0, upscaled: 0 };
  host.querySelectorAll<HTMLImageElement | HTMLVideoElement>("img, video").forEach((img) => {
    const box = img.getBoundingClientRect();
    let left = box.left;
    let top = box.top;
    let right = box.right;
    let bottom = box.bottom;
    for (let el = img.parentElement; el && el !== host; el = el.parentElement) {
      const style = getComputedStyle(el);
      if (style.overflowX !== "visible" || style.overflowY !== "visible") {
        const r = el.getBoundingClientRect();
        left = Math.max(left, r.left);
        top = Math.max(top, r.top);
        right = Math.min(right, r.right);
        bottom = Math.min(bottom, r.bottom);
      }
    }
    right = Math.min(right, hostRect.right);
    const media =
      img instanceof HTMLVideoElement
        ? { naturalWidth: img.videoWidth, naturalHeight: img.videoHeight, complete: img.readyState >= 1 }
        : {
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            complete: img.complete,
            vector: /^data:image\/svg|\.svg(?:[?#]|$)/i.test(img.currentSrc || img.src),
          };
    // A video poster (data-matrx-poster) fills its player's box by design: judged whole or broken, never cropped.
    const poster = img.hasAttribute("data-matrx-poster");
    const verdict = imageProbe(
      media,
      { width: box.width, height: box.height },
      poster ? "contain" : getComputedStyle(img).objectFit,
      { width: Math.max(0, right - left), height: Math.max(0, bottom - top) },
    );
    if (verdict === "loading") return;
    images.total += 1;
    if (verdict === "broken") images.broken += 1;
    if (verdict === "cropped") images.cropped += 1;
    if (verdict === "upscaled") images.upscaled += 1;
  });
  // A kit media piece that gave up (KindImage/KindVideo/KindAudio/KindEmbed/KindFile) shows its
  // refusal in a role=alert and draws no <img>, so the loop above never sees it: count it broken.
  const failedPieces = host.querySelectorAll(MEDIA_PIECE_ERROR_SELECTOR).length;
  images.total += failedPieces;
  images.broken += failedPieces;
  return { height, standIns: host.querySelectorAll("[data-unresolved-import]").length, images };
}

/** How far the drawn content runs past the box or the window sideways (sideways scroll), px. */
export function overflowPx(host: HTMLElement): number {
  const inBox = host.scrollWidth - host.clientWidth;
  const inWindow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
  return Math.max(0, Math.round(Math.max(inBox, inWindow)));
}
