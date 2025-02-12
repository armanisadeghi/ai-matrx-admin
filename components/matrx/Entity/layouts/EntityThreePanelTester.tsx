import * as React from 'react';
import {EntityKeys} from '@/types/entityTypes';
import {EntityFormPanel, EntityFormPanelRefs} from '@/app/(authenticated)/tests/crud-operations/components/EntityFormPanel';
import EnhancedEntityAnalyzer from '@/components/admin/redux/EnhancedEntityAnalyzer';
import { DynamicResizableLayout } from '@/components/matrx/resizable/DynamicResizableLayout';
import EntityQuickReferenceList from "@/components/matrx/Entity/prewired-components/quick-reference/EntityQuickReferenceList";

interface EntityPageProps<TEntity extends EntityKeys> {
    entityKey: TEntity;
}

export function EntityThreePanelTester<TEntity extends EntityKeys>(
    {
        entityKey,
    }: EntityPageProps<TEntity>) {
    const EntityFormPanelRef = React.useRef<EntityFormPanelRefs>(null);

    const handleShowContent = () => {
        EntityFormPanelRef.current?.handleCreateNew();
    };

    const panels = [
        {
            content: (
                <EntityQuickReferenceList
                    entityKey={entityKey}
                    onCreateEntityClick={handleShowContent}
                    showCreateNewButton={true}
                />
            ),
            defaultSize: 20,
            minSize: 15,
            maxSize: 30,
            collapsible: true
        },
        {
            content: (
                <EntityFormPanel
                    ref={EntityFormPanelRef}
                    entityKey={entityKey}
                    allowCreateNew={true}
                    onCreateSuccess={() => {
                        console.log('Create success from EntityPage Triggered');
                    }}
                    onUpdateSuccess={() => {
                        console.log('Update success from EntityPage Triggered');
                    }}
                    onDeleteSuccess={() => {
                        console.log('Delete success from EntityPage Triggered');
                    }}
                />
            ),
            defaultSize: 60,
            minSize: 30,
            maxSize: 70
        },
        {
            content: (
                <EnhancedEntityAnalyzer
                    selectedEntityKey={entityKey}
                    defaultExpanded={false}/>
            ),
            defaultSize: 20,
            minSize: 15,
            maxSize: 50,
            collapsible: true
        }
    ];

    return (
        <DynamicResizableLayout
            panels={panels}
            direction="horizontal"
            className="bg-background"
        />
    );
}
