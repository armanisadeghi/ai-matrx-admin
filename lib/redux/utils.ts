// lib/redux/utils.ts
import { createAsyncThunk } from '@reduxjs/toolkit';
import { AppDispatch, RootState } from './store';
import { getEntitySlice } from '@/lib/redux/entity/entitySlice';
import { createEntitySelectors } from '@/lib/redux/entity/selectors';
import { EntityKeys } from '@/types/entityTypes';

// Typed thunk creator
export const createAppThunk = createAsyncThunk.withTypes<{
  state: RootState;
  dispatch: AppDispatch;
  rejectValue: string; // Adjust this if you need a different reject value type
}>();

// Utility to get typed entity actions and selectors
export const getTypedEntityTools = <TEntity extends EntityKeys>(entityKey: TEntity) => {
  const entitySlice = getEntitySlice(entityKey);
  const entitySelectors = createEntitySelectors(entityKey);

  return {
    actions: entitySlice.actions,
    selectors: entitySelectors,
  };
};

export const getTypedEntityActions = <TEntity extends EntityKeys>(entityKey: TEntity) => {
  const entitySlice = getEntitySlice(entityKey);
  return entitySlice.actions;
};

export const getTypedEntitySelectors = <TEntity extends EntityKeys>(entityKey: TEntity) => {
  const entitySelectors = createEntitySelectors(entityKey);
  return entitySelectors;
};

// Typed store utilities (if you need direct store access outside of React)
export const getAppStoreUtils = (store: any) => ({
  dispatch: store.dispatch as AppDispatch,
  getState: store.getState as () => RootState,
});