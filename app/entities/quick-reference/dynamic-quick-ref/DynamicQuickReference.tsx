'use client';
import * as React from 'react';
import {cn} from '@/lib/utils';
import {Button} from '@/components/ui/button';
import {CheckSquare} from 'lucide-react';
import {EntityKeys} from '@/types/entityTypes';
import SmartCrudWrapper, {
    SmartCrudWrapperProps
} from "@/components/matrx/Entity/prewired-components/layouts/smart-layouts/smart-actions/SmartCrudWrapper";
import {useFetchQuickRef} from "@/app/entities/hooks/useFetchQuickRef";
import {useQuickRefRenderer} from './card-wrapper';
import {useQuickRefModes} from "@/app/entities/hooks/useQuickRefModes";

interface EntityQuickReferenceCardsProps<TEntity extends EntityKeys> {
    entityKey: TEntity;
    onSelectionChange?: (recordId: string | string[]) => void;
    smartCrudProps?: Partial<SmartCrudWrapperProps>;
    className?: string;
}

const SMART_CRUD_PROP_DEFAULTS: Partial<SmartCrudWrapperProps> = {
    options: {
        allowCreate: true,
        allowEdit: true,
        allowDelete: true,
        showConfirmation: true
    },
    layout: {
        buttonLayout: 'row' as const,
        buttonSize: 'icon' as const,
        buttonSpacing: 'normal' as const
    }
};

function DynamicQuickReference<TEntity extends EntityKeys>(
    {
        entityKey,
        className = '',
        smartCrudProps = SMART_CRUD_PROP_DEFAULTS,
    }: EntityQuickReferenceCardsProps<TEntity>) {
    useFetchQuickRef(entityKey);
    const {selectionMode, toggleSelectionMode} = useQuickRefModes(entityKey);
    const {renderItems} = useQuickRefRenderer({entityKey, variant: 'gradient', fetchMode: "fkIfk"});
    const fullSmartCrudProps = React.useMemo(() => ({
        entityKey,
        ...smartCrudProps,
    }), [entityKey, smartCrudProps]);

    return (
        <div className={cn('flex flex-col w-full min-w-0 p-1 overflow-hidden max-w-full', className)}>
            <div className="p-2 flex items-center justify-center w-full overflow-hidden">
                <SmartCrudWrapper {...fullSmartCrudProps} />
            </div>
            {selectionMode !== 'none' && (
                <div className="p-2 flex items-center justify-center w-full overflow-hidden">
                    <Button
                        onClick={toggleSelectionMode}
                        size="sm"
                        variant={selectionMode === 'multiple' ? 'secondary' : 'outline'}
                        className="truncate max-w-full"
                    >
                        <CheckSquare className="h-4 w-4 mr-2 flex-shrink-0"/>
                        <span className="truncate">{selectionMode === 'multiple' ? 'Cancel Multi' : 'Multi'}</span>
                    </Button>
                </div>
            )}
            <div className="grid auto-rows-fr overflow-y-auto space-y-1 w-full overflow-x-hidden max-w-full">
                {renderItems()}
            </div>
        </div>
    );
}

export default DynamicQuickReference;