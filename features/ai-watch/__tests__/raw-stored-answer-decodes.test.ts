/**
 * @jest-environment node
 *
 * A raw answer over 16 KB is stored as `.raw.gz` (aidream raw_capture_sink). Watch AI must show it
 * decoded, inline, never as a binary blob. The fixture is the recorded ScrapeCreators Instagram
 * profile answer (aidream packages/matrx-social/tests/fixtures/ig_profile.json, 151 KB) gzipped
 * exactly as the sink files it.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { gunzipIfNeeded } from "@/features/files/utils/gunzip";
import { RAW_PREVIEW_CHARS, rawIsJson, rawTextView } from "../data/raw-data";

const STORED = readFileSync(join(__dirname, "fixtures/scrapecreators-ig-profile.raw.gz"));
const EXACT = gunzipSync(STORED).toString("utf-8");

test("the stored .raw.gz decodes in the browser to the exact answer", async () => {
  const decoded = await gunzipIfNeeded(new Blob([STORED], { type: "application/gzip" }));
  expect(decoded).toBe(EXACT);
  expect(decoded.length).toBeGreaterThan(16_384);
  expect(rawIsJson(decoded)).toBe(true);
});

test("plain stored text passes through unchanged", async () => {
  expect(await gunzipIfNeeded(new Blob(["not gzip"]))).toBe("not gzip");
});

test("exact bytes are exact; a very large answer says how much is shown and expands to all of it", () => {
  const exact = rawTextView(EXACT, { formatted: false, full: false });
  expect(EXACT.length).toBeGreaterThan(RAW_PREVIEW_CHARS);
  expect(exact.formatted).toBe(false);
  expect(exact.totalChars).toBe(EXACT.length);
  expect(exact.shownChars).toBe(RAW_PREVIEW_CHARS);
  expect(EXACT.startsWith(exact.text)).toBe(true);

  const all = rawTextView(EXACT, { formatted: false, full: true });
  expect(all.text).toBe(EXACT);
  expect(all.shownChars).toBe(all.totalChars);
});

test("JSON lays out readably and still carries every value", () => {
  const laidOut = rawTextView(EXACT, { formatted: true, full: true });
  expect(laidOut.formatted).toBe(true);
  expect(laidOut.text.split("\n").length).toBeGreaterThan(EXACT.split("\n").length);
  expect(JSON.parse(laidOut.text)).toEqual(JSON.parse(EXACT));
});

test("non-JSON text is never 'laid out'", () => {
  const v = rawTextView("upstream busy", { formatted: true, full: false });
  expect(v).toEqual({ text: "upstream busy", formatted: false, totalChars: 13, shownChars: 13 });
});
