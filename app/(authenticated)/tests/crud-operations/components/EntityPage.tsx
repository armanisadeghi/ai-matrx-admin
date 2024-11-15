// EntityPage.tsx
import * as React from 'react';
import {EntityKeys} from '@/types/entityTypes';
import {ResizableLayout} from './ResizableLayout';
import {QuickReferenceSidebar} from './QuickReferenceSidebar';
import {EntityFormPanel} from './EntityFormPanel';

interface EntityPageProps<TEntity extends EntityKeys> {
    entityKey: TEntity;
}

export function EntityPage<TEntity extends EntityKeys>(
    {
        entityKey
    }: EntityPageProps<TEntity>) {
    const [selectedId, setSelectedId] = React.useState<string>();
    const [selectedIds, setSelectedIds] = React.useState<string[]>();

    const handleSelectionChange = (selection: string | string[]) => {
        if (Array.isArray(selection)) {
            setSelectedIds(selection);
            setSelectedId(undefined);
        } else {
            setSelectedId(selection);
            setSelectedIds(undefined);
        }
    };

    return (
        <ResizableLayout
            leftPanel={
                <QuickReferenceSidebar
                    entityKey={entityKey}
                    onSelectionChange={handleSelectionChange}
                    onCreateNew={() => setSelectedId(undefined)}
                />
            }
            rightPanel={
                <EntityFormPanel
                    entityKey={entityKey}
                    selectedId={selectedId}
                    selectedIds={selectedIds}
                    onCreateSuccess={() => {
                        // Handle create success
                    }}
                    onUpdateSuccess={() => {
                        // Handle update success
                    }}
                    onDeleteSuccess={() => {
                        setSelectedId(undefined);
                        setSelectedIds(undefined);
                    }}
                />
            }
        />
    );
}
