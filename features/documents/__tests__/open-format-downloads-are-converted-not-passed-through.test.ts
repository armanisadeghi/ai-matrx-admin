/** Download to .odt / .rtf / .epub: ODT and RTF go through the converter (never docx bytes under a new name), EPUB comes from the EPUB engine, an empty conversion is an error. */
import { exportOpenFormat, type OpenFormatDeps } from "../export-open-formats";

function deps(over: Partial<OpenFormatDeps> = {}) {
  const saved: { fileName: string; bytes: Uint8Array; mime: string }[] = [];
  const asked: string[] = [];
  const d: OpenFormatDeps = {
    engine: async (_md, format, fileName) => {
      asked.push(`engine:${format}`);
      return { bytes: new TextEncoder().encode(`${format}-bytes`), fileName: `${fileName}.${format}` };
    },
    convert: async (docx, _n, target) => {
      asked.push(`convert:${target}`);
      return new TextEncoder().encode(`${target}<-${new TextDecoder().decode(docx)}`);
    },
    save: (fileName, bytes, mime) => saved.push({ fileName, bytes, mime }),
    ...over,
  };
  return { d, saved, asked };
}

describe("document open-format downloads", () => {
  it("EPUB comes from the EPUB engine and is not converted", async () => {
    const { d, saved, asked } = deps();
    await exportOpenFormat("# Hi", "epub", "My Book", d);
    expect(asked).toEqual(["engine:epub"]);
    expect(saved[0]).toMatchObject({ fileName: "My Book.epub", mime: "application/epub+zip" });
  });
  it.each(["odt", "rtf"] as const)("%s is the converter's output of the engine's docx", async (format) => {
    const { d, saved, asked } = deps();
    await exportOpenFormat("# Hi", format, "Plan: v2/final", d);
    expect(asked).toEqual(["engine:docx", `convert:${format}`]);
    expect(new TextDecoder().decode(saved[0]!.bytes)).toBe(`${format}<-docx-bytes`);
    expect(saved[0]!.fileName).toBe(`Plan v2 final.${format}`);
  });
  it("an empty conversion is an error and nothing is saved", async () => {
    const { d, saved } = deps({ convert: async () => new Uint8Array() });
    await expect(exportOpenFormat("x", "odt", "t", d)).rejects.toThrow(/empty/);
    expect(saved).toEqual([]);
  });
});
