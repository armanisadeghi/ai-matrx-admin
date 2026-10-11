/**
 * The live test each playground demo runs on itself. Pure: the probes (DOM
 * size, stand-in chips, images, captured errors) are gathered by the card and
 * judged here, so the verdict is testable without a browser.
 */

export type CheckStatus = "pass" | "fail" | "pending" | "na";

export interface DemoProbe {
  /** Rendered height of the shape's box, px. Null before the first measure. */
  height: number | null;
  /** Unresolved-import stand-in chips found in the box (null when the box is a frame). */
  standIns: number | null;
  /** Images in the box (null when the box is a frame and cannot be inspected). */
  images: { total: number; broken: number; cropped: number } | null;
  /** Errors captured for this demo's kind since it mounted. */
  errors: string[];
  /** Ms since mount — checks wait a moment before failing on "nothing rendered". */
  ageMs: number;
}

export interface DemoCheck {
  id: "rendered" | "errors" | "imports" | "images";
  label: string;
  status: CheckStatus;
  detail: string | null;
}

/** Smallest box that counts as "rendered" (the shell's own gutter is 8px). */
export const MIN_RENDERED_PX = 24;
/** How long a demo may take to paint before "not rendered" is a failure. */
export const RENDER_GRACE_MS = 8_000;

export function judgeDemo(probe: DemoProbe): { checks: DemoCheck[]; verdict: CheckStatus } {
  const rendered: DemoCheck =
    probe.height !== null && probe.height >= MIN_RENDERED_PX
      ? { id: "rendered", label: "Rendered", status: "pass", detail: `${Math.round(probe.height)}px` }
      : {
          id: "rendered",
          label: "Rendered",
          status: probe.ageMs >= RENDER_GRACE_MS ? "fail" : "pending",
          detail: probe.height === null ? null : `${Math.round(probe.height)}px`,
        };
  const errors: DemoCheck =
    probe.errors.length === 0
      ? { id: "errors", label: "No errors", status: "pass", detail: null }
      : { id: "errors", label: "No errors", status: "fail", detail: probe.errors[0] };
  const imports: DemoCheck =
    probe.standIns === null
      ? { id: "imports", label: "Imports", status: "na", detail: "In frame" }
      : probe.standIns === 0
        ? { id: "imports", label: "Imports", status: "pass", detail: null }
        : { id: "imports", label: "Imports", status: "fail", detail: `${probe.standIns} not found` };
  let images: DemoCheck;
  if (probe.images === null) images = { id: "images", label: "Images", status: "na", detail: "In frame" };
  else if (probe.images.total === 0) images = { id: "images", label: "Images", status: "na", detail: "None" };
  else if (probe.images.broken + probe.images.cropped === 0)
    images = { id: "images", label: "Images", status: "pass", detail: `${probe.images.total} whole` };
  else
    images = {
      id: "images",
      label: "Images",
      status: "fail",
      detail: [
        probe.images.broken ? `${probe.images.broken} broken` : null,
        probe.images.cropped ? `${probe.images.cropped} cropped` : null,
      ]
        .filter(Boolean)
        .join(", "),
    };
  const checks = [rendered, errors, imports, images];
  const verdict: CheckStatus = checks.some((c) => c.status === "fail")
    ? "fail"
    : checks.some((c) => c.status === "pending")
      ? "pending"
      : "pass";
  return { checks, verdict };
}

/**
 * Is this image shown whole? Broken when it never decoded; cropped when the box
 * it is drawn in cuts it (object-fit cover at another ratio) or a clipping
 * ancestor inside the shape hides part of it.
 */
export function imageProbe(
  img: { naturalWidth: number; naturalHeight: number; complete: boolean },
  box: { width: number; height: number },
  objectFit: string,
  visible: { width: number; height: number },
): "ok" | "broken" | "cropped" | "loading" {
  if (!img.complete) return "loading";
  if (img.naturalWidth === 0 || img.naturalHeight === 0) return "broken";
  if (box.width === 0 || box.height === 0) return "cropped";
  const natural = img.naturalWidth / img.naturalHeight;
  const drawn = box.width / box.height;
  if (objectFit === "cover" && Math.abs(drawn - natural) / natural > 0.02) return "cropped";
  if (visible.width + 1 < box.width || visible.height + 1 < box.height) return "cropped";
  return "ok";
}
