/**
 * defaultTraySnapshotCapture — the fleet-wide fallback `captureTraySnapshot`.
 *
 * Any window WITHOUT a custom `renderTrayPreview` gets this capture so its
 * minimized card shows a representative image of the actual body instead of
 * the generic placeholder. Windows with a semantic preview keep it (better
 * fidelity at zero render cost) and never pay for a capture.
 *
 * Performance contract (do not weaken any of these when editing):
 *  - Runs exactly ONCE per minimize, against the briefly retained offscreen
 *    body, inside WindowPanel's existing timeout race. No polling, no
 *    network, no persistent storage — the Blob lands in the bounded
 *    object-URL cache (`traySnapshotMap`, 16 entries, revoked on restore).
 *  - `html-to-image` loads only on the first capture (dynamic import), so
 *    minimize-preview support adds nothing to the window-panels chunk.
 *  - Oversized DOM subtrees are skipped entirely (the clone phase of a
 *    DOM-to-canvas render is synchronous and would jank the main thread);
 *    the chip then falls back to the styled default body.
 *  - Output is downscaled (320px longest edge, 1x pixel density) WebP.
 */

/**
 * Skip capture above this many descendant elements — the synchronous clone
 * pass on a subtree this size risks a visible main-thread stall.
 */
const MAX_CAPTURE_ELEMENT_COUNT = 3000;

export async function defaultTraySnapshotCapture(
  bodyEl: HTMLElement,
): Promise<Blob | null> {
  try {
    if (
      bodyEl.querySelectorAll("*").length > MAX_CAPTURE_ELEMENT_COUNT ||
      bodyEl.offsetWidth < 8 ||
      bodyEl.offsetHeight < 8
    ) {
      return null;
    }
    const { captureElementThumbnail } = await import(
      "@/hooks/useScreenCapture"
    );
    const blob = await captureElementThumbnail(bodyEl);
    // A capture of a body that had not painted (a second minimize of a window whose body was just
    // retained) comes back as one flat colour: an empty tile (MKT-077). Treat it as no capture so
    // the chip shows the labelled default body instead.
    return blob && (await isFlatImage(blob)) ? null : blob;
  } catch {
    // A failed capture is never worth breaking minimize over — the chip
    // falls back to the default preview body.
    return null;
  }
}

/** True when every sampled pixel is transparent or the same colour — nothing to show. */
async function isFlatImage(blob: Blob): Promise<boolean> {
  try {
    const bitmap = await createImageBitmap(blob);
    const size = 24;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return false;
    ctx.drawImage(bitmap, 0, 0, size, size);
    bitmap.close?.();
    const { data } = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < data.length; i += 4) {
      if (
        Math.abs(data[i] - data[0]) > 6 ||
        Math.abs(data[i + 1] - data[1]) > 6 ||
        Math.abs(data[i + 2] - data[2]) > 6 ||
        Math.abs(data[i + 3] - data[3]) > 6
      ) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}
