"use client";

import React from "react";
import {
  MatrxDataTable,
  type MatrxDataTableQueryState,
  type MatrxColumnDef,
  type ToolbarFacet,
} from "@ai-matrx/design-system/data-table";
import {
  Badge,
  Chip,
  Select,
  type BadgeTone,
  type ChipTone,
} from "@ai-matrx/design-system/controls";
import { AI_MODEL_DRILL } from "./aiModelDrill";
import type { AiModel, AiProvider } from "../types";
import { AiModelRef } from "@ai-matrx/chat/agents/components/identity-refs/AiIdentityRef";
import { aiModelSummary, AI_MODELS_LOCATION } from "../format";
import { CostRatingCell } from "./CostRatingCell";
import { matchesTierView } from "../maxTier";
import type { TabState } from "../hooks/useTabUrlState";
import { parseCapabilities } from "@ai-matrx/agents/models";
import { type ContentType } from "@ai-matrx/agents/models";
import { MatrxUuidCell } from "@ai-matrx/design-system/data-table/uuid-cell";
import { aiModelHref, aiProviderHref } from "../doors";
import { aiModelService } from "../service";
import { useAiTableBulk } from "./useAiTableBulk";
import { Copy, Eye, Pencil } from "lucide-react";
import {
  modelFiltersToColumns,
  modelQueryToTab,
  modelQueryExtras,
} from "../utils/canonicalTableQuery";
import {
  ProviderPriceCell,
  type ProviderPriceField,
} from "./ProviderPriceCell";
import { formatCount } from "@ai-matrx/kit/format";
import { ReadFailure } from "@ai-matrx/design-system";

// ─── Provider tones ───────────────────────────────────────────────────────────

/** The ONE mapping from a model maker to its Chip tone. */
const PROVIDER_TONES: Record<string, ChipTone> = {
  anthropic: "orange",
  openai: "emerald",
  google: "blue",
  meta: "indigo",
  mistral: "violet",
  mixtral: "violet",
  xai: "slate",
  groq: "teal",
  "ai matrx": "rose",
  "black forest": "slate",
  deepseek: "cyan",
  microsoft: "sky",
  qwen: "amber",
  together: "lime",
  wan: "slate",
  cerebras_chat: "fuchsia",
};

function providerTone(name: string | null): ChipTone {
  return PROVIDER_TONES[(name ?? "").toLowerCase()] ?? "neutral";
}

// ─── Cell Helpers ─────────────────────────────────────────────────────────────

function formatNumber(n: number | null): string {
  return formatCount(n, { style: "compact" });
}

function BoolBadge({
  value,
  trueLabel,
  tone,
}: {
  value: boolean | null;
  trueLabel: string;
  tone: BadgeTone;
}) {
  if (!value) return <span className="type-meta text-muted-foreground">—</span>;
  return <Badge tone={tone}>{trueLabel}</Badge>;
}

function ModalityBadges({ values }: { values: ContentType[] }) {
  return (
    <div className="flex items-center gap-1 whitespace-nowrap">
      {values.map((value) => (
        <Badge key={value}>{value.charAt(0).toUpperCase() + value.slice(1)}</Badge>
      ))}
    </div>
  );
}

function PriceCell({
  item,
  field,
}: {
  item: AiModel;
  field: ProviderPriceField;
}) {
  const value = item.preferred_pricing?.[field];
  return (
    <ProviderPriceCell
      value={value}
      usageBasis={item.preferred_pricing?.usage_basis}
      field={field}
    />
  );
}

// ─── Column definitions ───────────────────────────────────────────────────────

interface ColDef {
  key: string;
  header: string;
  width: string;
  sortable: boolean;
  filter?: "select" | "boolean" | "number";
  className?: string;
  render: (
    item: AiModel,
    providerMap: Record<string, string>,
  ) => React.ReactNode;
}

