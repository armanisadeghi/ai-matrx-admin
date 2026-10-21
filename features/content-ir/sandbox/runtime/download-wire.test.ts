import { toActionWire } from "./download-wire";
import { measureBytes, MAX_INBOUND_BYTES } from "../protocol";

describe("download content leaves the frame as a Blob", () => {
  it("a 200 KB export fits under the frame message cap", () => {
    const content = "a,b\n".repeat(50_000);
    expect(measureBytes({ input: { filename: "x.csv", content } })).toBeGreaterThan(MAX_INBOUND_BYTES);
    const wire = toActionWire("download", { filename: "x.csv", content, mime: "text/csv" }) as { content: Blob };
    expect(wire.content).toBeInstanceOf(Blob);
    expect(wire.content.size).toBe(content.length);
    expect(measureBytes({ input: wire })).toBeLessThan(MAX_INBOUND_BYTES);
  });

  it("leaves every other action alone", () => {
    const input = { url: "https://example.com" };
    expect(toActionWire("open_url", input)).toBe(input);
    expect(toActionWire("download", { file_id: "f1" })).toEqual({ file_id: "f1" });
  });
});
