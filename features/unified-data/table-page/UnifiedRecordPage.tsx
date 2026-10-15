"use client";

// features/unified-data/table-page/UnifiedRecordPage.tsx — ONE RECORD, ITS OWN PAGE.
//
// The record panel the table's rail draws (records-ui `RecordPanel`: the form, history, what ran on
// it, checklists, comments) — the same component, full page, never a second renderer. Everything
// around it — whose table this is, the store switch, the mount, access states — is the table page's
// own `useUnifiedTable` / `UnifiedTableBody`, so a record opens exactly when its table would.

import { useRouter } from "next/navigation";
import { RecordPanel, RecordsSkeleton, recordNameIn } from "@ai-matrx/records-ui";
import { useRecord, useRecordsClient, useTable } from "@ai-matrx/records/react";
import { Eye, FileText, Table2 } from "lucide-react";
import { TieredBreadcrumb } from "@/components/official/tiered-breadcrumb/TieredBreadcrumb";
import { recordPageHref } from "@/features/unified-data/table-page/recordPageHref";
import RouteHeader from "@/features/shell/components/header/RouteHeader";
import { ChevronLeftTapButton } from "@ai-matrx/design-system/tap-target/buttons";
import { NO_ADDRESS, UnifiedTableBody, useUnifiedTable } from "@/features/unified-data/table-page/UnifiedTable";
import { RecordPageMenu } from "@/features/unified-data/table-page/RecordPageMenu";

/** One page of a table's records for the record segment's menu; its search covers what was read. */
const RECORD_SIBLINGS_READ = 200;

function RecordCrumbs({ tableId, recordId }: { tableId: string; recordId: string }) {
  const router = useRouter();
  const table = useTable(tableId);
  const record = useRecord(recordId);
  const client = useRecordsClient();
  const tableName = table.data?.name?.trim() || "Table";
  const recordName = record.data?.document ? recordNameIn(table.data, record.data.document) : "";
  const tableHref = `/data/${encodeURIComponent(tableId)}`;
  return (
    <RouteHeader
      left={
        <>
          <ChevronLeftTapButton
            variant="transparent"
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) router.back();
              else router.push(tableHref);
            }}
            ariaLabel="Back"
          />
          {/* The one tiered breadcrumb: the table opens the other tables (each with its views); the
              record opens the other records of this table. */}
          <TieredBreadcrumb
            className="gap-0.5 px-1.5 text-sm"
            emptyChildren="No views"
            segmentClassName="inline-flex h-7 max-w-60 items-center gap-1.5 rounded px-1 text-muted-foreground hover:bg-accent hover:text-foreground data-[current=true]:font-medium data-[current=true]:text-foreground"
            segments={[
              {
                id: tableId,
                label: tableName,
                icon: <Table2 size={14} className="text-muted-foreground" />,
                href: tableHref,
                siblings: async () => {
                  const res = await client.tableList();
                  if (!res.ok) throw new Error(res.error.message);
                  return {
                    heading: "Other tables",
                    items: res.data.map((t) => ({ id: t.id, label: t.name?.trim() || "Untitled", icon: <Table2 size={15} />, href: `/data/${encodeURIComponent(t.id)}`, current: t.id === tableId })),
                  };
                },
              },
              {
                id: recordId,
                label: recordName,
                href: recordPageHref(tableId, recordId),
                siblings: async () => {
                  const res = await client.list({ table_id: tableId, limit: RECORD_SIBLINGS_READ });
                  if (!res.ok) throw new Error(res.error.message);
                  return {
                    heading: `Other records in ${tableName}`,
                    items: res.data.rows.map((row) => ({
                      id: row.id,
                      label: table.data ? recordNameIn(table.data, row.document) : "Untitled",
                      icon: <FileText size={15} />,
                      href: recordPageHref(tableId, row.id),
                      current: row.id === recordId,
                      expandable: false,
                    })),
                  };
                },
              },
            ]}
            loadChildren={async (item) => {
              // A table's views (tier 2 under "Other tables"), each opening the table on that view.
              const res = await client.views({ table_id: item.id });
              if (!res.ok) throw new Error(res.error.message);
              return res.data.map((v) => ({ id: v.view_id, label: v.name?.trim() || "Untitled view", icon: <Eye size={15} />, href: `/data/${encodeURIComponent(item.id)}?view=${encodeURIComponent(v.view_id)}`, expandable: false }));
            }}
          />
        </>
      }
    />
  );
}

export function UnifiedRecordPage({ tableId, recordId }: { tableId: string; recordId: string }) {
  const router = useRouter();
  const mount = useUnifiedTable({ tableId, address: NO_ADDRESS });
  return (
    <div className="h-full overflow-y-auto pt-[var(--shell-header-h)]">
      <div className="mx-auto w-full max-w-3xl p-4">
        <UnifiedTableBody
          mount={mount}
          onLeave={() => router.push(mount.allTablesHref)}
          /* A property page, not a grid, while the table is found (STABLE-TABLES). */
          skeleton={<RecordsSkeleton layout="record" embedded />}
          content={
            <>
              <RecordCrumbs tableId={tableId} recordId={recordId} />
              <RecordPageMenu tableId={tableId} recordId={recordId}>
                <RecordPanel tableId={tableId} recordId={recordId} onPage />
              </RecordPageMenu>
            </>
          }
        />
      </div>
    </div>
  );
}
