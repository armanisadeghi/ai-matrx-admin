"use client";

// features/launchpad/widgets/bodies/RecentWidget.tsx — the person's latest items of one kind, read from the
// search projection (`platform.search_items` via the Board's `searchItemsAsPerson`): an empty query
// answers recents, newest first, across every organization the person reaches. Each row opens the
// record's own page (the entity registry's `hrefFor`).
import { formatRelativeTime } from "@ai-matrx/kit/format";
import { useQuery } from "@tanstack/react-query";
import { searchItemsAsPerson } from "@/features/board/tools/search-items";
import { tryGetEntityInfo } from "@/features/scopes/registry/entityRegistry";
import { RECENT_KINDS } from "../catalog";
import { configText, type LaunchpadWidgetBodyProps } from "../types";
import { WidgetList } from "../frame";
import { usePageInput, usePageOutput } from "../../bus/react";
import type { PageRecordValue } from "../../bus/ports";

export function RecentWidget({ config, capacity }: LaunchpadWidgetBodyProps) {
  const token = configText(config, "kind") || "conversation";
  const limit = capacity;
  const kind = RECENT_KINDS.find((k) => k.value === token);
  const info = tryGetEntityInfo(token);
  // Page bus: a connected "Search" narrows the list; a connected "Selected item" makes rows pick.
  const search = usePageInput("search", "text")?.trim() ?? "";
  const selected = usePageOutput<PageRecordValue>("selected");
  const query = useQuery({
    queryKey: ["start-recent", token, limit, search],
    staleTime: 30_000,
    queryFn: () => searchItemsAsPerson({ query: search, tokens: [token], limit }),
  });
  return (
    <WidgetList
      capacity={capacity}
      loading={query.isLoading}
      error={query.error ? query.error.message : null}
      empty={search ? `No ${kind?.label.toLowerCase() ?? token} match "${search}"` : `No ${kind?.label.toLowerCase() ?? token} yet`}
      rows={(query.data ?? []).map((r) => {
        const title = r.title || `Untitled ${kind?.one ?? token}`;
        const href = info?.hrefFor?.(r.entity_id) ?? null;
        const picked = selected.value?.token === r.entity_token && selected.value.id === r.entity_id;
        return {
          key: `${r.entity_token}:${r.entity_id}`,
          title,
          href,
          meta: r.updated_at ? formatRelativeTime(r.updated_at, { suffix: false, minUnit: "minute" }) : null,
          icon: info?.Icon,
          ...(selected.connected
            ? {
                selected: picked,
                onSelect: () =>
                  selected.publish(picked ? null : { token: r.entity_token, id: r.entity_id, label: title, ...(href ? { href } : {}) }),
              }
            : {}),
        };
      })}
    />
  );
}
