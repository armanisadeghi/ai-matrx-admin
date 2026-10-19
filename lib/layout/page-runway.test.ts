/**
 * THE PAGE RUNWAY (owner, 2026-10-19) — every page that scrolls lets its last line reach about
 * half the screen, never less than what floats; one value, every page reads it; nothing may shrink
 * it; floating chrome rests above a page's own bottom bar. Born from /notes: Plain mode ended 44px
 * under its last line, Read mode 78px, and the page assistant sat on the notes status bar.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PAGE_FOOT_ATTR, measurePageFoot } from "./floating-chrome";
import { PAGE_RUNWAY_VIEWPORT_FRACTION, pageRunwayPx, runwayVerdict } from "./page-rhythm";

const ROOT = resolve(__dirname, "../..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");
const SHELL_CSS = read("styles/shell.css");

describe("the page runway value", () => {
  it("is ONE token: half the screen, never less than the floating clearance", () => {
    expect(SHELL_CSS).toMatch(/--matrx-page-runway:\s*max\(50dvh,\s*var\(--matrx-floating-clearance\)\);/);
    expect(PAGE_RUNWAY_VIEWPORT_FRACTION).toBe(0.5);
  });

  it("every shell runway reads it — none is left at the bare floating clearance", () => {
    expect(SHELL_CSS).not.toMatch(/max\(\s*var\(--matrx-floating-clearance\),\s*var\(--shell-fixed-alert-clearance/);
    expect(SHELL_CSS).not.toMatch(/height:\s*max\(var\(--shell-fixed-alert-clearance\),\s*var\(--matrx-floating-clearance\)\)/);
    const runwayReads = SHELL_CSS.match(/var\(--matrx-page-runway\)/g) ?? [];
    expect(runwayReads.length).toBeGreaterThanOrEqual(6);
  });

  it("the generous end-space class and education read the same token, not their own numbers", () => {
    const block = /\.scroll-page-end-space,[\s\S]*?\{([\s\S]*?)\}/.exec(SHELL_CSS)?.[1] ?? "";
    expect(block).toContain("var(--matrx-page-runway)");
    expect(block).not.toMatch(/40dvh|20rem/);
  });

  it("the full-page notes editor pads every mode with the token, never a private number", () => {
    const notes = read("features/notes/components/NoteEditorCore.tsx");
    expect(notes).toContain('"pb-[var(--matrx-page-runway)] [--matrx-textarea-end:var(--matrx-page-runway)]"');
    expect(notes).toContain('"[&_.rich-editor-column]:pb-[var(--matrx-page-runway)]!"');
    expect(notes).not.toContain("pb-[85dvh]");
    expect(notes).toContain('data-matrx-page-runway={embedded ? undefined : ""}');
  });
});

describe("runwayVerdict", () => {
  it("half the screen, or what floats + the page end when that is taller", () => {
    expect(pageRunwayPx(800, 1280, 0)).toBe(400);
    expect(pageRunwayPx(800, 1280, 500)).toBe(516);
    expect(pageRunwayPx(600, 375, 0)).toBe(300);
  });

  it("calls the /notes Plain (44px) and Read (78px) ends short, the runway ok, a stacked padding double", () => {
    const runway = pageRunwayPx(768, 1024, 98);
    expect(runwayVerdict(44, runway, 1024)).toBe("short");
    expect(runwayVerdict(78, runway, 1024)).toBe("short");
    expect(runwayVerdict(runway, runway, 1024)).toBe("ok");
    expect(runwayVerdict(runway + 48, runway, 1024)).toBe("double");
  });
});

describe("a page's own bottom bar lifts the floating chrome", () => {
  const bar = (top: number, bottom: number, inWindow = false) => {
    const host = document.createElement("div");
    if (inWindow) host.setAttribute("data-window-panel", "");
    const el = document.createElement("div");
    el.setAttribute(PAGE_FOOT_ATTR, "");
    el.getBoundingClientRect = () => ({ top, bottom, left: 0, right: 900, width: 900, height: bottom - top, x: 0, y: top, toJSON: () => ({}) });
    host.appendChild(el);
    document.body.appendChild(host);
    return host;
  };
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("measures a bar on the floor (the notes status bar, 28px)", () => {
    bar(740, 768);
    expect(measurePageFoot(document, 768)).toBe(28);
  });

  it("ignores a bar mid-page and one inside a floating window", () => {
    bar(400, 428);
    bar(740, 768, true);
    expect(measurePageFoot(document, 768)).toBe(0);
  });

  it("the dock's bottom adds the measured bar, and the notes bar declares itself", () => {
    const dock = /\.ambient-assistant-dock \{[\s\S]*?\}/.exec(SHELL_CSS)?.[0] ?? "";
    expect(dock).toContain("var(--matrx-page-foot-h, 0px)");
    expect(read("features/notes/components/NoteMetadataBar.tsx")).toContain('data-matrx-page-foot=""');
    expect(read("features/shell/components/FloatingClearanceSync.tsx")).toContain("measurePageFoot(");
  });
});
