// features/agents/org-chart/publish/publicRead.ts — the published chart as the public page reads it.
//
// Server-only. Reads with the request's own client: a signed-out visitor reads through the table's
// anonymous lane (published rows only, the columns declared in lib/security/public-exposure.ts); a
// signed-in visitor through the same row security every other read uses. One `null` answers a page
// that was taken down, removed or never existed — an address cannot be used to learn which.
import "server-only";

import { cache } from "react";

import { createClient } from "@/utils/supabase/server";

import { parseSnapshot, type OrgChartSnapshot } from "./snapshot";

export interface PublicOrgChart {
  id: string;
  slug: string;
  title: string;
  blurb: string | null;
  creatorName: string | null;
  snapshot: OrgChartSnapshot;
  updatedAt: string;
}

interface Row {
  id: string;
  slug: string;
  title: string;
  blurb: string | null;
  creator_name: string | null;
  snapshot: unknown;
  updated_at: string;
}

const PUBLIC_COLUMNS = "id, slug, title, blurb, creator_name, snapshot, updated_at";

export const readPublishedOrgChart = cache(async (slug: string): Promise<PublicOrgChart | null> => {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 80) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("agent")
    .from("org_chart_publication")
    .select(PUBLIC_COLUMNS)
    .eq("slug", slug)
    .eq("published_to_web", true)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(`Could not read the published chart: ${error.message}`);
  if (!data) return null;
  const row = data as Row;
  const snapshot = parseSnapshot(row.snapshot);
  if (!snapshot) return null;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    blurb: row.blurb,
    creatorName: row.creator_name,
    snapshot,
    updatedAt: row.updated_at,
  };
});

/** Who is looking, and — for a signed-in viewer only — who made the page (to message them). */
export async function readViewerAndCreator(publicationId: string): Promise<{
  viewerId: string | null;
  creatorId: string | null;
}> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const viewerId = typeof claims?.claims?.sub === "string" ? claims.claims.sub : null;
  if (!viewerId) return { viewerId: null, creatorId: null };
  const { data } = await supabase
    .schema("agent")
    .from("org_chart_publication")
    .select("created_by")
    .eq("id", publicationId)
    .maybeSingle();
  return { viewerId, creatorId: (data as { created_by: string | null } | null)?.created_by ?? null };
}
