/**
 * THERE IS ONE CANVAS. It is the @ai-matrx/canvas column, placed by
 * `ShellCanvasColumn`, mounted once per layout stack: the app shell and the
 * three provider stacks of the public and link layouts. A route never mounts, wraps or forks a canvas of
 * its own — it opens things INTO the one canvas.
 *
 * Static: scans every tracked app .ts/.tsx; the column implementation ships from npm.
 */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const ROOT = process.cwd();

function trackedSources(): string[] {
  return execSync("git ls-files '*.ts' '*.tsx'", { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
    .split("\n")
    .filter((p) => p && !p.includes("__tests__/one-canvas-column"));
}

const isTest = (path: string) => /(__tests__\/|\.test\.tsx?$|\.spec\.tsx?$)/.test(path);

function filesMatching(pattern: RegExp, { includeTests = true } = {}): string[] {
  return trackedSources().filter((path) => {
    if (!includeTests && isTest(path)) return false;
    try {
      return pattern.test(readFileSync(`${ROOT}/${path}`, "utf8"));
    } catch {
      return false; // deleted in the working tree
    }
  });
}

describe("one canvas", () => {
  it("only ShellCanvasBody renders the canvas column, and nothing renders CanvasFrame", () => {
    // A test may mount the real column to see a tab's body (side-panels-are-canvas-tabs).
    expect(filesMatching(/<CanvasColumn[\s/>]/, { includeTests: false })).toEqual(["features/canvas/host/ShellCanvasBody.tsx"]);
    expect(filesMatching(/<CanvasFrame[\s/>]/)).toEqual([]);
  });

  it("the canvas body has two hosts: the classic column and the new frame's canvas panel", () => {
    expect(filesMatching(/<ShellCanvasBody[\s/>]/, { includeTests: false }).sort()).toEqual(
      ["features/canvas/host/ShellCanvasColumn.tsx", "features/shell/frame-host/FrameCanvas.tsx"].sort(),
    );
  });

  it("ShellCanvasColumn is mounted only by the app shell and the public / link provider stacks", () => {
    // The public and link layouts no longer mount it themselves: they render these stacks (the
    // applet layout is the link layout's own stack for /applets/[slug]).
    expect(filesMatching(/<ShellCanvasColumn[\s/>]/).sort()).toEqual(
      [
        "app/(link)/applets/[slug]/layout.tsx",
        "components/public-link/LinkProviders.tsx",
        "features/public-shell/PublicFullProvidersImpl.tsx",
        "features/shell/components/AppShell.tsx",
      ].sort(),
    );
  });

  it("only the host binds the canvas to the store (tests may mount their own)", () => {
    expect(filesMatching(/<CanvasProvider[\s/>]/, { includeTests: false })).toEqual(["features/canvas/host/CanvasHostProvider.tsx"]);
  });
});
