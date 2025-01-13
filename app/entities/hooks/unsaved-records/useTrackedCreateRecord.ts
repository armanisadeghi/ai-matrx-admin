'use client';

import { useCallback, useRef } from 'react';
import { generateTemporaryRecordId, useEntityTools, useEntityToasts } from '@/lib/redux';
import { EntityKeys, MatrxRecordId } from '@/types';
import { callbackManager, CallbackContext, ProgressInfo } from '@/utils/callbackManager';

interface RecordCreationContext extends CallbackContext {
  tempId: string;
  entityKey: EntityKeys;
  step: 'start' | 'finalize' | 'complete';
  matrxRecordId?: MatrxRecordId; // Will be available in final context
}

interface CreationCallbackData {
  success: boolean;
  error?: Error;
  matrxRecordId?: MatrxRecordId;
}

interface CreationProgress {
  step: RecordCreationContext['step'];
  status: ProgressInfo['status'];
  error?: Error;
}

interface useTrackedCreateRecordResult {
  startCreate: () => string; // returns tempId
  createRecord: (tempId: string) => void;
  getProgress: (tempId: string) => CreationProgress | null;
  getFinalId: (tempId: string) => MatrxRecordId | null;
}

export const useTrackedCreateRecord = (entityKey: EntityKeys): useTrackedCreateRecordResult => {
  const { store, actions, dispatch, selectors } = useEntityTools(entityKey);
  const entityToasts = useEntityToasts(entityKey);
  
  // Track creation groups and progress
  const groupsRef = useRef<Map<string, string>>(new Map()); // tempId -> groupId
  const progressRef = useRef<Map<string, CreationProgress>>(new Map()); // tempId -> progress
  const finalIdsRef = useRef<Map<string, MatrxRecordId>>(new Map()); // tempId -> final matrxRecordId

  const startCreate = useCallback(() => {
    const entityState = store.getState()[entityKey];
    const tempId = generateTemporaryRecordId(entityState);
    const groupId = callbackManager.createGroup();

    // Set initial progress
    const initialProgress: CreationProgress = {
      step: 'start',
      status: 'running'
    };
    progressRef.current.set(tempId, initialProgress);

    // Register the creation flow observer
    callbackManager.registerWithContext<CreationCallbackData, RecordCreationContext>(
      (data, context) => {
        if (context?.tempId) {
          progressRef.current.set(context.tempId, {
            step: context.step,
            status: 'running'
          });
        }
      },
      {
        context: { 
          tempId, 
          entityKey,
          step: 'start'
        },
        groupId
      }
    );

    // Store group ID reference
    groupsRef.current.set(tempId, groupId);

    // Dispatch initial creation action
    dispatch(actions.startRecordCreation({ count: 1, tempId }));

    return tempId;
  }, [dispatch, actions, entityKey, store]);

  const createRecord = useCallback((tempId: string) => {
    const state = store.getState();
    const groupId = groupsRef.current.get(tempId);
    
    if (!groupId) {
      console.error('No creation group found for tempId:', tempId);
      return;
    }

    // Update progress to finalization step
    progressRef.current.set(tempId, {
      step: 'finalize',
      status: 'running'
    });

    const createPayload = selectors.selectCreatePayload(state, tempId);
    dispatch(actions.addPendingOperation(tempId));

    // Register completion callback
    const callbackId = callbackManager.registerWithContext<CreationCallbackData, RecordCreationContext>(
      (data, context) => {
        dispatch(actions.removePendingOperation(tempId));
        
        if (data.success && data.matrxRecordId) {
          entityToasts.handleCreateSuccess();
          
          // Store final ID mapping
          finalIdsRef.current.set(tempId, data.matrxRecordId);
          
          // Update final progress
          progressRef.current.set(tempId, {
            step: 'complete',
            status: 'completed'
          });
        } else {
          entityToasts.handleError(data.error, 'create');
          progressRef.current.set(tempId, {
            step: 'finalize',
            status: 'error',
            error: data.error
          });
        }
      },
      {
        context: {
          tempId,
          entityKey,
          step: 'finalize'
        },
        groupId
      }
    );

    // Dispatch create action
    dispatch(actions.createRecord({
      ...createPayload,
      callbackId
    }));
  }, [dispatch, actions, selectors, entityToasts, entityKey, store]);

  const getProgress = useCallback((tempId: string) => {
    return progressRef.current.get(tempId) || null;
  }, []);

  const getFinalId = useCallback((tempId: string) => {
    return finalIdsRef.current.get(tempId) || null;
  }, []);

  return {
    startCreate,
    createRecord,
    getProgress,
    getFinalId
  };
};

export default useTrackedCreateRecord;