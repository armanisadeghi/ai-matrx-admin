/**
 * The preview must be able to FAIL.
 *
 * The old Preview tab handed a stored example straight to the component as an
 * object — no text, no recognition, no routing — so it showed green for kinds
 * that were rendering as key/value dumps in chat. These tests pin the property
 * that fixes that: each path reports what the route ACTUALLY returned, and a
 * kind with no component reaches the generic floor here exactly as it does in
 * production.
 */

import { componentRegistry } from "@/features/content-ir/registry/component-registry";
import { kindRegistry } from "@/features/content-ir/registry/kind-registry";
import { runRenderPath, reachedRealComponent } from "../run-path";
import { IR_ROUTE_KEY } from "@ai-matrx/rich-content/kinds/react/kind-route";
import { RENDER_PATHS } from "../paths";

// 🚨 A PARTIAL MOCK OF A REAL MODULE IS A SUITE THAT DIES ON THE NEXT EXPORT
// (DD-239). This used to replace the whole capture store with `{ captureError }`.
// When the session barrier started calling `setSessionStateProbe` from the same
// module at client-construction time, the mock no longer satisfied it and THIS
// SUITE DIED AT IMPORT — no test ran, for days, while the file still looked
// green in a list. Spread the real module: only the export this suite needs to
// observe is replaced, and a new export can never silently take the suite down.
jest.mock("@/lib/diagnostics/errorCaptureStore", () => ({
  ...jest.requireActual("@/lib/diagnostics/errorCaptureStore"),
  captureError: jest.fn(),
}));

const VALUE = {
  status: "complete",
  image_count_received: 5,
  products: [{ __kind: "product_entry", product_index: 1 }],
};

function seedComponent(kind: string) {
  componentRegistry.ingestDbRows([
    {
      kind,
      platform: "web",
      role: "output",
      componentKey: `${kind}_board`,
      source: "db",
      config: {},
      isActive: true,
      componentSource: "export default function B() { return null; }",
      propsTransform: null,
      pinnedKindVersion: null,
      updatedAt: "2026-08-29T00:00:00.000Z",
      createdBy: null,
    },
  ]);
}

const STREAMING = RENDER_PATHS.filter((p) => p.streams).map((p) => p.id);

