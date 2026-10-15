/**
 * The deck's theme decides the slide's colours everywhere. The editor canvas pins CSS tokens from
 * `slidePaperStyle`; the HTML, PPTX and PDF exports read the surface resolver directly. These tests
 * resolve BOTH sides for every preset and require the same colours — and prove the check can fail.
 */

import { PRESET_LIST, resolveDeckTheme } from "@/components/mardown-display/blocks/presentations/presets";
import { hexToHslTriplet, slideSurface } from "@/components/mardown-display/blocks/presentations/slide-surface";
import { generatePresentationHTML } from "@/components/mardown-display/blocks/presentations/presentation-html-generator";

const pptxCalls: { background?: { color: string }; texts: string[] }[] = [];
jest.mock("@ai-matrx/alchemy/operate/pptx", () => ({
  buildPresentation: async (build: (p: unknown) => void) => {
    build({
      layout: "",
      defineLayout: () => {},
      addSlide: () => {
        const rec = { background: undefined as { color: string } | undefined, texts: [] as string[] };
        pptxCalls.push(rec);
        return {
          set background(v: { color: string }) {
            rec.background = v;
          },
          addText: (_t: unknown, o: { color?: string }) => {
            if (o?.color) rec.texts.push(o.color);
          },
        };
      },
    });
    return new Blob(["x"]);
  },
}));
jest.mock("@ai-matrx/kit/download", () => ({ downloadFile: jest.fn() }));

import { slidePaperStyle } from "../slide-paper";
import { exportToPowerPoint } from "@/components/mardown-display/blocks/presentations/presentation-export";

const slides = [{ title: "T", bullets: ["a"] }, { type: "intro", title: "I" }];

describe.each(PRESET_LIST.map((p) => p.key))("preset %s", (key) => {
  const theme = { preset: key };
  const surface = slideSurface(resolveDeckTheme(theme));

  it("editor canvas page colour === HTML export page colour", () => {
    const style = slidePaperStyle({ theme }) as Record<string, string>;
    expect(style["--card"]).toBe(hexToHslTriplet(surface.background));
    const html = generatePresentationHTML({ slides, theme });
    expect(html).toContain(`background: ${surface.background};`);
  });

  it("editor canvas page colour === PPTX slide background, and body text matches", async () => {
    pptxCalls.length = 0;
    await exportToPowerPoint({ slides, theme }, { returnBlob: true });
    const style = slidePaperStyle({ theme }) as Record<string, string>;
    expect(pptxCalls.length).toBe(2);
    for (const c of pptxCalls) expect(hexToHslTriplet(c.background!.color)).toBe(style["--card"]);
    expect(pptxCalls[0]!.texts).toContain(surface.foreground.replace("#", ""));
  });

  it("the surface does not depend on the app's light/dark mode", () => {
    document.documentElement.classList.add("dark");
    const dark = JSON.stringify(slidePaperStyle({ theme }));
    document.documentElement.classList.remove("dark");
    expect(JSON.stringify(slidePaperStyle({ theme }))).toBe(dark);
  });
});

describe("Midnight is a dark theme; every other preset is light paper", () => {
  it("midnight draws on a dark page, the rest on white", () => {
    expect(slideSurface(resolveDeckTheme({ preset: "midnight" })).mode).toBe("dark");
    for (const p of PRESET_LIST.filter((x) => x.key !== "midnight")) {
      expect(slideSurface(resolveDeckTheme({ preset: p.key })).background).toBe("#FFFFFF");
    }
  });
  it("the probe can fail: a dark deck's editor tokens differ from white paper", () => {
    const dark = slidePaperStyle({ theme: { preset: "midnight" } }) as Record<string, string>;
    expect(dark["--card"]).not.toBe(hexToHslTriplet("#FFFFFF"));
  });
});
