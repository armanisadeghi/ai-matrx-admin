/**
 * /devices console (2026-10-17 web walk): a tapped row says it is opening (the console took 1-3 s with
 * no feedback), and a direct load of ?view=sessions on an ONLINE computer never starts a shell nor
 * writes `&t=` (it showed Terminal, then Sessions).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";

let pending = false;
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children }: { children: unknown }) => children,
  useLinkStatus: () => ({ pending }),
}));

import { partitionByAge, RowOpening } from "../DeviceList";

describe("a tapped device row says it is opening", () => {
  it("shows a spinner while the console loads, the chevron otherwise", () => {
    pending = true;
    expect(renderToStaticMarkup(<RowOpening />)).toMatch(/role="status"[^>]*|aria-label="Opening"/);
    expect(renderToStaticMarkup(<RowOpening />)).toContain('aria-label="Opening"');
    pending = false;
    expect(renderToStaticMarkup(<RowOpening />)).not.toContain('aria-label="Opening"');
  });
});

describe("the console's first connection honours the view in the address", () => {
  const src = readFileSync(join(__dirname, "../TerminalPanel.tsx"), "utf8");
  it("the terminal opens or attaches a shell only once its view is on screen", () => {
    expect(src).toMatch(/if \(!visible \|\| !live \|\| !ready \|\| !pageVisible/);
    expect(src).toMatch(/\}, \[visible, live, ready, pageVisible\]\);/);
  });
});

describe("the list never reorders under the finger when the relay answers", () => {
  it("recent vs older comes from the rows alone (no relay argument), so a late 'online' moves nothing", () => {
    const now = Date.parse("2026-10-17T08:00:00Z");
    const rows = [
      { id: "new", last_seen: "2026-10-17T07:00:00Z" },
      { id: "old", last_seen: "2026-08-01T07:00:00Z" },
    ] as never[];
    const { recent, older } = partitionByAge(rows, now);
    expect(recent.map((r: { id: string }) => r.id)).toEqual(["new"]);
    expect(older.map((r: { id: string }) => r.id)).toEqual(["old"]);
    expect(partitionByAge.length).toBe(2);
    const src = readFileSync(join(__dirname, "../DeviceList.tsx"), "utf8");
    expect(src).not.toMatch(/statuses\[d\.id\]\?\.online\) return false/);
  });
});
