/**
 * Review 5, G8: a person's <troubleshooting> with no Symptom is not an app error. It stays on its
 * legacy rendering with a warning; a console.error here is captured and raises the admin badge on
 * every note that holds one.
 */
jest.mock("../registry/surface-registry", () => ({
  surfaceRegistry: {
    ensureWarm: () => Promise.resolve(),
    getSurfaceForTag: (tag: string) =>
      tag === "troubleshooting" ? { parserStrategy: "troubleshooting_legacy_text", kind: "troubleshooting_guide" } : null,
    getSurfaceForFence: () => null,
  },
}));

import { envelopeForCompletedXmlRegion } from "../surfaces/xml-finalize";

it("a region outside the grammar warns, never errors", () => {
  const error = jest.spyOn(console, "error").mockImplementation(() => {});
  const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  const envelope = envelopeForCompletedXmlRegion("troubleshooting", "<troubleshooting>\n### The app will not start\n- Check the cable\n</troubleshooting>");
  expect(envelope).toBeNull();
  expect(error).not.toHaveBeenCalled();
  expect(warn).toHaveBeenCalledTimes(1);
  error.mockRestore();
  warn.mockRestore();
});
