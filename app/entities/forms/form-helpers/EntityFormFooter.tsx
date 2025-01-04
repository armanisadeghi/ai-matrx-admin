import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SmartCrudButtons } from '@/components/matrx/Entity/prewired-components/layouts/smart-layouts/smart-actions';
import EntityRecordSheet from '../../layout/EntityRecordSheet';
import { ComponentDensity, ComponentSize, EntityKeys, MatrxRecordId } from '@/types';
import { UnifiedLayoutProps } from '@/components/matrx/Entity';
import { getUpdatedUnifiedLayoutProps } from '../../layout/configs';

function getSheetLayoutProps(initialLayoutProps: UnifiedLayoutProps): UnifiedLayoutProps {
    return getUpdatedUnifiedLayoutProps(initialLayoutProps, {
        fieldFiltering: {
            excludeFields: [],
            defaultShownFields: [],
        },
        density: 'comfortable',
    });
}

interface EntityFormFooterProps {
    entityKey: EntityKeys;
    recordId: MatrxRecordId;
    density: ComponentDensity;
    crudOptions: {
        allowCreate?: boolean;
        allowEdit?: boolean;
        allowDelete?: boolean;
        allowRefresh?: boolean;
        showConfirmation?: boolean;
    };
    crudLayout: {
        buttonsPosition?: 'top' | 'bottom' | 'left' | 'right';
        buttonLayout?: 'row' | 'column';
        buttonSize?: ComponentSize;
        buttonSpacing?: ComponentDensity;
    };
    unifiedLayoutProps: UnifiedLayoutProps;
    customButtons?: string[];
}

const EntityFormFooter = ({
    entityKey,
    recordId,
    density = "compact",
    crudOptions = {
        allowCreate: false,
        allowEdit: true,
        allowDelete: true,
        allowRefresh: true,
    },
    crudLayout = {
        buttonLayout: 'row',
        buttonSize: 'icon',
        buttonsPosition: 'top',
        buttonSpacing: 'normal',
    },
    unifiedLayoutProps,
}: EntityFormFooterProps) => {
    const [sheetStates, setSheetStates] = useState<Record<string, boolean>>({});

    const toggleSheet = (recordId: MatrxRecordId) => {
        setSheetStates((prev) => ({
            ...prev,
            [recordId]: !prev[recordId],
        }));
    };

    return (
        <>
            <SmartCrudButtons
                entityKey={entityKey}
                recordId={recordId}
                options={crudOptions}
                layout={crudLayout}
            />

            <Button
                variant='ghost'
                size='sm'
                onClick={() => toggleSheet(recordId)}
                className='text-xs'
            >
                <Settings className='w-3 h-3' />
                Advanced
            </Button>

            <EntityRecordSheet
                selectedEntity={entityKey}
                recordId={recordId}
                unifiedLayoutProps={getSheetLayoutProps(unifiedLayoutProps)}
                updateKey={0}
                open={sheetStates[recordId]}
                onOpenChange={(open) => setSheetStates((prev) => ({ ...prev, [recordId]: open }))}
                title={`Advanced Settings`}
                size='lg'
            />
        </>
    );
};

export default EntityFormFooter;
