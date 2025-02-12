'use client';

import { createEntitySelectors, useAppSelector } from '@/lib/redux';
import { QuickReferenceRecord } from '@/lib/redux/entity/types/stateTypes';
import { useMemo, useState, useEffect } from 'react';
import { RecipeRecordWithKey, CompiledRecipeRecordWithKey } from '@/types';

export function useRunRecipeVersionSelection({ 
  onRecipeChange, 
  onVersionChange,
  onStateChange 
}: {
  onRecipeChange?: (recipe: QuickReferenceRecord | undefined) => void;
  onVersionChange?: (version: number) => void;
  onStateChange?: (state: { 
    recipe: QuickReferenceRecord | undefined; 
    version: number;
    compiledVersions: CompiledRecipeRecordWithKey[];
  }) => void;
} = {}) {
  const [selectedRecipe, setSelectedRecipe] = useState<QuickReferenceRecord | undefined>(undefined);
  const [selectedVersion, setSelectedVersion] = useState<number>(1);
  const [isVersionInitialized, setIsVersionInitialized] = useState(false);

  const selectors = useMemo(() => createEntitySelectors('recipe'), []);
  const compiledSelectors = useMemo(() => createEntitySelectors('compiledRecipe'), []);

  const recipeRecord = useAppSelector((state) => 
    selectors.selectRecordWithKey(state, selectedRecipe?.recordKey)
  ) as RecipeRecordWithKey | undefined;

  const allCompiledVersions = useAppSelector(state => 
    compiledSelectors.selectRecordsByFieldValue(state, 'recipeId', recipeRecord?.id)
  ) as CompiledRecipeRecordWithKey[];

  const sortedVersions = useMemo(() => 
    [...allCompiledVersions].sort((a, b) => b.version - a.version),
    [allCompiledVersions]
  );

  useEffect(() => {
    if (recipeRecord?.version && !isVersionInitialized) {
      const version = recipeRecord.version;
      setSelectedVersion(version);
      setIsVersionInitialized(true);
      onStateChange?.({
        recipe: selectedRecipe,
        version,
        compiledVersions: sortedVersions
      });
    }
  }, [recipeRecord?.version, isVersionInitialized, selectedRecipe, sortedVersions, onStateChange]);

  const handleRecipeChange = (recipe: QuickReferenceRecord) => {
    setSelectedRecipe(recipe);
    setIsVersionInitialized(false);
    onRecipeChange?.(recipe);
    onStateChange?.({
      recipe,
      version: selectedVersion,
      compiledVersions: sortedVersions
    });
  };

  const handleVersionChange = (version: number) => {
    setSelectedVersion(version);
    onVersionChange?.(version);
    onStateChange?.({
      recipe: selectedRecipe,
      version,
      compiledVersions: sortedVersions
    });
  };

  return {
    selectedRecipe,
    selectedVersion,
    sortedVersions,
    handleRecipeChange,
    handleVersionChange,
  };
}

export type UseRunRecipeVersionSelectionReturn = ReturnType<typeof useRunRecipeVersionSelection>;