/**
 * A FRAMED PAGE'S DOCKS NEVER FLOAT OVER IT (2026-10-20). An app page shown inside the app — a
 * launchpad "App page" widget, a board Page tile (`<html data-board-embed>`) — is usually narrower
 * than `md`, so it draws its phone layout, and the phone's bottom docks (the notes editor's
 * undo/format/Home·Copy·Tags·More dock, the list search bar) floated over the page's text inside a
 * 438px frame. In a frame a page dock is the page's last row instead: the page ends above it and
 * every control stays reachable (styles/shell.css §13d).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { PAGE_DOCK_ATTR } from "./floating-chrome";

const ROOT = resolve(__dirname, "../..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");
const SHELL_CSS = read("styles/shell.css");

/** A phone dock: hidden from `md` up, pinned to the bottom of the page or the viewport. */
const PHONE_DOCK = /md:hidden\s+(?:fixed|absolute)\s+bottom-0|(?:fixed|absolute)\s+bottom-0[^"]*\bmd:hidden\b/;

function tsxFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) tsxFiles(path, out);
    else if (name.endsWith(".tsx") && !name.includes(".test.")) out.push(path);
  }
  return out;
}

describe("a framed page's docks", () => {
  it("the shell lays every page dock in the page's flow inside a frame", () => {
    expect(PAGE_DOCK_ATTR).toBe("data-matrx-page-dock");
    const rule = /html\[data-board-embed\]\s+\.flex-col\s*>\s*\[data-matrx-page-dock\]\s*\{([^}]*)\}/.exec(SHELL_CSS)?.[1] ?? "";
    expect(rule).toMatch(/position:\s*relative\s*!important/);
    expect(rule).toMatch(/inset:\s*auto\s*!important/);
  });

  it("in a frame the dock is in flow, so it is solid: every glass token is re-declared opaque", () => {
    const rule = /html\[data-board-embed\]\s+\.flex-col\s*>\s*\[data-matrx-page-dock\]\s*\{([^}]*)\}/.exec(SHELL_CSS)?.[1] ?? "";
    // Every leaf glass token the app declares (app/globals.css) must be overridden, or some glass survives.
    const declared = new Set(read("app/globals.css").match(/--matrx-glass-[a-z-]+(?=:)/g) ?? []);
    expect(declared.size).toBeGreaterThan(5);
    for (const token of declared) expect(rule).toMatch(new RegExp(`${token}:`));
    expect(rule).toMatch(/--matrx-glass-bg:\s*hsl\(var\(--card\)\)/);
    expect(rule).toMatch(/--matrx-glass-blur:\s*0px/);
    expect(rule).not.toMatch(/--matrx-glass-bg:\s*rgba/);
  });

  it("every phone dock declares itself a page dock (census over features/, components/, app/)", () => {
    const offenders: string[] = [];
    for (const top of ["features", "components", "app"]) {
      for (const file of tsxFiles(resolve(ROOT, top))) {
        const lines = readFileSync(file, "utf8").split("\n");
        lines.forEach((line, i) => {
          if (!PHONE_DOCK.test(line)) return;
          // The attribute sits on the same element: this line or the next few of its opening tag.
          const tag = lines.slice(Math.max(0, i - 3), i + 4).join("\n");
          if (!tag.includes(PAGE_DOCK_ATTR)) offenders.push(`${file.slice(ROOT.length + 1)}:${i + 1}`);
        });
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the two known phone docks are the last row of a flex column, so the frame rule reaches them", () => {
    const editor = read("features/notes/components/mobile/MobileNoteEditor.tsx");
    expect(editor).toContain('className="h-full bg-background flex flex-col overflow-hidden relative"');
    const notesList = read("features/notes/components/mobile/MobileNotesList.tsx");
    expect(notesList).toContain('<div className="h-full flex flex-col bg-background overflow-hidden">');
  });
});
