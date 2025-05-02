import { RootState } from "@/lib/redux";
import { FieldBuilder } from "../types";

// Base selector for the fieldBuilder state
const getFieldBuilderState = (state: RootState) => state.fieldBuilder;

// Selector for all fields
export const selectAllFields = (state: RootState): FieldBuilder[] => Object.values(getFieldBuilderState(state).fields);

// Selector for a specific field by ID
export const selectFieldById = (state: RootState, id: string): FieldBuilder | null => getFieldBuilderState(state).fields[id] || null;

// Selector for field loading state
export const selectFieldLoading = (state: RootState): boolean => getFieldBuilderState(state).isLoading;

// Selector for field error state
export const selectFieldError = (state: RootState): string | null => getFieldBuilderState(state).error;

// Selector for fields by a list of IDs
export const selectFieldsByIds = (state: RootState, fieldIds: string[]): FieldBuilder[] => {
  return fieldIds
    .map(id => selectFieldById(state, id))
    .filter((field): field is FieldBuilder => field !== null);
};

// Selector for fields of a specific component type
export const selectFieldsByComponentType = (state: RootState, componentType: string): FieldBuilder[] => {
  return selectAllFields(state).filter(field => field.component === componentType);
}; 