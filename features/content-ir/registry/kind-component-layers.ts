/**
 * SHAPE LAYERS — the viewer's overlay loader (slice 2).
 *
 * `content_ir.kind_component_layer` holds "My view" (audience_user_id) and
 * "My organization's view" (audience_organization_id) components for a kind
 * slug. This module reads THE VIEWER's rows and hands them to the shared
 * resolver's overlay tier (`ComponentResolver.setOverlay`), which ranks
 * mine → my organization's (newest) → shared → compiled → generic.
 *
 * 🚨 THE READ DECLARES ITS OWN SCOPE. RLS is the ceiling, never the view: the
 * table carries the mandatory `platform_admin_read` arm, so on an admin-lane
 * page an unscoped select would return EVERY person's layered rows and the
 * resolver would render a stranger's view to an admin. The predicate is
 * explicit — `audience_user_id = me OR audience_organization_id IN my orgs` —
 * and the resolver re-checks every row against the viewer as well.
 *
 * Lifecycle: no read before the registry is demanded (THE ZERO-PREFETCH LAW);
 * signed out → no read at all and no overlay; every auth change (sign-in,
 * sign-out, user switch) and admin-lane change clears the overlay before the
 * next viewer's rows load; a `kindComponents` invalidation reloads it.
 *
 * Zero static import edge into Supabase — the registry cluster is a hot chunk
 * (see component-registry.ts); every client reach is an `await import`.
 */

import type {
  ComponentOverlayInput,
  KindComponentLayerRow,
} from "@ai-matrx/content-ir-react";
import { isJsonObject } from "@/types/json";
import { readAllRows } from "@ai-matrx/data/db";

/** The resolver surface this loader drives. */
export interface OverlayTarget {
  setOverlay(input: ComponentOverlayInput): void;
  clearOverlay(): void;
}

/** ~100 uuids per GET url — a person's memberships can run to hundreds. */
const ORGANIZATION_CHUNK = 100;

const LAYER_COLUMNS =
  "id, kind, platform, role, component_key, source, is_active, config, component_source, props_transform, pinned_kind_version, updated_at, created_by, audience_user_id, audience_organization_id";

interface LayerDbRow {
  id: string;
  kind: string;
  platform: string;
  role: string;
  component_key: string;
  source: string;
  is_active: boolean;
  config: unknown;
  component_source: string | null;
  props_transform: string | null;
  pinned_kind_version: number | null;
  updated_at: string;
  created_by: string | null;
  audience_user_id: string | null;
  audience_organization_id: string | null;
}

/**
 * THE AUDIENCE PREDICATE — the PostgREST `or` filter for one chunk of the
 * viewer's organizations. Pure, so the guard test can pin it: it always names
 * the viewer, and only ever the viewer's own organizations.
 */
export function layerAudienceFilter(
  userId: string,
  organizationIds: readonly string[],
): string {
  const mine = `audience_user_id.eq.${userId}`;
  if (organizationIds.length === 0) return mine;
  return `${mine},audience_organization_id.in.(${organizationIds.join(",")})`;
}

