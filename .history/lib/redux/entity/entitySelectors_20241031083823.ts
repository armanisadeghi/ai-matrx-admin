// lib/redux/entity/selectors.ts
import { RootState } from "@/lib/redux/store";
import { createSelector } from "@reduxjs/toolkit";
import { EntityKeys } from "@/types/entityTypes";
import { EntitySliceState } from "@/lib/redux/entity/entitySliceCreator";

// Base selector that gets the entities state
const selectEntitiesState = (state: RootState) => state.entities;

export const createEntitySelectors = <TEntity extends EntityKeys>(entityKey: TEntity) => {
  // Create a memoized selector for the specific entity slice
  const selectEntitySlice = createSelector(
    [selectEntitiesState],
    (entities) => entities[`ENTITIES/${entityKey.toUpperCase()}`] as EntitySliceState<TEntity>
  );

  // Create individual field selectors
  const selectors = {
    selectData: createSelector(
      [selectEntitySlice],
      (slice) => slice?.data ?? []
    ),

    selectLoading: createSelector(
      [selectEntitySlice],
      (slice) => slice?.loading ?? false
    ),

    selectError: createSelector(
      [selectEntitySlice],
      (slice) => slice?.error ?? null
    ),

    selectInitialized: createSelector(
      [selectEntitySlice],
      console.log('Slice Initialized', (slice) => slice?.initialized),
      (slice) => slice?.initialized ?? false
    ),

    selectTotalCount: createSelector(
      [selectEntitySlice],
      (slice) => slice?.totalCount ?? 0
    ),

    selectAllPkAndDisplayFields: createSelector(
      [selectEntitySlice],
      (slice) => slice?.allPkAndDisplayFields ?? []
    ),

    selectLastFetched: createSelector(
      [selectEntitySlice],
      (slice) => slice?.lastFetched ?? {}
    ),

    selectStaleTime: createSelector(
      [selectEntitySlice],
      (slice) => slice?.staleTime ?? 600000
    ),

    selectBackups: createSelector(
      [selectEntitySlice],
      (slice) => slice?.backups ?? {}
    ),

    selectSelectedItem: createSelector(
      [selectEntitySlice],
      (slice) => slice?.selectedItem ?? null
    ),

    selectPage: createSelector(
      [selectEntitySlice],
      (slice) => slice?.page ?? 1
    ),

    selectPageSize: createSelector(
      [selectEntitySlice],
      (slice) => slice?.pageSize ?? 10
    ),

    selectMaxCount: createSelector(
      [selectEntitySlice],
      (slice) => slice?.maxCount
    ),

    selectSchema: createSelector(
      [selectEntitySlice],
      (slice) => slice?.entitySchema
    ),

    // Parameterized selectors
    selectDataItem: (index: number) =>
      createSelector(
        [selectors.selectData],
        (data) => data[index]
      ),

    selectBackup: (backupKey: string) =>
      createSelector(
        [selectors.selectBackups],
        (backups) => backups[backupKey]
      ),

    selectPkAndDisplayField: (index: number) =>
      createSelector(
        [selectors.selectAllPkAndDisplayFields],
        (fields) => fields[index]
      ),
  };

  return selectors;
};

export type EntitySelectors<TEntity extends EntityKeys> = ReturnType<typeof createEntitySelectors<TEntity>>;