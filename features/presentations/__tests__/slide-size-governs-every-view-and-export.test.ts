/**
 * File → Page setup (slide size) is real only if the saved deck keeps it and every output obeys it.
 * A 4:3 deck must be 4:3 in the stage, the PDF page, the PowerPoint slide and the web page export.
 */
import { generatePresentationHTML } from "@/components/mardown-display/blocks/presentations/presentation-html-generator";
import { pdfPageMm, exportToPowerPoint } from "@/components/mardown-display/blocks/presentations/presentation-export";
import { DEFAULT_SLIDE_SIZE, normalizeSlideSize, slideAspect, slideStage } from "@/components/mardown-display/blocks/presentations/slide-size";
import { blankDeck, deckForStorage, deckReducer, normalizeDeck } from "../deck-model";

const layouts: Array<{ name: string; width: number; height: number }> = [];
jest.mock("@ai-matrx/alchemy/operate/pptx", () => ({
  buildPresentation: async (build: (p: unknown) => void) => {
    const pptx = {
      layout: "",
      defineLayout: (l: { name: string; width: number; height: number }) => layouts.push(l),
      addSlide: () => ({ addText: () => {}, background: null }),
    };
    build(pptx);
    layouts.push({ name: `used:${pptx.layout}`, width: 0, height: 0 });
    return new Blob(["x"]);
  },
}));
jest.mock("@ai-matrx/kit/download", () => ({ downloadFile: () => {} }));

const four3 = normalizeSlideSize({ preset: "4:3" });

describe("slide size model", () => {
  it("presets resolve to Google's sizes; broken values fall back to widescreen", () => {
    expect(four3).toEqual({ preset: "4:3", width: 10, height: 7.5 });
    expect(normalizeSlideSize({ preset: "16:10" })).toMatchObject({ width: 10, height: 6.25 });
    expect(normalizeSlideSize(null)).toEqual(DEFAULT_SLIDE_SIZE);
    expect(normalizeSlideSize({ preset: "custom", width: 0, height: 9 })).toEqual(DEFAULT_SLIDE_SIZE);
    expect(normalizeSlideSize({ preset: "custom", width: 13.333, height: 7.5 })).toEqual({ preset: "custom", width: 13.333, height: 7.5 });
  });
  it("the stage is 540 tall and exactly as wide as the ratio asks (16:9 stays 960x540)", () => {
    expect(slideStage(DEFAULT_SLIDE_SIZE)).toEqual({ width: 960, height: 540 });
    expect(slideStage(four3)).toEqual({ width: 720, height: 540 });
    expect(slideAspect(four3)).toBe("10 / 7.5");
  });
});

describe("the deck keeps its slide size", () => {
  it("setSlideSize changes the deck, and storage and reload carry it", () => {
    const state = deckReducer({ deck: normalizeDeck(blankDeck("T")), current: 0 }, { type: "setSlideSize", size: four3 });
    expect(state.deck.slideSize).toEqual(four3);
    const reloaded = normalizeDeck(JSON.parse(JSON.stringify(deckForStorage(state.deck))));
    expect(reloaded.slideSize).toEqual(four3);
  });
});

describe("every export obeys it", () => {
  it("PDF pages take the slide's shape (16:9 keeps its 297 x 167 mm page)", () => {
    const [w43, h43] = pdfPageMm(four3);
    expect(w43 / h43).toBeCloseTo(4 / 3, 3);
    const [w, h] = pdfPageMm(DEFAULT_SLIDE_SIZE);
    expect([w, Math.round(h * 100) / 100]).toEqual([297, 167.06]);
  });
  it("the PowerPoint slide is defined at the deck's size and used", async () => {
    layouts.length = 0;
    const res = await exportToPowerPoint({ slides: [{ type: "intro", title: "A" } as never], theme: null, slideSize: four3 }, { returnBlob: true });
    expect(res.success).toBe(true);
    expect(layouts[0]).toMatchObject({ width: 10, height: 7.5 });
    expect(layouts.some((l) => l.name === `used:${layouts[0]!.name}`)).toBe(true);
  });
  it("the web page export keeps the slide's shape", () => {
    const html = generatePresentationHTML({ slides: [{ type: "intro", title: "A" } as never], theme: null, slideSize: four3 });
    expect(html).toContain("aspect-ratio: 10 / 7.5");
    expect(html).toContain('data-slide-size="10x7.5"');
    expect(generatePresentationHTML({ slides: [{ type: "intro", title: "A" } as never], theme: null })).toContain("aspect-ratio: 10 / 5.625");
  });
});
