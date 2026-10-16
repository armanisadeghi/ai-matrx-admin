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
});
