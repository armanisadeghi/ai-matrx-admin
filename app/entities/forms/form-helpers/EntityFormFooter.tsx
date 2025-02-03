import React from 'react';
import { SmartCrudButtons } from '@/components/matrx/Entity/prewired-components/layouts/smart-layouts/smart-actions';
import { ComponentDensity, ComponentSize, EntityKeys, MatrxRecordId } from '@/types';
import { UnifiedLayoutProps } from '@/components/matrx/Entity';
import { CrudButtonOptions, CrudLayout } from '@/components/matrx/Entity/prewired-components/layouts/smart-layouts/smart-actions/SmartCrudWrapper';


export interface EntityFormFooterProps {
    entityKey: EntityKeys;
    recordId: MatrxRecordId;
    density: ComponentDensity;
    crudOptions: CrudButtonOptions;
    crudLayout: CrudLayout;
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
        forceEnable: false,
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
