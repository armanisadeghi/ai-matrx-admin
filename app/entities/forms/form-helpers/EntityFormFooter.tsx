import React from 'react';
import { SmartCrudButtons } from '@/components/matrx/Entity/prewired-components/layouts/smart-layouts/smart-actions';
import { ComponentDensity, ComponentSize, EntityKeys, MatrxRecordId } from '@/types';
import { UnifiedLayoutProps } from '@/components/matrx/Entity';


interface EntityFormFooterProps {
    entityKey: EntityKeys;
    recordId: MatrxRecordId;
    density: ComponentDensity;
    crudOptions: {
        allowCreate?: boolean;
        allowEdit?: boolean;
        allowDelete?: boolean;
        allowRefresh?: boolean;
        allowAdvanced?: boolean;
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
    density = 'compact',
    crudOptions = {
        allowCreate: false,
        allowEdit: true,
        allowDelete: true,
        allowAdvanced: true,
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

    return (
        <div className="flex flex-col items-center gap-4">
            <SmartCrudButtons
                entityKey={entityKey}
                recordId={recordId}
                options={crudOptions}
                layout={crudLayout}
                unifiedLayoutProps={unifiedLayoutProps}
            />
        </div>
    );
};

export default EntityFormFooter;
