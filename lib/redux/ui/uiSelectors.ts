// selectors.ts
import { RootState } from '../store';

export const selectCurrentSchema = (state: RootState) => state.ui.currentSchema;
export const selectCurrentData = (state: RootState) => state.ui.data;
export const selectUIErrors = (state: RootState) => state.ui.errors;
