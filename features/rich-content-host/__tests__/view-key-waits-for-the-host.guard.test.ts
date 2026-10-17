// A render never reads a host-registered source adapter before the lazy rich-content host lands.
// Crash 2026-10-16: opening a note showed "No source adapter registered for type: note" — the
// metadata bar called richDocumentViewKey(noteSource) at render, and the "note" adapter is registered
// by the host (providers/richContentHost.ts), which loads lazily. The mobile note dock and the
// study-guide reader had the same read. Every app-side richDocumentViewKey( call is gated on the host
// having landed (useNoteRenderHost / useRichContentHostLanded), or uses the package's
// useRichDocumentViewKey. FAILS on the old code (three ungated calls); passes now.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../../..");

it("every render-time richDocumentViewKey( call waits for the host", () => {
  const files = execFileSync("git", ["grep", "-l", "richDocumentViewKey(", "--", "*.tsx", ":!**/__tests__/**", ":!*.test.tsx"], {
    cwd: ROOT,
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean);
  const ungated: string[] = [];
  for (const f of files) {
    fs.readFileSync(path.join(ROOT, f), "utf8")
      .split("\n")
      .forEach((line, i) => {
        if (line.includes("richDocumentViewKey(") && !/\?\s*richDocumentViewKey\(/.test(line)) ungated.push(`${f}:${i + 1}`);
      });
  }
  expect(ungated).toEqual([]);
});
