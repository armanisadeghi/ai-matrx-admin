"use client";

/**
 * On the web — every web result a person answered for this brand (Smart Add Create, Enrich, the validation page, added
 * by hand): websites, mentions, listings, backlinks, press, Not us, Former, Broken link, Maybe … grouped by
 * relationship. Each row opens the page in a new tab and its relationship can be changed in place, through the same
 * answer path the review uses (smart-add/webDecisions.ts → validate/persist.ts → the server's promotion).
 */

import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { readOf } from "@ai-matrx/design-system";
import { Select } from "@ai-matrx/design-system/controls";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table/types";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";
import { toast } from "@/lib/toast";
import { extractErrorMessage } from "@/utils/errors";
import { Favicon } from "@/features/research/components/overview/live-pipeline/ui/Favicon";
import { outboundHref } from "@/features/marketing/smart-add/SmartAddExtras";
import { listBrandRelationKinds, type BrandRelationKind } from "@/features/marketing/data/service";
import type { MarketingBrand } from "@/features/marketing/types";
import { changeWebDecision, listBrandWebDecisions, type WebDecisionRow } from "@/features/marketing/smart-add/webDecisions";
import { webDecisionsQueryKey } from "@/features/marketing/smart-add/enrich/useEnrichWebDecisions";

const FIELD_LABEL: Record<string, string> = {
  web_page: "Web page",
  mention: "Mention",
  listing: "Listing",
  website: "Website",
  bio_link: "Bio link",
  link_page: "Link page",
};

const SENTIMENT_LABEL: Record<string, string> = { positive: "Positive", neutral: "Neutral", negative: "Negative" };

function RelationCell({
  row,
  kinds,
  canEdit,
  onChange,
}: {
  row: WebDecisionRow;
  kinds: BrandRelationKind[];
  canEdit: boolean;
  onChange: (row: WebDecisionRow, kind: BrandRelationKind) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const label = kinds.find((k) => k.key === row.relationKey)?.label ?? row.relationKey;
  if (!canEdit || !kinds.length) return <span className="truncate text-sm">{label}</span>;
  return (
    <Select<string>
      aria-label={`Relationship of ${row.label}`}
      value={row.relationKey}
      disabled={busy}
      onValueChange={async (key) => {
        const kind = kinds.find((k) => k.key === key);
        if (!kind || key === row.relationKey) return;
        setBusy(true);
        try {
          await onChange(row, kind);
        } finally {
          setBusy(false);
        }
      }}
      options={[
        ...kinds.map((k) => ({ value: k.key, label: k.label })),
        ...(kinds.some((k) => k.key === row.relationKey) ? [] : [{ value: row.relationKey, label }]),
      ]}
      data-testid="brand-web-decision-relation"
    />
  );
}

export function BrandWebDecisionsSection({ brand, canEdit }: { brand: MarketingBrand; canEdit: boolean }) {
  const queryClient = useQueryClient();
  const kindsQuery = useQuery({ queryKey: ["marketing", "brand-relation-kinds"], queryFn: listBrandRelationKinds, staleTime: 5 * 60_000 });
  const rowsQuery = useQuery({ queryKey: webDecisionsQueryKey(brand.id), queryFn: () => listBrandWebDecisions(brand.id), staleTime: 0, refetchOnMount: "always" });
  const kinds = kindsQuery.data ?? [];
  const rows = rowsQuery.data ?? [];
  const [groupBy, setGroupBy] = useState<string | null>("relationship");
  const brandRef = useRef(brand);
  const labelOf = (key: string) => kinds.find((k) => k.key === key)?.label ?? key;

  const change = async (row: WebDecisionRow, kind: BrandRelationKind) => {
    try {
      await changeWebDecision(
        {
          // The brand's organization, never the active one.
          organizationId: brand.organization_id,
          getBrand: () => brandRef.current,
          setBrand: (b) => {
            brandRef.current = b;
          },
          kinds,
        },
        row,
        kind,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: webDecisionsQueryKey(brand.id) }),
        queryClient.invalidateQueries({ queryKey: ["marketing", "brand-relations", brand.id] }),
        queryClient.invalidateQueries({ queryKey: ["marketing", "brand-exclusions", brand.id] }),
      ]);
    } catch (error) {
      toast.error(`Not saved: ${row.label}`, { description: extractErrorMessage(error) });
    }
  };

  const columns: MatrxColumnDef<WebDecisionRow>[] = [
    {
      id: "page",
      header: "Page",
      accessorFn: (row) => `${row.label} ${row.host}`,
      cell: (row) => (
        <OutboundLink
          href={outboundHref(row.url)}
          className="matrx-tap-area flex min-w-0 items-center gap-2 hover:underline"
          title={row.url}
          data-testid="brand-web-decision-open"
        >
          <Favicon hostname={row.host} size={16} />
          <span className="min-w-0 truncate text-sm">{row.label}</span>
          <ExternalLink className="size-3 shrink-0 text-muted-foreground" aria-label="Opens in a new tab" />
        </OutboundLink>
      ),
    },
    { id: "host", header: "Site", accessorFn: (row) => row.host, cell: (row) => <span className="truncate text-sm text-muted-foreground">{row.host}</span> },
    {
      id: "relationship",
      header: "Relationship",
      accessorFn: (row) => labelOf(row.relationKey),
      cell: (row) => <RelationCell row={row} kinds={kinds} canEdit={canEdit} onChange={change} />,
    },
    { id: "sentiment", header: "Tone", accessorFn: (row) => (row.sentiment ? SENTIMENT_LABEL[row.sentiment] : ""), cell: (row) => <span className="text-sm">{row.sentiment ? SENTIMENT_LABEL[row.sentiment] : ""}</span> },
    { id: "found", header: "Found as", accessorFn: (row) => FIELD_LABEL[row.field ?? ""] ?? row.field ?? "", cell: (row) => <span className="text-sm text-muted-foreground">{FIELD_LABEL[row.field ?? ""] ?? row.field ?? ""}</span> },
    {
      id: "decided",
      header: "Decided",
      accessorFn: (row) => row.decidedAt ?? "",
      cell: (row) => <span className="text-sm tabular-nums text-muted-foreground">{row.decidedAt ? new Date(row.decidedAt).toLocaleDateString() : ""}</span>,
    },
  ];

  return (
    <section id="on-the-web" className="scroll-mt-24" data-testid="brand-web-decisions">
      <MatrxDataTable
        data={rows}
        columns={columns}
        getRowId={(row) => row.id}
        isFetching={rowsQuery.isFetching}
        read={readOf({ loading: rowsQuery.isLoading, error: rowsQuery.error }, { what: "the web results", onRetry: () => void rowsQuery.refetch() })}
        pageSize={50}
        detail={{ enabled: false }}
        grouping={{ columnId: groupBy, onColumnIdChange: setGroupBy, groupableColumnIds: ["relationship", "found", "host", "sentiment"], rowNoun: "page", order: "count-desc" }}
        emptyState={{ title: "No web results decided yet" }}
        toolbar={{ title: "On the web", titleCount: { value: rows.length, label: rows.length === 1 ? "page" : "pages" } }}
      />
    </section>
  );
}
