import * as React from 'react';
import {EntityKeys} from '@/types/entityTypes';
import EnhancedEntityAnalyzer from '@/components/admin/redux/EnhancedEntityAnalyzer';
import {DynamicResizableLayout} from '@/components/matrx/resizable/DynamicResizableLayout';
import FormComponent from "@/app/(authenticated)/tests/forms/new-entity-form/FormComponent";
import {QuickReferenceSidebar} from '../../crud-operations/components/QuickReferenceSidebar';
import {EntityFormPanelRefs} from '../../crud-operations/components/EntityFormPanel';

interface EntityPageProps<TEntity extends EntityKeys> {
    entityKey: TEntity;
}

const MobileLayout = <TEntity extends EntityKeys>(
    {
        entityKey,
        onCreateEntity,
    }: {
        entityKey: TEntity;
        onCreateEntity: () => void;
    }) => (
    <div className="flex flex-col min-h-min w-full">
        <div className="flex-none">
            <QuickReferenceSidebar
                entityKey={entityKey}
                onCreateEntityClick={onCreateEntity}
                showCreateNewButton={true}
            />
        </div>
        <div className="flex-1">
            <FormComponent entityKey={entityKey} />
            <EnhancedEntityAnalyzer
                selectedEntityKey={entityKey}
                defaultExpanded={false}
            />
        </div>
    </div>
);

const DesktopLayout = <TEntity extends EntityKeys>(
    {
        entityKey,
        onCreateEntity,
    }: {
        entityKey: TEntity;
        onCreateEntity: () => void;
    }) => {
    const panels = [
        {
            content: (
                <QuickReferenceSidebar
                    entityKey={entityKey}
                    onCreateEntityClick={onCreateEntity}
                    showCreateNewButton={true}
                />
            ),
            defaultSize: 15,
            minSize: 10,
            maxSize: 50,
            collapsible: true
        },
        {
            content: <FormComponent entityKey={entityKey}/>,
            defaultSize: 60,
            minSize: 20,
            maxSize: 100
        },
        {
            content: (
                <EnhancedEntityAnalyzer
                    selectedEntityKey={entityKey}
                    defaultExpanded={false}
                />
            ),
            defaultSize: 25,
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
};

import { ScrollArea } from "@/components/ui/scroll-area";

export function ThreePanelLayout<TEntity extends EntityKeys>({
    entityKey,
}: EntityPageProps<TEntity>) {
    const EntityFormPanelRef = React.useRef<EntityFormPanelRefs>(null);
    const handleShowContent = () => {
        EntityFormPanelRef.current?.handleCreateNew();
    };

    return (
        <div className="w-full h-full flex flex-col">
            <div className="hidden md:block h-full">
                <DesktopLayout
                    entityKey={entityKey}
                    onCreateEntity={handleShowContent}
                />
            </div>
            <div className="block md:hidden h-full">
                <ScrollArea className="h-[calc(100vh-10rem)]">
                    <MobileLayout
                        entityKey={entityKey}
                        onCreateEntity={handleShowContent}
                    />
                </ScrollArea>
            </div>
        </div>
    );
}
