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
  // An unmocked app client points at a database Jest never reaches, so every kind read would FAIL
  // (never "none") and a kind with no component could only settle at the bounded wait. The test host
  // answers instead from an empty database: every lookup asked is answered, "none" settling it
  // (__tests__/helpers/settle-kind-lookups.ts). A suite that mocks the client keeps its own answers.
  kindDataClient: async () => {
    const client = require("@/utils/supabase/client").supabase;
    return isUnmockedSupabaseClient(client) ? emptyDatabaseClient() : client;
  },
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

/** True for the real supabase-js client (not a suite's jest.mock stand-in). */
function isUnmockedSupabaseClient(client: unknown): boolean {
  const from = (client as { from?: unknown } | null)?.from;
  return typeof from === "function" && !jest.isMockFunction(from) && (client as object).constructor?.name === "SupabaseClient";
}

/**
 * A database with no rows: any query chain resolves `{ data, error: null }` — `null` for a single-row
 * read (`maybeSingle` / `single`), `[]` for everything else, count 0.
 */
function emptyDatabaseClient(): unknown {
  const answer = (single: boolean) => ({ data: single ? null : [], error: null, count: 0, status: 200, statusText: "OK" });
  // Every property is another link and every link is callable, so `.schema().from().select()…`,
  // `.rpc()` and `.auth.getSession()` all end in the same empty answer when awaited.
  // The client itself is NOT thenable (the host's async getter resolves to it); its links are.
  const chain = (single: boolean, root = false): unknown =>
    new Proxy(function () {}, {
      get(_t, key) {
        if (key === "then") {
          if (root) return undefined;
          return (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
            Promise.resolve(answer(single)).then(resolve, reject);
        }
        return chain(single || key === "maybeSingle" || key === "single");
      },
      apply: () => chain(single),
    });
  return chain(false, true);
}
