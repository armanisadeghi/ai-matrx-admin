import {
  COARSE_SIZES,
  DENSE_SIZES,
  FINE_SIZES,
  fitFieldControls,
  isDenseField,
  minTextPx,
  type FitRequest,
} from "./proFieldControlFit";

// ProInput's own geometry: 12px left padding + the 4px text gap.
const FIXED = 16;

function fit(fieldWidth: number, over: Partial<FitRequest> = {}) {
  return fitFieldControls({
    fieldWidth,
    sizes: FINE_SIZES,
    fixedPx: FIXED,
    hasSubmit: false,
    menuHasOwnItems: true,
    mic: true,
    clear: false,
    expand: false,
    ...over,
  });
}

const textRoom = (w: number, r: ReturnType<typeof fit>) => w - FIXED - r.inlineWidth;

describe("the one fitting rule", () => {
  it("unmeasured (first paint) keeps everything inline", () => {
    const r = fit(0, { hasSubmit: true, clear: true });
    expect(r).toMatchObject({ mic: "inline", clearInline: true, folded: [], showMenu: true });
  });

  it("a plain field steps mic → '…' only, and the mic is never lost", () => {
    for (const w of [520, 320, 220]) expect(fit(w).mic).toBe("inline");
    for (const w of [160, 110]) {
      const r = fit(w);
      expect(r.mic).toBe("folded");
      expect(r.folded).toContain("mic");
      expect(r.showMenu).toBe(true);
    }
  });

  it("with Clear + Send, Clear and the mic FOLD into '…' instead of vanishing (the 220px defect)", () => {
    const wide = fit(320, { hasSubmit: true, clear: true });
    expect(wide).toMatchObject({ mic: "inline", clearInline: true, folded: [] });

    const tight = fit(220, { hasSubmit: true, clear: true });
    expect(tight.clearInline).toBe(false);
    expect(tight.mic).toBe("folded");
    expect(tight.folded).toEqual(expect.arrayContaining(["clear", "mic"]));
    expect(tight.showMenu).toBe(true); // the old rule hid "…" here
    expect(textRoom(220, tight)).toBeGreaterThanOrEqual(minTextPx(220));
  });

  it("Send and '…' always stay — the field's action is never folded", () => {
    for (const w of [160, 110, 60]) {
      const r = fit(w, { hasSubmit: true, clear: true });
      expect(r.showMenu).toBe(true);
      expect(r.inlineWidth).toBe(FINE_SIZES.box * 2);
    }
  });

  it("the text keeps its floor whenever folding can give it back", () => {
    for (const w of [600, 520, 400, 320, 260, 220]) {
      for (const over of [{}, { hasSubmit: true, clear: true }, { hasSubmit: true, clear: true, expand: true }]) {
        expect(textRoom(w, fit(w, over))).toBeGreaterThanOrEqual(minTextPx(w));
      }
    }
  });

  it("a phone folds earlier: 173px with Clear + Send keeps ~80px of text, not five letters", () => {
    const r = fit(173, { sizes: COARSE_SIZES, hasSubmit: true, clear: true });
    expect(r).toMatchObject({ mic: "folded", clearInline: false, showMenu: true });
    expect(textRoom(173, r)).toBeGreaterThanOrEqual(80);
  });

  it("the mic is ONE button — no device chevron takes room beside it (Arman, 2026-10-16)", () => {
    const r = fit(600, { menuHasOwnItems: false });
    expect(r.mic).toBe("inline");
    expect(r.inlineWidth).toBe(FINE_SIZES.mic);
    expect(r.showMenu).toBe(false); // the microphone choice lives on the mic itself
  });

  it("Expand folds first, then Clear, then the mic", () => {
    const order = [600, 330, 300, 260, 200].map((w) =>
      fit(w, { hasSubmit: true, clear: true, expand: true }).folded.join(","),
    );
    expect(order[0]).toBe("");
    expect(order.at(-1)).toBe("expand,clear,mic");
    for (let i = 1; i < order.length; i += 1) {
      expect(order[i]!.startsWith(order[i - 1]!)).toBe(true);
    }
  });

  it("no mic offered → nothing to fold", () => {
    const r = fit(110, { mic: false });
    expect(r.mic).toBe("none");
    expect(r.folded).toEqual([]);
  });

  it("a menu with nothing of its own appears only to hold a folded control", () => {
    expect(fit(520, { menuHasOwnItems: false, mic: false }).showMenu).toBe(false);
    expect(fit(80, { menuHasOwnItems: false }).showMenu).toBe(true);
  });

  it("a field shorter than a tap box is dense", () => {
    expect(isDenseField(28)).toBe(true);
    expect(isDenseField(36)).toBe(false);
    expect(isDenseField(0)).toBe(false);
    expect(DENSE_SIZES.box).toBeLessThanOrEqual(28);
  });
});
