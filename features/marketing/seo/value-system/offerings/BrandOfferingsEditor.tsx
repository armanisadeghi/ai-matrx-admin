"use client";

/**
 * BRAND OFFERINGS without a website: what the brand sells and what it charges.
 * Offerings and prices belong to the brand, so this works with no site at all.
 * Site availability, worth and keyword placement appear once a website exists
 * (the site view of this same page).
 */

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  LoadingSurface,
  QueryError,
  SectionCard,
} from "@/features/marketing/components/shared/MarketingUi";
import { useMarketingBrand } from "@/features/marketing/lib/brand-context";
import { brandKindCopy } from "@/features/marketing/lib/brand-kind";
import { marketingRoutes } from "@/features/marketing/lib/routes";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { toast } from "@/lib/toast";
import { extractErrorMessage } from "@/utils/errors";
import {
  listBrandCatalogForBrand,
  listBrandOfferingPrices,
  retireBrandOfferingForBrand,
  saveBrandOfferingForBrand,
  setBrandOfferingPrice,
  NO_OFFERING_PRICE,
  type CatalogOffering,
} from "./data";
import { buildCatalogTree, forbiddenParents } from "./catalog-tree";
import { usePublishOfferingsFeed } from "./BrandOfferingsSurface";
import { OfferingEditDialog, type OfferingEditDraft } from "./OfferingEditDialog";
import { OfferingCatalogTable, type CatalogRowActions } from "./OfferingCatalogTable";

const KEY = ["marketing", "brand-offerings"] as const;

/** The row actions that only mean something with a website; the brand-only table never shows them. */
const SITE_ONLY_NOOPS: CatalogRowActions = {
  onToggleOffered: () => undefined,
  onSetWorth: () => undefined,
  onEdit: () => undefined,
  onAddChild: () => undefined,
  onViewKeywords: () => undefined,
  onRemove: () => undefined,
  onMove: () => undefined,
  onBulkAvailability: () => undefined,
};

const NEW_DRAFT: OfferingEditDraft = {
  offeringId: null,
  name: "",
  kind: "service",
  description: "",
  parentId: null,
  priceAmount: "",
  priceCurrency: "USD",
  priceUnit: "",
  priceNote: "",
};

