// EntityFormPanel.tsx
import * as React from 'react';
import {ScrollArea} from '@/components/ui/scroll-area';
import {Button} from '@/components/ui/button';
import {EntityKeys} from '@/types/entityTypes';
import {useQuickReference} from '@/lib/redux/entity/hooks/useQuickReference';
import EntityLogger from "@/lib/redux/entity/entityLogger";
import {EntityShowSelectedAccordion} from '@/components/matrx/Entity';
import EntityFormGroup from './EntityFormGroup';

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

    const entityLogger = EntityLogger.createLoggerWithDefaults("ENTITY FORM PANEL", entityKey);

    React.useImperativeHandle(ref, () => ({
        handleCreateNew: () => {
            if (!allowCreateNew) return;
            clearSelection();
        }
    }));

    const isMultiSelectMode = selectionMode === 'multiple' && selectedRecordIds?.length > 0;

    return (
        <>
            {allowCreateNew && (
                <div className="flex justify-end p-6">
                    <Button
                        onClick={() => clearSelection()}
                        size="sm"
                        variant="secondary"
                    >
                        Create New
                    </Button>
                </div>
            )}

            <ScrollArea className="h-full">
                <div className="p-6">
                    {isMultiSelectMode ? (
                        <EntityShowSelectedAccordion entityKey={entityKey}/>
                    ) : (
                         <EntityFormGroup<EntityKeys>
                             entityKey={entityKey}
                             allowCreate={allowCreateNew}
                             allowEdit={true}
                             allowDelete={true}
                         />
                     )}
                </div>
            </ScrollArea>
        </>
    );
});