describe("render paths report what the route actually did", () => {
  it("every streaming path recognizes the kind from raw text", () => {
    seedComponent("path_probe_kind");
    for (const id of STREAMING) {
      const run = runRenderPath(id, "path_probe_kind", VALUE);
      if (!run) throw new Error(`${id} produced no run`);
      if (!run.wire) throw new Error(`${id} streamed no text`);
      // The accumulator saw the shape — the recognition step the old preview
      // skipped entirely.
      const identified = run.records.some(
        (r) => r.envelope?.kind === "path_probe_kind",
      );
      if (!identified) throw new Error(`${id} never identified the kind`);
      expect(identified).toBe(true);
    }
  });

  it("a kind WITH a component reaches it on the chat paths", () => {
    seedComponent("path_ok_kind");
    for (const id of ["chat_fence", "chat_bare"] as const) {
      const run = runRenderPath(id, "path_ok_kind", VALUE)!;
      expect(run.verdict.reachedRealComponent).toBe(true);
      expect(run.verdict.resolvedAs).toBe("db_kind_component");
    }
  });

  it("a kind with NO component honestly reports the generic floor", () => {
    // THE PROPERTY THE OLD PREVIEW LACKED. A real failure, shown as one.
    const run = runRenderPath("chat_bare", "path_no_component_kind", VALUE)!;
    expect(run.verdict.reachedRealComponent).toBe(false);
    expect(run.verdict.resolvedAs).toBe("generic_structured");
    expect(run.verdict.fallbackReason).toBe("unregistered");
  });

  it("reached = a bound component, never merely a payload on a plain block", () => {
    // Live 2026-10-14 (brand_intake_facts): the route left a `code` block carrying
    // serverData and the verdict said a real component rendered.
    const data = { status: "x" };
    expect(reachedRealComponent({ type: "code", serverData: data })).toBe(false);
    expect(reachedRealComponent({ type: "code", serverData: data, metadata: { __ir: {} } })).toBe(false);
    expect(reachedRealComponent({ type: "generic_structured", serverData: data })).toBe(false);
    expect(reachedRealComponent({ type: "db_kind_component", serverData: data })).toBe(true);
    const bound = (by: string, extra = {}) => ({
      type: "some_component",
      serverData: data,
      metadata: { [IR_ROUTE_KEY]: { by, key: "some_component", ...extra } },
    });
    expect(reachedRealComponent(bound("compiled"))).toBe(true);
    expect(reachedRealComponent(bound("generic", { unverified: true, reason: "unregistered" }))).toBe(false);
  });

  it("an unregistered kind never reports a component on any chat path", () => {
    for (const id of ["chat_fence", "chat_fence_one_line", "chat_xml_tag", "chat_bare"] as const) {
      const run = runRenderPath(id, "path_unregistered_code_kind", VALUE)!;
      expect(run.verdict.reachedRealComponent).toBe(false);
    }
  });

  it("artifact paths judge what the artifact card actually draws (SHAPES-BUGS 2.3)", () => {
    // Live 2026-10-14 (brand_basics): both artifact paths said "generic
    // key/value view · no component drew this" while the shape's own
    // component rendered right under the verdict. The artifact card draws a
    // kind body through the kind front door — the same route a reloaded
    // record takes — so its verdict is that route's answer, not "artifact".
    seedComponent("path_artifact_kind");
    for (const id of ["chat_artifact", "chat_artifact_materialized"] as const) {
      const run = runRenderPath(id, "path_artifact_kind", VALUE)!;
      expect(run.blocks.some((b) => b.type === "artifact")).toBe(true);
      expect(run.verdict.reachedRealComponent).toBe(true);
      expect(run.verdict.resolvedAs).toBe("db_kind_component");
      expect(run.verdict.notes.join(" ")).not.toMatch(/No component drew this/);
    }
    // And with no component, the same card honestly reports the generic floor.
    for (const id of ["chat_artifact", "chat_artifact_materialized"] as const) {
      const run = runRenderPath(id, "path_artifact_bare_kind", VALUE)!;
      expect(run.verdict.reachedRealComponent).toBe(false);
      expect(run.verdict.resolvedAs).toBe("generic_structured");
    }
  });

  it("a plain-value shape (root form, e.g. json) says WHY chat shows the generic view (SHAPES-BUGS 3.2)", () => {
    // Live 2026-10-14 (`json`, schema {} = any value): the example passed its
    // schema, reload drew value_result, and the chat verdict said only
    // "broken-instance". The truth: a plain-value shape can never travel as a
    // tagged object in chat, so the screen must say that, not imply a bad example.
    kindRegistry.upsertDefinition({
      kind: "path_root_json_kind",
      schema: { kind: "path_root_json_kind", fields: {}, root: { type: "json" } },
      schemaSource: "content_ir",
      tier: "cold",
    });
    seedComponent("path_root_json_kind");
    const run = runRenderPath("chat_fence", "path_root_json_kind", VALUE)!;
    expect(run.verdict.reachedRealComponent).toBe(false);
    expect(run.verdict.notes.join(" ")).toMatch(/single plain value/);
    // The reload path draws the component — and carries no such note.
    const reload = runRenderPath("reload", "path_root_json_kind", VALUE)!;
    expect(reload.verdict.reachedRealComponent).toBe(true);
    expect(reload.verdict.notes.join(" ")).not.toMatch(/single plain value/);
  });

  it("the reload path routes a stored value the way a rehydrated message does", () => {
    seedComponent("path_reload_kind");
    const run = runRenderPath("reload", "path_reload_kind", VALUE)!;
    expect(run.wire).toBeNull(); // nothing streams here, in production either
    expect(run.verdict.reachedRealComponent).toBe(true);
  });

  it("the server-partial path SAYS its input is synthesized", () => {
    seedComponent("path_partial_kind");
    const run = runRenderPath("server_partial", "path_partial_kind", VALUE)!;
    expect(
      run.verdict.notes.some((n) => /constructed in this browser/.test(n)),
    ).toBe(true);
  });
});
