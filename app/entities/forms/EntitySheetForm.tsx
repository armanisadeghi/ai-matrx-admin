import React, { useEffect, useState } from 'react';
import { UnifiedLayoutProps } from '@/components/matrx/Entity';
import { EntityKeys, MatrxRecordId } from '@/types';
import { RootState, selectEntityPrettyName, useAppSelector, useEntityTools } from '@/lib/redux';
import { Button } from '@/components/ui/button';
import { useCreateRecord } from '../hooks/unsaved-records/useCreateRecord';
import { useUpdateRecord } from '../hooks/crud/useUpdateRecord';
import { getUnifiedLayoutProps } from '../layout/configs';
import { generateTemporaryRecordId } from '@/lib/redux/entity/utils/stateHelpUtils';
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import EntityFormMinimalAnyRecord from './EntityFormMinimalAnyRecord';

type FormMode = 'create' | 'edit' | 'view';

interface EntitySheetFormProps {
  mode: FormMode;
  entityName: EntityKeys;
  recordId?: MatrxRecordId;
  position?: 'left' | 'right' | 'top' | 'bottom';
  size?: 'sm' | 'default' | 'lg' | 'xl' | 'full';
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EntitySheetForm = ({
  mode = 'view',
  entityName,
  recordId,
  position = 'right',
  size = 'default',
  open,
  onOpenChange,
}: EntitySheetFormProps) => {
  const [tempRecordId, setTempRecordId] = useState<MatrxRecordId | undefined>(undefined);
  
  const { actions, dispatch, store } = useEntityTools(entityName);
  const entityState = store.getState()[entityName];
  const entityPrettyName = useAppSelector((state: RootState) => selectEntityPrettyName(state, entityName));

  const unifiedLayoutProps = getUnifiedLayoutProps({
    formComponent: 'MINIMAL',
    quickReferenceType: 'LIST',
    isExpanded: true,
    handlers: {},
    entityKey: entityName
  }) as UnifiedLayoutProps;

  const { createRecord } = useCreateRecord(entityName);
  const { updateRecord } = useUpdateRecord(entityName, () => onOpenChange(false));

  useEffect(() => {
    if (open) {
      if (mode === 'create') {
        const tempId = generateTemporaryRecordId(entityState);
        dispatch(actions.startRecordCreation({ count: 1, tempId }));
        setTempRecordId(tempId);
      } else if (mode === 'edit' && recordId) {
        dispatch(actions.startRecordUpdateById(recordId));
      }
    }
  }, [open, mode, recordId, dispatch, actions, entityState]);

  const handleClose = () => {
    dispatch(actions.cancelOperation());
    setTempRecordId(undefined);
    onOpenChange(false);
  };

  const handleSave = () => {
    if (mode === 'create' && tempRecordId) {
      createRecord(tempRecordId);
    } else if (mode === 'edit' && recordId) {
      updateRecord(recordId);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'create':
        return `New ${entityPrettyName}`;
      case 'edit':
        return `Edit ${entityPrettyName}`;
      default:
        return `View ${entityPrettyName}`;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={position} className={`w-full ${size === 'lg' ? 'sm:max-w-lg' : size === 'xl' ? 'sm:max-w-xl' : size === 'full' ? 'sm:max-w-[100vw]' : 'sm:max-w-md'}`}>
        <SheetHeader>
          <SheetTitle>{getTitle()}</SheetTitle>
        </SheetHeader>

        <EntityFormMinimalAnyRecord
          recordId={mode === 'create' ? tempRecordId : recordId}
          unifiedLayoutProps={unifiedLayoutProps}
        />
        
        <div className="flex justify-end space-x-2 mt-4">
          <Button 
            variant="outline" 
            onClick={handleClose}
          >
            Cancel
          </Button>
          {(mode === 'create' || mode === 'edit') && (
            <Button onClick={handleSave}>
              {mode === 'create' ? 'Create' : 'Save'}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default EntitySheetForm;