import { createSelector } from '@reduxjs/toolkit';
import { RootState } from "@/lib/redux";
import { FieldBuilder } from "../types";
import { selectAppletBrokerMappings } from "@/lib/redux/app-builder/selectors/appletSelectors";
import { BrokerMapping, ComponentType } from '@/types/customAppTypes';

// Base selector for the fieldBuilder state
export const getFieldBuilderState = (state: RootState) => state.fieldBuilder;

// Memoized selector for all fields
export const selectAllFields = createSelector(
  [getFieldBuilderState],
  (fieldBuilderState) => Object.values(fieldBuilderState.fields)
);

// Memoized selector for a specific field by ID
export const selectFieldById = createSelector(
  [
    getFieldBuilderState,
    (state: RootState, id: string) => id
  ],
  (fieldBuilderState, id) => fieldBuilderState.fields[id] || null
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

// Memoized selector for field labels by a list of IDs
export const selectFieldLabelsByIds = createSelector(
  [
    getFieldBuilderState,
    (_state: RootState, fieldIds: string[]) => fieldIds
  ],
  (fieldBuilderState, fieldIds) => {
    const labels: Record<string, string> = {};
    fieldIds.forEach(fieldId => {
      const field = fieldBuilderState.fields[fieldId];
      if (field && field.label) {
        labels[fieldId] = field.label;
      }
    });
    return labels;
  }
);

// Memoized selector for fields of a specific component type
export const selectFieldsByComponentType = createSelector(
  [
    selectAllFields,
    (_state: RootState, componentType: ComponentType) => componentType
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

// Explicit selectors for each ComponentProps property
export const selectFieldMin = createSelector(
  [(state: RootState, id: string) => getFieldBuilderState(state).fields[id]],
  (field) => (field ? field.componentProps.min : null)
);

export const selectFieldMax = createSelector(
  [(state: RootState, id: string) => getFieldBuilderState(state).fields[id]],
  (field) => (field ? field.componentProps.max : null)
);

export const selectFieldStep = createSelector(
  [(state: RootState, id: string) => getFieldBuilderState(state).fields[id]],
  (field) => (field ? field.componentProps.step : null)
);

export const selectFieldRows = createSelector(
  [(state: RootState, id: string) => getFieldBuilderState(state).fields[id]],
  (field) => (field ? field.componentProps.rows : null)
);

export const selectFieldMinDate = createSelector(
  [(state: RootState, id: string) => getFieldBuilderState(state).fields[id]],
  (field) => (field ? field.componentProps.minDate : null)
);

export const selectFieldMaxDate = createSelector(
  [(state: RootState, id: string) => getFieldBuilderState(state).fields[id]],
  (field) => (field ? field.componentProps.maxDate : null)
);

export const selectFieldOnLabel = createSelector(
  [(state: RootState, id: string) => getFieldBuilderState(state).fields[id]],
  (field) => (field ? field.componentProps.onLabel : null)
);

export const selectFieldOffLabel = createSelector(
  [(state: RootState, id: string) => getFieldBuilderState(state).fields[id]],
  (field) => (field ? field.componentProps.offLabel : null)
);

export const selectFieldMultiSelect = createSelector(
  [(state: RootState, id: string) => getFieldBuilderState(state).fields[id]],
  (field) => (field ? field.componentProps.multiSelect : null)
);

export const selectFieldMaxItems = createSelector(
  [(state: RootState, id: string) => getFieldBuilderState(state).fields[id]],
  (field) => (field ? field.componentProps.maxItems : null)
);

export const selectFieldMinItems = createSelector(
  [(state: RootState, id: string) => getFieldBuilderState(state).fields[id]],
  (field) => (field ? field.componentProps.minItems : null)
);

export const selectFieldGridCols = createSelector(
  [(state: RootState, id: string) => getFieldBuilderState(state).fields[id]],
  (field) => (field ? field.componentProps.gridCols : null)
);

export const selectFieldAutoComplete = createSelector(
  [(state: RootState, id: string) => getFieldBuilderState(state).fields[id]],
  (field) => (field ? field.componentProps.autoComplete : null)
);

export const selectFieldDirection = createSelector(
  [(state: RootState, id: string) => getFieldBuilderState(state).fields[id]],
  (field) => (field ? field.componentProps.direction : null)
);

export const selectFieldCustomContent = createSelector(
  [(state: RootState, id: string) => getFieldBuilderState(state).fields[id]],
  (field) => (field ? field.componentProps.customContent : null)
);

export const selectFieldShowSelectAll = createSelector(
  [(state: RootState, id: string) => getFieldBuilderState(state).fields[id]],
  (field) => (field ? field.componentProps.showSelectAll : null)
);

export const selectFieldWidth = createSelector(
  [(state: RootState, id: string) => getFieldBuilderState(state).fields[id]],
  (field) => (field ? field.componentProps.width : null)
);

export const selectFieldValuePrefix = createSelector(
  [(state: RootState, id: string) => getFieldBuilderState(state).fields[id]],
  (field) => (field ? field.componentProps.valuePrefix : null)
);

export const selectFieldValueSuffix = createSelector(
  [(state: RootState, id: string) => getFieldBuilderState(state).fields[id]],
  (field) => (field ? field.componentProps.valueSuffix : null)
);

export const selectFieldMaxLength = createSelector(
  [(state: RootState, id: string) => getFieldBuilderState(state).fields[id]],
  (field) => (field ? field.componentProps.maxLength : null)
);

export const selectFieldSpellCheck = createSelector(
  [(state: RootState, id: string) => getFieldBuilderState(state).fields[id]],
  (field) => (field ? field.componentProps.spellCheck : null)
);

export const selectHasUnsavedFieldChanges = createSelector(
  [selectAllFields],
  (fields) => fields.some(field => field.isDirty === true)
);

// Memoized selector to check if a specific field has unsaved changes
export const selectHasFieldUnsavedChanges = createSelector(
  [(state: RootState, id: string) => selectFieldById(state, id)],
  (field) => field ? field.isDirty === true : false
);

// Memoized selector to get all fields mapped to brokers for a specific applet
export const selectFieldsByBrokerMappings = createSelector(
  [
    (state: RootState, appletId: string) => selectAppletBrokerMappings(state, appletId),
    getFieldBuilderState,
  ],
  (brokerMappings: BrokerMapping[] | null, fieldBuilderState) => {
    if (!brokerMappings || brokerMappings.length === 0) {
      return [];
    }
    const fieldIds = brokerMappings.map((mapping) => mapping.fieldId);
    return fieldIds
      .map((id) => fieldBuilderState.fields[id])
      .filter((field): field is FieldBuilder => field !== null);
  }
);

// Memoized selector to get the field mapped to a specific broker ID for a specific applet
export const selectFieldByBrokerId = createSelector(
  [
    (state: RootState, appletId: string, brokerId: string) => ({
      brokerMappings: selectAppletBrokerMappings(state, appletId),
      brokerId,
    }),
    getFieldBuilderState,
  ],
  ({ brokerMappings, brokerId }, fieldBuilderState) => {
    if (!brokerMappings || brokerMappings.length === 0) {
      return null;
    }
    const mapping = brokerMappings.find((mapping) => mapping.brokerId === brokerId);
    if (!mapping) {
      return null;
    }
    return fieldBuilderState.fields[mapping.fieldId] || null;
  }
);