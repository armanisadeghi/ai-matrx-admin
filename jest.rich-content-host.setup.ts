/**
 * @ai-matrx/rich-content's host for Jest — the same capabilities as providers/richContentHost.ts,
 * but every one resolves the app module AT CALL TIME (`require` inside the getter), so a suite's
 * `jest.mock("@/lib/toast")` (or any other mocked app module) still reaches the engine code that
 * moved into the package, exactly as when that code imported the app module itself.
 */
import { configureRichContent } from "@ai-matrx/rich-content/host";
import { registerKindCorrector } from "@ai-matrx/rich-content/kinds/registry/kind-correctors";

/* eslint-disable @typescript-eslint/no-require-imports */
function late<T extends object>(load: () => T): T {
  return new Proxy(function () {} as unknown as T, {
    get(_t, key) {
      const target = load() as Record<PropertyKey, unknown>;
      const value = target[key];
      return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(target) : value;
    },
    apply(_t, _this, args) {
      return (load() as unknown as (...a: unknown[]) => unknown)(...args);
    },
  });
}

configureRichContent({
  // The app bindings load on first use (they import the app's windows, canvas, kind views and
  // domain blocks — too much to load into every suite); loading them re-registers `app` itself.
  app: new Proxy({}, {
    get(_t, key) {
      require("@/features/rich-content-host/app-bindings");
      return (require("@ai-matrx/rich-content/host").hostCapability("app") as Record<PropertyKey, unknown> | undefined)?.[key];
    },
  }) as never,
  // The app's domain blocks + JSON answer renderer register on the first block lookup, after the
  // suite's own jest.mock calls, so a mocked block still reaches the registry.
  ensureBlockRegistrations: () => {
    require("@/features/rich-content-host/app-bindings");
  },
  ensureRichDocumentRegistrations: () => {
    require("@/features/rich-content-host/rich-document-registrations").ensureWebRichDocumentRegistrations();
  },
  showManualCopy: (opts) => require("@/components/dialogs/clipboard-fallback/manualCopyOpener").showManualCopy(opts),
  readSessionKnob: (knob) => require("@/lib/scoped-config/sessionKnob").getSessionKnob(knob),
  toast: late(() => require("@/lib/toast").toast),
  captureError: (report) => require("@/lib/diagnostics/errorCaptureStore").captureError(report),
  ErrorActions: (props) => require("@/components/errors/ErrorAlchemyMenu").ErrorAlchemyMenu(props),
  NestedContent: (props) => require("react").createElement(require("@ai-matrx/rich-content/levels/standard/NestedRichContent").NestedRichContent, props),
  wikilinks: {
    resolve: (t) => require("@/features/rich-content-host/wikilink-resolver").resolveWikiTarget(t),
    create: (title) => require("@/features/rich-content-host/wikilink-resolver").createWikiPage(title),
    loadBody: (token, id) => require("@/features/rich-content-host/wikilink-resolver").loadWikiBody(token, id),
  },
  resolvePerson: async (id) => require("@/features/organizations/people/visiblePeople").resolveVisiblePerson(id),
  ResourcePeek: (props) => require("react").createElement(require("@/features/organizations/peek/ResourcePeekHost").ResourcePeekHost, props),
  splitterEnvelopes: {
    withIrEnvelope: (source, metadata) => require("@ai-matrx/rich-content/kinds/registry/region-envelope-memo").withIrEnvelope(source, metadata),
    fenceRegion: (l, t) => require("@/features/content-ir/surfaces/xml-finalize").envelopeForCompletedFenceRegion(l, t),
    xmlRegion: (tag, t) => require("@/features/content-ir/surfaces/xml-finalize").envelopeForCompletedXmlRegion(tag, t),
  },
  useOpenSaveToTable: () => require("@/features/overlays/definitions/saveToTable.overlay").useOpenSaveToTable(),
  kindRegistry: late(() => require("@/features/content-ir/registry/kind-registry").kindRegistry),
  // The package kind registry's database tiers read through these (the host passes the same two to registerKindHost).
  kindDataClient: async () => require("@/utils/supabase/client").supabase,
  loadTableKindSource: async () => require("@/features/content-ir/registry/table-kind-source"),
  componentRegistry: late(() => require("@/features/content-ir/registry/component-registry").componentRegistry),
  sessionReady: {
    hasSession: () => require("@/features/content-ir/registry/session-ready").hasSession(),
    whenSessionReady: (listener: () => void) => require("@/features/content-ir/registry/session-ready").whenSessionReady(listener),
  },
  adminLaneOpen: () => require("@/utils/supabase/adminLane").browserAdminLaneOpen(),
  kindViewerOrganizations: late(() => require("@/features/content-ir/registry/kind-viewer-organizations").webViewerOrganizations),
  contentIrHost: late(() => require("@/features/content-ir/host/ContentIrHostBoundary").matrxContentIrHost),
  reportKindComponentIncident: (incident) => require("@/features/content-ir/react/db-component/kindComponentIncident").reportKindComponentIncident(incident),
});

registerKindCorrector("draft_critique", (value) => {
  const result = require("@/features/crm/draft-critique/draftCritique").correctDraftCritique(value);
  return { value: result.critique, corrections: result.corrections };
});

// THE COLD-VERDICT RULE is per kind (@ai-matrx/rich-content >= 0.2.205): "unregistered" is published only once
// THIS kind's own lookups answered. Suites that declare "the list loaded and this kind is not in it" do it with
// `componentRegistry.replaceDbRows([...])` (the whole tier replaced = the list landed). Honour that declaration
// for the per-kind predicate in tests: a full replace marks the warm list landed, and a definition nobody
// registered then reads "absent" (not "pending"). Tests of the pending state itself never call replaceDbRows.
{
  const { ComponentRegistry } = require("@ai-matrx/rich-content/kinds/registry/component-registry");
  const { PackageKindRegistry } = require("@ai-matrx/rich-content/kinds/registry/package-kind-registry");
  const landed = new WeakSet<object>();
  const replaceDbRows = ComponentRegistry.prototype.replaceDbRows;
  ComponentRegistry.prototype.replaceDbRows = function (this: { warmListLanded: boolean }, rows: unknown) {
    replaceDbRows.call(this, rows);
    this.warmListLanded = true;
    landed.add(globalThis);
  };
  const schemaState = PackageKindRegistry.prototype.schemaState;
  PackageKindRegistry.prototype.schemaState = function (this: unknown, kind: string) {
    const state = schemaState.call(this, kind);
    return state === "pending" && landed.has(globalThis) ? "absent" : state;
  };
}
