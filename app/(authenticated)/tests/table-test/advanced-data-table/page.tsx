// app/(authenticated)/dynamic-crud/page.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { EntityKeys, EntityData } from '@/types/entityTypes';
import PreWiredCardHeader from '@/components/matrx/Entity/EntityCardHeader';
import AdvancedDataTable, { FormattingConfig } from '@/components/matrx/Entity/DataTable/AdvancedDataTable';
import { ButtonVariant, ButtonSize } from '@/components/matrx/Entity/types/tableBuilderTypes';
import {ActionConfig, SmartFieldConfig} from "@/components/matrx/Entity/addOns/smartCellRender";

export default function DataBrowserPage() {
    const [selectedEntity, setSelectedEntity] = useState<EntityKeys | null>(null);

    const handleArchive = (row: EntityData<EntityKeys>) => {
        // TODO: Handle archive action
        console.log('Archiving:', row);
    };

    const handleAction = (action: string, row: EntityData<EntityKeys>) => {
        switch(action) {
            case 'view':
                console.log('Viewing:', row);
                break;
            case 'edit':
                console.log('Editing:', row);
                break;
            case 'delete':
                console.log('Deleting:', row);
                break;
            default:
                console.log(`Unhandled action ${action}:`, row);
        }
    };

    const formatting: FormattingConfig = {
        nullValue: '',
        undefinedValue: '',
        emptyValue: '',
        booleanFormat: {
            true: 'Yes',
            false: 'No'
        },
        numberFormat: {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    };

    const smartFields: SmartFieldConfig = {
        boolean: {
            component: 'switch',
            props: { size: 'sm' }
        },
        uuid: {
            component: 'button',
            props: { variant: 'ghost' }
        },
        reference: {
            component: 'modal',
            props: { width: 'lg' }
        }
    };

    const actions: ActionConfig = {
        view: {
            enabled: true,
            variant: 'secondary' as ButtonVariant,
            size: 'xs' as ButtonSize
        },
        edit: {
            enabled: true,
            variant: 'outline' as ButtonVariant,
            size: 'xs' as ButtonSize
        },
        delete: {
            enabled: true,
            variant: 'destructive' as ButtonVariant,
            size: 'xs' as ButtonSize
        },
        custom: [{
            key: 'archive',
            label: 'Archive',
            variant: 'secondary' as ButtonVariant,
            size: 'xs' as ButtonSize,
            handler: handleArchive
        }]
    };

    const tableOptions = {
        showCheckboxes: true,
        showFilters: true,
        showActions: true,
        enableSorting: true,
        enableGrouping: true,
        enableColumnResizing: true
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
