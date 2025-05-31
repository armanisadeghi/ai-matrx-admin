'use client';

import React from 'react';
import { EntityKeys } from '@/types/entityTypes';
import { FormLoadingTwoColumn } from "@/components/matrx/LoadingComponents";
import { UnifiedLayoutProps } from '@/components/matrx/Entity';
import { getUnifiedLayoutProps, getUpdatedUnifiedLayoutProps } from '@/app/entities/layout/configs';
import ArmaniForm from "@/components/matrx/ArmaniForm/ArmaniForm";
import { useEntityCrud } from '@/lib/redux/entity/hooks/useEntityCrud';
import { useEntity } from '@/lib/redux/entity/hooks/useEntity';
import SmartCrudButtons from '@/components/matrx/Entity/prewired-components/layouts/smart-layouts/smart-actions/SmartCrudButtons';
import {
    ComponentDensity,
    ComponentSize,
    FormColumnsOptions,
    FormDirectionOptions,
    FormLayoutOptions,
    AnimationPreset
} from '@/types/componentConfigTypes';
import { MatrxVariant } from "@/components/matrx/ArmaniForm/field-components/types";

export interface EntityContentProps<TEntity extends EntityKeys> {
    entityKey: TEntity;
    className?: string;
    density?: ComponentDensity;
    animationPreset?: AnimationPreset;
    formOptions?: {
        size?: ComponentSize;
        formLayout?: FormLayoutOptions;
        formColumns?: FormColumnsOptions;
        formDirection?: FormDirectionOptions;
        formEnableSearch?: boolean;
        formIsSinglePage?: boolean;
        formIsFullPage?: boolean;
        floatingLabel?: boolean;
        variant?: MatrxVariant;
    };
}

function NotSmartEntityContent<TEntity extends EntityKeys>({
    entityKey,
    className,
    density = 'normal',
    animationPreset = 'smooth',
    formOptions
}: EntityContentProps<TEntity>) {
    const entity = useEntity(entityKey);
    const { activeRecordCrud } = useEntityCrud(entityKey);

    // Create unified layout props using the config utilities
    const baseUnifiedProps = getUnifiedLayoutProps({
        entityKey,
        density,
        formComponent: 'DEFAULT'
    });

    // Apply form options as overrides
    const unifiedLayoutProps: UnifiedLayoutProps = getUpdatedUnifiedLayoutProps(baseUnifiedProps, {
        dynamicStyleOptions: {
            density,
            animationPreset,
            size: formOptions?.size || 'default',
            variant: formOptions?.variant || 'default'
        },
        dynamicLayoutOptions: {
            formStyleOptions: {
                formLayout: formOptions?.formLayout || 'grid',
                formColumns: formOptions?.formColumns || 2,
                formDirection: formOptions?.formDirection || 'row',
                formEnableSearch: formOptions?.formEnableSearch ?? true,
                formIsSinglePage: formOptions?.formIsSinglePage ?? true,
                formIsFullPage: formOptions?.formIsFullPage ?? true,
                floatingLabel: formOptions?.floatingLabel ?? true
            }
        }
    });

    if (!entity.entityMetadata) {
        return <FormLoadingTwoColumn />;
    }

    if (entity.loadingState.error) {
        return (
            <div className="p-4 text-red-500 dark:text-red-400">
                Error: {entity.loadingState.error.message}
            </div>
        );
    }

    const formClassName = className || "p-2";

    return (
        <div className={formClassName}>
            <div className="mb-4">
                <SmartCrudButtons
                    entityKey={entityKey}
                    options={{
                        allowCreate: true,
                        allowEdit: true,
                        allowDelete: true,
                    }}
                    layout={{
                        buttonLayout: 'row',
                        buttonSize: 'sm',
                    }}
                />
            </div>
            
            {(activeRecordCrud.recordData || !entity.primaryKeyMetadata) && (
                <ArmaniForm {...unifiedLayoutProps} className={className} />
            )}
        </div>
    );
}

// Memoize the entire component
export default React.memo(NotSmartEntityContent, (prevProps, nextProps) => {
    return prevProps.entityKey === nextProps.entityKey &&
        prevProps.className === nextProps.className &&
        prevProps.density === nextProps.density &&
        prevProps.animationPreset === nextProps.animationPreset &&
        JSON.stringify(prevProps.formOptions) === JSON.stringify(nextProps.formOptions);
});
