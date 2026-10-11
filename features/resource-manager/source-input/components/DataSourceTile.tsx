"use client";

/**
 * The Source input's "Data" tile: a table made by Get data, picked like any other Table Source
 * (it is sent as the same `dataset` Source token a Table from Use existing is), or a new one made
 * right here with the Get data panel (the board's `GetDataBody`, reused whole).
 */

import { useState } from "react";
import { Check, DownloadCloud, Table2 } from "lucide-react";
import { ReadFailure } from "@ai-matrx/design-system";
import { Button, EmptyState, RegionSkeleton } from "@ai-matrx/design-system/controls";
import { formatRelativeTime } from "@ai-matrx/kit/format";

import { GetDataBody } from "@/features/board/data-fetch/GetDataBody";
import { getDataSource } from "@/features/board/data-fetch/tile-meta";
import type { NodeSource } from "@/features/board/board/document";
import { useFetchedTables } from "@/features/data-sources/hooks";

import { RECORD_STORE_TOKEN } from "../recordStoreKinds";

export interface DataSourceTileProps {
  surfaceKey: string;
  isPicked: (token: string, id: string) => boolean;
  /** Pick a table (or take it off); the host applies its `max` and de-dupe. */
  onPick: (table: { id: string; title: string }) => void;
}

export function DataSourceTile({ surfaceKey, isPicked, onPick }: DataSourceTileProps) {
  const tables = useFetchedTables();
  const [making, setMaking] = useState(false);
  const [source, setSource] = useState<NodeSource>(() => getDataSource());

  if (making) {
    return (
      <div className="flex flex-col gap-2">
        <div className="h-[28rem] overflow-hidden rounded-lg border border-border" data-data-tile-panel="">
          <GetDataBody
            tileId={`source-input:${surfaceKey}`}
            source={source}
            onSource={(next, title) => {
              if (next.kind === "entity" && next.id) {
                onPick({ id: next.id, title: title ?? "Data table" });
                setMaking(false);
                setSource(getDataSource());
                void tables.refetch();
                return;
              }
              setSource(next);
            }}
          />
        </div>
        <Button variant="quiet" className="self-start" onClick={() => setMaking(false)}>
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2" data-data-tile="">
      <Button variant="outline" icon={<DownloadCloud className="h-4 w-4" />} className="self-start" onClick={() => setMaking(true)} data-data-tile-new="">
        Get new data
      </Button>
      {tables.isLoading ? (
        <RegionSkeleton shape="rows" count={3} aria-label="Loading your data tables" />
      ) : tables.error ? (
        <ReadFailure error={tables.error} what="your data tables" onRetry={() => void tables.refetch()} />
      ) : (tables.data?.length ?? 0) === 0 ? (
        <EmptyState icon={<Table2 className="h-5 w-5" />} title="No data tables yet" line="Get data makes one." />
      ) : (
        <div className="flex max-h-72 flex-col overflow-y-auto" role="listbox" aria-label="Data tables">
          {tables.data?.map((t) => {
            const picked = isPicked(RECORD_STORE_TOKEN.table, t.tableId);
            return (
              <Button
                key={t.tableId}
                variant="quiet"
                pressed={picked}
                role="option"
                aria-selected={picked}
                icon={picked ? <Check className="h-4 w-4" /> : <Table2 className="h-4 w-4" />}
                meta={t.finishedAt ? formatRelativeTime(t.finishedAt, { style: "intl" }) : undefined}
                className="w-full justify-start"
                onClick={() => onPick({ id: t.tableId, title: t.tableName })}
                data-data-table-id={t.tableId}
              >
                {t.tableName}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
