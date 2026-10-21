import {
  FRAME_COMPANION_OPEN_MAX_BYTES,
  frameCompanionOpenFor,
  nextFrameCompanionOpen,
  readFrameCookie,
} from "../geometry";

const longKey = (i: number) =>
  `/agents/${crypto.randomUUID()}/runs/${crypto.randomUUID()}/${crypto.randomUUID()}?i=${i}`;

describe("side chat open cookie", () => {
  afterEach(() => {
    document.cookie = "matrx-frame:bad=; max-age=0; path=/";
  });

  it("stays under the byte cap with 30 long uuid-heavy open pages", () => {
    let value: string | null = null;
    const keys = Array.from({ length: 30 }, (_, i) => longKey(i));
    for (const k of keys) value = nextFrameCompanionOpen(value, k, true);
    expect(encodeURIComponent(value!).length).toBeLessThanOrEqual(FRAME_COMPANION_OPEN_MAX_BYTES);
    // newest survives, oldest was trimmed
    expect(frameCompanionOpenFor(value, keys[29]!)).toBe(true);
    expect(frameCompanionOpenFor(value, keys[0]!)).toBeNull();
  });

  it("stores only open pages: closing forgets the page", () => {
    const opened = nextFrameCompanionOpen(null, "/a", true);
    const closed = nextFrameCompanionOpen(opened, "/a", false);
    expect(JSON.parse(closed)).toEqual([]);
    expect(frameCompanionOpenFor(closed, "/a")).toBeNull();
  });

  it("a corrupt cookie does not throw", () => {
    document.cookie = "matrx-frame:bad=%E0%A4%A; path=/";
    expect(() => readFrameCookie("matrx-frame:bad")).not.toThrow();
    expect(readFrameCookie("matrx-frame:bad")).toBeNull();
  });
});
