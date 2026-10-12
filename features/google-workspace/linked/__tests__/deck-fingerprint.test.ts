/**
 * @jest-environment node
 */
import { contentFingerprint } from "../GoogleLinkControl";

const deck = (title: string) => ({ slides: [{ type: "intro", title }], theme: { preset: "ocean" } });

describe("a deck's Google fingerprint", () => {
  it("is the same for the same deck whatever the key order", async () => {
    const a = await contentFingerprint(deck("Hello"));
    const b = await contentFingerprint({ theme: { preset: "ocean" }, slides: [{ title: "Hello", type: "intro" }] });
    expect(a).toBe(b);
  });
  it("changes when a slide's text changes (so a push after an edit reads as changed here)", async () => {
    expect(await contentFingerprint(deck("Hello"))).not.toBe(await contentFingerprint(deck("Hello!")));
  });
});
