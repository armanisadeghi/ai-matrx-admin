"use client";

// providers/ModelCatalogHost.tsx
//
// THE ONE `@ai-matrx/agents/models/react` mount: the model picker's catalog, favorites and the
// app's UI ports. Everything the picker knows lives in the package; this host binds identity:
//
//   isSuperAdmin   → `selectIsSuperAdmin` (admin power only while on an admin page)
//   canUseTopTier  → `selectCanUseTopTierModels` (cost-rating-6 models are locked without it)
//   hiddenModelIds → `userPreferences.aiModels.inactiveModels` (Settings › Models switch-offs)
//   LinkComponent  → `next/link`
//   settingsHref   → the Models settings page
//   renderErrorAction → the Error Alchemy menu on a failed catalog read
//   access.usesOwnKey → models served by a key in the person's Vault ("Your key", no model points;
//                       read on demand from `lib/ai-models/ownKeyModels.ts`)
//
// Inside StoreProvider (the favorites cache and the admin gate read Redux).

import { useSyncExternalStore, type ReactNode } from "react";
import Link from "@/components/navigation/AppLink";
import { ModelCatalogProvider } from "@ai-matrx/agents/models/react";
import { getModelCatalog, getModelFavorites } from "@/lib/ai-models/modelCatalog";
import { getOwnKeyModelsSnapshot, refreshOwnKeyModelsIfStale, subscribeOwnKeyModels } from "@/lib/ai-models/ownKeyModels";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectCanUseTopTierModels, selectIsSuperAdmin } from "@/lib/redux/selectors/userSelectors";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";

const renderErrorAction = (error: string | undefined) =>
  error === undefined ? <ErrorAlchemyMenu /> : <ErrorAlchemyMenu error={error} />;

export function ModelCatalogHost({ children }: { children: ReactNode }) {
  const isSuperAdmin = useAppSelector(selectIsSuperAdmin);
  const canUseTopTier = useAppSelector(selectCanUseTopTierModels);
  const hiddenModelIds = useAppSelector((state) => state.userPreferences?.aiModels?.inactiveModels);
  // A new snapshot (the own-key list changed) makes a new port, so the picker re-renders.
  const ownKeyModels = useSyncExternalStore(subscribeOwnKeyModels, getOwnKeyModelsSnapshot, getOwnKeyModelsSnapshot);
  const access = {
    usesOwnKey: (modelId: string) => {
      refreshOwnKeyModelsIfStale();
      return ownKeyModels.has(modelId);
    },
  };
  return (
    <ModelCatalogProvider
      catalog={getModelCatalog()}
      favorites={getModelFavorites()}
      isSuperAdmin={isSuperAdmin}
      canUseTopTier={canUseTopTier}
      hiddenModelIds={hiddenModelIds}
      access={access}
      LinkComponent={Link}
      settingsHref="/user-settings/ai/models"
      renderErrorAction={renderErrorAction}
    >
      {children}
    </ModelCatalogProvider>
  );
}
