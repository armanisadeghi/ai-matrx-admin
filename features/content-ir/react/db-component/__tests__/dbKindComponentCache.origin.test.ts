/**
 * A DB kind component whose import the shared kind component scope cannot supply is REFUSED BY NAME
 * (rich-content/code-runtime 5b928bfaee, 2026-10-17: `requireEveryImport` -> `unsupplied_import`; before it the
 * component compiled with an undefined binding and the gap was filed lazily as a sandbox-unresolved-import under
 * `kind-component:<kind>:<platform>:<role>`). The failure must still name the row to fix: the durable incident
 * carries kind, platform and role, and the compile error names the missing specifier.
 */
import type { ComponentResolution } from "@ai-matrx/content-ir/react";
import { reportKindComponentIncident } from "@/features/content-ir/react/db-component/kindComponentIncident";
import { getOrCompileDbKindComponent } from "@/features/content-ir/react/db-component/dbKindComponentCache";
import {
  clearCapturedErrors,
  getSnapshot,
} from "@/lib/diagnostics/errorCaptureStore";
import { resetUnresolvedImportCaptures } from "@/lib/diagnostics/captureUnresolvedImports";

jest.mock("@/features/content-ir/react/db-component/kindComponentIncident", () => ({
  reportKindComponentIncident: jest.fn(),
}));

beforeEach(() => {
  (reportKindComponentIncident as jest.Mock).mockClear();
  clearCapturedErrors();
  resetUnresolvedImportCaptures();
});

it("refuses an unsupplied import by name and files the incident under the kind, platform and role it compiled for", async () => {
  const resolution = {
    componentKey: "listing_scorecard_view",
    source: "db",
    config: {},
    isActive: true,
    resolvedBy: "db",
    componentSource: `
      import { ScoreDial } from "@/features/listings/ScoreDial";
      export default function Scorecard({ data }) {
        return <div><ScoreDial /> {String(data?.title ?? "")}</div>;
      }
    `,
    propsTransform: null,
    hasComponentSource: true,
    pinnedKindVersion: null,
    updatedAt: "2026-10-01T09:00:00Z",
    createdBy: null,
  } as unknown as ComponentResolution;

  const result = getOrCompileDbKindComponent("listing_scorecard", resolution);
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("unreachable");
  expect(String(result.error)).toContain('"@/features/listings/ScoreDial"');
  await new Promise((resolve) => setTimeout(resolve, 0));

  expect(reportKindComponentIncident).toHaveBeenCalledTimes(1);
  expect(reportKindComponentIncident).toHaveBeenCalledWith(
    expect.objectContaining({
      kind: "listing_scorecard",
      errorType: "compile_error",
      platform: "web",
      role: "output",
      componentKey: "listing_scorecard_view",
      message: expect.stringContaining("@/features/listings/ScoreDial"),
    }),
  );
  // And it is loud in the client inspector too, naming the kind.
  expect(
    getSnapshot().some((e) => e.source === "content-ir" && String(e.message).includes('"listing_scorecard"')),
  ).toBe(true);
});
