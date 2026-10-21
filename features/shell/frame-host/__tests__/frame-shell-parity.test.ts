/**
 * ONE PROVIDER LIST, TWO SHELLS. FrameShell renders what AppShell shares with it
 * (FRAME_SHARED_SHELL_PARTS); every other part AppShell renders is named here as classic-only.
 * A new part added to AppShell fails this until it is placed in one list or the other — so the
 * frame never silently loses a provider or a background sync.
 */
import fs from "node:fs";
import path from "node:path";
import { FRAME_SHARED_SHELL_PARTS } from "../frameShellParts";

const CLASSIC_ONLY = [
  "PrepaintScript", "Sidebar", "Header", "ShellUserBlock", "CanvasPrepaintScript", "ShellChatDock",
  "MobileSideSheet", "ShellCanvasColumn", "GlassPortal", "MobileDock", "NavActiveSync", "MobileMenuPathSync",
  "ShellSidebarCookieSync", "ShellChatWidthInstant", "ShellChromeRouteSync",
];

/** Component names a file renders as JSX (comments stripped: a retired part named in a comment is not rendered). */
const rendered = (file: string) => {
  const code = fs
    .readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  return new Set([...code.matchAll(/<([A-Z][A-Za-z0-9]*)[\s/>]/g)].map((m) => m[1]));
};

it("every part AppShell renders is shared with the frame or named classic-only", () => {
  const app = rendered(path.join(__dirname, "../../components/AppShell.tsx"));
  const shared = new Set<string>(FRAME_SHARED_SHELL_PARTS);
  const unplaced = [...app].filter((c) => !shared.has(c) && !CLASSIC_ONLY.includes(c));
  expect(unplaced).toEqual([]);
  expect([...shared].filter((c) => !app.has(c))).toEqual([]);
});

it("FrameShell renders every shared part", () => {
  const frame = rendered(path.join(__dirname, "../FrameShell.tsx"));
  expect(FRAME_SHARED_SHELL_PARTS.filter((c) => !frame.has(c))).toEqual([]);
});
