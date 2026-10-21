import { act } from "react";
import { createRoot } from "react-dom/client";

import { ItemLogo } from "../components/ItemLogo";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function render(props: Parameters<typeof ItemLogo>[0]) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  await act(async () => { createRoot(host).render(<ItemLogo {...props} />); });
  return host.firstElementChild as HTMLElement;
}

describe("a logo is raw; dark mode only puts it on a light chip", () => {
  it("a logo gets the dark-only light chip and no tint or filter", async () => {
    const el = await render({ name: "Pura Vida", logoUrl: "https://x.example/logo.png", size: 64 });
    expect(el.className).toContain("dark:bg-neutral-100");
    expect(el.className).not.toMatch(/(^|\s)bg-neutral-100/);
    expect(el.outerHTML).not.toMatch(/filter|invert|grayscale/);
  });
  it("a place photo is not chipped; the letter fallback is not chipped", async () => {
    const photo = await render({ name: "Bar", logoUrl: "https://x.example/p.jpg", fill: true });
    expect(photo.className).not.toContain("dark:bg-neutral-100");
    const letter = await render({ name: "Bar" });
    expect(letter.className).not.toContain("dark:bg-neutral-100");
  });
  it("the chip pads in fixed pixels, never a percentage of the parent (which crushed small chips)", async () => {
    const el = await render({ name: "Rothy's", logoUrl: "https://x.example/logo.png", size: 44 });
    expect(el.className).not.toMatch(/p-\[\d+%\]/);
    expect(el.style.getPropertyValue("--logo-pad")).toBe("4px");
  });
  it("a favicon service's 16px default globe is not the item's mark: it falls to the letter", async () => {
    const el = await render({ name: "Tushy", website: "tushy.example", size: 44 });
    const img = el.querySelector("img") as HTMLImageElement;
    Object.defineProperty(img, "naturalWidth", { value: 16 });
    await act(async () => { img.dispatchEvent(new Event("load")); });
    expect(el.querySelector("img")).toBeNull();
    expect(el.textContent).toBe("T");
  });
  it("a picture already loaded before hydration drops its shimmer", async () => {
    const proto = HTMLImageElement.prototype;
    const complete = Object.getOwnPropertyDescriptor(proto, "complete");
    const natural = Object.getOwnPropertyDescriptor(proto, "naturalWidth");
    Object.defineProperty(proto, "complete", { configurable: true, get: () => true });
    Object.defineProperty(proto, "naturalWidth", { configurable: true, get: () => 400 });
    try {
      const el = await render({ name: "Bar", logoUrl: "https://x.example/p.jpg", fill: true });
      expect(el.querySelector(".animate-pulse")).toBeNull();
    } finally {
      if (complete) Object.defineProperty(proto, "complete", complete);
      if (natural) Object.defineProperty(proto, "naturalWidth", natural); else delete (proto as { naturalWidth?: number }).naturalWidth;
    }
  });
  it("a stored logo that is only a 16px placeholder also falls to the letter (old runs saved favicon URLs)", async () => {
    const el = await render({ name: "Cotopaxi", logoUrl: "https://www.google.com/s2/favicons?domain=cotopaxi.example", size: 44 });
    const img = el.querySelector("img") as HTMLImageElement;
    Object.defineProperty(img, "naturalWidth", { value: 16 });
    await act(async () => { img.dispatchEvent(new Event("load")); });
    expect(el.querySelector("img")).toBeNull();
    expect(el.textContent).toBe("C");
  });
  it("a source's stand-in picture is no picture: the favicon shows (old saved runs too)", async () => {
    const ph = "https://businessunitprofile-cdn.trustpilot.net/businessunitprofile-consumersite/public/default-business-unit-image-118x89.svg";
    const el = await render({ name: "Topo Designs", logoUrl: ph, website: "topodesigns.com", size: 44 });
    const img = el.querySelector("img") as HTMLImageElement;
    expect(img.getAttribute("src")).toContain("favicons?domain=topodesigns.com");
    const none = await render({ name: "Cotopaxi", logoUrl: ph, size: 44 });
    expect(none.querySelector("img")).toBeNull();
    expect(none.textContent).toBe("C");
  });
  it("a wide wordmark served as a photo is shown whole, never cropped by cover", async () => {
    const el = await render({ name: "Amazon", logoUrl: "https://x.example/amazon-logo.png", fill: true, size: 64 });
    const img = el.querySelector("img") as HTMLImageElement;
    expect(img.className).toContain("object-cover"); // a photo until it proves wide
    Object.defineProperty(img, "naturalWidth", { value: 400 });
    Object.defineProperty(img, "naturalHeight", { value: 120 });
    await act(async () => { img.dispatchEvent(new Event("load")); });
    const after = el.querySelector("img") as HTMLImageElement;
    expect(after.className).toContain("object-contain");
    expect(after.className).not.toContain("object-cover");
  });
});
