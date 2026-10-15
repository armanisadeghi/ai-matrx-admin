/** @jest-environment jsdom */

import { act } from "react";
import { createRoot } from "react-dom/client";

import { PlatformMark } from "../components/PlatformMark";
import { PROFILE_SITES } from "../profile-sites";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mark(platform: string): HTMLElement {
  const host = document.createElement("div");
  act(() => createRoot(host).render(<PlatformMark platform={platform} size={24} />));
  return host;
}

describe("every developer / creator site wears its real mark, raw", () => {
  it.each(PROFILE_SITES.map((s) => s.id))("%s is the brand's own drawn mark on no tile", (id) => {
    const host = mark(id);
    const svg = host.querySelector("svg");
    expect(svg).not.toBeNull();
    // A drawn shape, not initials or a stand-in glyph.
    expect([...host.querySelectorAll("path")].map((p) => p.getAttribute("d") ?? "").join("").length).toBeGreaterThan(30);
    // Raw: nothing wraps it in a coloured tile, and the shape carries the colour itself.
    expect(host.querySelector("[class*='bg-']")).toBeNull();
    expect(host.querySelector("span[style*='background']")).toBeNull();
    expect(svg?.getAttribute("class") ?? "").not.toMatch(/\bbg-/);
    expect(host.textContent).toBe("");
  });

  it("each site has its own shape (Mastodon and Twitch are no longer stand-in glyphs)", () => {
    const shapes = PROFILE_SITES.map((s) => [...mark(s.id).querySelectorAll("path")].map((p) => p.getAttribute("d")).join("|"));
    expect(new Set(shapes).size).toBe(PROFILE_SITES.length);
  });
});
