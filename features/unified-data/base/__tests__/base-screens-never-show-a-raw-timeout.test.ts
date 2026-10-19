// A STATEMENT TIMEOUT NEVER READS AS POSTGRES' WORDS ON A BASE SCREEN (AT-REVIEWFIX T, 2026-10-19).
// AT-WALK-E6 saw "canceling statement due to statement timeout" captured from a base rename. Every failure a base screen
// shows goes through sayError (timeout -> the store's sentence) or ErrorNotice, and the store helpers keep the SQLSTATE.
// RED on the prior bytes: baseStore threw new Error(error.message) (code lost), the duplicate, Sheets and Airtable dialogs
// printed raw text, and every catch read `e instanceof Error ? e.message`.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { TIMED_OUT_SENTENCE, isTimedOutError } from "@ai-matrx/design-system";

jest.mock("@/utils/supabase/client", () => ({ createClient: () => ({}) }));
jest.mock("@/lib/python-client", () => ({ putJson: jest.fn() }));

import { storeError } from "../baseStore";
import { sayError } from "../sayError";

const DIR = join(__dirname, "..");
// Every source file under features/unified-data/base, subfolders included (AT-REVIEW-3); tests are not screens.
function sources(dir: string, rel = ""): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? e.name === "__tests__" ? [] : sources(join(dir, e.name), join(rel, e.name))
      : /\.(ts|tsx)$/.test(e.name) && !/\.test\.(ts|tsx)$/.test(e.name) ? [join(rel, e.name)] : [],
  );
}
const files = sources(DIR);

it("the scan sees every base file, subfolders included", () => {
  expect(files).toEqual(expect.arrayContaining(["BaseScreens.tsx", "baseStore.ts", "sayError.ts"]));
  expect(files.some((f) => f.includes("__tests__"))).toBe(false);
});

it("no base screen turns a caught error into on-screen text by hand", () => {
  const offenders: string[] = [];
  for (const f of files) {
    const src = readFileSync(join(DIR, f), "utf8");
    src.split("\n").forEach((line, i) => {
      if (/(\w+) instanceof Error \? \1\.message/.test(line)) offenders.push(`${f}:${i + 1} reads e.message (use sayError)`);
      if (/role="alert">\{/.test(line)) offenders.push(`${f}:${i + 1} prints raw text in an alert (use ErrorNotice)`);
      if (/throw new Error\(error\.message\)/.test(line)) offenders.push(`${f}:${i + 1} drops the SQLSTATE (use storeError)`);
      if (/String\(\w+\.message\)/.test(line)) offenders.push(`${f}:${i + 1} prints a raw message (use sayError)`);
    });
  }
  expect(offenders).toEqual([]);
});

it("a timeout reads as the store's sentence and keeps its code through the store helpers", () => {
  const raw = { message: "canceling statement due to statement timeout", code: "57014" };
  const e = storeError(raw);
  expect(e.code).toBe("57014");
  expect(isTimedOutError(e)).toBe(true);
  expect(sayError(e, "x")).toBe(TIMED_OUT_SENTENCE);
  expect(sayError(new Error("canceling statement due to statement timeout"), "x")).toBe(TIMED_OUT_SENTENCE);
  expect(sayError(new Error("Harbor Base is already in that workspace."), "x")).toBe("Harbor Base is already in that workspace.");
  expect(sayError(null, "The base could not be read.")).toBe("The base could not be read.");
});
