/** @jest-environment jsdom */
import { probeBox } from "../demo-probe";
import { judgeDemo } from "../demo-health";
import { nextYouTubePoster, isMissingYouTubePoster } from "@/features/files/blocks/youtube/YouTubeEmbed";

function rect(width: number, height: number): DOMRect {
  return { width, height, left: 0, top: 0, right: width, bottom: height, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
}

function host(inner: string): HTMLElement {
  const el = document.createElement("div");
  el.innerHTML = `<div>${inner}</div>`;
  document.body.appendChild(el);
  el.getBoundingClientRect = () => rect(600, 400);
  (el.firstElementChild as HTMLElement).getBoundingClientRect = () => rect(600, 400);
  return el;
}

function decoded(img: HTMLImageElement, w: number, h: number, box: [number, number], fit = "cover") {
  Object.defineProperty(img, "naturalWidth", { value: w });
  Object.defineProperty(img, "naturalHeight", { value: h });
  Object.defineProperty(img, "complete", { value: true });
  img.style.objectFit = fit;
  img.getBoundingClientRect = () => rect(box[0], box[1]);
}

const verdict = (el: HTMLElement) =>
  judgeDemo({ ...probeBox(el, "page"), errors: [], ageMs: 10_000 }).checks.find((c) => c.id === "images");

describe("playground media health", () => {
  it("a video poster filling its 16:9 facade is whole, not cropped", () => {
    const el = host(`<img data-matrx-poster="" src="https://i.ytimg.com/vi/x/hqdefault.jpg">`);
    decoded(el.querySelector("img")!, 480, 360, [339, 190]);
    expect(verdict(el)?.status).toBe("pass");
  });

  it("the same cover crop on an ordinary image still fails as cropped", () => {
    const el = host(`<img src="https://example.com/a.jpg">`);
    decoded(el.querySelector("img")!, 480, 360, [339, 190]);
    expect(verdict(el)).toMatchObject({ status: "fail", detail: "1 cropped" });
  });

  it("a kit image that gave up fails the demo as broken", () => {
    const el = host(`<figure data-kind-image=""><div role="alert">This image couldn't be loaded.</div></figure>`);
    expect(verdict(el)).toMatchObject({ status: "fail", detail: "1 broken" });
  });

  it("YouTube posters step maxres → sd → hq, and the 120px placeholder counts as missing", () => {
    const maxres = "https://i.ytimg.com/vi/abc123/maxresdefault.jpg";
    const sd = nextYouTubePoster("abc123", maxres);
    expect(sd).toBe("https://i.ytimg.com/vi/abc123/sddefault.jpg");
    expect(nextYouTubePoster("abc123", sd!)).toBe("https://i.ytimg.com/vi/abc123/hqdefault.jpg");
    expect(nextYouTubePoster("abc123", "https://i.ytimg.com/vi/abc123/hqdefault.jpg")).toBeNull();
    expect(nextYouTubePoster("abc123", "https://cdn.example/custom.jpg")).toBe("https://i.ytimg.com/vi/abc123/hqdefault.jpg");
    expect(isMissingYouTubePoster({ naturalWidth: 120 })).toBe(true);
    expect(isMissingYouTubePoster({ naturalWidth: 1280 })).toBe(false);
    expect(isMissingYouTubePoster({ naturalWidth: 0 })).toBe(false);
  });
});
