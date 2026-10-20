"use client";

import React from "react";
import {
  MatrxDataTable,
  type MatrxDataTableQueryState,
  type MatrxColumnDef,
} from "@ai-matrx/design-system/data-table";
import {
  ViewTapButton,
  PencilTapButton,
  CopyTapButton,
  TrashTapButton,
} from "@ai-matrx/design-system/tap-target/buttons";
import {
  Badge,
  Chip,
  type BadgeTone,
  type ChipTone,
} from "@ai-matrx/design-system/controls";
import { AI_MODEL_DRILL } from "./aiModelDrill";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { toastWriteFailure } from "@/lib/errors/toastWriteFailure";
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
  const applyQuery = (next: MatrxDataTableQueryState) => {
    console.log("APPLYQ", JSON.stringify(next.columnFilters), new Error().stack?.split("\n").slice(2,12).join("|"));
    onUpdateTabState({
      ...modelQueryToTab(next),
      tableQuery: modelQueryExtras(next),
    });
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
      look="mac"
      tableId="ai/models"
      viewTabs={false}
      data={tierModels}
      drill={AI_MODEL_DRILL}
      columns={[...(columns), ...drillColumns, { id: "custom-actions", header: "Actions", sortable: false, filter: false, customActions: (model) => (
        <ModelRowActions
          model={model}
          onSelect={onSelect}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
      ) }]}
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
            onChange: (value) => {
              console.log("FACETCHANGE", value);
              const rest = Object.fromEntries(
                Object.entries(state.columnFilters).filter(
                  ([id]) => id !== "is_deprecated",
                ),
              );
              applyQuery({
                ...state,
                page: 1,
                columnFilters:
                  value === "all"
                    ? rest
                    : {
                        ...rest,
                        is_deprecated: {
                          kind: "boolean",
                          value: value === "deprecated",
                        },
                      },
              });
            },
          },
        ],
        intelligentSearch: {},
        refresh: { onRefresh },
        add: { onAdd: onCreate },
      }}

    />
  );
}

export function ModelRowActions({
  model,
  onSelect,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  model: AiModel;
  onSelect: (model: AiModel) => void;
  onEdit: (model: AiModel) => void;
  onDuplicate: (model: AiModel) => void;
  onDelete: (model: AiModel) => void;
}) {
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await aiModelService.remove(model.id);
      setConfirmDelete(false);
      onDelete(model);
    } catch (err) {
      toastWriteFailure(err, { action: "move this model to Trash", remedy: "Try again." });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <ViewTapButton
        variant="transparent"
        ariaLabel="View model"
        onClick={() => onSelect(model)}
      />
      <PencilTapButton
        variant="transparent"
        ariaLabel="Edit model"
        onClick={() => onEdit(model)}
      />
      <CopyTapButton
        variant="transparent"
        ariaLabel="Duplicate model"
        onClick={() => onDuplicate(model)}
      />
      <TrashTapButton
        variant="transparent"
        iconColor="text-destructive"
        ariaLabel="Move model to Trash"
        onClick={() => setConfirmDelete(true)}
      />
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Move &quot;{model.common_name || model.name}&quot; to Trash?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This model leaves the model list, and agents set to it cannot run
              on it while it is in Trash. Restore it from Trash to bring it back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={deleting} onClick={() => void handleConfirmDelete()}>
              {deleting ? "Moving…" : "Move to Trash"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
