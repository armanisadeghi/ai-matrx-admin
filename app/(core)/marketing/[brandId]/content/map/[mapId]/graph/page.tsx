// record-view: none — a sub-view (graph) inside a record or scope, not the record page; the record's own page carries the section
// One map's workspace — the GRAPH view.
// See ../page.tsx: the view is a route, the adapter is the ONE route host.

import { TopicalMapRouteBody } from "@/features/marketing/seo/topical-map/components/TopicalMapRouteBody";

export default async function BrandTopicalMapGraphPage({
  params,
}: {
  params: Promise<{ mapId: string }>;
}) {
  const { mapId } = await params;
  return <TopicalMapRouteBody mapId={mapId} />;
}
