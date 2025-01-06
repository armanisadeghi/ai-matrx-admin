import { useCallback } from 'react';
import { generateTemporaryRecordId, useEntityTools } from '@/lib/redux';
import { EntityKeys } from '@/types';

interface UseTemporaryRecordOptions {
  entityKey: EntityKeys;
}

export const useStartCreateRecord = ({ entityKey }: UseTemporaryRecordOptions) => {
  const { actions, dispatch, store } = useEntityTools(entityKey);
  const entityState = store.getState()[entityKey];
  
  return useCallback(() => {
    const tempId = generateTemporaryRecordId(entityState);
    dispatch(actions.startRecordCreation({ count: 1, tempId }));
  }, [dispatch, actions, store]);
};

export default useStartCreateRecord;