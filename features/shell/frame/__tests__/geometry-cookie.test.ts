import { readFrameCookie } from "../geometry";

describe("frame geometry cookies", () => {
  afterEach(() => {
    document.cookie = "matrx-frame:bad=; max-age=0; path=/";
  });

  it("a corrupt cookie does not throw", () => {
    document.cookie = "matrx-frame:bad=%E0%A4%A; path=/";
    expect(() => readFrameCookie("matrx-frame:bad")).not.toThrow();
    expect(readFrameCookie("matrx-frame:bad")).toBeNull();
  });
});
