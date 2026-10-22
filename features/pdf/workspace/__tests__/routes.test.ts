/**
 * The PDF workspace's pages and mounting, checked as the app is wired: the feature is declared (a tool with a front door),
 * the front door and the record page exist, the record page checks access and names why when it refuses, every PDF
 * is one click from the workspace, and the host is built in a client hook (never a start-up `configure*Host`).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PDF_SURFACES } from "../../surfaces/registry";

const root = join(__dirname, "..", "..", "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

describe("the /pdf pages", () => {
  it("declares the feature and ships its front door and record page", () => {
    expect(read("features/shell/constants/feature-pages.ts")).toMatch(/route: "\/pdf", node: "files\/pdf", kind: "tool"/);
    expect(existsSync(join(root, "app/(core)/pdf/page.tsx"))).toBe(true);
    expect(existsSync(join(root, "app/(core)/pdf/[fileId]/page.tsx"))).toBe(true);
    expect(read("app/(core)/pdf/page.tsx")).toContain("PdfFrontDoor");
    expect(read("features/pdf/workspace/PdfFrontDoor.tsx")).toContain("surfaceName={PDF_FRONT_DOOR_SURFACE_NAME}");
  });

  it("the record page reads the file as the signed-in person and, when it cannot, names why through the access gate", () => {
    const page = read("app/(core)/pdf/[fileId]/page.tsx");
    expect(page).toContain('.from("files")');
    expect(page).toMatch(/<AccessGate\s+token="file"/);
    expect(page).toContain("PdfWorkspaceRoute");
  });

  it("guests get the sign-in gate, not the workspace", () => {
    const layout = read("app/(core)/pdf/layout.tsx");
    expect(layout).toContain("getSessionVerdict");
    expect(layout).toContain("ModuleSignInGate");
  });

  it("the workspace route mounts its surface and the package chrome", () => {
    const route = read("features/pdf/workspace/PdfWorkspaceRoute.tsx");
    expect(route).toContain("PDF_WORKSPACE_SURFACE_NAME");
    expect(read("features/pdf/workspace/WorkspaceSurface.tsx")).toContain('"matrx-user/analysis-studio"');
    expect(route).toContain("<RecordPageHeader");
    expect(route).toContain("<PdfWorkspace host={host}");
  });
});

describe("mounting", () => {
  it("every PDF surface menu offers the workspace for a file, and nothing for a document with no file", () => {
    const entry = PDF_SURFACES.find((s) => s.id === "pdf-workspace");
    expect(entry?.buildHref({ fileId: "abc", processedDocumentId: null })).toBe("/pdf/abc");
    expect(entry?.buildHref({ fileId: null, processedDocumentId: "p" })).toBeNull();
  });

  it("the host is a hook in a client module, never a start-up configure call", () => {
    for (const f of ["features/pdf/workspace/usePdfWorkspaceHost.tsx", "features/pdf/workspace/PdfWorkspaceRoute.tsx"]) {
      const src = read(f);
      expect(src.startsWith('"use client";')).toBe(true);
      expect(src).not.toMatch(/^configure\w*Host\(/m);
    }
  });

  it("the stylesheet scans the office package so the chrome's classes exist", () => {
    expect(read("app/globals.css")).toContain('@source "../node_modules/@ai-matrx/office/dist";');
  });
});
