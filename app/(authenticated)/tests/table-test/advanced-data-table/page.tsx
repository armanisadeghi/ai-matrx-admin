// app/(authenticated)/dynamic-crud/page.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { EntityKeys } from '@/types/entityTypes';
import PreWiredCardHeader from '@/components/matrx/Entity/EntityCardHeaderSelect';
import AdvancedDataTable from '@/components/matrx/Entity/DataTable/AdvancedDataTable';
import {
    ActionConfig,
    SmartFieldConfig,
    ValueFormattingOptions,
    TableOptions
} from "@/components/matrx/Entity/types/advancedDataTableTypes";
import {EntityDataWithId} from "@/lib/redux/entity/types/stateTypes";

export default function DataBrowserPage() {
    const [selectedEntity, setSelectedEntity] = useState<EntityKeys | null>(null);

    const handleArchive = (row: EntityDataWithId<EntityKeys>) => {
        // TODO: Handle archive action
        console.log('Archiving:', row);
    };

    const handleAction = (action: string, row: EntityDataWithId<EntityKeys>) => {
        switch(action) {
            case 'view':
                console.log('DataBrowserPage Viewing:', row);
                break;
            case 'edit':
                console.log('DataBrowserPage Editing:', row);
                break;
            case 'delete':
                console.log('DataBrowserPage Deleting:', row);
                break;
            default:
                console.log(`DataBrowserPage Unhandled action ${action}:`, row);
        }
    };

    const formatting: ValueFormattingOptions = {
        nullValue: '',
        undefinedValue: '',
        emptyValue: '',
        booleanFormat: {
            true: 'Yes',
            false: 'No'
        },
        numberFormat: {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
            style: 'decimal'
        }
    };

    const smartFields: SmartFieldConfig = {
        boolean: {
            component: 'switch',
            props: { size: 'sm' }
        },
        uuid: {
            component: 'button',
            label: 'Unique ID',
            onUUIDClick: (uuid) => {
                console.log('UUID clicked:', uuid);
            },
            // props: {
            //     className: 'custom-class'
            // }
        },
        object: {
            component: 'json',
            props: { size: 'sm' }
        },
        date: null,
        number: null
    };


    const actions: ActionConfig = {
        view: {
            enabled: true,
            variant: 'secondary',
            size: 'xs'
        },
        edit: {
            enabled: true,
            variant: 'outline',
            size: 'xs'
        },
        delete: {
            enabled: true,
            variant: 'destructive',
            size: 'xs'
        },
        custom: [{
            key: 'archive',
            label: 'Archive',
            variant: 'secondary',
            size: 'xs',
            handler: handleArchive
        }]
    };

    const tableOptions: Partial<TableOptions> = {
        showCheckboxes: true,
        showFilters: true,
        showActions: true,
        enableSorting: true,
        enableGrouping: true,
        enableColumnResizing: true,
        showColumnVisibility: true,
        showGlobalFilter: true,
        showPagination: true,
        defaultPageSize: 10,
        defaultPageSizeOptions: [5, 10, 25, 50, 100]
    };

    return (
        <div className="h-full w-full p-4">
            <Card className="h-full flex flex-col">
                <PreWiredCardHeader onEntityChange={setSelectedEntity}/>
                <CardContent className="flex-grow flex flex-col justify-between">
                    <div className="flex-1 p-4 overflow-hidden flex flex-col">
                        {selectedEntity ? (
                            <AdvancedDataTable
                                key={selectedEntity}
                                entityKey={selectedEntity}
                                variant="default"
                                options={tableOptions}
                                formatting={formatting}
                                smartFields={smartFields}
                                actions={actions}
                                onAction={handleAction}
                            />
                        ) : (
                             <div className="h-full flex items-center justify-center text-muted-foreground">
                                 Please select an entity to view its data
                             </div>
                         )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
