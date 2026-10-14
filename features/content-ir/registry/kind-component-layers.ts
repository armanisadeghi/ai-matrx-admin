/**
 * SHAPE LAYERS — the matrx-frontend adapter for the viewer's overlay (slice 2).
 *
 * The lifecycle (signed out → no read; user / lane change clears then re-reads;
 * late reads discarded; bounded outage with one error per outage; coalesced
 * forced syncs) and THE AUDIENCE PREDICATE live in ONE place —
 * `@ai-matrx/content-ir-react` (`KindComponentOverlayLoader`,
 * `readViewerLayerRows`). This file injects only what is this app's:
 *
 *  - the viewer id (one lazy `onAuthStateChange`),
 *  - the viewer's organizations — the scope tree the app already holds
 *    (`scopesTree.organizationIds`, the person's OWN organizations, never the
 *    admin lane's) once it is ready, else one `mbr_for_user` read,
 *  - ONE filtered, read-to-completion chunk of `kind_component_layer`
 *    (`readAllRows`),
 *  - a membership watch: when the app's organization list changes, the overlay
 *    re-reads so a view from an organization the person left stops rendering.
 *
 * Zero static import edge into Supabase or the Redux store graph — the registry
 * cluster is a hot chunk (see component-registry.ts); every client reach is an
 * `await import` (the store singleton is a leaf module).
 */

import {
  createOverlayViewerWatch,
  LAYER_COLUMNS,
  readViewerLayerRows as readViewerLayerRowsVia,
  type KindComponentLayerRow,
  type LayerDbRow,
} from "@ai-matrx/content-ir-react";
import { readAllRows } from "@ai-matrx/data/db";
import { getStoreSingleton } from "@/lib/redux/store-singleton";

/** The scope-tree slice, structurally — the one place this adapter reads it. */
interface ScopeTreeShape {
  scopesTree?: { treeStatus?: string; organizationIds?: string[] };
}

/** Sorted ids of the person's own organizations when the app has them loaded; else null. */
function appMembershipIds(): string[] | null {
  const state = getStoreSingleton()?.getState() as ScopeTreeShape | undefined;
  const tree = state?.scopesTree;
  if (!tree || tree.treeStatus !== "ready" || !Array.isArray(tree.organizationIds)) {
    return null;
  }
  return [...tree.organizationIds].sort();
}

/** The organization set the last read used — the membership watch's baseline. */
let baselineOrganizationKey: string | null = null;

/**
 * The organizations the viewer belongs to: the app's own loaded list when
 * ready (no second membership read), else `mbr_for_user` (auth.uid()-scoped).
 */
export async function readViewerOrganizationIds(): Promise<string[]> {
  const known = appMembershipIds();
  if (known) {
    baselineOrganizationKey = known.join(",");
    return known;
  }
  const [{ supabase }, { readMembershipRows }] = await Promise.all([
    import("@/utils/supabase/client"),
    import("@ai-matrx/auth/organizations"),
  ]);
  const answer = await readMembershipRows<{
    container_id: string;
    status?: string | null;
  }>(supabase, "organization");
  if (answer.error) {
    throw new Error(
      `kind_component_layer overlay: the viewer's organizations could not be read — ${answer.error.message}`,
    );
  }
  const ids = new Set<string>();
  for (const row of answer.data ?? []) {
    if (row.status && row.status !== "active") continue;
    ids.add(row.container_id);
  }
  const out = [...ids];
  baselineOrganizationKey = [...out].sort().join(",");
  return out;
}

/**
 * ONE filtered chunk of `kind_component_layer`, read to completion. The
 * `orFilter` is the package's audience predicate — this app is also an
 * admin-lane page, so the explicit predicate (never RLS alone) scopes it.
 */
export async function readViewerLayerChunk(orFilter: string): Promise<LayerDbRow[]> {
  const { supabase } = await import("@/utils/supabase/client");
  return (await readAllRows(
    ({ from, to }) =>
      supabase
        .schema("content_ir")
        .from("kind_component_layer")
        .select(LAYER_COLUMNS, { count: "exact" })
        .is("deleted_at", null)
        .or(orFilter)
        .order("id", { ascending: true })
        .range(from, to),
    { label: "content_ir.kind_component_layer (viewer overlay)" },
  )) as LayerDbRow[];
}

export function readViewerLayerRows(
  userId: string,
  organizationIds: readonly string[],
): Promise<KindComponentLayerRow[]> {
  return readViewerLayerRowsVia(userId, organizationIds, readViewerLayerChunk);
}

const viewerWatch = createOverlayViewerWatch(async (report) => {
  const { supabase } = await import("@/utils/supabase/client");
  // `onAuthStateChange` fires INITIAL_SESSION on subscribe, so the first
  // answer arrives without a network call.
  supabase.auth.onAuthStateChange((_event, session) => {
    report(session?.user?.id ?? null);
  });
});

/** The signed-in user id; null = signed out or not yet told (no overlay, no read). */
export function overlayViewerId(): string | null {
  return viewerWatch.current();
}

export function watchOverlayViewer(onChange: () => void): void {
  viewerWatch.start(onChange);
}

let membershipWatchInstalled = false;

/**
 * Re-read when the app's organization list changes after the overlay read
 * (joined / left an organization). `onChange` is a FORCED sync.
 */
export function watchViewerMembership(onChange: () => void): void {
  if (membershipWatchInstalled) return;
  const store = getStoreSingleton();
  if (!store) return; // retried on the next demand
  membershipWatchInstalled = true;
  store.subscribe(() => {
    const known = appMembershipIds();
    if (known === null || baselineOrganizationKey === null) return;
    if (known.join(",") !== baselineOrganizationKey) onChange();
  });
}

/** Test seam — forget the watched viewer / membership baseline. */
export function resetOverlayAdapterForTests(): void {
  baselineOrganizationKey = null;
  membershipWatchInstalled = false;
}
