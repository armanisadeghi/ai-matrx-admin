import { finishedDownloadName, readVariantFiles, rememberVariantFile } from "../variant-files";

const store = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};

describe("finished download names", () => {
  it("two variant files of one version never share a name", () => {
    const s = store();
    rememberVariantFile("p", "file-aaaaaa", "Shape 1:1", s);
    rememberVariantFile("p", "file-bbbbbb", "Hook: Cozy up", s);
    const labels = readVariantFiles("p", s);
    const taken = new Set<string>();
    const a = finishedDownloadName("Tea", { fileId: "file-aaaaaa", version: 2 }, labels, taken);
    const b = finishedDownloadName("Tea", { fileId: "file-bbbbbb", version: 2 }, labels, taken);
    expect(a).toBe("Tea Shape 1 1.mp4".replace("1 1", "1 1"));
    expect(new Set([a, b]).size).toBe(2);
    expect(b).toContain("Hook");
  });
  it("files never seen render still get distinct names", () => {
    const taken = new Set<string>();
    const a = finishedDownloadName("Tea", { fileId: "aaaaaa11", version: 2 }, {}, taken);
    const b = finishedDownloadName("Tea", { fileId: "bbbbbb22", version: 2 }, {}, taken);
    expect(a).not.toBe(b);
  });
});
