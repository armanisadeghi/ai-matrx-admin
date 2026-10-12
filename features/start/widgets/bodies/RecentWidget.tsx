"use client";

// features/start/widgets/bodies/RecentWidget.tsx — the person's latest items of one kind, read from the
// search projection (`platform.search_items` via the Board's `searchItemsAsPerson`): an empty query
// answers recents, newest first, across every organization the person reaches. Each row opens the
// record's own page (the entity registry's `hrefFor`).
import { formatRelativeTime } from "@ai-matrx/kit/format";
import { useQuery } from "@tanstack/react-query";
import { searchItemsAsPerson } from "@/features/board/tools/search-items";
import { tryGetEntityInfo } from "@/features/scopes/registry/entityRegistry";
import { RECENT_KINDS } from "../catalog";
import type { StartWidgetBodyProps } from "../types";
import { WidgetList, slotRows } from "../frame";

export function RecentWidget({ config, size }: StartWidgetBodyProps) {
  const token = config.kind ?? "conversation";
  const limit = slotRows("recent", size);
  const kind = RECENT_KINDS.find((k) => k.value === token);
  const info = tryGetEntityInfo(token);
  const query = useQuery({
    queryKey: ["start-recent", token, limit],
    staleTime: 30_000,
    queryFn: () => searchItemsAsPerson({ query: "", tokens: [token], limit }),
  });
  return (
    <WidgetList
      type="recent"
      size={size}
      loading={query.isLoading}
      error={query.error ? query.error.message : null}
      empty={`No ${kind?.label.toLowerCase() ?? token} yet`}
      rows={(query.data ?? []).map((r) => ({
        key: `${r.entity_token}:${r.entity_id}`,
        title: r.title || `Untitled ${kind?.one ?? token}`,
        href: info?.hrefFor?.(r.entity_id) ?? null,
        meta: r.updated_at ? formatRelativeTime(r.updated_at, { suffix: false, minUnit: "minute" }) : null,
        icon: info?.Icon,
      }))}
    />
  );
}
