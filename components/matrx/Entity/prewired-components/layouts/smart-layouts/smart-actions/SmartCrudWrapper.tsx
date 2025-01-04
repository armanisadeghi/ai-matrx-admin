import { EntityKeys, MatrxRecordId } from '@/types/entityTypes';
import { ReactNode } from 'react';
import SmartNewButton from './core-buttons/SmartNewButton';
import SmartEditButton from './core-buttons/SmartEditButton';
import SmartSaveButton from './core-buttons/SmartSaveButton';
import SmartCancelButton from './core-buttons/SmartCancelButton';
import SmartDeleteButton from './core-buttons/SmartDeleteButton';
import SmartRefreshButton from './core-buttons/SmartRefreshButton';
import LoadingButtonGroup from '@/components/ui/loaders/loading-button-group';
import { cn } from '@/lib/utils';
import { ComponentDensity, ComponentSize } from '@/types/componentConfigTypes';

export interface SmartCrudWrapperProps {
    entityKey: EntityKeys;
    recordId?: MatrxRecordId;
    children?: ReactNode;
    options?: {
        allowCreate?: boolean;
        allowEdit?: boolean;
        allowSave?: boolean;
        allowCancel?: boolean;
        allowDelete?: boolean;
        allowRefresh?: boolean;
        showConfirmation?: boolean;
    };
    layout?: {
        buttonsPosition?: 'top' | 'bottom' | 'left' | 'right';
        buttonLayout?: 'row' | 'column';
        buttonSize?: ComponentSize;
        buttonSpacing?: ComponentDensity;
    };
    className?: string;
}

export const SmartCrudWrapper = ({
    entityKey,
    recordId,
    children,
    options = {
        allowCreate: true,
        allowEdit: true,
        allowSave: true,
        allowCancel: true,
        allowDelete: true,
        allowRefresh: true,
        showConfirmation: true,
    },
    layout = {
        buttonsPosition: 'top',
        buttonLayout: 'row',
        buttonSize: 'default',
        buttonSpacing: 'normal',
    },
    className,
}: SmartCrudWrapperProps) => {
    const getButtonsWithProps = (hideText: boolean = false) => (
        <>
            {options.allowCreate && (
                <SmartNewButton
                    entityKey={entityKey}
                    recordId={recordId}
                    size={hideText ? 'icon' : layout.buttonSize}
                    hideText={hideText}
                />
            )}
            {options.allowEdit && (
                <SmartEditButton
                    entityKey={entityKey}
                    recordId={recordId}
                    size={hideText ? 'icon' : layout.buttonSize}
                    hideText={hideText}
                />
            )}
            {options.allowSave && (
                <SmartSaveButton
                    entityKey={entityKey}
                    recordId={recordId}
                    size={hideText ? 'icon' : layout.buttonSize}
                    hideText={hideText}
                    showConfirmation={options.showConfirmation}
                />
            )}
            {options.allowCancel && (
                <SmartCancelButton
                    entityKey={entityKey}
                    recordId={recordId}
                    size={hideText ? 'icon' : layout.buttonSize}
                    hideText={hideText}
                />
            )}
            {options.allowDelete && (
                <SmartDeleteButton
                    entityKey={entityKey}
                    recordId={recordId}
                    size={hideText ? 'icon' : layout.buttonSize}
                    hideText={hideText}
                />
            )}
            {options.allowRefresh && (
                <SmartRefreshButton
                    entityKey={entityKey}
                    recordId={recordId}
                    size={hideText ? 'icon' : layout.buttonSize}
                    hideText={hideText}
                />
            )}
        </>
    );

    const space = () => {
        const baseSpace = layout.buttonSpacing === 'compact' ? 1 : layout.buttonSpacing === 'comfortable' ? 4 : 2;

        return {
            padding: baseSpace,
            gap: Math.max(baseSpace, 3),
        };
    };

    const ButtonContainer = () => {
        const spacing = space();

        return (
            <div className={cn(`p-${spacing.padding}`, 'touch-none')}>
                <LoadingButtonGroup
                    className={cn(layout.buttonLayout === 'column' && 'flex-col', 'gap-2')}
                    gap={spacing.gap}
                >
                    {getButtonsWithProps()}
                </LoadingButtonGroup>
            </div>
        );
    };

    if (!children) {
        return <ButtonContainer />;
    }

    return (
        <div
            className={cn(
                'flex min-w-0',
                {
                    'flex-row gap-4': layout.buttonsPosition === 'left',
                    'flex-row-reverse gap-4': layout.buttonsPosition === 'right',
                    'flex-col-reverse gap-2': layout.buttonsPosition === 'bottom',
                    'flex-col gap-2': layout.buttonsPosition === 'top',
                },
                className
            )}
        >
            {['top', 'left'].includes(layout.buttonsPosition) && <ButtonContainer />}
            <div className='min-w-0 flex-1'>{children}</div>
            {['bottom', 'right'].includes(layout.buttonsPosition) && <ButtonContainer />}
        </div>
    );
};

export default SmartCrudWrapper;