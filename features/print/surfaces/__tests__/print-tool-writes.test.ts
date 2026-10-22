import { parsePrintFormPatch } from "../print-tool-writes";
import { printFieldTargets, type PrintField } from "../print-tool-surface";

const fields: PrintField[] = [
  { name: "qr_value", label: "Value", description: "v", kind: "text" },
  { name: "pages", label: "Pages", description: "p", kind: "number", min: 1, max: 10 },
  { name: "toc", label: "TOC", description: "t", kind: "boolean" },
  { name: "ec", label: "EC", description: "e", kind: "choice", options: ["M", "H"] },
  { name: "stock", label: "Stock", description: "s", kind: "choice" },
  { name: "ink", label: "Ink", description: "i", kind: "color" },
];

describe("parsePrintFormPatch", () => {
  it("returns only the keys sent, typed", () => {
    expect(parsePrintFormPatch(fields, { pages: 4, toc: false, ec: "H", ink: "#AABBCC" })).toEqual({
      pages: 4,
      toc: false,
      ec: "H",
      ink: "#aabbcc",
    });
  });

  it("uses run-time choices when the manifest has none", () => {
    expect(parsePrintFormPatch(fields, { stock: "avery-5160" }, { stock: ["avery-5160"] })).toEqual({ stock: "avery-5160" });
    expect(() => parsePrintFormPatch(fields, { stock: "nope" }, { stock: ["avery-5160"] })).toThrow(/must be one of/);
  });

  it.each([
    [{ pages: 0 }, /at least 1/],
    [{ pages: 11 }, /at most 10/],
    [{ pages: "4" }, /must be a number/],
    [{ toc: "yes" }, /true or false/],
    [{ ec: "L" }, /must be one of/],
    [{ ink: "blue" }, /hex color/],
    [{ qr_value: "x" }, /not a control/],
    [{ other: 1 }, /not a control/],
    [{}, /empty/],
    [[], /JSON object/],
  ])("refuses %j", (value, message) => {
    expect(() => parsePrintFormPatch(fields, value)).toThrow(message);
  });
});

describe("printFieldTargets", () => {
  it("gives each text field a patchable twin and the rest one object target", () => {
    const targets = printFieldTargets(fields, { name: "settings", label: "Settings" });
    expect(targets.map((t) => [t.name, t.valueType, t.patchable ?? false])).toEqual([
      ["qr_value", "string", true],
      ["settings", "object", false],
    ]);
    expect(targets[0].updatesValue).toBe("qr_value");
  });
});
