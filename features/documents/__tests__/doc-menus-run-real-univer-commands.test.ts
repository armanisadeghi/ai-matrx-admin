/**
 * The document's Google-Docs menus and toolbar run REAL Univer commands:
 * every id sent exists in the installed Univer 1.0.4 bundles, and no row is a
 * no-op. Zoom carries the open document's id (Univer refuses it otherwise).
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

import { buildDocMenus, buildDocToolbar, type DocChromeHost } from "../chrome/doc-commands";
import { flattenMenus, type EditorMenuEntry } from "@/components/editor-chrome/editor-menu-model";

function fakeHost() {
  const calls: { kind: string; args: unknown[] }[] = [];
  const host: DocChromeHost = {
    api: {
      executeCommand: (id: string, params?: object) => {
        calls.push({ kind: "exec", args: params ? [id, params] : [id] });
        return true;
      },
    },
    editable: true,
    unitId: () => "doc-1",
    zoom: () => 1,
    print: () => calls.push({ kind: "host.print", args: [] }),
    wordCount: () => calls.push({ kind: "host.wordCount", args: [] }),
    fullScreen: () => false,
    toggleFullScreen: () => calls.push({ kind: "host.toggleFullScreen", args: [] }),
  };
  return { host, calls };
}

function univerCommandIds(): Set<string> {
  const pnpm = join(__dirname, "..", "..", "..", "node_modules", ".pnpm");
  const ids = new Set<string>();
  for (const dir of readdirSync(pnpm)) {
    if (!dir.startsWith("@univerjs+")) continue;
    const name = dir.slice("@univerjs+".length).split("@")[0]!;
    const file = join(pnpm, dir, "node_modules", "@univerjs", name, "lib", "es", "index.js");
    if (!existsSync(file)) continue;
    for (const m of readFileSync(file, "utf8").matchAll(/"([a-z-]+\.(?:command|operation)\.[A-Za-z0-9.-]+)"/g)) ids.add(m[1]!);
  }
  return ids;
}

const PAGE_LINKS = new Set(["help.privacy", "help.terms", "help.feedback"]);

function allRunnables(host: DocChromeHost) {
  const toolbar = buildDocToolbar(host);
  return [
    ...flattenMenus(buildDocMenus(host)),
    ...toolbar.flatMap((t) =>
      t.kind === "menu" ? flattenMenus([{ id: t.id, label: t.label, items: t.items as EditorMenuEntry[] }]) : [],
    ),
    ...toolbar.flatMap((t) => (t.kind === "button" ? [{ id: t.id, run: t.run }] : [])),
  ];
}

describe("document menus and toolbar → Univer", () => {
  it("every command id sent exists in the installed Univer bundles", () => {
    const known = univerCommandIds();
    const { host, calls } = fakeHost();
    for (const a of allRunnables(host)) void a.run();
    const sent = [...new Set(calls.filter((c) => c.kind === "exec").map((c) => c.args[0] as string))];
    expect(sent.length).toBeGreaterThan(35);
    expect(sent.filter((id) => !known.has(id))).toEqual([]);
  });

  it("no row is a no-op, and zoom names the document", () => {
    for (const a of allRunnables(fakeHost().host)) {
      // A Google row we cannot run yet announces its registered promise (google-menu-parity test);
      // Help's policy links open pages. Neither is an editor command.
      if ((a as { soon?: string }).soon || PAGE_LINKS.has(a.id)) continue;
      const { host, calls } = fakeHost();
      void allRunnables(host).find((r) => r.id === a.id)!.run();
      expect({ id: a.id, reached: calls.length > 0 }).toEqual({ id: a.id, reached: true });
    }
    const { host, calls } = fakeHost();
    void flattenMenus(buildDocMenus(host)).find((r) => r.id === "view.zoom.150")!.run();
    expect(calls.at(-1)).toEqual({ kind: "exec", args: ["doc.command.set-zoom-ratio", { zoomRatio: 1.5, documentId: "doc-1" }] });
  });
});
