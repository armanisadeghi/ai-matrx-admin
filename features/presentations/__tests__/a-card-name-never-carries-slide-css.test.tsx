/**
 * A deck card's text is its name, date and thumbnail content — never the CSS that styles the thumbnail.
 * The slide's Format → Text rule used to render as a <style> inside the card, so reading the card's text
 * returned "[data-slide-fmt] … " glued to the deck name. The rule now lives in <head>.
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";

jest.mock("@/components/mardown-display/blocks/presentations/SlideView", () => ({ SlideView: () => <p>Plain slide text</p> }));
jest.mock("@/components/mardown-display/blocks/presentations/ScaledSlide", () => ({ ScaledSlide: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

import { PaperSlide, slideFormatScope, slideTextFormatCss } from "../slide-paper";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("slide text-format css", () => {
  it("is scoped to its own format so two looks never collide", () => {
    const a = slideTextFormatCss({ bold: true }, slideFormatScope(slideTextFormatCss({ bold: true })));
    const b = slideTextFormatCss({ italic: true }, slideFormatScope(slideTextFormatCss({ italic: true })));
    expect(a).toMatch(/^\[data-slide-fmt="[a-z0-9]+"\]/);
    expect(a.split("{")[0]).not.toBe(b.split("{")[0]);
  });
});

describe("slide text-format css reaches what a person sees", () => {
  it("underline is drawn on inline-block fields and in ink, not on transparent gradient text", () => {
    const css = slideTextFormatCss({ underline: true });
    expect(css).toMatch(/:is\(h1[^)]*\) \*\{text-decoration:underline/);
    expect(css).toContain("text-decoration-color:hsl(var(--foreground))");
    expect(slideTextFormatCss({ underline: true, color: "#112233" })).toContain("text-decoration-color:currentColor");
  });
  it("an alignment lets the wrapper of a shrink-wrapped title span the row, so it can move", () => {
    expect(slideTextFormatCss({ align: "right" })).toMatch(/:has\(> :is\(h1[^)]*\)\), \S+ :has\(> \* > :is\(h1[^)]*\)\)\{width:100%\}/);
    expect(slideTextFormatCss({ align: "right" })).not.toMatch(/:has\([^)]*:has\(/); // :has() cannot nest: a nested one drops the whole rule
    expect(slideTextFormatCss({})).toBe("");
  });
});

describe("a deck card's text", () => {
  it("holds no style text (fails if the <style> is rendered back inside the card)", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    act(() => {
      root.render(
        <article>
          <h3>Q3 plan</h3>
          <PaperSlide deck={{ theme: undefined, slideSize: undefined } as never} slide={{ id: "s", title: "T", textStyle: { bold: true } } as never} />
        </article>,
      );
    });
    expect(host.textContent).toContain("Q3 plan");
    expect(host.textContent).not.toContain("data-slide-fmt");
    expect(host.querySelector("style")).toBeNull();
    expect(host.querySelector("[data-slide-fmt]")).not.toBeNull();
    expect(document.head.querySelector("style[data-href^='slide-fmt-']")).not.toBeNull();
  });
});