const COLUMNS: ColDef[] = [
  {
    key: "id",
    header: "ID",
    width: "w-[120px] min-w-[120px]",
    sortable: true,
    render: (item) => (
      <AiModelRef
        modelId={item.id}
        name={item.common_name || item.name}
        showId
        showIcon={false}
      />
    ),
  },
  {
    key: "common_name",
    header: "Display Name",
    width: "w-[180px] min-w-[140px]",
    sortable: true,
    render: (item) => (
      <span
        className="type-title truncate block max-w-[170px]"
        title={item.common_name ?? item.name}
      >
        {item.common_name || item.name}
      </span>
    ),
  },
  {
    key: "name",
    header: "Model Name",
    width: "w-[200px] min-w-[160px]",
    sortable: true,
    render: (item) => (
      <span
        className="type-meta font-mono text-muted-foreground truncate block max-w-[190px]"
        title={item.name}
      >
        {item.name}
      </span>
    ),
  },
  {
    key: "input_price",
    header: "Input Price",
    width: "w-[130px] min-w-[120px]",
    sortable: true,
    className: "text-right",
    render: (item) => <PriceCell item={item} field="input_price" />,
  },
  {
    key: "cached_input_price",
    header: "Cached Input",
    width: "w-[140px] min-w-[130px]",
    sortable: true,
    className: "text-right",
    render: (item) => <PriceCell item={item} field="cached_input_price" />,
  },
  {
    key: "output_price",
    header: "Output Price",
    width: "w-[130px] min-w-[120px]",
    sortable: true,
    className: "text-right",
    render: (item) => <PriceCell item={item} field="output_price" />,
  },
  {
    key: "maker",
    header: "Provider",
    width: "w-[120px] min-w-[100px]",
    sortable: true,
    filter: "select",
    render: (item) => (
      <Chip tone={providerTone(item.maker)} label={item.maker ?? "—"} />
    ),
  },
  {
    key: "provider_id",
    header: "Provider FK",
    width: "w-[120px] min-w-[100px]",
    sortable: true,
    render: (item, providerMap) => (
      <MatrxUuidCell
        value={item.provider_id}
        label={
          item.provider_id
            ? (providerMap[item.provider_id] ?? "AI model provider")
            : "AI model provider"
        }
        href={item.provider_id ? aiProviderHref(item.provider_id) : null}
      />
    ),
  },
  {
    key: "input_capability",
    header: "Input",
    width: "w-[150px] min-w-[130px]",
    sortable: false,
    filter: "select",
    render: (item) => (
      <ModalityBadges
        values={
          parseCapabilities(item.capabilities, {
            modelId: item.id,
            modelName: item.name,
          }).input
        }
      />
    ),
  },
  {
    key: "output_capability",
    header: "Output",
    width: "w-[140px] min-w-[120px]",
    sortable: false,
    filter: "select",
    render: (item) => (
      <ModalityBadges
        values={
          parseCapabilities(item.capabilities, {
            modelId: item.id,
            modelName: item.name,
          }).output
        }
      />
    ),
  },
  {
    key: "context_window",
    header: "Context",
    width: "w-[80px] min-w-[70px]",
    sortable: true,
    filter: "number",
    className: "text-right",
    render: (item) => (
      <span className="type-meta tabular-nums">
        {formatNumber(item.context_window)}
      </span>
    ),
  },
  {
    key: "max_tokens",
    header: "Max Tokens",
    width: "w-[90px] min-w-[80px]",
    sortable: true,
    filter: "number",
    className: "text-right",
    render: (item) => (
      <span className="type-meta tabular-nums">
        {formatNumber(item.max_tokens)}
      </span>
    ),
  },
  // NOTE: no controls/constraints columns — those legacy model_definition
  // columns were DROPPED (ai_034); resolved rules live on ai.model_config.
  {
    key: "is_deprecated",
    header: "Deprecated",
    width: "w-[90px] min-w-[80px]",
    sortable: true,
    filter: "boolean",
    render: (item) => (
      <BoolBadge
        value={item.is_deprecated}
        trueLabel="Deprecated"
        tone="destructive"
      />
    ),
  },
  {
    key: "is_primary",
    header: "Primary",
    width: "w-[75px] min-w-[70px]",
    sortable: true,
    filter: "boolean",
    render: (item) => (
      <BoolBadge
        value={item.is_primary}
        trueLabel="Primary"
        tone="success"
      />
    ),
  },
  {
    key: "is_premium",
    header: "Premium",
    width: "w-[75px] min-w-[70px]",
    sortable: true,
    filter: "boolean",
    render: (item) => (
      <BoolBadge
        value={item.is_premium}
        trueLabel="Premium"
        tone="warning"
      />
    ),
  },
  {
    key: "cost_rating",
    header: "Cost",
    width: "w-[150px] min-w-[130px]",
    sortable: true,
    render: (item) => <CostRatingCell model={item} />,
  },
  // Pricing remains read-only here; editing still lives only on ai.offering.
];

