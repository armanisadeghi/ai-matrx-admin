/** The one logo-brightness check: white logos get a dark tile, dark logos a light one. Needs a same-origin (proxied) image to read pixels. */

/** Mean brightness of the opaque pixels (0-1), or null when the browser will not let us read it. */
export function brightnessOf(img: HTMLImageElement): number | null {
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 24;
    const g = c.getContext("2d");
    if (!g) return null;
    g.drawImage(img, 0, 0, 24, 24);
    const d = g.getImageData(0, 0, 24, 24).data;
    let sum = 0;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 40) continue;
      sum += (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
      n++;
    }
    return n ? sum / n : -1; // -1: fully transparent
  } catch {
    return null;
  }
}

/** Which tile a logo of this brightness sits on; null (unreadable) keeps the checker. */
export function shadeForBrightness(b: number | null): "light" | "dark" | "checker" {
  if (b === null) return "checker";
  return b === -1 || b > 0.8 ? "dark" : b < 0.2 ? "light" : "checker";
}
