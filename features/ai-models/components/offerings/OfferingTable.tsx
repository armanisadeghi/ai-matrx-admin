"use client";

import { RecordId } from "@ai-matrx/design-system";
import {
  MatrxDataTable,
  type MatrxColumnDef,
} from "@ai-matrx/design-system/data-table";
import { Badge } from "@/components/ui/badge";
import { useAiTableBulk } from "../useAiTableBulk";
import { AiModelRef } from "@ai-matrx/chat/agents/components/identity-refs/AiIdentityRef";
import type { AiApi, AiEndpoint, AiModel, AiOffering } from "../../types";
import type { ReadOutcome } from "@ai-matrx/design-system";
import {
  ProviderPriceCell,
  type ProviderPriceField,
} from "../ProviderPriceCell";

interface OfferingTableProps {
  offerings: AiOffering[];
  models: AiModel[];
  endpoints: AiEndpoint[];
  apis: AiApi[];
  loading: boolean;
  onSelect: (offering: AiOffering) => void;
  onDelete: (offering: AiOffering) => Promise<void>;
  onCreate: () => void;
  onRetry: () => void;
  /** The offerings read (the container owns it). */
  read?: ReadOutcome | undefined;
}

function ProviderModelIdCell({ value }: { value: string }) {
  return (
    <span className="inline-flex min-w-0 items-center">
      <RecordId value={value} label="Provider model" show="full" className="min-w-0 truncate text-xs" />
    </span>
  );
}

export default function OfferingTable({
  offerings,
  models,
  endpoints,
  apis,
  loading,
  onSelect,
  onDelete,
  onCreate,
  onRetry,
  read,
}: OfferingTableProps) {
  const modelName = (id: string) => {
    const model = models.find((item) => item.id === id);
    return model?.common_name || model?.name || `Unknown AI model (${id})`;
  };
  const resolvedModelName = (id: string) => {
    const model = models.find((item) => item.id === id);
    return model?.common_name || model?.name || null;
  };
  const endpointName = (id: string) => {
    const endpoint = endpoints.find((item) => item.id === id);
    return endpoint?.display_name || id;
  };
  const apiName = (id: string) => {
    const api = apis.find((item) => item.id === id);
    return api?.display_name || id;
  };
  const priceFor = (offering: AiOffering, field: ProviderPriceField) =>
    offering.pricing[0]?.[field] ?? null;
  const pricingUsageBasisFor = (offering: AiOffering) =>
    offering.pricing[0]?.usage_basis ?? offering.usage_basis;

  const columns: MatrxColumnDef<AiOffering>[] = [
    {
      id: "model",
      header: "Model",
      label: "Model",
      accessorFn: (offering) => modelName(offering.model_id),
      width: 180,
      cell: (offering) => (
        <AiModelRef
          modelId={offering.model_id}
          name={resolvedModelName(offering.model_id)}
          showId
          showIcon={false}
        />
      ),
    },
    {
      id: "endpoint",
      header: "Endpoint",
      label: "Endpoint",
      accessorFn: (offering) => endpointName(offering.endpoint_id),
      width: 150,
    },
    {
      id: "api",
      header: "API",
      label: "API",
      accessorFn: (offering) => apiName(offering.api_id),
      width: 150,
    },
    {
      accessorKey: "provider_model_id",
      header: "Provider Model ID",
      width: 220,
      cell: (offering) => (
        <ProviderModelIdCell value={offering.provider_model_id} />
      ),
    },
    // table-filter-off: a numeric rank, filtered as a number
    {
      accessorKey: "priority",
      header: "Priority",
      width: 90,
      align: "right",
      cell: (offering) => (
        <span className="block text-right font-mono text-xs tabular-nums">
          {offering.priority}
        </span>
      ),
    },
    {
      id: "input_price",
      header: "Input Price",
      accessorFn: (offering) => priceFor(offering, "input_price"),
      width: 140,
      align: "right",
      cell: (offering) => (
        <ProviderPriceCell
          value={priceFor(offering, "input_price")}
          usageBasis={pricingUsageBasisFor(offering)}
          field="input_price"
        />
      ),
    },
    {
      id: "cached_input_price",
      header: "Cached Input",
      accessorFn: (offering) => priceFor(offering, "cached_input_price"),
      width: 150,
      align: "right",
      cell: (offering) => (
        <ProviderPriceCell
          value={priceFor(offering, "cached_input_price")}
          usageBasis={pricingUsageBasisFor(offering)}
          field="cached_input_price"
        />
      ),
    },
    {
      id: "output_price",
      header: "Output Price",
      accessorFn: (offering) => priceFor(offering, "output_price"),
      width: 140,
      align: "right",
      cell: (offering) => (
        <ProviderPriceCell
          value={priceFor(offering, "output_price")}
          usageBasis={pricingUsageBasisFor(offering)}
          field="output_price"
        />
      ),
    },
    {
      id: "is_available",
      header: "Available",
      accessorFn: (offering) => (offering.is_available ? "Yes" : "No"),
      width: 100,
      cell: (offering) => (
        <Badge
          variant="outline"
          className={
            offering.is_available
              ? "border-green-300 bg-green-50 text-[10px] text-green-700 dark:bg-green-900/20 dark:text-green-300"
              : "bg-muted text-[10px] text-muted-foreground"
          }
        >
          {offering.is_available ? "Available" : "Unavailable"}
        </Badge>
      ),
    },
    {
      id: "usage_basis",
      header: "Usage Basis",
      accessorFn: (offering) => offering.usage_basis ?? "",
      width: 120,
    },
  ];

  const { rowActionDefs, selection } = useAiTableBulk<AiOffering>({
    noun: "offering",
    rows: offerings,
    getRowName: (offering) => `${endpointName(offering.endpoint_id)} · ${resolvedModelName(offering.model_id) ?? offering.model_id}`,
    deleteOne: onDelete,
    deleteLabel: "Delete offering",
    consequence: "The offering is removed. This cannot be undone.",
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <MatrxDataTable<AiOffering>
        data={offerings}
        columns={columns}
        rowActionDefs={rowActionDefs}
        selection={selection}
        getRowId={(offering) => offering.id}
        isLoading={loading && offerings.length === 0}
        isFetching={loading && offerings.length > 0}
        pageSize={25}
        pageSizeOptions={[10, 25, 50, 100]}
        localPagination={{ mode: "numbered", reason: "The page-size choice must show exact pages and retain the canonical footer controls.", approvedBy: "Arman, September 27 2026 footer rule" }}
        defaultSort={{ id: "priority", direction: "asc" }}
        detail={{ enabled: false }}
        onRowOpen={onSelect}
        tableId="ai/offerings"
        read={read}
        emptyState={{ title: "No offerings yet." }}
        toolbar={{
          title: "AI Offerings",
          refresh: { onRefresh: onRetry },
          add: { onAdd: onCreate },
        }}
        copy={{
          label: "AI offering",
          listLabel: "AI offerings",
          location: "AI model administration",
          rowKind: "ai_offering",
          listKind: "ai_offerings",
          humanRow: (offering) =>
            `${modelName(offering.model_id)} via ${endpointName(offering.endpoint_id)} (${offering.provider_model_id})`,
          agentRow: (offering) => offering,
        }}

      />
    </div>
  );
}
