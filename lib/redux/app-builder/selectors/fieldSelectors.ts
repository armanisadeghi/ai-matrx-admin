import { createSelector } from '@reduxjs/toolkit';
import { RootState } from "@/lib/redux";
import { FieldBuilder } from "../types";

// Base selector for the fieldBuilder state
export const getFieldBuilderState = (state: RootState) => state.fieldBuilder;

// Memoized selector for all fields
export const selectAllFields = createSelector(
  [getFieldBuilderState],
  (fieldBuilderState) => Object.values(fieldBuilderState.fields)
);

// Memoized selector for a specific field by ID
export const selectFieldById = createSelector(
  [(state: RootState, id: string) => getFieldBuilderState(state).fields[id]],
  (field) => field || null
);

// Memoized selector for field loading state
export const selectFieldLoading = createSelector(
  [getFieldBuilderState],
  (fieldBuilderState) => fieldBuilderState.isLoading
);

// Memoized selector for field error state
export const selectFieldError = createSelector(
  [getFieldBuilderState],
  (fieldBuilderState) => fieldBuilderState.error
);

// Memoized selector for fields by a list of IDs
export const selectFieldsByIds = createSelector(
  [
    getFieldBuilderState,
    (_state: RootState, fieldIds: string[]) => fieldIds
  ],
  (fieldBuilderState, fieldIds) => {
    return fieldIds
      .map(id => fieldBuilderState.fields[id])
      .filter((field): field is FieldBuilder => field !== null);
  }
);

// Memoized selector for fields of a specific component type
export const selectFieldsByComponentType = createSelector(
  [
    selectAllFields,
    (_state: RootState, componentType: string) => componentType
  ],
  (fields, componentType) => fields.filter(field => field.component === componentType)
);

// Memoized selector for dirty fields
export const selectDirtyFields = createSelector(
  [selectAllFields],
  (fields) => fields.filter(field => field.isDirty === true)
);

// Memoized selector to check if there are any unsaved changes
export const selectHasUnsavedChanges = createSelector(
  [selectAllFields],
  (fields) => fields.some(field => field.isDirty === true)
);

// Memoized selector for local fields
export const selectLocalFields = createSelector(
  [selectAllFields],
  (fields) => fields.filter(field => field.isLocal === true)
);

// Memoized selector for the active field ID
export const selectActiveFieldId = createSelector(
  [getFieldBuilderState],
  (fieldBuilderState) => fieldBuilderState.activeFieldId
);

// Memoized selector for the active field
export const selectActiveField = createSelector(
  [getFieldBuilderState, selectActiveFieldId],
  (fieldBuilderState, activeId) => activeId ? fieldBuilderState.fields[activeId] : null
);

// Memoized selector for the new field ID
export const selectNewFieldId = createSelector(
  [getFieldBuilderState],
  (fieldBuilderState) => fieldBuilderState.newFieldId
);

// Memoized selector for the new field
export const selectNewField = createSelector(
  [getFieldBuilderState, selectNewFieldId],
  (fieldBuilderState, newId) => newId ? fieldBuilderState.fields[newId] : null
);

// Explicit selectors for each FieldBuilder property
export const selectFieldId = createSelector(
  [(state: RootState, id: string) => getFieldBuilderState(state).fields[id]],
  (field) => (field ? field.id : null)
);

export const selectFieldLabel = createSelector(
  [(state: RootState, id: string) => getFieldBuilderState(state).fields[id]],
  (field) => (field ? field.label : null)
);

export const selectFieldDescription = createSelector(
  [(state: RootState, id: string) => getFieldBuilderState(state).fields[id]],
  (field) => (field ? field.description : null)
);

export const selectFieldHelpText = createSelector(
  [(state: RootState, id: string) => getFieldBuilderState(state).fields[id]],
  (field) => (field ? field.helpText : null)
);

export const selectFieldGroup = createSelector(
  [(state: RootState, id: string) => getFieldBuilderState(state).fields[id]],
  (field) => (field ? field.group : null)
);

export const selectFieldIconName = createSelector(
  [(state: RootState, id: string) => getFieldBuilderState(state).fields[id]],
  (field) => (field ? field.iconName : null)
);

export const selectFieldComponent = createSelector(
  [(state: RootState, id: string) => getFieldBuilderState(state).fields[id]],
  (field) => (field ? field.component : null)
);

export const selectFieldRequired = createSelector(
  [(state: RootState, id: string) => getFieldBuilderState(state).fields[id]],
  (field) => (field ? field.required : null)
);

export const selectFieldDisabled = createSelector(
  [(state: RootState, id: string) => getFieldBuilderState(state).fields[id]],
  (field) => (field ? field.disabled : null)
);

export const selectFieldPlaceholder = createSelector(
  [(state: RootState, id: string) => getFieldBuilderState(state).fields[id]],
  (field) => (field ? field.placeholder : null)
);

export const selectFieldDefaultValue = createSelector(
  [(state: RootState, id: string) => getFieldBuilderState(state).fields[id]],
  (field) => (field ? field.defaultValue : null)
);

export const selectFieldOptions = createSelector(
  [(state: RootState, id: string) => getFieldBuilderState(state).fields[id]],
  (field) => (field ? field.options : null)
);

export const selectFieldComponentProps = createSelector(
  [(state: RootState, id: string) => getFieldBuilderState(state).fields[id]],
  (field) => (field ? field.componentProps : null)
);

export const selectFieldIncludeOther = createSelector(
  [(state: RootState, id: string) => getFieldBuilderState(state).fields[id]],
  (field) => (field ? field.includeOther : null)
);

export const selectFieldIsPublic = createSelector(
  [(state: RootState, id: string) => getFieldBuilderState(state).fields[id]],
  (field) => (field ? field.isPublic : null)
);

export const selectFieldIsDirty = createSelector(
  [(state: RootState, id: string) => getFieldBuilderState(state).fields[id]],
  (field) => (field ? field.isDirty : null)
);

export const selectFieldIsLocal = createSelector(
  [(state: RootState, id: string) => getFieldBuilderState(state).fields[id]],
  (field) => (field ? field.isLocal : null)
);

// Memoized selector for field dirty status
export const selectFieldDirtyStatus = createSelector(
  [(state: RootState, id: string) => getFieldBuilderState(state).fields[id]],
  (field) => field?.isDirty || false
);