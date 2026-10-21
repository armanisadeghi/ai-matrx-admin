"use client";

import type { ComponentType } from "react";
import { Badge } from "@/components/ui/badge";
import { useAiTableBulk } from "../useAiTableBulk";
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
import {
  Building2,
  Lock,
  BookOpen,
  Package,
  Globe,
  ImageOff,
  Pencil,
} from "lucide-react";
import type { AiProvider } from "../../types";
import { readOf } from "@ai-matrx/design-system";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";
import { oneRowTint } from "@/components/official/table-row-tints";

function LinkIcon({
  href,
  label,
  icon: Icon,
}: {
  href: string | null | undefined;
  label: string;
  icon: ComponentType<{ className?: string }>;
}) {
  if (!href) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="flex h-6 w-6 items-center justify-center text-muted-foreground/30">
            <Icon className="h-3.5 w-3.5" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          No {label} link set
        </TooltipContent>
      </Tooltip>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <OutboundLink
          href={href}
          onClick={(event) => event.stopPropagation()}
          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
        >
          <Icon className="h-3.5 w-3.5" />
        </OutboundLink>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[280px] break-all text-xs">
        {label}: {href}
      </TooltipContent>
    </Tooltip>
  );
}

function ProviderLinks({ item }: { item: AiProvider }) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-0.5">
        {item.logo_url ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <img
                src={item.logo_url}
                alt=""
                className="h-5 w-5 shrink-0 rounded bg-muted object-contain"
              />
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Logo
            </TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground/30">
                <ImageOff className="h-3 w-3" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              No logo set
            </TooltipContent>
          </Tooltip>
        )}
        <LinkIcon
          href={item.documentation_link}
          label="Documentation"
          icon={BookOpen}
        />
        <LinkIcon href={item.models_link} label="Models list" icon={Package} />
        <LinkIcon href={item.website_url} label="Website" icon={Globe} />
      </div>
    </TooltipProvider>
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

export interface ProviderTableProps {
  providers: AiProvider[];
  isLoading: boolean;
  error: string | null;
  selectedId: string | null;
  onSelect: (provider: AiProvider) => void;
  onEdit: (provider: AiProvider) => void;
  onDelete: (provider: AiProvider) => Promise<void>;
  onCreate: () => void;
  onRetry: () => void;
}

export default function ProviderTable({
  providers,
  isLoading,
  error,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
  onCreate,
  onRetry,
}: ProviderTableProps) {
  const { rowActionDefs, selection } = useAiTableBulk<AiProvider>({
    noun: "provider",
    rows: providers,
    getRowName: (item) => item.name,
    deleteOne: onDelete,
    protectedReason: (item) => (item.is_system ? "System providers cannot be deleted" : null),
    deleteLabel: "Delete provider",
    consequence: "The provider leaves the active provider list.",
    extraVerbs: [
      { id: "edit", icon: Pencil, label: "Edit provider", onClick: onEdit, bulk: false, noBulk: "edit" },
    ],
  });
  const columns: MatrxColumnDef<AiProvider>[] = [
    {
      accessorKey: "name",
      header: "Name",
      sortable: true,
      cell: (item) => (
        <TruncatedText
          value={item.name}
          className="block max-w-[190px] truncate font-medium"
        />
      ),
    },
    {
      accessorKey: "slug",
      header: "Slug",
      sortable: true,
      cell: (item) => (
        <TruncatedText
          value={item.slug || "—"}
          className="block max-w-[130px] truncate font-mono text-muted-foreground"
        />
      ),
    },
    {
      id: "links",
      header: "Links",
      cell: (item) => <ProviderLinks item={item} />,
    },
    {
      accessorKey: "is_system",
      header: "System",
      sortable: true,
      cell: (item) =>
        item.is_system ? (
          <Badge
            variant="outline"
            className="gap-1 border-border bg-muted text-xs text-muted-foreground"
          >
            <Lock className="h-3 w-3" />
            System
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <MatrxDataTable<AiProvider>
        data={providers}
        isLoading={isLoading && providers.length === 0}
        isFetching={isLoading && providers.length > 0}
        columns={columns}
        rowActionDefs={rowActionDefs}
        selection={selection}
        getRowId={(item) => item.id}
        pageSize={50}
        pageSizeOptions={[10, 25, 50, 100]}
        defaultSort={{ id: "name", direction: "asc" }}
        onRowOpen={onSelect}
        detail={{ enabled: false }}
        tableStyle={oneRowTint(selectedId)}
        // The read's failure is the table's to say, once: the failure with no
        // rows, a stale notice above rows kept from an earlier read.
        read={readOf({ loading: isLoading, error }, { what: "providers", onRetry })}
        emptyState={{
          title: "No providers found",
          icon: <Building2 className="h-8 w-8" />,
        }}
        tableId="ai/providers"
        toolbar={{
          title: "AI Providers",
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
                  className="block max-w-full truncate text-left font-medium hover:underline"
                  onClick={() => onSelect(item)}
                >
                  {item.name}
                </button>
                <p className="truncate font-mono text-xs text-muted-foreground">
                  {item.slug || "—"}
                </p>
              </div>
              {item.is_system ? (
                <Badge variant="outline" className="shrink-0 gap-1 text-xs">
                  <Lock className="h-3 w-3" />
                  System
                </Badge>
              ) : null}
            </div>
            <ProviderLinks item={item} />
            <div className="flex justify-end">{controls.actions}</div>
          </article>
        )}
      />
    </div>
  );
}
