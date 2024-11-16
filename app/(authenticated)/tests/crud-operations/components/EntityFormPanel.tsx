import * as React from 'react';
import {ScrollArea} from '@/components/ui/scroll-area';
import {Button} from '@/components/ui/button';
import {EntityKeys} from '@/types/entityTypes';
import {useQuickReference} from '@/lib/redux/entity/hooks/useQuickReference';
import {EntityShowSelectedAccordion} from '@/components/matrx/Entity';
import { EntityFormGroupRefs } from './EntityFormGroup';
import ForwardedEntityFormGroup from './EntityFormGroup';

interface EntityFormPanelProps<TEntity extends EntityKeys> {
    ref: React.Ref<any>;
    entityKey: TEntity;
    onCreateSuccess?: () => void;
    onUpdateSuccess?: () => void;
    onDeleteSuccess?: () => void;
    allowCreateNew?: boolean;
}

export interface EntityFormPanelRefs {
    handleCreateNew?: () => void;
}

export const EntityFormPanel = React.forwardRef<EntityFormPanelRefs, EntityFormPanelProps<EntityKeys>>((
    {
        entityKey,
        onCreateSuccess,
        onUpdateSuccess,
        onDeleteSuccess,
        allowCreateNew = true,
    }: EntityFormPanelProps<EntityKeys>,
    ref
) => {
    const {
        selectedRecordIds,
        selectionMode,
        clearSelection,
    } = useQuickReference(entityKey);

    const formGroupRef = React.useRef<EntityFormGroupRefs>(null);

    React.useImperativeHandle(ref, () => ({
        handleCreateNew: () => {
            if (!allowCreateNew) return;
            clearSelection();
            formGroupRef.current?.handleCreateNew();
        }
    }));

    const isMultiSelectMode = selectionMode === 'multiple' && selectedRecordIds?.length > 0;

    return (
        <div className="h-full flex flex-col">
            {allowCreateNew && (
                <div className="shrink-0 p-6">
                    <Button
                        onClick={() => {
                            clearSelection();
                            formGroupRef.current?.handleCreateNew();
                        }}
                        size="sm"
                        variant="secondary"
                    >
                        Create New
                    </Button>
                </div>
            )}

            <ScrollArea className="flex-1">
                <div className="p-6">
                    {isMultiSelectMode ? (
                        <EntityShowSelectedAccordion entityKey={entityKey}/>
                    ) : (
                         <ForwardedEntityFormGroup
                             ref={formGroupRef}
                             entityKey={entityKey}
                             allowCreate={allowCreateNew}
                             allowEdit={true}
                             allowDelete={true}
                         />
                     )}
                </div>
            </ScrollArea>
        </div>
    );
});
