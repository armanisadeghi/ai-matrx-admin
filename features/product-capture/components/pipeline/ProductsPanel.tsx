"use client";

/**
 * ProductsPanel — what the SERVER pipeline found: one card per product the
 * intake analyzer declared on this item (`workbench.product_capture_product`,
 * one research run each). Both documents are verbatim registered kinds
 * (`product_entry`, `resale_intelligence_report`) and render through the kind
 * registry — this panel never re-shapes them.
 */

import React from "react";
import { Badge, PropertyRow } from "@ai-matrx/design-system/controls";

import KindInstanceRender from "@/features/content-ir/studio/components/KindInstanceRender";

import type { CaptureProduct } from "../../pipeline-service";
import { PanelSection } from "./panel-primitives";

const INTAKE_KIND = "product_entry";
const RESEARCH_KIND = "resale_intelligence_report";

const kindOf = (value: Record<string, unknown>, fallback: string): string =>
  typeof value.__kind === "string" ? value.__kind : fallback;

export function ProductsPanel({ products }: { products: CaptureProduct[] }) {
  if (products.length === 0) return null;
  return (
    <PanelSection
      title="Products"
      badge={<Badge tone="neutral">{products.length}</Badge>}
    >
      <div className="space-y-3">
        {products.map((product) => (
          <article
            key={product.id}
            className="space-y-3 rounded-lg border border-border p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="min-w-0 flex-1 break-words text-sm font-semibold">
                {product.name || `Product ${product.productIndex}`}
              </h4>
              <Badge tone={product.status === "researched" ? "success" : "info"}>
                {product.status === "researched" ? "Researched" : "Analyzed"}
              </Badge>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <PropertyRow label="Category" value={product.category || null} />
              <PropertyRow label="Verdict" value={product.verdict} />
              <PropertyRow
                label="Realistic used range"
                value={product.realisticUsedRange}
              />
            </div>
            {product.research && (
              <KindInstanceRender
                kind={kindOf(product.research, RESEARCH_KIND)}
                value={product.research}
                variant="bare"
              />
            )}
            <details className="rounded-md border border-border">
              <summary className="cursor-default px-3 py-2 text-xs font-medium text-muted-foreground">
                Intake analysis
              </summary>
              <div className="border-t border-border p-3">
                <KindInstanceRender
                  kind={kindOf(product.intake, INTAKE_KIND)}
                  value={product.intake}
                  variant="bare"
                />
              </div>
            </details>
          </article>
        ))}
      </div>
    </PanelSection>
  );
}
