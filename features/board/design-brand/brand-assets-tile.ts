// THE BRAND'S ASSETS ON ITS DESIGN BOARD: a design board linked to a brand (`design-board-brand.ts`) offers one
// more Add-menu row on the Table type — "Brand assets", a read-only table tile of the real `web.brand_asset` rows
// (token `web_brand_asset`) of THAT brand (`entityTableSource`, filter `brand_id`). The assets are the brand's own
// (made and confirmed on the brand's page), so the board shows them and never writes them.

import { Palette } from "lucide-react";

import { TABLE_ENTITY, entityTableSource } from "../items/table-tile";
import { startNewEntries, type BoardItemType, type StartNewEntry } from "../items/types";

export const BRAND_ASSET_TOKEN = "web_brand_asset";
export const BRAND_ASSETS_LABEL = "Brand assets";

/** The Add-menu entry that places the brand's assets, read-only. */
export function brandAssetsEntry(brandId: string): StartNewEntry {
  return {
    label: BRAND_ASSETS_LABEL,
    icon: Palette,
    create: () => ({
      title: BRAND_ASSETS_LABEL,
      source: entityTableSource(BRAND_ASSET_TOKEN, { filter: { brand_id: brandId }, readOnly: true }),
      size: { w: 720, h: 520 },
    }),
  };
}

/** The board's addable types with "Brand assets" added to the Table type's entries; unchanged with no brand. */
export function withBrandAssets(types: readonly BoardItemType[], brandId: string | null): readonly BoardItemType[] {
  if (!brandId) return types;
  return types.map((t) => (t.key === TABLE_ENTITY ? { ...t, startNew: [...startNewEntries(t), brandAssetsEntry(brandId)] } : t));
}
