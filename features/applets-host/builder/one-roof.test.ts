// features/applets-host/builder/one-roof.test.ts — lane ROOF (2026-10-22): Spaces, Make and Applets under one roof.
//
// "Build an Applet on this database": a Space database seeds the ONE builder with its table (`?seed=`), the seed
// survives the address, the table is named to the builder and its organization is where the build runs.
// "A Space page as an Applet page": a page she placed (`space`) survives the builder's answer and every rewrite.
import { attachedTableIds, attachedTableOrganization, attachmentsContext, readBuildSeed } from "./build-references";
import { buildSeedHref, tableReference } from "./build-seed";
import { coerceBuildAnswer, keepSpacePages } from "./build-applet";

const TABLE = tableReference({ tableId: "t-clients", organizationId: "org-7", label: "Clients" });

describe("build an Applet on this database", () => {
  it("the seed carries the table through the builder's address", () => {
    const href = buildSeedHref([TABLE]);
    expect(href.startsWith("/applets/build?seed=")).toBe(true);
    const refs = readBuildSeed(decodeURIComponent(href.split("?seed=")[1] ?? ""));
    expect(refs).toEqual([TABLE]);
    expect(attachedTableIds(refs)).toEqual(["t-clients"]);
    expect(attachedTableOrganization(refs)).toBe("org-7");
    expect(attachmentsContext(refs)).toContain("bind it, so the Applet reads and writes these records");
  });

  it("a table reference without its organization is left out", () => {
    expect(readBuildSeed(JSON.stringify([{ ...TABLE, organization_id: "" }]))).toEqual([]);
  });
});

describe("a Space page as an Applet page", () => {
  it("the builder's answer keeps a page's space", () => {
    const answer = coerceBuildAnswer({ applet: { name: "A", entry: "App.tsx", files: [{ name: "App.tsx", source: "export default function App() { return null; }" }], pages: [{ path: "/notes", title: "Notes", space: "sp-1" }], sources: [], mandates: [] }, note: "" });
    expect(answer.applet.pages).toEqual([{ path: "/notes", title: "Notes", file: "", space: "sp-1" }]);
  });

  it("a Space page the answer left out is put back; one whose address the answer now uses is not", () => {
    const current = [
      { path: "/", title: "Home", file: "App.tsx" },
      { path: "/notes", title: "Notes", file: "", space: "sp-1" },
      { path: "plan", title: "Plan", file: "", space: "sp-2" },
    ];
    const answer = [
      { path: "/", title: "Home", file: "App.tsx" },
      { path: "/plan", title: "Plan", file: "Plan.tsx" },
    ];
    expect(keepSpacePages(answer, current)).toEqual([...answer, { path: "/notes", title: "Notes", file: "", space: "sp-1" }]);
    expect(keepSpacePages(answer, null)).toEqual(answer);
  });
});
