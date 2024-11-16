// EntityPage.tsx
import * as React from 'react';
import {EntityKeys} from '@/types/entityTypes';
import {ResizableLayout} from './ResizableLayout';
import {QuickReferenceSidebar} from './QuickReferenceSidebar';
import {EntityFormPanel, EntityFormPanelRefs} from './EntityFormPanel';

interface EntityPageProps<TEntity extends EntityKeys> {
    entityKey: TEntity;
}

export function EntityPage<TEntity extends EntityKeys>({entityKey,}: EntityPageProps<TEntity>) {

    const EntityFormPanelRef = React.useRef<EntityFormPanelRefs>(null);

    const handleShowContent = () => {
        EntityFormPanelRef.current?.handleCreateNew();
    };


    return (
        <ResizableLayout className={'bg-background'}
            leftPanel={
                <QuickReferenceSidebar
                    entityKey={entityKey}
                    onCreateEntityClick={handleShowContent}
                    showCreateNewButton={true}
                />
            }
            rightPanel={
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
            }
        />
    );
}