export interface AiModelTableProps {
  models: AiModel[];
  providers: AiProvider[];
  isLoading: boolean;
  /** The model read's failure; with no rows the table shows it instead of "No AI models found". */
  loadError?: string | null;
  selectedId: string | null;
  tabState: TabState;
  onUpdateTabState: (patch: Partial<Omit<TabState, "id">>) => void;
  onSelect: (model: AiModel) => void;
  onEdit: (model: AiModel) => void;
  onDelete: (model: AiModel) => void;
  onDuplicate: (model: AiModel) => void;
  onCreate: () => void;
  onRefresh: () => void;
}

/** The ONE AI models table: the package table over the complete catalog, domain cells here. */
export default function AiModelTable(props: AiModelTableProps) {
  const {
    models,
    providers,
    isLoading,
    selectedId,
    onSelect,
    onEdit,
    onDelete,
    onDuplicate,
    onCreate,
    onRefresh,
  } = props;
  const { tabState, onUpdateTabState } = props;
  const { rowActionDefs, selection } = useAiTableBulk<AiModel>({
    noun: "model",
    rows: models,
    getRowName: (model) => model.common_name || model.name,
    deleteOne: (model) => moveModelToTrash(model, onDelete),
    deleteLabel: "Move to Trash",
    consequence: "The model leaves the model list, and agents set to it cannot run on it. Restore it from Trash to bring it back.",
    extraVerbs: [
      { id: "view", icon: Eye, label: "View model", onClick: onSelect, bulk: false, noBulk: "view" },
      { id: "edit", icon: Pencil, label: "Edit model", onClick: onEdit, bulk: false, noBulk: "edit" },
      { id: "duplicate", icon: Copy, label: "Duplicate model", onClick: onDuplicate, bulk: false, noBulk: "single" },
    ],
  });
  const extraQuery: Partial<MatrxDataTableQueryState> = tabState.tableQuery ?? {};
  const state: MatrxDataTableQueryState = {
    ...extraQuery,
    search: tabState.q,
    page: tabState.page,
    pageSize: tabState.perPage,
    sort: tabState.sort
      ? {
          id: tabState.sort === "provider" ? "maker" : tabState.sort,
          direction: tabState.dir,
        }
      : null,
    anyOf: extraQuery.anyOf ?? "",
    columnFilters: {
      ...extraQuery.columnFilters,
      ...modelFiltersToColumns(tabState.filters),
    },
  };
  const applyQuery = (next: MatrxDataTableQueryState) =>
    onUpdateTabState({
      ...modelQueryToTab(next),
      tableQuery: modelQueryExtras(next),
    });
  /** Set or clear ONE column filter, keeping the rest of the query. */
  const setColumnFilter = (
    id: string,
    filter: MatrxDataTableQueryState["columnFilters"][string] | undefined,
  ) => {
    const rest = Object.fromEntries(
      Object.entries(state.columnFilters).filter(([key]) => key !== id),
    );
    applyQuery({
      ...state,
      page: 1,
      columnFilters: filter ? { ...rest, [id]: filter } : rest,
    });
  };
  const makerOptions = [
    ...new Set(models.map((m) => m.maker).filter((v): v is string => !!v)),
  ].sort();
  const outputOptions = [
    ...new Set(
      models.flatMap(
        (m) =>
          parseCapabilities(m.capabilities, { modelId: m.id, modelName: m.name })
            .output,
      ),
    ),
  ].sort();
  const selectFacet = (
    id: string,
    label: string,
    allLabel: string,
    options: string[],
  ): ToolbarFacet => {
    const current = state.columnFilters[id];
    const value = current?.kind === "select" ? current.value : "";
    return {
      type: "custom",
      id,
      filter: {
        active: value !== "",
        onReset: () => setColumnFilter(id, undefined),
      },
      render: () => (
        <Select
          aria-label={label}
          value={value}
          options={[
            { value: "", label: allLabel },
            ...options.map((option) => ({ value: option, label: option })),
          ]}
          onValueChange={(next) =>
            setColumnFilter(id, next ? { kind: "select", value: next } : undefined)
          }
        />
      ),
    };
  };
  const providerMap = Object.fromEntries(
    providers.map((provider) => [provider.id, provider.name ?? provider.id]),
  );
  const tierView = tabState.filters.tier;
  const tierModels = tierView
    ? models.filter((model) => matchesTierView(model, tierView))
    : models;
  const columns: MatrxColumnDef<AiModel>[] = COLUMNS.map((column) => ({
    id: column.key,
    header: column.header,
    width: Number(column.width.match(/w-\[(\d+)px\]/)?.[1] ?? 140),
    sortable: column.sortable,
    ...(column.filter
      ? {
          filter: column.filter,
          ...(column.filter === "select" ? { filterSingle: true } : {}),
        }
      : {}),
    accessorFn: (model) => {
      if (
        column.key === "input_price" ||
        column.key === "cached_input_price" ||
        column.key === "output_price"
      )
        return model.preferred_pricing?.[column.key];
      if (
        column.key === "input_capability" ||
        column.key === "output_capability"
      ) {
        const capabilities = parseCapabilities(model.capabilities, {
          modelId: model.id,
          modelName: model.name,
        });
        return column.key === "input_capability"
          ? capabilities.input
          : capabilities.output;
      }
      return model[column.key as keyof AiModel];
    },
    ...(column.className === "text-right" ? { align: "right" as const } : {}),
    cell: (model) =>
      column.key === "id" ? (
        <MatrxUuidCell
          value={model.id}
          label="Model ID"
          href={aiModelHref(model.id)}
          onOpen={() => onSelect(model)}
        />
      ) : (
        column.render(model, providerMap)
      ),
  }));
  // Facts a model has no column for today, read by the drill (hidden until a person adds them).
  const kinds = (model: AiModel, side: "input" | "output") => {
    const caps = parseCapabilities(model.capabilities, { modelId: model.id, modelName: model.name });
    const list = side === "input" ? caps.input : caps.output;
    return Array.isArray(list) && list.length > 0 ? [...list].sort().join(" + ") : "None";
  };
  const drillColumns: MatrxColumnDef<AiModel>[] = [
    {
      id: "hosted_by",
      header: "Hosted by",
      hidden: true,
      sortable: false,
      accessorFn: (model) => (model.provider_id ? (providerMap[model.provider_id] ?? "Unknown") : "None"),
    },
    { id: "input_kinds", header: "Accepts", hidden: true, sortable: false, accessorFn: (model) => kinds(model, "input") },
    { id: "output_kinds", header: "Returns", hidden: true, sortable: false, accessorFn: (model) => kinds(model, "output") },
  ];
  if (props.loadError && models.length === 0) {
    return (
      <ReadFailure error={props.loadError} what="the model catalog" onRetry={onRefresh} />
    );
  }

  return (
    <MatrxDataTable<AiModel>
      tableId="ai/models"
      viewTabs={false}
      data={tierModels}
      drill={AI_MODEL_DRILL}
      columns={[...columns, ...drillColumns]}
      rowActionDefs={rowActionDefs}
      selection={selection}
      getRowId={(model) => model.id}
      query={{
        mode: "controlled-local",
        state,
        onStateChange: applyQuery,
      }}
      isLoading={isLoading && models.length === 0}
      isFetching={isLoading && models.length > 0}
      selectedId={selectedId}
      onRowOpen={onSelect}
      detail={{ enabled: false }}
      copy={{
        label: "AI model",
        listLabel: "AI models",
        location: AI_MODELS_LOCATION,
        rowKind: "ai-model",
        listKind: "ai-models",
        rowDescription: "A single AI model registry row.",
        listDescription: "The AI model registry, as filtered and sorted.",
        humanRow: aiModelSummary,
        rowAttributes: (model) => ({
          id: model.id,
          provider: model.maker ?? model.provider_id ?? "",
        }),
      }}
      toolbar={{
        title: "AI Models",
        titleCount: { value: models.length, label: "models" },
        facets: [
          {
            type: "button-group",
            id: "status",
            value:
              tabState.filters.is_deprecated === undefined
                ? "all"
                : tabState.filters.is_deprecated
                  ? "deprecated"
                  : "active",
            defaultValue: "active",
            options: [
              { value: "active", label: "Active" },
              { value: "deprecated", label: "Deprecated" },
              { value: "all", label: "All" },
            ],
            onChange: (value) =>
              setColumnFilter(
                "is_deprecated",
                value === "all"
                  ? undefined
                  : { kind: "boolean", value: value === "deprecated" },
              ),
          },
          selectFacet("output_capability", "Output", "All outputs", outputOptions),
          selectFacet("maker", "Provider", "All providers", makerOptions),
        ],
        intelligentSearch: {},
        refresh: { onRefresh },
        add: { onAdd: onCreate },
      }}

    />
  );
}

/**
 * Move one model to Trash: the server write first (`ai.model_definition.deleted_at`; delete means
 * archive, 2026-09-27), then the caller's local-state removal. The row's Delete and its bulk twin
 * both call this, so neither can drop a row locally without the write (it did once).
 */
export async function moveModelToTrash(model: AiModel, onDelete: (model: AiModel) => void): Promise<void> {
  await aiModelService.remove(model.id);
  onDelete(model);
}