export function BrandOfferingsEditor() {
  const brand = useMarketingBrand();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<OfferingEditDraft | null>(null);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const catalog = useQuery({
    queryKey: [...KEY, "catalog", brand.id],
    queryFn: ({ signal }) => listBrandCatalogForBrand(brand.id, signal),
  });
  const prices = useQuery({
    queryKey: [...KEY, "prices", brand.id],
    queryFn: ({ signal }) => listBrandOfferingPrices(brand.id, signal),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: KEY });
  const failed = (action: string) => (error: unknown) =>
    toast.error(`Could not ${action}`, { description: extractErrorMessage(error) });

  const save = useMutation({
    mutationFn: async (values: OfferingEditDraft) => {
      const id = await saveBrandOfferingForBrand({
        organizationId: brand.organizationId,
        brandId: brand.id,
        offeringId: values.offeringId,
        name: values.name,
        kind: values.kind,
        description: values.description,
        parentId: values.parentId,
      });
      const amount = values.priceAmount === "" ? null : Number(values.priceAmount);
      const stored = prices.data?.[id] ?? NO_OFFERING_PRICE;
      const next = {
        amount,
        currency: values.priceCurrency || null,
        unit: values.priceUnit || null,
        note: values.priceNote || null,
      };
      const changed =
        amount !== stored.amount ||
        (amount !== null && next.currency !== stored.currency) ||
        next.unit !== stored.unit ||
        next.note !== stored.note;
      if (changed) await setBrandOfferingPrice(id, next);
      return id;
    },
    onSuccess: (_id, values) => {
      setDraft(null);
      void refresh();
      toast.success(values.offeringId ? "Offering saved" : `“${values.name}” added`);
    },
    onError: failed("save that offering"),
  });

  const remove = useMutation({
    mutationFn: (offering: CatalogOffering) =>
      retireBrandOfferingForBrand({
        brandId: brand.id,
        offeringId: offering.id,
        parentId: offering.parentId,
      }),
    onSuccess: () => {
      void refresh();
      toast.success("Offering removed");
    },
    onError: failed("remove that offering"),
  });

  usePublishOfferingsFeed({
    catalog: catalog.data ?? null,
    prices: prices.data ?? {},
    site: null,
    stats: null,
    placement: null,
    draft,
    openDraft: setDraft,
    siteActions: null,
  });

  if (catalog.isPending) return <LoadingSurface label="Loading offerings…" />;
  if (catalog.isError) {
    return <QueryError error={catalog.error} onRetry={() => void catalog.refetch()} />;
  }

  const offerings = catalog.data;
  const tree = buildCatalogTree(offerings, new Map());

  return (
    <div className="h-full min-h-0 overflow-y-auto overscroll-contain bg-textured pt-[var(--shell-header-h)]">
      <div className="mx-auto w-full max-w-6xl space-y-3 px-3 py-3 sm:px-4">
        <SectionCard
          title="Offerings"
          about={brandKindCopy(brand).offeringsLine(brand.name)}
          headerExtra={
            <>
              <Link
                href={marketingRoutes.newSite(brand.id)}
                className="matrx-tap-area type-secondary font-medium text-primary"
              >
                Add a website
              </Link>
              {offerings.length === 0 ? (
                <Button variant="primary" icon={<Plus />} onClick={() => setDraft(NEW_DRAFT)}>
                  Add offering
                </Button>
              ) : null}
            </>
          }
        >
          {offerings.length === 0 ? (
            <p className="p-3 type-secondary text-muted-foreground">No offerings yet.</p>
          ) : (
            <div className="p-3">
              <OfferingCatalogTable
                brandOnly
                tree={tree}
                prices={prices.data ?? {}}
                metas={[]}
                collapsed={collapsed}
                selectedId={null}
                selectedIds={[]}
                busy={remove.isPending}
                actions={{
                  ...SITE_ONLY_NOOPS,
                  onEdit: (node) => {
                    const o = node.offering;
                    const p = prices.data?.[o.id];
                    setDraft({
                      offeringId: o.id,
                      name: o.name,
                      kind: o.kind,
                      description: o.description ?? "",
                      parentId: o.parentId,
                      priceAmount: p?.amount == null ? "" : String(p.amount),
                      priceCurrency: p?.currency ?? "USD",
                      priceUnit: p?.unit ?? "",
                      priceNote: p?.note ?? "",
                    });
                  },
                  onAddChild: (node) => setDraft({ ...NEW_DRAFT, parentId: node.offering.id }),
                  onRemove: async (node) => {
                    const ok = await confirm({
                      title: `Remove "${node.offering.name}"?`,
                      description: "It leaves this brand's offerings and every site that offers it.",
                      variant: "destructive",
                      confirmLabel: "Remove",
                    });
                    if (ok) remove.mutate(node.offering);
                  },
                }}
                onToggle={(id) =>
                  setCollapsed((current) => {
                    const next = new Set(current);
                    if (!next.delete(id)) next.add(id);
                    return next;
                  })
                }
                onSelect={() => undefined}
                onSelectedIdsChange={() => undefined}
                onAdd={() => setDraft(NEW_DRAFT)}
                onSaveEdits={async () => undefined}
              />
            </div>
          )}
        </SectionCard>
      </div>

      {draft ? (
        <OfferingEditDialog
          draft={draft}
          catalog={offerings}
          forbiddenParentIds={
            draft.offeringId ? forbiddenParents(tree, draft.offeringId) : new Set<string>()
          }
          busy={save.isPending}
          brandOnly
          onCancel={() => setDraft(null)}
          onSave={(values) => save.mutate(values)}
        />
      ) : null}
    </div>
  );
}
