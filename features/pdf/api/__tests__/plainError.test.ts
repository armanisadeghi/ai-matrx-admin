/** Every tool error is plain words: no verb, endpoint name, arrow or status code reaches a person. */
import { plainPdfError, plainPdfMessage, endpointKeyOf } from "../plainError";

const RAW = /(POST|GET)\s|→|->|\b(4\d\d|5\d\d)\b|cropPages|MediaBox|CropBox|Invalid request/;

describe("plainPdfMessage", () => {
  it("never shows the walk's crop error as raw endpoint text", () => {
    const msg = plainPdfMessage({ label: "POST cropPages", status: 422, detail: "Invalid request: CropBox not in MediaBox" });
    expect(msg).toBe("Could not crop those pages with these settings. Check them and try again.");
    expect(msg).not.toMatch(RAW);
  });

  it("keeps a readable sentence from the server", () => {
    expect(plainPdfMessage({ label: "POST cropPages", status: 422, detail: "Crop box is outside page 1 bounds" })).toBe(
      "Could not crop those pages. Crop box is outside page 1 bounds.",
    );
  });

  it("covers every status class and every labelled endpoint without raw text", () => {
    for (const status of [401, 403, 404, 413, 422, 429, 500, 503]) {
      for (const label of ["POST cropPages", "POST redactPattern", "POST extractPages", "POST compress", "GET redactPatterns", "POST unknownThing"]) {
        expect(plainPdfMessage({ label, status, detail: "Invalid request" })).not.toMatch(RAW);
      }
    }
  });

  it("keeps the technical line on the error for logs", () => {
    const e = plainPdfError({ label: "POST cropPages", status: 422, detail: "CropBox not in MediaBox" });
    expect(e.message).not.toMatch(RAW);
    expect(e.technical).toBe("POST cropPages → 422: CropBox not in MediaBox");
    expect(e.status).toBe(422);
  });

  it("reads the endpoint key out of a label", () => {
    expect(endpointKeyOf("POST cropPages (expected binary)")).toBe("cropPages");
    expect(endpointKeyOf("GET redactPatterns")).toBe("redactPatterns");
  });
});
