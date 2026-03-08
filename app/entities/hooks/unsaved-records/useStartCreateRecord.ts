import { useCallback } from 'react';
import { generateTemporaryRecordId } from "@/lib/redux/entity/utils/stateHelpUtils";
import { useAppDispatch } from "@/lib/redux/hooks";
import { useEntityTools } from "@/lib/redux/entity/hooks/coreHooks";
import { EntityKeys } from '@/types/entityTypes';

interface UseTemporaryRecordOptions<T = any> {
  entityKey: EntityKeys;
}

type FieldUpdate = {
  field: string;
  value: any;
};

export const useStartCreateRecord = <T extends Record<string, any>>({ 
  entityKey 
}: UseTemporaryRecordOptions<T>) => {
    const dispatch = useAppDispatch();
    const { actions, store } = useEntityTools(entityKey);
  const entityState = store.getState().entities[entityKey];  
  // Simple creation that just returns the tempId
  const create = useCallback(() => {
    const tempId = generateTemporaryRecordId(entityState);
    dispatch(actions.startRecordCreation({ count: 1, tempId }));
    return tempId;
  }, [dispatch, actions, entityState]);

  // Creation with initial data population
  const createWithData = useCallback((initialData: Partial<T>) => {
    const tempId = create();
    
    // Convert the initialData object into individual field updates
    Object.entries(initialData).forEach(([field, value]) => {
      dispatch(
        actions.updateUnsavedField({
          recordId: tempId,
          field,
          value,
        })
      );
    });

    return tempId;
  }, [create, dispatch, actions]);

  return {
    create,
    createWithData,
  };
};

export default useStartCreateRecord;