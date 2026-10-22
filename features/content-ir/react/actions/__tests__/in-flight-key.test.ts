import { inFlightKey } from "../in-flight-key";

describe("kind action double-fire guard identity", () => {
  it("two images loading at once never block each other; the same request twice does", () => {
    const wide = inFlightKey("fetch_image", { url: "https://example.com/wide.jpg" });
    const png = inFlightKey("fetch_image", { url: "https://example.com/transparent.png" });
    expect(wide).not.toBe(png);
    expect(inFlightKey("fetch_image", { url: "https://example.com/wide.jpg" })).toBe(wide);
    expect(inFlightKey("load_media", { file_id: "a" })).not.toBe(inFlightKey("load_media", { file_id: "b" }));
  });

  it("key order does not change the identity", () => {
    expect(inFlightKey("download", { a: 1, b: { c: 2, d: 3 } })).toBe(inFlightKey("download", { b: { d: 3, c: 2 }, a: 1 }));
  });

  it("one shortcut may open for two ideas at once, never twice for one", () => {
    const one = inFlightKey("run_shortcut", { shortcutId: "s", scope: { selection: "Idea 1" } });
    const two = inFlightKey("run_shortcut", { shortcutId: "s", scope: { selection: "Idea 2" } });
    expect(one).not.toBe(two);
    expect(inFlightKey("run_shortcut", { shortcutId: "s", scope: { selection: "Idea 1" } })).toBe(one);
  });

  it("named targets keep their own keys", () => {
    expect(inFlightKey("apply_surface_write", { target: "t1" })).toBe("apply_surface_write::t1");
    expect(inFlightKey("run_shortcut", { shortcutId: "s", saveAs: "k" })).toBe("run_shortcut::save:k");
  });
});
