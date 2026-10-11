"use client";

/**
 * The Table tile's source bar for a table made by "Get data": the shared `FetchedTableBar`
 * (`features/data-sources`) plus what the tile remembers — the address words and the limit notes —
 * and the new totals written back into the tile's meta after a Refresh / Get more.
 */

import { FetchedTableBar } from "../../data-sources/FetchedTableBar";
import type { NodeSource } from "../board/document";
import { useFetchOrganizationId } from "./GetDataBody";
import { provenanceOf, withDataFetchMeta, type DataFetchProvenance } from "./tile-meta";

export function FetchedSourceBar({
  tileId,
  tableId,
  source,
  fetched,
  onSource,
}: {
  tileId: string;
  tableId: string;
  source: NodeSource;
  /** What the tile remembers (shown while the table's own spec loads, and the address words). */
  fetched: DataFetchProvenance | null;
  onSource: (next: NodeSource, title?: string) => void;
}) {
  const organizationId = useFetchOrganizationId();
  return (
    <FetchedTableBar
      tableId={tableId}
      organizationId={organizationId}
      runKey={`${tileId}:more`}
      fetched={fetched}
      onFinished={(result) => {
        if (fetched && source.kind === "entity") {
          const next = provenanceOf(result, fetched, fetched);
          onSource({ ...source, meta: withDataFetchMeta(source.meta, { fetched: next }) });
        }
      }}
    />
  );
}
