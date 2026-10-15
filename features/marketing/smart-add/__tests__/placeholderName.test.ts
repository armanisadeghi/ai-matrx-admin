import { parseEvidenceItem } from "../evidence";
import { isPlaceholderName } from "../placeholderName";

const raw = (over: Record<string, unknown>) => ({
  key: "k1", field: "name", value: "Linus", confidence: 0.5, source: { node: "n", kind: "typed", where: "the email" }, ...over,
});

describe("MKT-107 — a placeholder is never a name", () => {
  it.each(["UNKNOWN", "unknown", "N/A", "none", "Null", "--", "?", " Anonymous "])("%s is a placeholder", (t) => {
    expect(isPlaceholderName(t)).toBe(true);
  });
  it.each(["Linus Torvalds", "Anon Ymous Co", "Nan", "Unknown Pleasures Records"])("%s is a real name", (t) => {
    expect(isPlaceholderName(t)).toBe(false);
  });
  it("a name finding of UNKNOWN is dropped at the door", () => {
    expect(parseEvidenceItem(raw({ value: "UNKNOWN" }))).toBeNull();
    expect(parseEvidenceItem(raw({ value: "Ada Lovelace" }))?.value).toBe("Ada Lovelace");
  });
  it("an account label of UNKNOWN is blanked, the account stays", () => {
    const item = parseEvidenceItem(raw({ field: "social", value: "https://github.com/x", label: "UNKNOWN" }));
    expect(item?.label).toBeNull();
    expect(item?.value).toBe("https://github.com/x");
  });
});
