"use client";

import { humanizeIdentifier } from "@ai-matrx/kit/text-case";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  MatrxDataTable,
  type MatrxColumnDef,
} from "@ai-matrx/design-system/data-table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Lock, Pencil, SlidersHorizontal } from "lucide-react";
import { useAiTableBulk } from "../useAiTableBulk";
import type { AiSetting } from "../../types";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { readOf } from "@ai-matrx/design-system";
import { oneRowTint } from "@/components/official/table-row-tints";

function CompactRange({
  min,
  max,
}: {
  min: number | null;
  max: number | null;
}) {
  if (min === null && max === null)
    return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span className="font-mono text-xs tabular-nums">
      {min ?? "—"}
      <span className="mx-0.5 text-muted-foreground">–</span>
      {max ?? "—"}
    </span>
  );
}

function TruncatedText({
  value,
  className,
}: {
  value: string;
  className: string;
}) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={className}>{value}</span>
        </TooltipTrigger>
        <TooltipContent>{value}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export interface SettingTableProps {
  settings: AiSetting[];
  isLoading: boolean;
  error: string | null;
  selectedId: string | null;
  onSelect: (setting: AiSetting) => void;
  onEdit: (setting: AiSetting) => void;
  onDelete: (setting: AiSetting) => Promise<void>;
  onCreate: () => void;
  onRetry: () => void;
}

export default function SettingTable({
  settings,
  isLoading,
  error,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
  onCreate,
  onRetry,
}: SettingTableProps) {
  const searchParams = useSearchParams();
  const { rowActionDefs, selection } = useAiTableBulk<AiSetting>({
    noun: "setting",
    rows: settings,
    getRowName: (item) => humanizeIdentifier(item.key),
    deleteOne: onDelete,
    protectedReason: (item) => (item.is_system ? "System settings cannot be deleted" : null),
    deleteLabel: "Delete setting",
    consequence: "The setting leaves the active settings vocabulary.",
    extraVerbs: [{ id: "edit", icon: Pencil, label: "Edit setting", onClick: onEdit, bulk: false, noBulk: "edit" }],
  });
  if (searchParams.get("tablePreview") === "defaults") {
    const fields = Array.from(new Set(settings.flatMap((row) => Object.keys(row))));
    const defaultColumns: MatrxColumnDef<AiSetting>[] = fields.map((field) => ({
      accessorKey: field as keyof AiSetting,
      header: field.replaceAll("_", " "),
    }));
    return (
      <div className="flex h-full min-h-0 flex-col">
        {error ? <p role="alert">{error} <ErrorAlchemyMenu className="ml-auto" /></p> : null}
        <MatrxDataTable
          data={settings}
          columns={defaultColumns}
          getRowId={(row) => row.id}
          tableId="ai-settings/package-defaults"
          toolbar={{ title: "AI Settings — package defaults" }}
          isLoading={isLoading}
        />
      </div>
    );
  }
  const columns: MatrxColumnDef<AiSetting>[] = [
    {
      accessorKey: "key",
      header: "Key",
      sortable: true,
      width: "17rem",
      cell: (item) => (
        <TruncatedText
          value={item.key}
          className="block w-full truncate font-mono text-xs font-medium sm:!whitespace-nowrap sm:!break-normal sm:![overflow-wrap:normal]"
        />
      ),
    },
    {
      accessorKey: "value_type",
      header: "Value Type",
      sortable: true,
      filter: "select",
      width: "9rem",
      cell: (item) => (
        <Badge variant="outline" className="font-mono text-xs">
          {item.value_type}
        </Badge>
      ),
    },
    {
      id: "range",
      header: "Min – Max",
      width: "8rem",
      cell: (item) => (
        <CompactRange min={item.canonical_min} max={item.canonical_max} />
      ),
    },
    {
      accessorKey: "is_system",
      header: "Origin",
      sortable: true,
      width: "7rem",
      cell: (item) =>
        item.is_system ? (
          <Badge
            variant="outline"
            className="gap-1 border-blue-200 bg-blue-50 text-xs text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
          >
            <Lock className="h-2.5 w-2.5" />
            System
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs">
            Custom
          </Badge>
        ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: (item) => (
        <TruncatedText
          value={item.description || "—"}
          className="block max-w-[420px] truncate text-xs text-muted-foreground"
        />
      ),
    },
  ];
  return (
    <div className="flex h-full min-h-0 flex-col">
      <MatrxDataTable<AiSetting>
        data={settings}
        isLoading={isLoading && settings.length === 0}
        isFetching={isLoading && settings.length > 0}
        columns={columns}
        rowActionDefs={rowActionDefs}
        selection={selection}
        getRowId={(item) => item.id}
        pageSize={50}
        pageSizeOptions={[10, 25, 50, 100]}
        defaultSort={null}
        onRowOpen={onSelect}
        detail={{ enabled: false }}
        tableStyle={oneRowTint(selectedId)}
        // The read's failure is the table's to say, once: the failure with no
        // rows, a stale notice above rows kept from an earlier read.
        read={readOf({ loading: isLoading, error }, { what: "settings", onRetry })}
        emptyState={{
          title: "No settings found",
          icon: <SlidersHorizontal className="h-8 w-8" />,
        }}
        tableId="ai/settings"
        toolbar={{
          title: "Settings Vocabulary",
          searchPlaceholder: "Search settings…",
          intelligentSearch: {
            roles: { key: "name", description: "description" },
            scopes: [{ id: "value_type", label: "Type", fields: ["value_type"] }],
          },
          refresh: { onRefresh: onRetry },
          add: { onAdd: onCreate },
        }}

        mobileCards={(item, _index, controls) => (
          <article
            className={
              item.id === selectedId
                ? "space-y-2 rounded-md border border-primary/40 bg-primary/10 p-3"
                : "space-y-2 rounded-md border border-border p-3"
            }
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <button
                  type="button"
                  className="block max-w-full truncate text-left font-mono font-medium hover:underline"
                  onClick={() => onSelect(item)}
                >
                  <code className="font-mono">{item.key}</code>
                </button>
                <p className="text-xs text-muted-foreground">
                  {item.value_type}
                </p>
              </div>
              {item.is_system ? (
                <Badge variant="outline" className="shrink-0 gap-1 text-xs">
                  <Lock className="h-3 w-3" />
                  System
                </Badge>
              ) : (
                <Badge variant="outline" className="shrink-0 text-xs">
                  Custom
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <CompactRange min={item.canonical_min} max={item.canonical_max} />
              <span className="truncate">{item.description || "—"}</span>
            </div>
            <div className="flex justify-end">{controls.actions}</div>
          </article>
        )}
      />
    </div>
  );
}