function chunks<T>(items: readonly T[], size: number): T[][] {
  if (items.length === 0) return [[]];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function toLayerRow(row: LayerDbRow): KindComponentLayerRow | null {
  if (row.role !== "output" && row.role !== "input" && row.role !== "loading") {
    return null;
  }
  return {
    id: row.id,
    kind: row.kind,
    platform: row.platform,
    role: row.role,
    componentKey: row.component_key,
    source: row.source,
    config: isJsonObject(row.config) ? row.config : {},
    isActive: row.is_active,
    componentSource: row.component_source,
    propsTransform: row.props_transform,
    pinnedKindVersion: row.pinned_kind_version,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    audienceUserId: row.audience_user_id,
    audienceOrganizationId: row.audience_organization_id,
  };
}

/** The organizations the viewer belongs to — `mbr_for_user` is auth.uid()-scoped. */
export async function readViewerOrganizationIds(): Promise<string[]> {
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
  return [...ids];
}

/**
 * ONE scoped read of the viewer's layered rows (chunked only by url length):
 * `deleted_at is null AND (audience_user_id = me OR audience_organization_id
 * IN my orgs)`, read to completion.
 */
export async function readViewerLayerRows(
  userId: string,
  organizationIds: readonly string[],
): Promise<KindComponentLayerRow[]> {
  const { supabase } = await import("@/utils/supabase/client");
  const byId = new Map<string, KindComponentLayerRow>();
  for (const chunk of chunks(organizationIds, ORGANIZATION_CHUNK)) {
    const filter = layerAudienceFilter(userId, chunk);
    const rows = (await readAllRows(
      ({ from, to }) =>
        supabase
          .schema("content_ir")
          .from("kind_component_layer")
          .select(LAYER_COLUMNS, { count: "exact" })
          .is("deleted_at", null)
          .or(filter)
          .order("id", { ascending: true })
          .range(from, to),
      { label: "content_ir.kind_component_layer (viewer overlay)" },
    )) as LayerDbRow[];
    for (const raw of rows) {
      const row = toLayerRow(raw);
      if (row) byId.set(row.id, row);
    }
  }
  return [...byId.values()];
}

/**
 * THE VIEWER WATCH — the signed-in user id, kept current by the ONE auth
 * subscription this module opens (lazily, on first registry demand). Signed
 * out (or not yet told) = null, which the loader treats as "no overlay, no
 * read". `onAuthStateChange` fires INITIAL_SESSION on subscribe, so the first
 * answer arrives without a network call.
 */
let watchedUserId: string | null = null;
let watchInstalled = false;

export function overlayViewerId(): string | null {
  return watchedUserId;
}

export function watchOverlayViewer(onChange: () => void): void {
  if (watchInstalled || typeof window === "undefined") return;
  watchInstalled = true;
  void import("@/utils/supabase/client")
    .then(({ supabase }) => {
      supabase.auth.onAuthStateChange((_event, session) => {
        const next = session?.user?.id ?? null;
        if (next === watchedUserId) return;
        watchedUserId = next;
        // Never call back into supabase inside the auth callback (supabase-js
        // holds its auth lock there) — defer to the next tick.
        setTimeout(onChange, 0);
      });
    })
    .catch(() => {
      watchInstalled = false;
    });
}

/** Test seam — forget the watched viewer and allow a fresh subscription. */
export function resetOverlayViewerWatchForTests(userId: string | null = null): void {
  watchedUserId = userId;
  watchInstalled = userId !== null;
}

/** Who is looking, and through which lane — the overlay's identity. */
export interface OverlayViewer {
  userId: string | null;
  laneOpen: boolean;
}

export interface OverlayLoaderPorts {
  /** The current viewer (synchronous snapshot). */
  viewer: () => OverlayViewer;
  readOrganizationIds: () => Promise<string[]>;
  readRows: (userId: string, organizationIds: readonly string[]) => Promise<KindComponentLayerRow[]>;
  reportError: (message: string, error: unknown) => void;
}

/**
 * The lifecycle, host-free so it is testable: `sync()` is cheap when the
 * viewer is unchanged; any change of user OR lane clears the overlay first and
 * then loads the new viewer's rows; a load that finishes after the viewer
 * changed again is DISCARDED (never installed for the wrong person).
 */
export class KindComponentOverlayLoader {
  private loadedKey: string | null = null;
  private inFlightKey: string | null = null;
  private generation = 0;

  constructor(
    private readonly target: OverlayTarget,
    private readonly ports: OverlayLoaderPorts,
  ) {}

  private static keyOf(viewer: OverlayViewer): string | null {
    return viewer.userId ? `${viewer.userId}|${viewer.laneOpen ? "lane" : "user"}` : null;
  }

  /** Re-read when the viewer or lane changed (or `force`); no-op otherwise. */
  sync(force = false): Promise<void> {
    const viewer = this.ports.viewer();
    const key = KindComponentOverlayLoader.keyOf(viewer);
    if (!force && (key === this.loadedKey || key === this.inFlightKey) && key !== null) {
      return Promise.resolve();
    }
    if (key === null) {
      // Signed out: no overlay and no read at all.
      this.generation += 1;
      this.loadedKey = null;
      this.inFlightKey = null;
      this.target.clearOverlay();
      return Promise.resolve();
    }
    if (key !== this.loadedKey) {
      this.loadedKey = null;
      this.target.clearOverlay();
    }
    const generation = ++this.generation;
    this.inFlightKey = key;
    const userId = viewer.userId as string;
    return (async () => {
      try {
        const organizationIds = await this.ports.readOrganizationIds();
        const rows = await this.ports.readRows(userId, organizationIds);
        if (generation !== this.generation) return; // the viewer moved on
        const now = KindComponentOverlayLoader.keyOf(this.ports.viewer());
        if (now !== key) return;
        this.target.setOverlay({ viewerId: userId, organizationIds, rows });
        this.loadedKey = key;
      } catch (error) {
        // Loud, never fatal: the shared tiers keep answering, which is what the
        // viewer saw before layers existed.
        this.ports.reportError(
          `[content-ir] the viewer's own / organization shape views could not be read — shared views render instead: ${
            error instanceof Error ? error.message : String(error)
          }`,
          error,
        );
      } finally {
        if (generation === this.generation) this.inFlightKey = null;
      }
    })();
  }

  /** Test seam / sign-out hard reset. */
  reset(): void {
    this.generation += 1;
    this.loadedKey = null;
    this.inFlightKey = null;
    this.target.clearOverlay();
  }
}
