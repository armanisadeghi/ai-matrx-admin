import { colorName, parseHex, prefersDarkText } from "../color-name";

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
