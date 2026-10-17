/**
 * THE HOST of @ai-matrx/rich-content in matrx-frontend — imported once, for its side effect, by
 * app/Providers.tsx (every page, not only chat surfaces). Each capability the engine can ask for
 * is filled from this app; the package's own defaults (announced, `data-rich-content-host="bare"`)
 * apply only in a host that leaves one out.
 */
import { lazy } from "react";
// The app bindings (windows, canvas, menus, kind views, chat state), mermaid, and this app's domain blocks.
import "@/features/rich-content-host/app-bindings";
import { ensureWebRichDocumentRegistrations } from "@/features/rich-content-host/rich-document-registrations";
import { configureRichContent } from "@ai-matrx/rich-content/host";
import { toast } from "@/lib/toast";
import { captureError } from "@/lib/diagnostics/errorCaptureStore";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { ResourcePeekHost } from "@/features/organizations/peek/ResourcePeekHost";
import { useOpenSaveToTable } from "@/features/overlays/openers/saveToTable";
import { useRouter } from "next/navigation";
import { useTableDoors } from "@/features/rich-content-host/useTableDoors";
import { withIrEnvelope } from "@ai-matrx/rich-content/kinds/registry/region-envelope-memo";
import { envelopeForCompletedFenceRegion, envelopeForCompletedXmlRegion } from "@/features/content-ir/surfaces/xml-finalize";
import { registerKindCorrector } from "@ai-matrx/rich-content/kinds/registry/kind-correctors";
// The app's compiled kinds register into the package's ONE kind registry at this import.
import "@/features/content-ir/registry/kind-registry";
import { registerKindHost } from "@ai-matrx/rich-content/kinds/register-kind-host";
import { hasSession, whenSessionReady } from "@/features/content-ir/registry/session-ready";
import { webViewerOrganizations } from "@/features/content-ir/registry/kind-viewer-organizations";
import { browserAdminLaneOpen } from "@/utils/supabase/adminLane";
import { matrxContentIrHost } from "@/features/content-ir/host/ContentIrHostBoundary";
// Fills the content-ir host's directive slot (Apply / open / copy on every directive card) before any kind renders.
import "@/features/matrx-envelope/directiveHost";
import { reportKindComponentIncident } from "@/features/content-ir/react/db-component/kindComponentIncident";
import { correctDraftCritique, type DraftCritique } from "@/features/crm/draft-critique/draftCritique";

const NestedContent = lazy(() =>
  import("@ai-matrx/rich-content/levels/standard/NestedRichContent").then((m) => ({ default: m.NestedRichContent })),
);

configureRichContent({
  // Chat's message actions + this app's remaining handlers, on the engine's first registry read.
  ensureRichDocumentRegistrations: ensureWebRichDocumentRegistrations,
  toast: toast as never,
  captureError: captureError as never,
  ErrorActions: ErrorAlchemyMenu,
  NestedContent,
  // Lazy: the Supabase resolver loads on the first link (and a test's module mock applies).
  wikilinks: {
    resolve: async (target) => (await import("@/features/rich-content-host/wikilink-resolver")).resolveWikiTarget(target),
    create: async (title) => (await import("@/features/rich-content-host/wikilink-resolver")).createWikiPage(title),
    loadBody: async (token, id) => (await import("@/features/rich-content-host/wikilink-resolver")).loadWikiBody(token, id),
  },
  resolvePerson: async (id) => {
    const { resolveVisiblePerson } = await import("@/features/organizations/people/visiblePeople");
    const p = await resolveVisiblePerson(id);
    return p ? { ...p, userId: p.userId, name: p.name } : null;
  },
  ResourcePeek: ResourcePeekHost as never,
  splitterEnvelopes: {
    withIrEnvelope: (source, metadata) => withIrEnvelope(source, metadata),
    fenceRegion: envelopeForCompletedFenceRegion,
    xmlRegion: envelopeForCompletedXmlRegion,
  },
  useOpenSaveToTable: useOpenSaveToTable as never,
  // "Open table" after Turn into a table: the table's own page, in-app navigation.
  // "Save to notes" and "Send to an agent" in every table's "…" menu.
  useTableDoors,
  useOpenDataTable: () => {
    const router = useRouter();
    return (tableId: string) => router.push(`/data/${encodeURIComponent(tableId)}`);
  },
  contentIrHost: matrxContentIrHost,
  reportKindComponentIncident: reportKindComponentIncident as never,
});

// THE SAME CALL Matrx 2 makes: the package's one kind registry becomes this host's `kindRegistry`, its
// database tiers read through this app's browser client (the signed-in person's RLS), table kinds
// through this app's table-kind source, and its invalidation + identity-flush refreshes install once.
// After the app bindings (above) registered the domain block dispatch, so no domain block is shadowed.
// The kind COMPONENT tier is the package's too (kind_component rows, the viewer's layers): it reads
// through the same client, waits on this app's session barrier to retry a refused read, and takes
// the viewer's organizations from the scope tree.
registerKindHost({
  kindDataClient: async () => (await import("@/utils/supabase/client")).supabase,
  loadTableKindSource: () => import("@/features/content-ir/registry/table-kind-source"),
  sessionReady: { hasSession: () => hasSession(), whenSessionReady: (listener) => whenSessionReady(listener) },
  adminLaneOpen: () => browserAdminLaneOpen(),
  kindViewerOrganizations: webViewerOrganizations,
});

// This app's own kind correctors (the package ships none).
registerKindCorrector("draft_critique", (value) => {
  const result = correctDraftCritique(value as DraftCritique);
  return { value: result.critique as unknown as Record<string, unknown>, corrections: result.corrections };
});
