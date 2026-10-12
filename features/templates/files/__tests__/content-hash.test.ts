import { stableContentHash } from "../seeds/content-hash";
import { documentSeeds } from "../seeds/document-templates";

describe("stableContentHash", () => {
  it("is identical across runs for every document seed (random ids ignored)", () => {
    const a = documentSeeds().map((t) => stableContentHash(t.snapshot));
    const b = documentSeeds().map((t) => stableContentHash(t.snapshot));
    expect(a).toEqual(b);
  });

  it("changes when the text content changes", () => {
    const base = { id: "08d13b94-02a9-40f9-ad38-fde9d03df8bc", body: { text: "hello", paragraphId: "para_AAAAAAAAAAAA" } };
    const edited = { ...base, body: { ...base.body, text: "hello!" } };
    expect(stableContentHash(edited)).not.toBe(stableContentHash(base));
  });

  it("ignores a table id used as value and key", () => {
    const t = (id: string) => ({ tables: { [id]: { tableId: id, rows: 2 } } });
    expect(stableContentHash(t("2de0b2"))).toBe(stableContentHash(t("279208")));
  });
});
