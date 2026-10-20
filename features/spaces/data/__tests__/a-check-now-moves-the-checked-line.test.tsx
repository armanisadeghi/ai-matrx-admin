/**
 * @jest-environment jsdom
 */
// AT-FIX-H 3: after "Check now" the Checked line of a connected-app trigger showed the first check's time. It now moves
// with the real result of the check the moment the server answers, and a stored time older than the answer never wins.
import { act } from "react";
import { createRoot } from "react-dom/client";
import { AppCheckText, appCheckLine } from "../app-check-line";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const FIRST = "2026-10-19T16:41:00.000Z";
const LATER = "2026-10-19T16:46:30.000Z";

it("a check answered after the stored time moves the line", () => {
  const line = appCheckLine({ app_says: null, app_checked_at: FIRST }, { at: LATER, ok: true, says: "Nothing new." });
  expect(line).toEqual({ text: `Checked ${new Date(LATER).toLocaleString()}`, problem: false });
});

it("a stale re-read (older stored time) never moves the line back", () => {
  const line = appCheckLine({ app_says: null, app_checked_at: FIRST }, { at: LATER, ok: true, says: null });
  expect(line.text).not.toContain(new Date(FIRST).toLocaleString());
});

it("a check that could not read the account says so", () => {
  const line = appCheckLine({ app_says: null, app_checked_at: FIRST }, { at: LATER, ok: false, says: "Switch it on first." });
  expect(line).toEqual({ text: "Switch it on first.", problem: true });
});

it("with no answer yet it shows the stored time, then 'Not checked yet'", () => {
  expect(appCheckLine({ app_says: null, app_checked_at: FIRST }, null).text).toBe(`Checked ${new Date(FIRST).toLocaleString()}`);
  expect(appCheckLine({ app_says: null, app_checked_at: null }, undefined).text).toBe("Not checked yet");
});

it("renders the moved line in the panel's row", () => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  act(() => createRoot(host).render(<AppCheckText item={{ app_says: null, app_checked_at: FIRST }} result={{ at: LATER, ok: true, says: null }} />));
  expect(host.querySelector("[data-testid=spaces-automation-app-checked]")?.textContent).toBe(`Checked ${new Date(LATER).toLocaleString()}`);
});

it("the panel hands every check result to the line (it was reading only the stored time)", () => {
  const fs = require("fs") as typeof import("fs");
  const src = fs.readFileSync(process.env.AUTOMATIONS_SRC ?? require("path").join(__dirname, "../Automations.tsx"), "utf8");
  expect(src).toMatch(/<AppCheckText item=\{a\} result=\{checked\[a\.id\]\}/);
  expect(src).not.toMatch(/a\.app_checked_at \?/);
});
