// scripts/__tests__/surface-impact-ownership.test.ts
//
// 2026-10-22: `check:surface-impact` warned SURFACE_UNOWNED on 166 applet surfaces. They are
// declared in the database (`declared_by = 'database'`, written by `ui.save_applet_surface` /
// `save_surface_extension`), and under surface-declarations plan D1 the DB IS their owner. A code
// row with no manifest and no server JSON stays unowned.

import { surfaceOwner } from "../lib/surface-ownership";

const NONE = new Set<string>();

describe("who owns a ui_surface row (check:surface-impact)", () => {
  it("a database-declared surface is owned by its DB authoring path", () => {
    expect(surfaceOwner({ name: "applets/abc", declared_by: "database" }, NONE, NONE)).toBe("database");
  });

  it("a code surface is owned by its manifest or its server JSON declaration", () => {
    expect(surfaceOwner({ name: "matrx-user/notes", declared_by: "code" }, new Set(["matrx-user/notes"]), NONE)).toBe("manifest");
    expect(surfaceOwner({ name: "sms/assistant", declared_by: "code" }, NONE, new Set(["sms/assistant"]))).toBe("server-json");
  });

  it("a code row with neither is unowned — the check still reports it", () => {
    expect(surfaceOwner({ name: "matrx-user/gone", declared_by: "code" }, NONE, NONE)).toBeNull();
    expect(surfaceOwner({ name: "matrx-user/gone", declared_by: null }, NONE, NONE)).toBeNull();
  });
});

describe("check:surface-impact reads declared_by and asks surfaceOwner", () => {
  it("selects the column and gates both unowned findings on the one helper", () => {
    const src = require("node:fs").readFileSync(require("node:path").resolve(__dirname, "../check-surface-impact.ts"), "utf8") as string;
    expect(src).toMatch(/"id,name,is_active,parent_surface_name,declared_by"/);
    expect(src).toMatch(/surfaceOwner\(s, codeBySurface, serverDeclared\) !== null/);
  });
});
