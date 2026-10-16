"use client";

/**
 * Temporary homes on the brand page (2026-10-16): what Smart Add promoted for a brand that has no permanent table
 * yet — recognition (`web.temp_brand_recognition`), firmographics (`web.temp_brand_firmographic`) and online
 * presence (`web.temp_brand_presence`). Each is a bounded section with the canonical table, editable in place,
 * deletable, and a quiet "Temporary" marker. Exit: adopt into real brand tables (see each table's description).
 *
 * Deleting a row sets `deleted_at` (the platform's soft delete); on the firmographic card, which holds ONE record,
 * "delete" clears that one value.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { Badge } from "@ai-matrx/design-system/controls";
import { MatrxDataTable, type MatrxColumnDef } from "@ai-matrx/design-system/data-table";
import type { MatrxTableIconAction } from "@ai-matrx/design-system/data-table/types";
import { supabase } from "@/utils/supabase/client";
import { authenticatedWebDb } from "@/utils/supabase/webDb";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { toast } from "@/lib/toast";
import { extractErrorMessage } from "@/utils/errors";
import { SectionCard } from "@/features/marketing/components/shared/MarketingUi";
import type { Database } from "@/types/database.types";

type Tables = Database["web"]["Tables"];
type RecognitionRow = Tables["temp_brand_recognition"]["Row"];
type PresenceRow = Tables["temp_brand_presence"]["Row"];
type FirmographicRow = Tables["temp_brand_firmographic"]["Row"];
type EditMap = Record<string, Record<string, unknown>>;

const TEMP_NOTE = "Temporary home: these move into permanent brand tables later.";

function TempMarker() {
  return (
    <span title={TEMP_NOTE}>
      <Badge tone="neutral">Temporary</Badge>
    </span>
  );
}

function asText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

function asNumber(value: unknown): number | null {
  const text = asText(value);
  if (text === null) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

const RECOGNITION_TYPES = ["credential", "membership", "award", "press_mention", "appearance", "sponsorship", "registry_record"];
const RECOGNITION_NUMBER = new Set(["year"]);
const PRESENCE_NUMBER = new Set(["follower_count", "rating", "review_count"]);

function usePatch(table: "temp_brand_recognition" | "temp_brand_presence" | "temp_brand_firmographic", queryKey: readonly unknown[]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const db = await authenticatedWebDb(supabase);
      const { error } = await db.from(table).update(patch as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
}

function TempSection({
  title,
  anchor,
  empty,
  canEdit,
  loading,
  error,
  children,
  hasRows,
}: {
  title: string;
  anchor: string;
  empty: string;
  canEdit: boolean;
  loading: boolean;
  error: unknown;
  hasRows: boolean;
  children: React.ReactNode;
}) {
  void canEdit;
  return (
    <SectionCard title={title} anchor={anchor} className="scroll-mt-24" headerExtra={<TempMarker />}>
      {error ? (
        <p data-error-box className="px-4 py-2.5 text-xs text-destructive">
          Could not load: {extractErrorMessage(error)}
        </p>
      ) : loading ? (
        <div aria-busy="true" aria-label={`Loading ${title.toLowerCase()}`} className="flex h-[50px] items-center px-4">
          <div className="h-4 w-48 animate-pulse rounded bg-muted" />
        </div>
      ) : !hasRows ? (
        <p className="flex min-h-[50px] items-center px-4 text-xs text-muted-foreground">{empty}</p>
      ) : (
        children
      )}
    </SectionCard>
  );
}

function useTempRows<R>(table: "temp_brand_recognition" | "temp_brand_presence" | "temp_brand_firmographic", brandId: string) {
  const queryKey = ["marketing", "brand", brandId, table] as const;
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const db = await authenticatedWebDb(supabase);
      const { data, error } = await db
        .from(table)
        .select("*")
        .eq("brand_id", brandId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as R[];
    },
    enabled: Boolean(brandId),
    staleTime: 30_000,
  });
  return { query, queryKey };
}

async function softDelete(
  patch: (args: { id: string; patch: Record<string, unknown> }) => Promise<void>,
  id: string,
  what: string,
  patchBody: Record<string, unknown>,
) {
  const ok = await confirm({ title: `Delete ${what}`, description: "This removes it from the brand.", confirmLabel: "Delete", variant: "destructive" });
  if (!ok) return;
  try {
    await patch({ id, patch: patchBody });
    toast.success("Deleted");
  } catch (error) {
    toast.error(`Could not delete: ${extractErrorMessage(error)}`);
  }
}

export function BrandRecognitionSection({ brandId, canEdit }: { brandId: string; canEdit: boolean }) {
  const { query, queryKey } = useTempRows<RecognitionRow>("temp_brand_recognition", brandId);
  const patch = usePatch("temp_brand_recognition", queryKey);
  const edit = canEdit;
  const columns: MatrxColumnDef<RecognitionRow>[] = [
    {
      id: "recognition_type",
      label: "Kind",
      header: "Kind",
      width: 130,
      accessorFn: (r) => r.recognition_type,
      editable: edit ? "select" : false,
      editOptions: RECOGNITION_TYPES.map((v) => ({ value: v, label: v.replace(/_/g, " ") })),
      filter: "select",
      filterOptions: RECOGNITION_TYPES.map((v) => ({ value: v, label: v.replace(/_/g, " ") })),
      cell: (r) => <span className="text-xs">{r.recognition_type.replace(/_/g, " ")}</span>,
    },
    { id: "name", label: "Name", header: "Name", width: 240, minWidth: 160, accessorFn: (r) => r.name, editable: edit ? "string" : false, filter: "text" },
    { id: "issuer_name", label: "Issuer", header: "Issuer", width: 180, accessorFn: (r) => r.issuer_name ?? "", editable: edit ? "string" : false, filter: "text" },
    { id: "year", label: "Year", header: "Year", width: 80, accessorFn: (r) => r.year ?? "", editable: edit ? "number" : false, cell: (r) => (r.year === null ? "—" : String(r.year)) },
    { id: "reference_number", label: "Reference", header: "Reference", width: 130, accessorFn: (r) => r.reference_number ?? "", editable: edit ? "string" : false },
    { id: "valid_from_text", label: "Valid from", header: "Valid from", width: 110, accessorFn: (r) => r.valid_from_text ?? "", editable: edit ? "string" : false },
    { id: "valid_until_text", label: "Valid until", header: "Valid until", width: 110, accessorFn: (r) => r.valid_until_text ?? "", editable: edit ? "string" : false },
    { id: "url", label: "Link", header: "Link", width: 200, accessorFn: (r) => r.url ?? "", editable: edit ? "string" : false },
  ];
  const rowActions = (r: RecognitionRow): MatrxTableIconAction[] =>
    canEdit
      ? [{ id: "delete", icon: Trash2, label: "Delete", tone: "destructive", onClick: () => void softDelete(patch.mutateAsync, r.id, r.name, { deleted_at: new Date().toISOString() }) }]
      : [];
  const rows = query.data ?? [];
  return (
    <TempSection
      title="Recognition"
      anchor="temp-brand-recognition"
      empty="No credentials, awards or press found yet."
      canEdit={canEdit}
      loading={query.isLoading}
      error={query.error}
      hasRows={rows.length > 0}
    >
      <MatrxDataTable<RecognitionRow>
        tableId="marketing-brand-temp-recognition"
        data={rows}
        columns={columns}
        getRowId={(r) => r.id}
        appearance="embedded"
        density="condensed"
        viewTabs={false}
        pageSize={0}
        toolbar={{ searchPlaceholder: "Search recognition…", singleRow: true }}
        rowActions={rowActions}
        edit={
          canEdit
            ? {
                enabled: true,
                autoSave: true,
                onSave: async (edits: EditMap) => {
                  for (const [id, fields] of Object.entries(edits)) {
                    const body: Record<string, unknown> = {};
                    for (const [k, v] of Object.entries(fields)) {
                      body[k] = RECOGNITION_NUMBER.has(k) ? asNumber(v) : k === "name" || k === "recognition_type" ? (asText(v) ?? undefined) : asText(v);
                    }
                    await patch.mutateAsync({ id, patch: body });
                  }
                },
              }
            : undefined
        }
        emptyState={{ title: "Nothing here yet" }}
      />
    </TempSection>
  );
}

export function BrandPresenceSection({ brandId, canEdit }: { brandId: string; canEdit: boolean }) {
  const { query, queryKey } = useTempRows<PresenceRow>("temp_brand_presence", brandId);
  const patch = usePatch("temp_brand_presence", queryKey);
  const edit = canEdit;
  const columns: MatrxColumnDef<PresenceRow>[] = [
    { id: "presence_type", label: "Kind", header: "Kind", width: 130, accessorFn: (r) => r.presence_type, editable: edit ? "string" : false, filter: "text", cell: (r) => <span className="text-xs">{r.presence_type.replace(/_/g, " ")}</span> },
    { id: "label", label: "Name", header: "Name", width: 220, minWidth: 140, accessorFn: (r) => r.label, editable: edit ? "string" : false, filter: "text" },
    { id: "platform_name", label: "Platform", header: "Platform", width: 130, accessorFn: (r) => r.platform_name ?? "", editable: edit ? "string" : false, filter: "text" },
    { id: "domain", label: "Domain", header: "Domain", width: 160, accessorFn: (r) => r.domain ?? "", editable: edit ? "string" : false },
    { id: "follower_count", label: "Followers", header: "Followers", width: 100, accessorFn: (r) => r.follower_count ?? "", editable: edit ? "number" : false },
    { id: "rating", label: "Rating", header: "Rating", width: 80, accessorFn: (r) => r.rating ?? "", editable: edit ? "number" : false },
    { id: "review_count", label: "Reviews", header: "Reviews", width: 90, accessorFn: (r) => r.review_count ?? "", editable: edit ? "number" : false },
    { id: "url", label: "Link", header: "Link", width: 200, accessorFn: (r) => r.url ?? "", editable: edit ? "string" : false },
  ];
  const rowActions = (r: PresenceRow): MatrxTableIconAction[] =>
    canEdit
      ? [{ id: "delete", icon: Trash2, label: "Delete", tone: "destructive", onClick: () => void softDelete(patch.mutateAsync, r.id, r.label, { deleted_at: new Date().toISOString() }) }]
      : [];
  const rows = query.data ?? [];
  return (
    <TempSection
      title="Online presence"
      anchor="temp-brand-presence"
      empty="No listings, profiles or review pages found yet."
      canEdit={canEdit}
      loading={query.isLoading}
      error={query.error}
      hasRows={rows.length > 0}
    >
      <MatrxDataTable<PresenceRow>
        tableId="marketing-brand-temp-presence"
        data={rows}
        columns={columns}
        getRowId={(r) => r.id}
        appearance="embedded"
        density="condensed"
        viewTabs={false}
        pageSize={0}
        toolbar={{ searchPlaceholder: "Search presence…", singleRow: true }}
        rowActions={rowActions}
        edit={
          canEdit
            ? {
                enabled: true,
                autoSave: true,
                onSave: async (edits: EditMap) => {
                  for (const [id, fields] of Object.entries(edits)) {
                    const body: Record<string, unknown> = {};
                    for (const [k, v] of Object.entries(fields)) {
                      body[k] = PRESENCE_NUMBER.has(k) ? asNumber(v) : k === "label" || k === "presence_type" ? (asText(v) ?? undefined) : asText(v);
                    }
                    await patch.mutateAsync({ id, patch: body });
                  }
                },
              }
            : undefined
        }
        emptyState={{ title: "Nothing here yet" }}
      />
    </TempSection>
  );
}

const FIRMOGRAPHIC_FIELDS: ReadonlyArray<{ key: keyof FirmographicRow & string; label: string }> = [
  { key: "entity_type", label: "Entity type" },
  { key: "ownership_type", label: "Ownership" },
  { key: "parent_company_name", label: "Parent company" },
  { key: "employee_count_range", label: "Employees" },
  { key: "annual_revenue", label: "Annual revenue" },
  { key: "funding", label: "Funding" },
  { key: "target_market", label: "Target market" },
  { key: "price_range", label: "Price range" },
  { key: "payment_methods", label: "Payment methods" },
  { key: "languages_spoken", label: "Languages" },
  { key: "live_chat", label: "Live chat" },
  { key: "response_time", label: "Response time" },
  { key: "google_place_id", label: "Google place id" },
  { key: "knowledge_graph_id", label: "Knowledge graph id" },
];

interface FirmographicLine {
  id: string;
  recordId: string;
  label: string;
  value: string;
}

export function BrandFirmographicSection({ brandId, canEdit }: { brandId: string; canEdit: boolean }) {
  const { query, queryKey } = useTempRows<FirmographicRow>("temp_brand_firmographic", brandId);
  const patch = usePatch("temp_brand_firmographic", queryKey);
  const record = (query.data ?? [])[0] ?? null;
  // One record, shown as Field / Value lines so each value is editable and clearable on its own.
  const lines: FirmographicLine[] = record
    ? FIRMOGRAPHIC_FIELDS.map((f) => ({ id: f.key, recordId: record.id, label: f.label, value: asText(record[f.key]) ?? "" })).filter((l) => l.value !== "")
    : [];
  const columns: MatrxColumnDef<FirmographicLine>[] = [
    { id: "label", label: "Field", header: "Field", width: 200, accessorFn: (r) => r.label, filter: "text" },
    { id: "value", label: "Value", header: "Value", width: 420, minWidth: 200, accessorFn: (r) => r.value, editable: canEdit ? "string" : false },
  ];
  const rowActions = (r: FirmographicLine): MatrxTableIconAction[] =>
    canEdit ? [{ id: "delete", icon: Trash2, label: "Clear value", tone: "destructive", onClick: () => void softDelete(patch.mutateAsync, r.recordId, r.label, { [r.id]: null }) }] : [];
  return (
    <TempSection
      title="Company profile"
      anchor="temp-brand-firmographic"
      empty="No company details found yet."
      canEdit={canEdit}
      loading={query.isLoading}
      error={query.error}
      hasRows={lines.length > 0}
    >
      <MatrxDataTable<FirmographicLine>
        tableId="marketing-brand-temp-firmographic"
        data={lines}
        columns={columns}
        getRowId={(r) => r.id}
        appearance="embedded"
        density="condensed"
        viewTabs={false}
        pageSize={0}
        toolbar={{ searchPlaceholder: "Search details…", singleRow: true }}
        rowActions={rowActions}
        edit={
          canEdit
            ? {
                enabled: true,
                autoSave: true,
                onSave: async (edits: EditMap, rows: FirmographicLine[]) => {
                  for (const [fieldKey, fields] of Object.entries(edits)) {
                    const row = rows.find((r) => r.id === fieldKey);
                    if (!row) continue;
                    await patch.mutateAsync({ id: row.recordId, patch: { [fieldKey]: asText(fields.value) } });
                  }
                },
              }
            : undefined
        }
        emptyState={{ title: "Nothing here yet" }}
      />
    </TempSection>
  );
}
