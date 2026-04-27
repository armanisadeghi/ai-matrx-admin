import { EntityData, EntityFieldKeys, EntityKeys } from "@/types/entityTypes";
import { MatrxRecordId } from "@/lib/redux/entity/types/stateTypes";
import type { AppDispatch, RootState } from "@/lib/redux/store";
import { getEntitySlice } from "../entitySlice";

export const entityUpdateActions = (
  dispatch: AppDispatch,
  entityKey: EntityKeys,
) => {
  const entityActions = getEntitySlice(entityKey)!.actions;

  return {
    directUpdateRecord: (params: {
      matrxRecordId: MatrxRecordId;
      data: Record<string, any>;
      callbackId?: string;
    }) => dispatch(entityActions.directUpdateRecord(params)),

    directUpdateRecordSuccess: (data: EntityData<typeof entityKey>) =>
      dispatch(entityActions.directUpdateRecordSuccess(data)),

    updateRecord: (params: {
      matrxRecordId: MatrxRecordId;
      data: Record<string, any>;
      callbackId?: string;
    }) => dispatch(entityActions.updateRecord(params)),

    startRecordUpdate: () => dispatch(entityActions.startRecordUpdate()),

    startRecordUpdateById: (recordId: MatrxRecordId) =>
      dispatch(entityActions.startRecordUpdateById(recordId)),

    optimisticUpdate: (params: {
      record: EntityData<typeof entityKey>;
      rollback?: EntityData<typeof entityKey>;
    }) => dispatch(entityActions.optimisticUpdate(params)),

    updateUnsavedField: (params: {
      recordId: MatrxRecordId;
      field: string;
      value: any;
    }) => dispatch(entityActions.updateUnsavedField(params)),

    updateUnsavedFields: (params: {
      updates: Array<{ recordId: MatrxRecordId; field: string; value: any }>;
    }) => dispatch(entityActions.updateUnsavedFields(params)),

    updateFieldSmart: (params: {
      keyOrId: string;
      field: string;
      value: any;
    }) => dispatch(entityActions.updateFieldSmart(params)),

    updateNestedFieldSmart: (params: {
      keyOrId: string;
      field: EntityFieldKeys<typeof entityKey>;
      nestedKey: string;
      value: any;
    }) => dispatch(entityActions.updateNestedFieldSmart(params)),

    updateMultipleNestedFieldsSmart: (params: {
      keyOrId: string;
      updates: Array<{
        field: EntityFieldKeys<typeof entityKey>;
        nestedKey: string;
        value: any;
      }>;
    }) => dispatch(entityActions.updateMultipleNestedFieldsSmart(params)),
  };
};

export const entityUpdateActionsWithThunks = (entityKey: EntityKeys) => {
  const entityActions = getEntitySlice(entityKey)!.actions;

  return {
    directUpdateRecord:
      (params: {
        matrxRecordId?: MatrxRecordId;
        data: Record<string, any>;
        callbackId?: string;
      }) =>
      (dispatch: AppDispatch, getState: () => RootState) => {
        const recordId =
          params.matrxRecordId ??
          getState().entities[entityKey].selection.activeRecord;
        if (!recordId) return;
        dispatch(
          entityActions.directUpdateRecord({
            matrxRecordId: recordId,
            ...params,
          }),
        );
      },

    directUpdateRecordSuccess:
      (data: EntityData<typeof entityKey>) => (dispatch: AppDispatch) => {
        dispatch(entityActions.directUpdateRecordSuccess(data));
      },

    updateRecord:
      (params: {
        matrxRecordId?: MatrxRecordId;
        data: Record<string, any>;
        callbackId?: string;
      }) =>
      (dispatch: AppDispatch, getState: () => RootState) => {
        const recordId =
          params.matrxRecordId ??
          getState().entities[entityKey].selection.activeRecord;
        if (!recordId) return;
        dispatch(
          entityActions.updateRecord({ matrxRecordId: recordId, ...params }),
        );
      },

    updateRecordSuccess:
      (data: EntityData<typeof entityKey>) => (dispatch: AppDispatch) => {
        dispatch(entityActions.updateRecordSuccess(data));
      },

    startRecordUpdate: () => (dispatch: AppDispatch) => {
      dispatch(entityActions.startRecordUpdate());
    },

    startRecordUpdateById:
      (recordId?: MatrxRecordId) =>
      (dispatch: AppDispatch, getState: () => RootState) => {
        const id =
          recordId ?? getState().entities[entityKey].selection.activeRecord;
        if (!id) return;
        dispatch(entityActions.startRecordUpdateById(id));
      },

    optimisticUpdate:
      (params: {
        record: EntityData<typeof entityKey>;
        rollback?: EntityData<typeof entityKey>;
      }) =>
      (dispatch: AppDispatch) => {
        dispatch(entityActions.optimisticUpdate(params));
      },

    updateUnsavedField:
      (params: { recordId?: MatrxRecordId; field: string; value: any }) =>
      (dispatch: AppDispatch, getState: () => RootState) => {
        const recordId =
          params.recordId ??
          getState().entities[entityKey].selection.activeRecord;
        if (!recordId) return;
        dispatch(entityActions.updateUnsavedField({ recordId, ...params }));
      },

    updateUnsavedFields:
      (params: {
        updates: Array<{ recordId?: MatrxRecordId; field: string; value: any }>;
      }) =>
      (dispatch: AppDispatch, getState: () => RootState) => {
        const activeRecord =
          getState().entities[entityKey].selection.activeRecord;
        const updatesWithRecordId = params.updates.map((update) => ({
          recordId: update.recordId ?? activeRecord,
          field: update.field,
          value: update.value,
        }));
        if (!updatesWithRecordId.every((update) => update.recordId)) return;
        dispatch(
          entityActions.updateUnsavedFields({ updates: updatesWithRecordId }),
        );
      },

    updateFieldSmart:
      (params: { keyOrId?: string; field: string; value: any }) =>
      (dispatch: AppDispatch, getState: () => RootState) => {
        const keyOrId =
          params.keyOrId ??
          getState().entities[entityKey].selection.activeRecord;
        if (!keyOrId) return;
        dispatch(entityActions.updateFieldSmart({ keyOrId, ...params }));
      },

    updateNestedFieldSmart:
      (params: {
        keyOrId?: string;
        field: EntityFieldKeys<typeof entityKey>;
        nestedKey: string;
        value: any;
      }) =>
      (dispatch: AppDispatch, getState: () => RootState) => {
        const keyOrId =
          params.keyOrId ??
          getState().entities[entityKey].selection.activeRecord;
        if (!keyOrId) return;
        dispatch(entityActions.updateNestedFieldSmart({ keyOrId, ...params }));
      },

    updateMultipleNestedFieldsSmart:
      (params: {
        keyOrId?: string;
        updates: Array<{
          field: EntityFieldKeys<typeof entityKey>;
          nestedKey: string;
          value: any;
        }>;
      }) =>
      (dispatch: AppDispatch, getState: () => RootState) => {
        const keyOrId =
          params.keyOrId ??
          getState().entities[entityKey].selection.activeRecord;
        if (!keyOrId) return;
        dispatch(
          entityActions.updateMultipleNestedFieldsSmart({ keyOrId, ...params }),
        );
      },
  };
};
