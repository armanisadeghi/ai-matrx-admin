"use client";

/**
 * THE U1 HARNESS. "Done means: a harness renders the same map from the store in
 * a trivial list; every RPC has a hook; selection and expansion state survive
 * switching views" (requirements §4 U1).
 *
 * This is that list, and it is deliberately plain: it reads ONLY from the
 * topical-map slice through `selectVisibleMapTopics`, so whatever it shows is
 * exactly what the outline, table and graph builders (U2) will consume. Nothing
 * here fetches; the route body owns the read.
 *
 * It is not a placeholder for the four views — it is the proof that the store
 * feeds them. U2 replaces each view's body with the real drawing and keeps this
 * same selector.
 */

import { FileText } from "lucide-react";

import {
  TreeDisclosure,
  TreeFolderIcon,
  treeIndentPx,
} from "@/components/official/topic-tree/geometry";

import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";

import {
  selectMapLoadedIncludes,
  selectVisibleMapTopics,
} from "../redux/selectors";
import { selectTopic, toggleExpanded } from "../redux/slice";

export function MapTopicTreeList({ mapId }: { mapId: string }) {
  const dispatch = useAppDispatch();
  const rows = useAppSelector(selectVisibleMapTopics(mapId));
  const includes = useAppSelector(selectMapLoadedIncludes(mapId));
  const countsLoaded = includes.includes("counts");

  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-card">
      {rows.map((row) => (
        <li key={row.slug}>
          <div
            className={`flex min-h-7 items-center gap-1 py-1 pr-3 type-body ${
              row.selected ? "bg-primary/10" : ""
            }`}
            style={{ paddingLeft: treeIndentPx(row.depth) }}
          >
            <TreeDisclosure
              expandable={row.hasChildren}
              expanded={row.expanded}
              label={row.name}
              onToggle={() => dispatch(toggleExpanded({ mapId, slug: row.slug }))}
            />
            {row.hasChildren ? (
              <TreeFolderIcon open={row.expanded} />
            ) : (
              <FileText aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <button
              type="button"
              className="min-w-0 flex-1 truncate text-left"
              aria-current={row.selected ? "true" : undefined}
              onDoubleClick={
                row.hasChildren
                  ? () => dispatch(toggleExpanded({ mapId, slug: row.slug }))
                  : undefined
              }
              onClick={() => dispatch(selectTopic({ mapId, slug: row.slug }))}
            >
              <span className={row.selected ? "font-semibold" : ""}>{row.name}</span>
            </button>
            {row.topic.status && row.topic.status !== "active" ? (
              <span className="shrink-0 type-meta text-muted-foreground">
                {row.topic.status}
              </span>
            ) : null}
            {/* An absent count means the tree was loaded WITHOUT `counts` — it
                never means zero, so nothing is printed in that case. */}
            {countsLoaded ? (
              <span className="shrink-0 type-meta text-muted-foreground">
                {row.topic.pages ?? 0} pages · {row.topic.planned ?? 0} planned ·{" "}
                {row.topic.keywords ?? 0} keywords
              </span>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
