import { useCallback } from "react";
import { generateTemporaryRecordId } from "@/lib/redux/entity/utils/stateHelpUtils";
import { useAppDispatch } from "@/lib/redux/hooks";
import { useEntityTools } from "@/lib/redux/entity/hooks/coreHooks";
import { EntityKeys } from "@/types/entityTypes";

interface UseTemporaryRecordOptions<T = any> {
  entityKey: EntityKeys;
}

export const useStartCreate = <T extends Record<string, any>>({
  entityKey,
}: UseTemporaryRecordOptions<T>) => {
  const dispatch = useAppDispatch();
  const { actions, store } = useEntityTools(entityKey);
  // @ts-ignore
  const entityState = store.getState().entities[entityKey];

  const create = useCallback(
    (initialData?: Partial<T>) => {
      const tempId = generateTemporaryRecordId(entityState);
      dispatch(actions.startRecordCreation({ count: 1, tempId }));

      if (initialData) {
        Object.entries(initialData).forEach(([field, value]) => {
          dispatch(
            actions.updateUnsavedField({
              recordId: tempId,
              field,
              value,
            }),
          );
        });
      }

      return tempId;
    },
    [dispatch, actions, entityState],
  );

  return { create };
};

export default useStartCreate;
