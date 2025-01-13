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

const defaultOptions = {
    allowCreate: true,
    allowEdit: true,
    allowCancel: true,
    allowDelete: true,
    allowRefresh: true,
    showConfirmation: true,
};

const defaultLayout = {
    buttonsPosition: 'top' as const,
    buttonLayout: 'row' as const,
    buttonSize: 'default' as ComponentSize,
    buttonSpacing: 'normal' as ComponentDensity,
};

export const SmartCrudWrapper = ({
    entityKey,
    recordId,
    children,
    options,
    layout,
    className,
}: SmartCrudWrapperProps) => {
    // Merge provided options with defaults
    const mergedOptions = {
        ...defaultOptions,
        ...(options || {}),
    };

    // Merge provided layout with defaults
    const mergedLayout = {
        ...defaultLayout,
        ...(layout || {}),
    };

    const getButtonsWithProps = (hideText: boolean = false) => (
        <>
            {mergedOptions.allowCreate && (
                <SmartNewButton
                    entityKey={entityKey}
                    recordId={recordId}
                    size={hideText ? 'icon' : mergedLayout.buttonSize}
                    hideText={hideText}
                />
            )}
            {mergedOptions.allowEdit && (
                <SmartEditButton
                    entityKey={entityKey}
                    recordId={recordId}
                    size={hideText ? 'icon' : mergedLayout.buttonSize}
                    hideText={hideText}
                />
            )}
            <SmartSaveButton
                entityKey={entityKey}
                recordId={recordId}
                size={hideText ? 'icon' : mergedLayout.buttonSize}
                hideText={hideText}
                showConfirmation={mergedOptions.showConfirmation}
            />
            {mergedOptions.allowCancel && (
                <SmartCancelButton
                    entityKey={entityKey}
                    recordId={recordId}
                    size={hideText ? 'icon' : mergedLayout.buttonSize}
                    hideText={hideText}
                />
            )}
            {mergedOptions.allowDelete && (
                <SmartDeleteButton
                    entityKey={entityKey}
                    recordId={recordId}
                    size={hideText ? 'icon' : mergedLayout.buttonSize}
                    hideText={hideText}
                />
            )}
            {mergedOptions.allowRefresh && (
                <SmartRefreshButton
                    entityKey={entityKey}
                    recordId={recordId}
                    size={hideText ? 'icon' : mergedLayout.buttonSize}
                    hideText={hideText}
                />
            )}
        </>
    );

    const space = () => {
        const baseSpace = mergedLayout.buttonSpacing === 'compact' ? 1 : mergedLayout.buttonSpacing === 'comfortable' ? 4 : 2;

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
                    className={cn(mergedLayout.buttonLayout === 'column' && 'flex-col', 'gap-2')}
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
                    'flex-row gap-4': mergedLayout.buttonsPosition === 'left',
                    'flex-row-reverse gap-4': mergedLayout.buttonsPosition === 'right',
                    'flex-col-reverse gap-2': mergedLayout.buttonsPosition === 'bottom',
                    'flex-col gap-2': mergedLayout.buttonsPosition === 'top',
                },
                className
            )}
        >
            {['top', 'left'].includes(mergedLayout.buttonsPosition) && <ButtonContainer />}
            <div className='min-w-0 flex-1'>{children}</div>
            {['bottom', 'right'].includes(mergedLayout.buttonsPosition) && <ButtonContainer />}
        </div>
    );
};

export default SmartCrudWrapper;