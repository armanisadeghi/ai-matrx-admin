import * as React from 'react';
import {EntityKeys} from '@/types/entityTypes';
import EnhancedEntityAnalyzer from '@/components/admin/redux/EnhancedEntityAnalyzer';
import { DynamicResizableLayout } from '@/components/matrx/resizable/DynamicResizableLayout';
import FormComponent from "@/app/(authenticated)/tests/forms/new-entity-form/FormComponent";
import { QuickReferenceSidebar } from '../../crud-operations/components/QuickReferenceSidebar';
import { EntityFormPanelRefs } from '../../crud-operations/components/EntityFormPanel';

interface EntityPageProps<TEntity extends EntityKeys> {
    entityKey: TEntity;
}

export function ThreePanelLayout<TEntity extends EntityKeys>(
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
                <QuickReferenceSidebar
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
                <FormComponent
                    entityKey={entityKey}
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
