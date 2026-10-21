"use client";

/**
 * BrandCreatePanel — THE create body for a brand (feature-pages contract, rule 3).
 *
 * One body, two hosts: the /marketing/brands/new page and the "Add brand" window panel
 * (`CreateBrandWindow`). It is the brand form (`BrandEditorForm`, the same form edit uses) with its
 * Smart Add doors on top — paste a website or social link and confirm what we find — and the by-hand
 * fields below. There is no create form in a Dialog and no second create form anywhere.
 */

import { BrandEditorForm } from "@/features/marketing/components/brands/BrandEditorDialog";
import type { MarketingBrand } from "@/features/marketing/types";

export function BrandCreatePanel({
  onCreated,
  onClose,
}: {
  onCreated?: (brand: MarketingBrand) => void;
  onClose: () => void;
}) {
  return <BrandEditorForm variant="panel" brand={null} onCreated={onCreated} onClose={onClose} />;
}
