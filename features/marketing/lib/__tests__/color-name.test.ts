import { colorName, colorNames, parseHex, prefersDarkText } from "../color-name";

describe("colorName", () => {
  it("names exact and near colors the way people say them", () => {
    expect(colorName("#000000")).toBe("Black");
    expect(colorName("#fff")).toBe("White");
    expect(colorName("#000082")).toBe("Navy");
    expect(colorName("#ff7f52")).toBe("Coral");
    expect(colorName("#008181")).toBe("Teal");
  });
  it("ignores alpha and rejects non-hex values", () => {
    expect(colorName("#ff000080")).not.toBeNull();
    expect(colorName("rgb(1,2,3)")).toBeNull();
    expect(parseHex("#12")).toBeNull();
  });
  it("picks readable text on a swatch", () => {
    expect(prefersDarkText("#ffffff")).toBe(true);
    expect(prefersDarkText("#0b1a3a")).toBe(false);
  });
});

describe("colorNames", () => {
  it("never gives two colors in one palette the same name", () => {
    // data-destruction's palette: two dark blues both read "Deep navy" before.
    const names = colorNames(["#00477f", "#101828", "#1f2937", "#95b1c7", "#ffffff", "#e1e1e1"]);
    expect(new Set(names).size).toBe(names.length);
    expect(names[1]).not.toBe(names[0]);
  });
  it("keeps order and returns null for non-hex values", () => {
    expect(colorNames(["#000000", "nope"])).toEqual(["Black", null]);
  });
});
