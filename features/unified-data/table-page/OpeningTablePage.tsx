"use client";

/**
 * THE TABLE PAGE, OPENING ON THE COLUMNS THAT MATTER. For a table made by "Get data" (it has a
 * `scraper.data_fetch_job` spec) the package's `TablePage` is opened with the source's telling
 * fields showing and every other column hidden through the grid's OWN hidden-columns look — the
 * same state its column control edits, so "all columns" is one click away and nothing is deleted.
 * A table that was never fetched renders exactly the plain `TablePage`. A column choice already
 * made (the address, a saved view, the person's own look) is never overridden.
 *
 * The package reads `viewAddress` once on arrival, so when the answer lands (spec, catalog,
 * fields, saved looks) the page is re-keyed ONCE to open on it.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useFields, useRecordsClient } from "@ai-matrx/records/react";
import { TablePage } from "@/features/data-tables/records-ui-host/recordsUiLazy";
import { readLooks, viewFromRow } from "@ai-matrx/records-ui/helpers";
import type { TablePageProps, ViewAddressState } from "@ai-matrx/records-ui";

import { useDataSources, useFetchSpec } from "@/features/data-sources/hooks";
import { hasChosenColumns, openingHiddenFields } from "@/features/data-sources/openingColumns";

type Chosen = { chosen: boolean } | null;

export function OpeningTablePage({
  organizationId,
  viewAddress,
  ...page
}: TablePageProps & { organizationId: string | null }) {
  const tableId = page.tableId as string;
  const spec = useFetchSpec(tableId).data ?? null;
  const catalog = useDataSources(spec ? organizationId : null);
  const fields = useFields(spec ? tableId : null);
  const client = useRecordsClient();
  const [saved, setSaved] = useState<Chosen>(null);

  useEffect(() => {
    if (!spec) return;
    let live = true;
    void (async () => {
      const [listed, looked] = await Promise.all([client.views({ table_id: tableId }), readLooks(client, tableId)]);
      if (!live) return;
      const views = listed.ok ? listed.data.map(viewFromRow) : [];
      setSaved({ chosen: hasChosenColumns(viewAddress, views, looked.ok ? looked.data : {}) });
    })();
    return () => {
      live = false;
    };
    // viewAddress is the arrival address: read once, like the package does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec?.jobId, client, tableId]);

  const source = catalog.data?.sources.find((s) => s.key === spec?.sourceKey) ?? null;
  const hidden = useMemo(
    () => (saved && !saved.chosen && source && fields.data ? openingHiddenFields(fields.data, source.output_fields ?? [], undefined, source.key) : null),
    [saved, source, fields.data],
  );
  const latched = useRef<string[] | null>(null);
  const [applied, setApplied] = useState<string[] | null>(null);
  useEffect(() => {
    if (hidden && !latched.current) {
      latched.current = hidden;
      setApplied(hidden);
    }
  }, [hidden]);

  const address: ViewAddressState | null | undefined = applied ? { ...(viewAddress ?? {}), hidden: applied } : viewAddress;
  return <TablePage key={applied ? "opening-columns" : "plain"} {...page} viewAddress={address} />;
}
